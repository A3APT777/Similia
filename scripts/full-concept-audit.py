"""
Полный аудит концепции сайта — визуал, UX, логика, консистентность.
Каждая страница: desktop + mobile + все элементы.
"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

W, H = 1440, 900
MW, MH = 375, 812
DIR = 'c:/projects/casebook/screenshots/concept-audit'
os.makedirs(DIR, exist_ok=True)

findings = []

def check(page, page_name, viewport='desktop'):
    """Проверяет страницу по всем параметрам"""
    issues = []

    # 1. Цвета — проверяем что нет хардкод цветов вне палитры
    colors = page.evaluate("""() => {
        const els = document.querySelectorAll('*')
        const badColors = []
        for (const el of els) {
            const s = window.getComputedStyle(el)
            const bg = s.backgroundColor
            const c = s.color
            // Ищем ярко-синие, ярко-красные, неоновые — не наша палитра
            if (bg.includes('rgb(0, 0, 255)') || bg.includes('rgb(255, 0, 0)') || bg.includes('rgb(0, 255, 0)')) {
                badColors.push({tag: el.tagName, bg})
            }
        }
        return badColors
    }""")
    if colors:
        issues.append(f'Цвета вне палитры: {len(colors)} элементов')

    # 2. Шрифты — проверяем что используются Cormorant и Geist
    fonts = page.evaluate("""() => {
        const fonts = new Set()
        for (const el of document.querySelectorAll('h1, h2, h3, p, span, a, button, label')) {
            const f = window.getComputedStyle(el).fontFamily
            if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                fonts.add(f.split(',')[0].trim().replace(/['"]/g, ''))
            }
        }
        return [...fonts]
    }""")
    non_standard = [f for f in fonts if f not in ['Cormorant Garamond', 'Geist', '__Geist_Fallback', 'Geist Sans', 'Georgia', 'serif', 'sans-serif', '', 'ui-sans-serif', 'system-ui', '-apple-system']]
    if non_standard:
        issues.append(f'Нестандартные шрифты: {non_standard}')

    # 3. Размеры текста — ищем < 11px
    small_text = page.evaluate("""() => {
        const small = []
        for (const el of document.querySelectorAll('p, span, a, button, label, td, th')) {
            const s = window.getComputedStyle(el)
            const size = parseFloat(s.fontSize)
            if (size < 11 && el.offsetWidth > 0 && el.offsetHeight > 0 && el.textContent.trim()) {
                small.push({text: el.textContent.trim().slice(0, 30), size: size + 'px'})
            }
        }
        return small.slice(0, 5)
    }""")
    if small_text:
        issues.append(f'Мелкий текст (<11px): {json.dumps(small_text, ensure_ascii=False)[:100]}')

    # 4. Overflow — горизонтальный скролл
    has_overflow = page.evaluate("""() => document.documentElement.scrollWidth > document.documentElement.clientWidth""")
    if has_overflow:
        issues.append('Горизонтальный скролл!')

    # 5. Пустые alt на изображениях
    missing_alt = page.evaluate("""() => {
        return [...document.querySelectorAll('img')].filter(i => !i.alt && i.offsetWidth > 0).length
    }""")
    if missing_alt > 0:
        issues.append(f'Изображения без alt: {missing_alt}')

    # 6. Z-index конфликты
    high_z = page.evaluate("""() => {
        const high = []
        for (const el of document.querySelectorAll('*')) {
            const z = parseInt(window.getComputedStyle(el).zIndex)
            if (z > 1000 && el.offsetWidth > 0) {
                high.push({tag: el.tagName, z, class: el.className?.toString().slice(0, 40)})
            }
        }
        return high
    }""")
    if len(high_z) > 3:
        issues.append(f'Высокие z-index (>1000): {len(high_z)} элементов')

    # 7. Touch targets на мобильном (< 44px)
    if viewport == 'mobile':
        small_targets = page.evaluate("""() => {
            const small = []
            for (const el of document.querySelectorAll('button, a, [role=button]')) {
                const r = el.getBoundingClientRect()
                if (r.width > 0 && r.height > 0 && (r.width < 36 || r.height < 36) && el.textContent?.trim()) {
                    small.push({text: el.textContent.trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height)})
                }
            }
            return small.slice(0, 5)
        }""")
        if small_targets:
            issues.append(f'Мелкие touch targets: {json.dumps(small_targets, ensure_ascii=False)[:100]}')

    for issue in issues:
        findings.append({'page': page_name, 'viewport': viewport, 'issue': issue})
        print(f'  ⚠️  [{viewport}] {issue}')

    if not issues:
        print(f'  ✅ [{viewport}] Без замечаний')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # === ПУБЛИЧНЫЕ СТРАНИЦЫ ===
    for url, name in [
        ('https://simillia.ru', 'landing'),
        ('https://simillia.ru/login', 'login'),
        ('https://simillia.ru/register', 'register'),
        ('https://simillia.ru/pricing', 'pricing'),
        ('https://simillia.ru/privacy', 'privacy'),
        ('https://simillia.ru/terms', 'terms'),
        ('https://simillia.ru/guide', 'guide'),
    ]:
        print(f'\n{"="*40}\n{name.upper()}\n{"="*40}')

        # Desktop
        page = browser.new_page(viewport={'width': W, 'height': H})
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{DIR}/{name}-d.png', full_page=True)
        check(page, name, 'desktop')
        page.close()

        # Mobile
        page = browser.new_page(viewport={'width': MW, 'height': MH})
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{DIR}/{name}-m.png', full_page=True)
        check(page, name, 'mobile')
        page.close()

    # === АВТОРИЗОВАННЫЕ СТРАНИЦЫ ===
    page = browser.new_page(viewport={'width': W, 'height': H})
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'test-qa@simillia.ru')
    page.fill('input[type="password"]', 'TestQA2026!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    auth_pages = [
        ('/dashboard', 'dashboard'),
        ('/settings', 'settings'),
        ('/repertory', 'repertory'),
        ('/referral', 'referral'),
        ('/ai-consultation', 'ai-consultation'),
        ('/patients/aaaa0001-0000-0000-0000-000000000001', 'patient-card'),
    ]

    for path, name in auth_pages:
        print(f'\n{"="*40}\n{name.upper()}\n{"="*40}')

        page.set_viewport_size({'width': W, 'height': H})
        page.goto(f'https://simillia.ru{path}', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(5000)
        page.screenshot(path=f'{DIR}/{name}-d.png', full_page=True)
        check(page, name, 'desktop')

        page.set_viewport_size({'width': MW, 'height': MH})
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{DIR}/{name}-m.png', full_page=True)
        check(page, name, 'mobile')

    # Консультация
    page.set_viewport_size({'width': W, 'height': H})
    page.goto('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    start = page.locator('button:has-text("Начать повторный")').first
    if start.count() > 0 and start.is_visible():
        start.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(8000)
        if '/consultations/' in page.url:
            print(f'\n{"="*40}\nCONSULTATION\n{"="*40}')
            page.screenshot(path=f'{DIR}/consultation-d.png', full_page=True)
            check(page, 'consultation', 'desktop')

            page.set_viewport_size({'width': MW, 'height': MH})
            page.wait_for_timeout(2000)
            page.screenshot(path=f'{DIR}/consultation-m.png', full_page=True)
            check(page, 'consultation', 'mobile')

    page.close()
    browser.close()

    # === ИТОГИ ===
    print(f'\n{"="*60}')
    print(f'ИТОГО: {len(findings)} замечаний')
    print(f'{"="*60}')

    if findings:
        # Группировка по типу
        from collections import Counter
        types = Counter(f['issue'].split(':')[0] for f in findings)
        print('\nПо типам:')
        for t, c in types.most_common():
            print(f'  {t}: {c}')

        print('\nДетали:')
        for f in findings:
            print(f'  [{f["page"]:15s}] [{f["viewport"]:7s}] {f["issue"]}')
    else:
        print('\nВСЁ В ПОРЯДКЕ!')

    # Сохраняем
    with open(f'{DIR}/findings.json', 'w', encoding='utf-8') as f:
        json.dump(findings, f, ensure_ascii=False, indent=2)
