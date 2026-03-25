"""
Снимаем ВСЕ скриншоты для /guide за один проход.
Один аккаунт, один пациент, один сценарий.
Каждый скриншот = то о чём текст.
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

DIR = 'c:/projects/casebook/public/guide/final'
os.makedirs(DIR, exist_ok=True)

W, H = 1440, 900

def crop(page, path, x, y, w, h):
    page.screenshot(path=path, clip={
        'x': max(0, int(x)), 'y': max(0, int(y)),
        'width': min(int(w), W), 'height': min(int(h), H)
    })

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': W, 'height': H})

    # ═══ 1. ЛЕНДИНГ ═══
    page.goto('https://simillia.ru', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/01-landing.png')
    print('[OK] 01 Лендинг')

    # Кроп CTA кнопки
    btn = page.locator('a:has-text("Начать")').first
    if btn.count() > 0:
        b = btn.bounding_box()
        if b: crop(page, f'{DIR}/01-cta.png', b['x']-40, b['y']-20, b['width']+80, b['height']+40)
        print('[OK] 01 CTA кроп')

    # ═══ 2. РЕГИСТРАЦИЯ ═══
    page.goto('https://simillia.ru/register', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/02-register.png')
    print('[OK] 02 Регистрация')

    form = page.locator('form').first
    if form.count() > 0:
        b = form.bounding_box()
        if b: crop(page, f'{DIR}/02-form.png', b['x']-20, b['y']-20, b['width']+40, b['height']+40)
        print('[OK] 02 Форма кроп')

    # ═══ 3. ЛОГИН и ДАШБОРД ═══
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'test-qa@simillia.ru')
    page.fill('input[type="password"]', 'TestQA2026!')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    page.screenshot(path=f'{DIR}/03-dashboard.png')
    print('[OK] 03 Дашборд')

    # Кроп сайдбара
    crop(page, f'{DIR}/04-sidebar.png', 0, 0, 250, H)
    print('[OK] 04 Сайдбар кроп')

    # ═══ 5. КНОПКА ДОБАВИТЬ ═══
    add_btn = page.locator('button:has-text("Добавить пациента")').first
    if add_btn.count() > 0:
        b = add_btn.bounding_box()
        if b: crop(page, f'{DIR}/05-add-btn.png', b['x']-20, b['y']-15, b['width']+40, b['height']+30)
        print('[OK] 05 Кнопка добавить кроп')

        add_btn.click()
        page.wait_for_timeout(500)
        if b: crop(page, f'{DIR}/05-add-dropdown.png', b['x']-20, b['y']-15, max(b['width']+40, 350), 300)
        print('[OK] 05 Dropdown кроп')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)

    # ═══ 6. ФОРМА ПАЦИЕНТА ═══
    page.goto('https://simillia.ru/patients/new', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/06-patient-form.png')
    print('[OK] 06 Форма пациента')

    # ═══ 7-12. КАРТОЧКА ПАЦИЕНТА ═══
    page.goto('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(4000)

    # Проверяем что мы на карточке, а не в консультации
    url = page.url
    print(f'URL: {url}')

    if '/consultations/' in url:
        # Мы в консультации — нужно вернуться на карточку
        page.goto('https://simillia.ru/patients/aaaa0001-0000-0000-0000-000000000001', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)
        url = page.url
        print(f'URL after redirect: {url}')

    page.screenshot(path=f'{DIR}/08-patient-card.png')
    print('[OK] 08 Карточка пациента')

    # Кроп верхней части (hero + кнопка Начать)
    crop(page, f'{DIR}/08-hero.png', 0, 0, W*0.75, 300)
    print('[OK] 08 Hero кроп')

    # Кроп кнопок действий
    # Найти все кнопки и их позиции
    buttons_info = []
    for btn_text in ['Начать', 'Записать', 'нкет', 'опросник', 'опрос']:
        btn = page.locator(f'button:has-text("{btn_text}")').first
        if btn.count() > 0 and btn.is_visible():
            b = btn.bounding_box()
            if b:
                buttons_info.append((btn_text, b))

    if buttons_info:
        # Найти область всех кнопок
        min_y = min(b['y'] for _, b in buttons_info)
        max_y = max(b['y'] + b['height'] for _, b in buttons_info)
        crop(page, f'{DIR}/09-actions.png', 0, min_y - 30, W*0.75, max_y - min_y + 60)
        print(f'[OK] 09 Actions кроп (y: {int(min_y)}-{int(max_y)})')

    # Каждая кнопка отдельно
    for btn_text in ['Начать повторный', 'Записать на приём', 'Анкета острого', 'Подробный опросник', 'Быстрый опрос']:
        btn = page.locator(f'button:has-text("{btn_text}")').first
        if btn.count() > 0 and btn.is_visible():
            b = btn.bounding_box()
            if b:
                safe_name = btn_text.replace(' ', '-').lower()[:20]
                crop(page, f'{DIR}/btn-{safe_name}.png', b['x']-15, b['y']-8, b['width']+30, b['height']+16)
                print(f'[OK] btn-{safe_name} кроп')

    # Клик на "Записать на приём" → показать форму
    schedule_btn = page.locator('button:has-text("Записать на приём")').first
    if schedule_btn.count() > 0 and schedule_btn.is_visible():
        schedule_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f'{DIR}/10-schedule-form.png')
        print('[OK] 10 Форма записи')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)

    # Клик на "Анкета острого случая" → показать ссылку
    intake_btn = page.locator('button:has-text("Анкета острого")').first
    if intake_btn.count() > 0 and intake_btn.is_visible():
        intake_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{DIR}/07-intake-link.png')
        print('[OK] 07 Ссылка на анкету')

        # Кроп поля с ссылкой
        link_input = page.locator('input[readonly]').first
        if link_input.count() > 0 and link_input.is_visible():
            b = link_input.bounding_box()
            if b: crop(page, f'{DIR}/07-intake-link-crop.png', b['x']-20, b['y']-15, b['width']+40, b['height']+50)
            print('[OK] 07 Ссылка кроп')

        page.keyboard.press('Escape')
        page.wait_for_timeout(300)

    # Клик на "Подробный опросник" → показать ссылку
    survey_btn = page.locator('button:has-text("Подробный опросник")').first
    if survey_btn.count() > 0 and survey_btn.is_visible():
        survey_btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{DIR}/12-survey-link.png')
        print('[OK] 12 Ссылка на опросник')
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)

    # Скролл к анкетам
    page.evaluate('window.scrollTo(0, 600)')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{DIR}/11-intakes-section.png')
    print('[OK] 11 Секция анкет')

    # ═══ 13-15. КОНСУЛЬТАЦИЯ ═══
    # Начать новый приём
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)
    start_btn = page.locator('button:has-text("Начать повторный")').first
    if start_btn.count() > 0 and start_btn.is_visible():
        start_btn.click()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(5000)

        page.screenshot(path=f'{DIR}/13-consultation.png')
        print('[OK] 13 Консультация')

        # Кроп левой части (жалобы)
        crop(page, f'{DIR}/14-complaints.png', 0, 0, W*0.6, H)
        print('[OK] 14 Жалобы кроп')

        # Кроп правой части (контекст)
        crop(page, f'{DIR}/14-right-panel.png', W*0.6, 0, W*0.4, H)
        print('[OK] 14 Правая панель кроп')

        # Кнопка реперторий
        rep_btn = page.locator('button:has-text("еперторий")').first
        if rep_btn.count() > 0:
            b = rep_btn.bounding_box()
            if b: crop(page, f'{DIR}/15-rep-btn.png', b['x']-15, b['y']-8, b['width']+30, b['height']+16)
            print('[OK] 15 Кнопка Реперторий кроп')

            rep_btn.click()
            page.wait_for_timeout(2000)
            page.screenshot(path=f'{DIR}/15-mini-rep.png')
            print('[OK] 15 Мини-реперторий')

            # Кроп мини-реперториума
            crop(page, f'{DIR}/15-mini-rep-crop.png', W*0.55, 0, W*0.45, H)
            print('[OK] 15 Мини-реп кроп')

        # Скролл к назначению
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        page.wait_for_timeout(500)
        crop(page, f'{DIR}/16-prescription.png', 0, 0, W*0.6, H)
        print('[OK] 16 Назначение')

        # Кнопка завершить
        finish_btn = page.locator('button:has-text("Завершить")').first
        if finish_btn.count() > 0:
            b = finish_btn.bounding_box()
            if b: crop(page, f'{DIR}/16-finish-btn.png', b['x']-15, b['y']-8, b['width']+30, b['height']+16)
            print('[OK] 16 Кнопка Завершить кроп')

    # ═══ 17. ПОЛНЫЙ РЕПЕРТОРИЙ ═══
    page.goto('https://simillia.ru/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/17-repertory.png')
    print('[OK] 17 Реперторий')

    # Поиск
    search = page.locator('input[type="search"], input[placeholder*="оиск"]').first
    if search.count() > 0:
        search.fill('headache left')
        page.wait_for_timeout(2000)
        page.screenshot(path=f'{DIR}/17-repertory-results.png')
        print('[OK] 17 Результаты поиска')

    # ═══ 18. AI КОНСУЛЬТАЦИЯ ═══
    page.goto('https://simillia.ru/ai-consultation', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/18-ai.png')
    print('[OK] 18 AI консультация')

    # ═══ 19. НАСТРОЙКИ ═══
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/19-settings.png', full_page=True)
    print('[OK] 19 Настройки')

    # ═══ 20. РЕФЕРАЛЫ ═══
    page.goto('https://simillia.ru/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/20-referral.png')
    print('[OK] 20 Рефералы')

    ref = page.locator('input[readonly]').first
    if ref.count() > 0:
        b = ref.bounding_box()
        if b: crop(page, f'{DIR}/20-ref-link.png', b['x']-20, b['y']-15, b['width']+40, b['height']+60)
        print('[OK] 20 Реф ссылка кроп')

    # ═══ 21. ТАРИФЫ ═══
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/21-pricing.png')
    print('[OK] 21 Тарифы')

    browser.close()
    print(f'\n[DONE] Все скриншоты в {DIR}')
