"""
Полный аудит кнопок — стиль + расположение + логика.
Снимает скриншоты каждой страницы и собирает данные о всех интерактивных элементах.
"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

W, H = 1440, 900
DIR = 'c:/projects/casebook/screenshots/button-audit-v2'
os.makedirs(DIR, exist_ok=True)

PAGES = [
    ('https://simillia.ru', 'landing', False),
    ('https://simillia.ru/login', 'login', False),
    ('https://simillia.ru/register', 'register', False),
    ('https://simillia.ru/pricing', 'pricing', False),
    ('https://simillia.ru/guide', 'guide', False),
    ('https://simillia.ru/privacy', 'privacy', False),
    # Auth required
    ('https://simillia.ru/dashboard', 'dashboard', True),
    ('https://simillia.ru/settings', 'settings', True),
    ('https://simillia.ru/repertory', 'repertory', True),
    ('https://simillia.ru/referral', 'referral', True),
    ('https://simillia.ru/ai-consultation', 'ai-consultation', True),
    ('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', 'patient-card', True),
]

all_buttons = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': W, 'height': H})

    logged_in = False

    for url, name, needs_auth in PAGES:
        if needs_auth and not logged_in:
            page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(1000)
            page.fill('input[type="email"]', 'test-qa@simillia.ru')
            page.fill('input[type="password"]', 'TestQA2026!')
            page.click('button[type="submit"]')
            page.wait_for_url('**/dashboard**', timeout=20000)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(5000)
            logged_in = True

        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(5000)

        # Скриншот desktop
        page.screenshot(path=f'{DIR}/{name}-desktop.png')

        # Скриншот mobile
        page.set_viewport_size({'width': 375, 'height': 812})
        page.wait_for_timeout(1000)
        page.screenshot(path=f'{DIR}/{name}-mobile.png')
        page.set_viewport_size({'width': W, 'height': H})
        page.wait_for_timeout(500)

        # Собираем ВСЕ интерактивные элементы
        elements = page.evaluate("""() => {
            const results = []
            const els = document.querySelectorAll('button, a[href], [role="button"], input[type="submit"]')
            for (const el of els) {
                const rect = el.getBoundingClientRect()
                if (rect.width < 5 || rect.height < 5) continue
                if (rect.top > 5000) continue // off-screen

                const style = window.getComputedStyle(el)
                const text = (el.textContent || '').trim().slice(0, 50)
                const tag = el.tagName.toLowerCase()
                const href = el.getAttribute('href') || ''
                const type = el.getAttribute('type') || ''
                const disabled = el.disabled || false
                const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'

                if (!visible) continue

                results.push({
                    text,
                    tag,
                    href,
                    type,
                    disabled,
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    borderRadius: style.borderRadius,
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    fontSize: style.fontSize,
                    fontWeight: style.fontWeight,
                    padding: style.padding,
                    className: el.className?.toString().slice(0, 100) || '',
                })
            }
            return results
        }""")

        for el in elements:
            el['page'] = name
            all_buttons.append(el)

        btn_count = len([e for e in elements if e['text'] and len(e['text']) > 1])
        print(f'[OK] {name}: {btn_count} interactive elements')

    # Консультация
    page.goto('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    start = page.locator('button:has-text("Начать повторный")').first
    if start.count() > 0 and start.is_visible():
        start.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(8000)
        if '/consultations/' in page.url:
            page.screenshot(path=f'{DIR}/consultation-desktop.png')
            page.set_viewport_size({'width': 375, 'height': 812})
            page.wait_for_timeout(1000)
            page.screenshot(path=f'{DIR}/consultation-mobile.png')
            page.set_viewport_size({'width': W, 'height': H})

            elements = page.evaluate("""() => {
                const results = []
                const els = document.querySelectorAll('button, a[href], [role="button"]')
                for (const el of els) {
                    const rect = el.getBoundingClientRect()
                    if (rect.width < 5 || rect.height < 5) continue
                    const style = window.getComputedStyle(el)
                    const text = (el.textContent || '').trim().slice(0, 50)
                    const visible = style.display !== 'none' && style.visibility !== 'hidden'
                    if (!visible || !text) continue
                    results.push({
                        text,
                        tag: el.tagName.toLowerCase(),
                        href: el.getAttribute('href') || '',
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        borderRadius: style.borderRadius,
                        backgroundColor: style.backgroundColor,
                        fontSize: style.fontSize,
                        className: el.className?.toString().slice(0, 80) || '',
                    })
                }
                return results
            }""")

            for el in elements:
                el['page'] = 'consultation'
                all_buttons.append(el)
            print(f'[OK] consultation: {len(elements)} elements')

    browser.close()

    # Сохраняем JSON для анализа
    with open(f'{DIR}/all-buttons.json', 'w', encoding='utf-8') as f:
        json.dump(all_buttons, f, ensure_ascii=False, indent=2)

    # Анализ
    print(f'\n{"="*60}')
    print(f'ВСЕГО: {len(all_buttons)} интерактивных элементов на {len(PAGES)+1} страницах')
    print(f'{"="*60}')

    # Группировка по стилю border-radius
    from collections import Counter
    br_counter = Counter()
    for btn in all_buttons:
        br = btn.get('borderRadius', '')
        text = btn.get('text', '')
        if text and len(text) > 1:
            is_pill = '9999' in br or '100px' in br or '50%' in br or '3.355' in br
            br_counter['pill' if is_pill else 'not-pill'] += 1

    print(f'\nСтиль: pill={br_counter["pill"]}, не-pill={br_counter["not-pill"]}')

    # Не-pill кнопки
    if br_counter['not-pill'] > 0:
        print(f'\nНЕ-PILL кнопки:')
        for btn in all_buttons:
            br = btn.get('borderRadius', '')
            text = btn.get('text', '')
            if text and len(text) > 1:
                is_pill = '9999' in br or '100px' in br or '50%' in br or '3.355' in br
                if not is_pill:
                    print(f'  [{btn["page"]:15s}] {text:30s} br={br:15s} y={btn.get("y", "?")}')

    # Кнопки без текста (потенциально проблемные)
    empty = [b for b in all_buttons if not b.get('text', '').strip() and b.get('tag') == 'button']
    if empty:
        print(f'\nКНОПКИ БЕЗ ТЕКСТА: {len(empty)}')
        for btn in empty[:10]:
            print(f'  [{btn["page"]:15s}] class={btn.get("className", "")[:40]:40s} y={btn.get("y", "?")}')

    # Ссылки которые никуда не ведут
    dead_links = [b for b in all_buttons if b.get('tag') == 'a' and (not b.get('href') or b['href'] == '#')]
    if dead_links:
        print(f'\nСсылки без href: {len(dead_links)}')
        for btn in dead_links[:10]:
            print(f'  [{btn["page"]:15s}] {btn.get("text", "")[:30]:30s} href={btn.get("href", "")}')

    print('\n[DONE]')
