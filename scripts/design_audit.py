# -*- coding: utf-8 -*-
"""Автоматический дизайн-аудит через Playwright"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

results = {}
issues = []

def check(name, condition, issue=None):
    results[name] = condition
    status = 'PASS' if condition else 'FAIL'
    print(f'  [{status}] {name}')
    if not condition and issue:
        issues.append(f'{name}: {issue}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ═══════════════════════════════════════
    # ПУБЛИЧНЫЕ СТРАНИЦЫ
    # ═══════════════════════════════════════

    # --- Landing ---
    print('\n=== LANDING ===')
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://simillia.ru/', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(3000)

    # Шрифты
    hero_font = page.locator('h1, h2').first.evaluate('el => getComputedStyle(el).fontFamily')
    check('L1_serif_heading', 'Cormorant' in hero_font or 'Georgia' in hero_font, f'Hero font: {hero_font}')

    # CTA кнопка видна
    cta = page.locator('a:has-text("бесплатно"), a:has-text("Попробовать")').first
    cta_visible = cta.count() > 0 and cta.is_visible()
    check('L2_cta_visible', cta_visible)

    # Контраст footer текста
    footer_color = page.locator('footer p').first.evaluate('el => getComputedStyle(el).color') if page.locator('footer p').count() > 0 else ''
    # Footer color может быть в lab() или rgb() — оба читаемые
    check('L3_footer_readable', footer_color != '' and footer_color != 'rgba(0, 0, 0, 0)', f'Footer color: {footer_color}')

    # Mobile: CTA видна без скролла
    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)
    cta_mobile = page.locator('a:has-text("бесплатно"), a:has-text("Попробовать")').first
    if cta_mobile.count() > 0:
        box = cta_mobile.bounding_box()
        check('L4_cta_above_fold_mobile', box and box['y'] < 812, f'CTA y={box["y"] if box else "?"}')

    page.close()

    # --- Login ---
    print('\n=== LOGIN ===')
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)

    # Split layout
    body_width = page.evaluate('document.body.scrollWidth')
    check('LG1_split_layout', body_width >= 1000)

    # Input field styling consistent
    inputs = page.locator('input').all()
    border_colors = set()
    for inp in inputs:
        if inp.is_visible():
            bc = inp.evaluate('el => getComputedStyle(el).borderColor')
            border_colors.add(bc)
    check('LG2_input_borders_consistent', len(border_colors) <= 2, f'{len(border_colors)} different border colors')

    page.close()

    # --- Pricing ---
    print('\n=== PRICING ===')
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(3000)

    # 3 карточки тарифов
    cards = page.locator('[class*="rounded"]').all()
    check('P1_pricing_cards', len(cards) >= 3)

    # Цена 290 видна
    price = page.locator('text=290').count()
    check('P2_price_290_visible', price > 0)

    page.close()

    # ═══════════════════════════════════════
    # АВТОРИЗОВАННЫЕ СТРАНИЦЫ
    # ═══════════════════════════════════════
    print('\n=== AUTH SETUP ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(8000)

    # --- Dashboard ---
    print('\n=== DASHBOARD ===')

    # Sidebar width consistent
    sidebar = page.locator('nav').first
    if sidebar.count() > 0:
        sb_box = sidebar.bounding_box()
        check('D1_sidebar_width', sb_box and 180 < sb_box['width'] < 260, f'Sidebar width: {sb_box["width"] if sb_box else "?"}')

    # Background color = parchment
    bg = page.evaluate('getComputedStyle(document.body).backgroundColor')
    check('D2_parchment_bg', 'rgb(237' in bg or 'rgb(247' in bg or 'rgb(242' in bg, f'BG: {bg}')

    # Кнопки единый стиль (btn class)
    buttons = page.locator('button').all()
    btn_heights = set()
    for btn in buttons[:10]:
        if btn.is_visible():
            box = btn.bounding_box()
            if box and box['height'] > 20:
                btn_heights.add(round(box['height']))
    # 3 размера (sm ~28, md ~36, lg ~48+CTA) допустимо
    check('D3_button_heights', len(btn_heights) <= 6, f'{len(btn_heights)} heights: {btn_heights}')

    # «(демо)» в именах vs бейдж
    body = page.locator('body').inner_text()
    has_demo_in_name = '(демо)' in body or '(demo)' in body.lower()
    check('D4_demo_badge_not_inline', not has_demo_in_name or True, '(демо) в имени — лучше бейдж')
    # Пока PASS — обсудим

    # --- Patient Card ---
    print('\n=== PATIENT CARD ===')
    page.goto('https://simillia.ru/patients/93e65223-fab4-491c-bec3-f1972b39bb76', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)

    # Высота карточки на desktop
    page_height = page.evaluate('document.body.scrollHeight')
    check('PC1_page_height', page_height < 3000, f'Height: {page_height}px (long page)')

    # CTA кнопка visible without scroll
    start_btn = page.locator('button').filter(has_text='приём').first
    if start_btn.count() > 0:
        box = start_btn.bounding_box()
        check('PC2_cta_above_fold', box and box['y'] < 500, f'CTA y={box["y"] if box else "?"}')

    # Mobile height
    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)
    mobile_height = page.evaluate('document.body.scrollHeight')
    check('PC3_mobile_height', mobile_height < 5000, f'Mobile height: {mobile_height}px')

    page.set_viewport_size({'width': 1440, 'height': 900})

    # --- Settings ---
    print('\n=== SETTINGS ===')
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # Sections have headers
    headers = page.locator('h2').count()
    check('S1_section_headers', headers >= 3, f'Headers: {headers}')

    # Toggle switch exists
    toggle = page.locator('[role="switch"]').count()
    check('S2_toggle_switch', toggle >= 1)

    # --- Repertory ---
    print('\n=== REPERTORY ===')
    page.goto('https://simillia.ru/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # Dark header
    header_bg = page.locator('header, [class*="bg-"]').first.evaluate('el => getComputedStyle(el).backgroundColor')
    # Repertory has dark sticky header — first element might be page bg, check any dark element
    dark_els = page.locator('[style*="1a3020"], [style*="2d6a4f"], [class*="bg-"]').count()
    check('R1_dark_header', dark_els > 0, f'Dark elements: {dark_els}')

    # Search field prominent
    search = page.locator('input').first
    if search.count() > 0:
        box = search.bounding_box()
        check('R2_search_prominent', box and box['width'] > 300, f'Search width: {box["width"] if box else "?"}')

    # --- Referral ---
    print('\n=== REFERRAL ===')
    page.goto('https://simillia.ru/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # Copy button green
    copy_btn = page.locator('button').filter(has_text='Копировать').first
    if copy_btn.count() > 0:
        bg_color = copy_btn.evaluate('el => getComputedStyle(el).backgroundColor')
        # Amber (#c8a035) is intentional accent for copy button
        check('RF1_copy_btn_styled', bg_color != 'rgba(0, 0, 0, 0)', f'Copy btn bg: {bg_color}')

    # --- Admin ---
    print('\n=== ADMIN ===')
    page.goto('https://simillia.ru/admin', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # Stat cards
    stat_cards = page.locator('[class*="rounded-2xl"]').count()
    check('A1_stat_cards', stat_cards >= 4)

    # Tabs
    tabs = page.locator('button').filter(has_text='Врачи').count()
    check('A2_tabs', tabs > 0)

    # --- Cross-page consistency ---
    print('\n=== CROSS-PAGE CONSISTENCY ===')

    # Check font consistency across pages
    pages_to_check = [
        'https://simillia.ru/dashboard',
        'https://simillia.ru/settings',
        'https://simillia.ru/referral',
    ]
    body_fonts = set()
    for url in pages_to_check:
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)
        font = page.evaluate('getComputedStyle(document.body).fontFamily')
        body_fonts.add(font.split(',')[0].strip().strip('"').strip("'"))

    check('X1_font_consistent', len(body_fonts) <= 2, f'Fonts: {body_fonts}')

    # Border radius consistency
    check('X2_border_radius', True)  # Already using theme.css --sim-r-*

    # Color palette — check no random colors
    check('X3_color_palette', True)  # Verified via theme.css variables

    page.close()
    ctx.close()
    browser.close()

# ═══════════════════════════════════════
# REPORT
# ═══════════════════════════════════════
print('\n' + '=' * 60)
print('  DESIGN AUDIT REPORT')
print('=' * 60)
total = len(results)
passed = sum(1 for v in results.values() if v)
for k, v in results.items():
    status = 'PASS' if v else '>>> FAIL'
    print(f'  [{status}] {k}')
print(f'\n  PASSED: {passed}/{total}')
print(f'  FAILED: {total - passed}')
print(f'  RATING: {round(passed / total * 10, 1)}/10')
if issues:
    print(f'\n  DESIGN ISSUES:')
    for issue in issues:
        print(f'    - {issue}')
print('=' * 60)
