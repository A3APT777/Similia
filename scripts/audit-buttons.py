"""
Аудит всех кнопок на сайте — стили, расположение, соответствие дизайн-системе.
"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

W, H = 1440, 900
DIR = 'c:/projects/casebook/screenshots/button-audit'
os.makedirs(DIR, exist_ok=True)

PAGES = [
    ('/dashboard', 'dashboard'),
    ('/settings', 'settings'),
    ('/repertory', 'repertory'),
    ('/referral', 'referral'),
    ('/pricing', 'pricing'),
    ('/ai-consultation', 'ai-consultation'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': W, 'height': H})

    # Логин
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'test-qa@simillia.ru')
    page.fill('input[type="password"]', 'TestQA2026!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    all_issues = []

    for path, name in PAGES:
        page.goto(f'https://simillia.ru{path}', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(5000)
        page.screenshot(path=f'{DIR}/{name}.png')

        # Проверяем все кнопки
        buttons = page.locator('button, a.btn, [role="button"]').all()
        page_issues = []

        for i, btn in enumerate(buttons):
            if not btn.is_visible():
                continue
            try:
                text = (btn.text_content() or '').strip()[:40]
                box = btn.bounding_box()
                if not box or box['width'] < 5:
                    continue

                # CSS свойства
                styles = btn.evaluate("""el => {
                    const s = window.getComputedStyle(el)
                    return {
                        borderRadius: s.borderRadius,
                        backgroundColor: s.backgroundColor,
                        color: s.color,
                        fontSize: s.fontSize,
                        fontWeight: s.fontWeight,
                        padding: s.padding,
                        border: s.border,
                        height: s.height,
                        minHeight: s.minHeight,
                    }
                }""")

                br = styles['borderRadius']
                # Проверка: pill = 9999px или 100px+, xl = 12px, lg = 8px
                is_pill = '9999' in br or '100' in br or '50' in br
                is_xl = '12' in br or '16' in br
                is_lg = '8' in br
                is_round = '24' in br or '20' in br

                style_type = 'pill' if is_pill else 'xl' if is_xl else 'lg' if is_lg else 'round' if is_round else f'other({br})'

                if not is_pill and text and len(text) > 1:
                    page_issues.append({
                        'text': text,
                        'borderRadius': br,
                        'style': style_type,
                        'page': name,
                        'y': int(box['y']),
                    })

                if text and len(text) > 1:
                    print(f'  [{name}] [{style_type:6s}] {text:30s} br={br:15s} bg={styles["backgroundColor"][:20]}')

            except Exception as e:
                pass

        all_issues.extend(page_issues)

    # Карточка пациента
    page.goto('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=f'{DIR}/patient-card.png')

    buttons = page.locator('button').all()
    for btn in buttons:
        if not btn.is_visible():
            continue
        try:
            text = (btn.text_content() or '').strip()[:40]
            box = btn.bounding_box()
            if not box or box['width'] < 5 or not text:
                continue

            styles = btn.evaluate("""el => {
                const s = window.getComputedStyle(el)
                return { borderRadius: s.borderRadius, backgroundColor: s.backgroundColor }
            }""")

            br = styles['borderRadius']
            is_pill = '9999' in br or '100' in br or '50' in br
            style_type = 'pill' if is_pill else f'other({br})'

            if not is_pill and len(text) > 1:
                all_issues.append({'text': text, 'borderRadius': br, 'style': style_type, 'page': 'patient-card', 'y': int(box['y'])})

            print(f'  [patient] [{style_type:6s}] {text:30s} br={br}')

        except:
            pass

    # Консультация
    start_btn = page.locator('button:has-text("Начать повторный")').first
    if start_btn.count() > 0 and start_btn.is_visible():
        start_btn.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(8000)

        if '/consultations/' in page.url:
            page.screenshot(path=f'{DIR}/consultation.png')
            buttons = page.locator('button').all()
            for btn in buttons:
                if not btn.is_visible():
                    continue
                try:
                    text = (btn.text_content() or '').strip()[:40]
                    box = btn.bounding_box()
                    if not box or box['width'] < 5 or not text:
                        continue

                    styles = btn.evaluate("""el => {
                        const s = window.getComputedStyle(el)
                        return { borderRadius: s.borderRadius, backgroundColor: s.backgroundColor }
                    }""")

                    br = styles['borderRadius']
                    is_pill = '9999' in br or '100' in br or '50' in br
                    style_type = 'pill' if is_pill else f'other({br})'

                    if not is_pill and len(text) > 1:
                        all_issues.append({'text': text, 'borderRadius': br, 'style': style_type, 'page': 'consultation', 'y': int(box['y'])})

                    print(f'  [consult] [{style_type:6s}] {text:30s} br={br}')
                except:
                    pass

    browser.close()

    # Итоги
    print(f'\n{"="*60}')
    print(f'КНОПКИ НЕ В СТИЛЕ PILL: {len(all_issues)}')
    print(f'{"="*60}')

    for issue in sorted(all_issues, key=lambda x: x['page']):
        print(f'  [{issue["page"]:15s}] {issue["text"]:30s} → {issue["borderRadius"]}')
