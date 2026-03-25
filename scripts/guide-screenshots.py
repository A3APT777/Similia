import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

CROPS = 'c:/projects/casebook/public/guide/crops'
SEQ = 'c:/projects/casebook/public/guide/sequences'
W, H = 1440, 900

os.makedirs(CROPS, exist_ok=True)
os.makedirs(SEQ, exist_ok=True)

def safe_clip(x, y, w, h):
    return {'x': max(0, x), 'y': max(0, y), 'width': min(w, W), 'height': min(h, H)}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': W, 'height': H})
    page = ctx.new_page()

    # === ЛЕНДИНГ ===
    page.goto('https://simillia.ru', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{CROPS}/01-landing-full.png')
    print('[OK] 01 Landing full')

    btn = page.locator('a:has-text("Начать")').first
    if btn.count() > 0:
        box = btn.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/01-landing-cta.png', clip=safe_clip(
                box['x'] - 40, box['y'] - 20, box['width'] + 80, box['height'] + 40
            ))
            print('[OK] 01 Landing CTA crop')

    # === РЕГИСТРАЦИЯ ===
    page.goto('https://simillia.ru/register', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{CROPS}/02-register-full.png')
    form = page.locator('form').first
    if form.count() > 0:
        box = form.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/02-register-form.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 30, box['width'] + 60, box['height'] + 60
            ))
            print('[OK] 02 Register form crop')

    # === ЛОГИН ===
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    # === ДАШБОРД ===
    page.screenshot(path=f'{CROPS}/03-dashboard-full.png')
    print('[OK] 03 Dashboard full')

    page.screenshot(path=f'{CROPS}/04-sidebar.png', clip={'x': 0, 'y': 0, 'width': 250, 'height': H})
    print('[OK] 04 Sidebar crop')

    # === ДОБАВИТЬ ПАЦИЕНТА — ПОСЛЕДОВАТЕЛЬНОСТЬ ===
    add_btn = page.locator('button:has-text("Добавить пациента")').first
    if add_btn.count() > 0:
        box = add_btn.bounding_box()
        if box:
            page.screenshot(path=f'{SEQ}/05-add-1-button.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 30, box['width'] + 60, box['height'] + 60
            ))
            print('[OK] 05 Add button crop')

            add_btn.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f'{SEQ}/05-add-2-dropdown.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 30, max(box['width'] + 60, 350), 350
            ))
            print('[OK] 05 Add dropdown crop')
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
    else:
        print('[SKIP] No add button found')

    # === ФОРМА ПАЦИЕНТА ===
    page.goto('https://simillia.ru/patients/new', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{CROPS}/06-patient-form.png')
    print('[OK] 06 Patient form')

    # === КАРТОЧКА ПАЦИЕНТА ===
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    patient_link = page.locator('a[href*="/patients/"][href*="-"]:not([href*="/new"])').first
    if patient_link.count() > 0:
        href = patient_link.get_attribute('href')

        pbox = patient_link.bounding_box()
        if pbox:
            page.screenshot(path=f'{SEQ}/07-patient-1-list.png', clip=safe_clip(
                pbox['x'] - 20, pbox['y'] - 10, pbox['width'] + 40, pbox['height'] + 20
            ))
            print('[OK] 07 Patient in list crop')

        page.goto(f'https://simillia.ru{href}', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)

        page.screenshot(path=f'{CROPS}/08-patient-card.png')
        print('[OK] 08 Patient card')

        page.screenshot(path=f'{CROPS}/08-patient-hero.png', clip={'x': 0, 'y': 0, 'width': W, 'height': 350})
        print('[OK] 08 Patient hero crop')

        page.evaluate('window.scrollTo(0, 800)')
        page.wait_for_timeout(500)
        page.screenshot(path=f'{CROPS}/10-patient-intakes.png')
        print('[OK] 10 Patient intakes')

        # === КОНСУЛЬТАЦИЯ ===
        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(300)
        start_btn = page.locator('button:has-text("Начать"), a:has-text("Начать")').first
        if start_btn.count() > 0 and start_btn.is_visible():
            start_btn.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(5000)

            page.screenshot(path=f'{CROPS}/11-consultation-full.png')
            print('[OK] 11 Consultation full')

            page.screenshot(path=f'{CROPS}/11-consultation-left.png', clip={'x': 0, 'y': 0, 'width': int(W * 0.6), 'height': H})
            print('[OK] 11 Consultation left crop')

            page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            page.wait_for_timeout(500)
            page.screenshot(path=f'{CROPS}/12-prescription.png', clip={'x': 0, 'y': 0, 'width': int(W * 0.6), 'height': H})
            print('[OK] 12 Prescription crop')

            page.evaluate('window.scrollTo(0, 0)')
            page.wait_for_timeout(300)

            rep_btn = page.locator('button:has-text("еперторий")').first
            if rep_btn.count() > 0:
                rbox = rep_btn.bounding_box()
                if rbox:
                    page.screenshot(path=f'{SEQ}/13-rep-1-button.png', clip=safe_clip(
                        rbox['x'] - 20, rbox['y'] - 10, rbox['width'] + 40, rbox['height'] + 20
                    ))
                    print('[OK] 13 Repertory button crop')

                rep_btn.click()
                page.wait_for_timeout(2000)

                page.screenshot(path=f'{SEQ}/13-rep-2-open.png', clip={'x': int(W * 0.55), 'y': 0, 'width': int(W * 0.45), 'height': H})
                print('[OK] 13 Mini repertory open crop')

                search = page.locator('input[placeholder*="мптом"], input[placeholder*="ymptom"]').last
                if search.count() > 0 and search.is_visible():
                    search.fill('headache left')
                    page.wait_for_timeout(2000)
                    page.screenshot(path=f'{SEQ}/13-rep-3-search.png', clip={'x': int(W * 0.55), 'y': 0, 'width': int(W * 0.45), 'height': H})
                    print('[OK] 13 Mini rep search crop')
        else:
            print('[SKIP] No start button')
    else:
        print('[SKIP] No patient link')

    # === ПОЛНЫЙ РЕПЕРТОРИЙ ===
    page.goto('https://simillia.ru/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{CROPS}/14-repertory-full.png')
    print('[OK] 14 Repertory full')

    search = page.locator('input[type="search"], input[placeholder*="оиск"]').first
    if search.count() > 0:
        search.fill('headache left')
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{CROPS}/14-repertory-results.png')
        print('[OK] 14 Repertory results')

    # === AI ===
    page.goto('https://simillia.ru/ai-consultation', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{CROPS}/15-ai-full.png')
    print('[OK] 15 AI consultation')

    # === НАСТРОЙКИ ===
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{CROPS}/16-settings.png', full_page=True)
    print('[OK] 16 Settings')

    # === РЕФЕРАЛЫ ===
    page.goto('https://simillia.ru/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{CROPS}/17-referral.png')
    print('[OK] 17 Referral')

    ref = page.locator('input[readonly]').first
    if ref.count() > 0:
        rbox = ref.bounding_box()
        if rbox:
            page.screenshot(path=f'{CROPS}/17-referral-link.png', clip=safe_clip(
                rbox['x'] - 30, rbox['y'] - 20, rbox['width'] + 60, rbox['height'] + 100
            ))
            print('[OK] 17 Referral link crop')

    # === ТАРИФЫ ===
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{CROPS}/18-pricing.png')
    print('[OK] 18 Pricing')

    browser.close()
    print('[DONE] All screenshots saved')
