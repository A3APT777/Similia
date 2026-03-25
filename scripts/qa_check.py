# -*- coding: utf-8 -*-
"""QA check — Apple-level design audit per component"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

issues = []

def issue(severity, block, desc):
    issues.append({'severity': severity, 'block': block, 'desc': desc})
    print(f'  [{severity.upper()}] {block}: {desc}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Login
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/login', timeout=60000)
    page.wait_for_timeout(5000)
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')
    page.wait_for_timeout(15000)
    page.goto('https://simillia.ru/dashboard', timeout=60000)
    page.wait_for_timeout(8000)

    print('\n=== QA: SIDEBAR ===\n')

    # 1. VISUAL SYSTEM — spacing, grid, radii, alignment
    sidebar = page.locator('aside').first
    if sidebar.count() > 0:
        sb_width = sidebar.evaluate('el => el.offsetWidth')
        print(f'  Sidebar width: {sb_width}px')
        if sb_width < 200 or sb_width > 280:
            issue('medium', 'visual', f'Sidebar width {sb_width}px — should be 220-260px')

    # Check nav link heights consistency
    nav_links = page.locator('.sb-nav-link').all()
    heights = set()
    for link in nav_links[:10]:
        if link.is_visible():
            h = link.evaluate('el => el.offsetHeight')
            heights.add(h)
    if len(heights) > 2:
        issue('medium', 'visual', f'Nav links have {len(heights)} different heights: {heights}')
    else:
        print(f'  Nav link heights: {heights} (consistent)')

    # Check spacing between section labels
    labels = page.locator('.sb-section-label').all()
    label_positions = []
    for lbl in labels:
        if lbl.is_visible():
            box = lbl.bounding_box()
            if box:
                label_positions.append(box['y'])
    if len(label_positions) >= 2:
        gaps = [label_positions[i+1] - label_positions[i] for i in range(len(label_positions)-1)]
        print(f'  Section label gaps: {[round(g) for g in gaps]}px')
        if max(gaps) - min(gaps) > 20:
            issue('minor', 'visual', f'Uneven section gaps: {[round(g) for g in gaps]}')

    # 2. TYPOGRAPHY
    nav_fonts = set()
    nav_sizes = set()
    for link in nav_links[:10]:
        if link.is_visible():
            font = link.evaluate('el => getComputedStyle(el).fontFamily.split(",")[0].trim()')
            size = link.evaluate('el => getComputedStyle(el).fontSize')
            nav_fonts.add(font)
            nav_sizes.add(size)
    print(f'  Nav fonts: {nav_fonts}')
    print(f'  Nav sizes: {nav_sizes}')
    if len(nav_sizes) > 1:
        issue('minor', 'typography', f'Multiple nav font sizes: {nav_sizes}')

    # Check logo font
    logo = page.locator('aside span').first
    if logo.count() > 0:
        logo_font = logo.evaluate('el => getComputedStyle(el).fontFamily')
        if 'Cormorant' not in logo_font and 'Georgia' not in logo_font:
            issue('medium', 'typography', f'Logo font is not Cormorant: {logo_font}')

    # 3. COMPONENTS — active indicator
    active_link = page.locator('.sb-nav-link[data-active]').first
    if active_link.count() > 0:
        indicator = active_link.locator('.sb-active-indicator').first
        if indicator.count() == 0:
            issue('critical', 'components', 'Active nav link missing indicator')
        else:
            ind_color = indicator.evaluate('el => getComputedStyle(el).backgroundColor')
            print(f'  Active indicator color: {ind_color}')

    # 4. VISUAL NOISE
    # Count total visible elements in sidebar
    all_els = sidebar.locator('*').all() if sidebar.count() > 0 else []
    visible_count = sum(1 for el in all_els[:100] if el.is_visible())
    print(f'  Visible elements in sidebar: {visible_count}')
    if visible_count > 80:
        issue('medium', 'noise', f'Too many visible elements ({visible_count}) — simplify')

    # 5. UX LOGIC
    # Check that all links actually work (href exists)
    for link in nav_links[:10]:
        href = link.get_attribute('href')
        tag = link.evaluate('el => el.tagName')
        if not href and tag == 'A':  # only check <a> tags, buttons are OK
            text = link.inner_text()[:20]
            issue('critical', 'ux', f'Nav link "{text}" has no href')

    # 6. HIERARCHY
    # Logo should be the first thing (highest Y)
    logo_box = page.locator('aside svg').first.bounding_box() if page.locator('aside svg').count() > 0 else None
    first_link_box = nav_links[0].bounding_box() if nav_links else None
    if logo_box and first_link_box:
        if logo_box['y'] > first_link_box['y']:
            issue('critical', 'hierarchy', 'Logo is below nav links')

    # 7. APPLE STYLE
    # Check sidebar background — should be deep dark
    sb_bg = sidebar.evaluate('el => getComputedStyle(el).backgroundColor') if sidebar.count() > 0 else ''
    print(f'  Sidebar bg: {sb_bg}')
    if 'rgb(237' in sb_bg or 'rgb(247' in sb_bg:
        issue('critical', 'apple', 'Sidebar background is too light — not premium dark')

    # 8. MOBILE
    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)

    # Check mobile header exists
    mobile_header = page.locator('header').first
    if mobile_header.count() > 0 and mobile_header.is_visible():
        mh_height = mobile_header.evaluate('el => el.offsetHeight')
        print(f'  Mobile header height: {mh_height}px')
        if mh_height < 44:
            issue('medium', 'mobile', f'Mobile header too short: {mh_height}px')

    # Burger button
    burger = page.locator('button[aria-label]').first
    if burger.count() > 0:
        burger_box = burger.bounding_box()
        if burger_box and (burger_box['width'] < 40 or burger_box['height'] < 40):
            issue('medium', 'mobile', f'Burger button too small: {burger_box["width"]}x{burger_box["height"]}')
    else:
        issue('critical', 'mobile', 'No burger button found')

    page.close()
    ctx.close()
    browser.close()

# === REPORT ===
print('\n' + '=' * 60)
print('  QA SIDEBAR REPORT')
print('=' * 60)

critical = sum(1 for i in issues if i['severity'] == 'critical')
medium = sum(1 for i in issues if i['severity'] == 'medium')
minor = sum(1 for i in issues if i['severity'] == 'minor')

print(f'\n  Critical: {critical} | Medium: {medium} | Minor: {minor}')

if issues:
    print('\n  ALL ISSUES:')
    for i in issues:
        print(f'    [{i["severity"].upper():8s}] {i["block"]}: {i["desc"]}')

# Score
score = 10 - critical * 2 - medium * 0.5 - minor * 0.2
score = max(0, min(10, round(score, 1)))
print(f'\n  SCORE: {score}/10')
print('=' * 60)
