import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

CROPS = 'c:/projects/casebook/public/guide/crops'
SEQ = 'c:/projects/casebook/public/guide/sequences'
W, H = 1440, 900

def safe_clip(x, y, w, h):
    return {'x': max(0, int(x)), 'y': max(0, int(y)), 'width': min(int(w), W), 'height': min(int(h), H)}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': W, 'height': H})

    # Логин
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    # === Найти пациента ===
    patient_link = page.locator('a[href*="/patients/"][href*="-"]:not([href*="/new"])').first
    if patient_link.count() == 0:
        print('[ERROR] No patient found')
        browser.close()
        sys.exit(1)

    href = patient_link.get_attribute('href')
    page.goto(f'https://simillia.ru{href}', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    # 1. Кнопки действий — кроп области с кнопками (верхняя часть карточки)
    page.screenshot(path=f'{CROPS}/09-actions-area.png', clip=safe_clip(0, 0, W * 0.75, 500))
    print('[OK] 09 Actions area (top of patient card)')

    # 2. Кнопка "Отправить анкету" / IntakeLinkButton — найти и кропнуть
    intake_btn = page.locator('button:has-text("нкет"), button:has-text("Первичн"), [data-tour="intake-link"]').first
    if intake_btn.count() > 0 and intake_btn.is_visible():
        # Кликнуть чтобы увидеть сгенерированную ссылку
        intake_btn.click()
        page.wait_for_timeout(2000)

        # Скриншот с появившейся ссылкой
        page.screenshot(path=f'{CROPS}/07-intake-link-generated.png', clip=safe_clip(0, 0, W * 0.75, 600))
        print('[OK] 07 Intake link generated')

        # Найти поле со ссылкой
        link_input = page.locator('input[readonly], input[value*="simillia"], input[value*="intake"]').first
        if link_input.count() > 0:
            box = link_input.bounding_box()
            if box:
                page.screenshot(path=f'{CROPS}/07-intake-link-crop.png', clip=safe_clip(
                    box['x'] - 30, box['y'] - 30, box['width'] + 60, box['height'] + 80
                ))
                print('[OK] 07 Intake link crop')

        # Закрыть
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
    else:
        print('[SKIP] No intake button found, trying other selectors')
        # Попробовать через dropdown
        all_btns = page.locator('button').all()
        for b in all_btns:
            txt = b.text_content() or ''
            if 'нкет' in txt.lower() or 'первичн' in txt.lower() or 'опросник' in txt.lower():
                print(f'  Found button: "{txt}"')

    # 3. Кнопка "Подробный опросник" — кроп
    survey_btn = page.locator('button:has-text("опросник"), button:has-text("Подробн")').first
    if survey_btn.count() > 0 and survey_btn.is_visible():
        box = survey_btn.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/12-survey-button.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 20, box['width'] + 60, box['height'] + 40
            ))
            print('[OK] 12 Survey button crop')

        survey_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{CROPS}/12-survey-link.png', clip=safe_clip(0, 0, W * 0.75, 600))
        print('[OK] 12 Survey link generated')
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
    else:
        print('[SKIP] No survey button')

    # 4. Кнопка "Самочувствие" — кроп
    followup_btn = page.locator('button:has-text("амочувств"), button:has-text("Быстрый")').first
    if followup_btn.count() > 0 and followup_btn.is_visible():
        box = followup_btn.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/13-followup-button.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 20, box['width'] + 60, box['height'] + 40
            ))
            print('[OK] 13 Followup button crop')
    else:
        print('[SKIP] No followup button')

    # 5. Кнопка "Записать на приём" — кроп
    schedule_btn = page.locator('button:has-text("аписать"), button:has-text("Запись"), [data-tour="schedule-btn"]').first
    if schedule_btn.count() > 0 and schedule_btn.is_visible():
        box = schedule_btn.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/10-schedule-button.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 20, box['width'] + 300, box['height'] + 100
            ))
            print('[OK] 10 Schedule button crop')

        schedule_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f'{CROPS}/10-schedule-form.png', clip=safe_clip(0, 0, W * 0.75, 500))
        print('[OK] 10 Schedule form')
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
    else:
        print('[SKIP] No schedule button')

    # 6. Кнопка "Начать приём" — кроп
    start_btn = page.locator('button:has-text("Начать"), a:has-text("Начать повт")').first
    if start_btn.count() > 0 and start_btn.is_visible():
        box = start_btn.bounding_box()
        if box:
            page.screenshot(path=f'{CROPS}/11-start-btn.png', clip=safe_clip(
                box['x'] - 30, box['y'] - 15, box['width'] + 60, box['height'] + 30
            ))
            print('[OK] 11 Start consultation button crop')

    # 7. Анкеты на карточке — скролл вниз
    page.evaluate('window.scrollTo(0, 600)')
    page.wait_for_timeout(500)

    # Найти секцию анкет
    intakes_section = page.locator('text=АНКЕТЫ, text=Анкеты').first
    if intakes_section.count() > 0:
        ibox = intakes_section.bounding_box()
        if ibox:
            page.screenshot(path=f'{CROPS}/10-intakes-section.png', clip=safe_clip(
                0, ibox['y'] - 20, W * 0.75, 400
            ))
            print('[OK] 10 Intakes section crop')

    # 8. Назначение — скриншот блока rx
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)

    # Найти текущее лечение
    treatment = page.locator('text=ТЕКУЩЕЕ ЛЕЧЕНИЕ, text=Текущее лечение, text=Назначение').first
    if treatment.count() > 0:
        tbox = treatment.bounding_box()
        if tbox:
            page.screenshot(path=f'{CROPS}/11-current-treatment.png', clip=safe_clip(
                0, tbox['y'] - 20, W * 0.75, 200
            ))
            print('[OK] 11 Current treatment crop')

    # 9. Полный скролл карточки
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    page.screenshot(path=f'{CROPS}/08-patient-card-full.png', full_page=True)
    print('[OK] 08 Patient card full page')

    browser.close()
    print('[DONE]')
