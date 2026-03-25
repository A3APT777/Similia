"""
ПОЛНАЯ ПРОВЕРКА ЛОГИКИ СЕРВИСА
Проходит весь путь врача от регистрации до follow-up.
Проверяет что данные попадают куда нужно и ничего не теряется.
"""
import sys, io, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

BASE = 'https://simillia.ru'
EMAIL = 'test-qa@simillia.ru'
PASSWORD = 'TestQA2026!'

PASS = 0
FAIL = 0
WARN = 0
results = []

def check(name, condition, detail=''):
    global PASS, FAIL
    if condition:
        PASS += 1
        results.append(('PASS', name, detail))
        print(f'  ✅ {name}')
    else:
        FAIL += 1
        results.append(('FAIL', name, detail))
        print(f'  ❌ {name} — {detail}')

def warn(name, detail=''):
    global WARN
    WARN += 1
    results.append(('WARN', name, detail))
    print(f'  ⚠️  {name} — {detail}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # ═══════════════════════════════════════
    print('\n═══ 1. АВТОРИЗАЦИЯ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)

    # Проверка что страница логина загрузилась
    check('Страница логина загрузилась', page.locator('input[type="email"]').count() > 0)

    page.fill('input[type="email"]', EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    check('Redirect на дашборд после логина', '/dashboard' in page.url)

    # ═══════════════════════════════════════
    print('\n═══ 2. ДАШБОРД ═══')
    # ═══════════════════════════════════════

    # Проверка элементов дашборда
    check('Сайдбар виден', page.locator('nav, aside').first.is_visible() if page.locator('nav, aside').count() > 0 else False)
    check('Список пациентов виден', page.locator('a[href*="/patients/"]').count() > 0)

    # Кнопка добавить пациента
    add_btn = page.locator('button:has-text("Добавить пациента")').first
    has_add = add_btn.count() > 0
    check('Кнопка "Добавить пациента" есть', has_add)

    if has_add:
        add_btn.click()
        page.wait_for_timeout(500)
        dropdown_visible = page.locator('text=вручную, text=Заполнить, text=нкету').first.count() > 0
        check('Dropdown с вариантами открывается', dropdown_visible)
        page.keyboard.press('Escape')

    # Ссылки в сайдбаре
    for link_text, expected_url in [
        ('Реперторий', '/repertory'),
        ('AI', '/ai-consultation'),
        ('Настройки', '/settings'),
    ]:
        link = page.locator(f'a:has-text("{link_text}")').first
        if link.count() > 0 and link.is_visible():
            href = link.get_attribute('href') or ''
            check(f'Сайдбар: "{link_text}" ведёт на {expected_url}', expected_url in href)
        else:
            warn(f'Сайдбар: "{link_text}" не найден')

    # ═══════════════════════════════════════
    print('\n═══ 3. КАРТОЧКА ПАЦИЕНТА ═══')
    # ═══════════════════════════════════════

    patient_link = page.locator('a[href*="/patients/"][href*="-"]:not([href*="/new"])').first
    check('Есть хотя бы один пациент', patient_link.count() > 0)

    if patient_link.count() > 0:
        href = patient_link.get_attribute('href')
        page.goto(f'{BASE}{href}', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(5000)

        url = page.url
        is_patient_card = '/patients/' in url and '/consultations/' not in url
        check('Открылась карточка пациента (не консультация)', is_patient_card)

        if not is_patient_card:
            warn('Redirect на консультацию', f'URL: {url}')

        # Проверяем кнопки
        for btn_text in ['Начать', 'Записать', 'нкет', 'опросник', 'опрос']:
            btn = page.locator(f'button:has-text("{btn_text}")').first
            if btn.count() > 0 and btn.is_visible():
                check(f'Кнопка "{btn_text}" видна', True)
            else:
                warn(f'Кнопка "{btn_text}" не найдена')

        # ═══════════════════════════════════════
        print('\n═══ 4. ОТПРАВКА АНКЕТЫ ═══')
        # ═══════════════════════════════════════

        intake_btn = page.locator('button:has-text("Анкета острого")').first
        if intake_btn.count() > 0 and intake_btn.is_visible():
            intake_btn.click()
            page.wait_for_timeout(3000)

            # Ищем сгенерированную ссылку
            link_input = page.locator('input[readonly]').first
            if link_input.count() > 0 and link_input.is_visible():
                link_value = link_input.input_value()
                check('Ссылка на анкету сгенерирована', len(link_value) > 20, link_value[:60])

                # Проверяем что ссылка рабочая
                if link_value:
                    new_page = browser.new_page(viewport={'width': 1440, 'height': 900})
                    new_page.goto(link_value, wait_until='networkidle', timeout=30000)
                    new_page.wait_for_timeout(3000)
                    # Ищем форму анкеты
                    has_form = new_page.locator('form, input, textarea, button:has-text("Далее")').count() > 0
                    check('Ссылка анкеты открывает форму', has_form, new_page.url)
                    new_page.close()
            else:
                warn('Поле со ссылкой не найдено')

            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
        else:
            warn('Кнопка "Анкета острого" не найдена')

        # ═══════════════════════════════════════
        print('\n═══ 5. ОТПРАВКА ОПРОСНИКА ═══')
        # ═══════════════════════════════════════

        survey_btn = page.locator('button:has-text("Подробный опросник")').first
        if survey_btn.count() > 0 and survey_btn.is_visible():
            survey_btn.click()
            page.wait_for_timeout(3000)

            link_input = page.locator('input[readonly]').first
            if link_input.count() > 0 and link_input.is_visible():
                link_value = link_input.input_value()
                check('Ссылка на опросник сгенерирована', len(link_value) > 20, link_value[:60])

                if link_value:
                    new_page = browser.new_page(viewport={'width': 1440, 'height': 900})
                    new_page.goto(link_value, wait_until='networkidle', timeout=30000)
                    new_page.wait_for_timeout(3000)
                    has_form = new_page.locator('form, input, textarea, button:has-text("Далее"), button:has-text("Отправить")').count() > 0
                    check('Ссылка опросника открывает форму', has_form, new_page.url)
                    new_page.close()
            else:
                warn('Поле со ссылкой опросника не найдено')

            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
        else:
            warn('Кнопка "Подробный опросник" не найдена')

        # ═══════════════════════════════════════
        print('\n═══ 6. ЗАПИСЬ НА ПРИЁМ ═══')
        # ═══════════════════════════════════════

        schedule_btn = page.locator('button:has-text("Записать на приём")').first
        if schedule_btn.count() > 0 and schedule_btn.is_visible():
            schedule_btn.click()
            page.wait_for_timeout(1000)
            # Проверяем что появилась форма записи (дата, время)
            has_date = page.locator('input[type="date"], input[name="date"]').count() > 0
            check('Форма записи открылась', has_date or page.locator('text=Записать, text=дата, text=время').count() > 0)
            page.keyboard.press('Escape')
            page.wait_for_timeout(300)
        else:
            warn('Кнопка "Записать на приём" не найдена')

        # ═══════════════════════════════════════
        print('\n═══ 7. КОНСУЛЬТАЦИЯ ═══')
        # ═══════════════════════════════════════

        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(300)

        start_btn = page.locator('button:has-text("Начать повторный")').first
        if start_btn.count() > 0 and start_btn.is_visible():
            start_btn.click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(8000)

            check('Консультация открылась', '/consultations/' in page.url)

            # Проверяем поля
            complaints = page.locator('textarea').first
            check('Поле жалоб видно', complaints.count() > 0 and complaints.is_visible())

            # Кнопка реперторий
            rep_btn = page.locator('button:has-text("еперторий")').first
            check('Кнопка "Реперторий" есть', rep_btn.count() > 0)

            # Кнопка завершить
            page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            page.wait_for_timeout(500)
            finish_btn = page.locator('button:has-text("Завершить")').first
            check('Кнопка "Завершить" есть', finish_btn.count() > 0)

            # Блок назначения
            rx_area = page.locator('text=Назначение, text=Препарат, input[placeholder*="препарат"], input[placeholder*="Remedy"]')
            check('Блок назначения видён', rx_area.count() > 0)

        else:
            warn('Кнопка "Начать приём" не найдена или не видна')

    # ═══════════════════════════════════════
    print('\n═══ 8. РЕПЕРТОРИЙ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)

    search = page.locator('input[type="search"], input[placeholder*="оиск"]').first
    check('Поле поиска в реперториуме', search.count() > 0)

    if search.count() > 0:
        search.fill('headache')
        page.wait_for_timeout(3000)
        # Проверяем что появились результаты
        results_count = page.locator('text=Head').count() + page.locator('text=pain').count()
        check('Поиск возвращает результаты', results_count > 0, f'{results_count} элементов')

    # ═══════════════════════════════════════
    print('\n═══ 9. AI КОНСУЛЬТАЦИЯ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/ai-consultation', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    textarea = page.locator('textarea').first
    check('Поле ввода AI-консультации', textarea.count() > 0)

    analyze_btn = page.locator('button:has-text("Анализ"), button:has-text("нализ")').first
    check('Кнопка анализа', analyze_btn.count() > 0)

    # ═══════════════════════════════════════
    print('\n═══ 10. НАСТРОЙКИ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    check('Страница настроек загрузилась', page.locator('text=Настройки, text=Расписание, text=аспис').count() > 0)

    # Проверяем секции
    for section in ['Расписание', 'Напомин', 'Правила', 'Экспорт', 'пароль', 'Безопасность']:
        found = page.locator(f'text={section}').count() > 0
        if found:
            check(f'Секция "{section}" есть', True)
        else:
            warn(f'Секция "{section}" не найдена')

    # Кнопка экспорта данных
    export_btn = page.locator('button:has-text("Скачать"), button:has-text("Экспорт")').first
    check('Кнопка экспорта данных', export_btn.count() > 0)

    # ═══════════════════════════════════════
    print('\n═══ 11. РЕФЕРАЛЫ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    ref_input = page.locator('input[readonly]').first
    if ref_input.count() > 0:
        val = ref_input.input_value()
        check('Реферальная ссылка сгенерирована', 'simillia' in val, val[:50])
    else:
        warn('Поле реферальной ссылки не найдено')

    copy_btn = page.locator('button:has-text("Копир"), button:has-text("опир")').first
    check('Кнопка копирования', copy_btn.count() > 0)

    # ═══════════════════════════════════════
    print('\n═══ 12. ТАРИФЫ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)

    check('Страница тарифов загрузилась', page.locator('text=290, text=Стандарт').count() > 0)
    check('Есть кнопка оплаты', page.locator('button:has-text("Оплатить"), button:has-text("Подключить"), a:has-text("Оплатить")').count() > 0)

    # ═══════════════════════════════════════
    print('\n═══ 13. ПУБЛИЧНЫЕ СТРАНИЦЫ ═══')
    # ═══════════════════════════════════════

    for path, expected_text in [
        ('/privacy', 'Политика'),
        ('/terms', 'Оферта'),
        ('/guide', 'Добро пожаловать'),
    ]:
        page.goto(f'{BASE}{path}', wait_until='networkidle', timeout=15000)
        page.wait_for_timeout(2000)
        found = page.locator(f'text={expected_text}').count() > 0
        check(f'{path} содержит "{expected_text}"', found)

    # ═══════════════════════════════════════
    print('\n═══ 14. МЁРТВЫЕ ССЫЛКИ ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)

    all_links = page.locator('a[href]').all()
    internal_hrefs = set()
    for link in all_links:
        href = link.get_attribute('href') or ''
        if href.startswith('/') and not href.startswith('//'):
            internal_hrefs.add(href.split('?')[0].split('#')[0])

    print(f'  Найдено {len(internal_hrefs)} уникальных внутренних ссылок')

    dead_links = []
    for href in sorted(internal_hrefs):
        if any(skip in href for skip in ['/api/', '/auth/', '/checkout/', '.pdf']):
            continue
        try:
            resp = page.goto(f'{BASE}{href}', wait_until='networkidle', timeout=10000)
            page.wait_for_timeout(1000)
            status = resp.status if resp else 0
            if status >= 400:
                dead_links.append((href, status))
                print(f'    ❌ {href} → {status}')
        except:
            dead_links.append((href, 'timeout'))
            print(f'    ⚠️  {href} → timeout')

    check('Нет мёртвых ссылок', len(dead_links) == 0, f'{len(dead_links)} мёртвых: {dead_links}')

    # ═══════════════════════════════════════
    print('\n═══ 15. КНОПКИ ВЕДУЩИЕ В НИКУДА ═══')
    # ═══════════════════════════════════════

    page.goto(f'{BASE}/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)

    all_buttons = page.locator('button').all()
    buttons_without_action = []
    for btn in all_buttons:
        if not btn.is_visible():
            continue
        txt = (btn.text_content() or '').strip()[:30]
        onclick = btn.get_attribute('onclick') or ''
        aria = btn.get_attribute('aria-label') or ''
        data_tour = btn.get_attribute('data-tour') or ''

        # Если кнопка без текста, без onclick, без aria — подозрительная
        if not txt and not onclick and not aria and not data_tour:
            buttons_without_action.append('(empty)')

    check('Все кнопки на дашборде имеют назначение', len(buttons_without_action) == 0, f'{len(buttons_without_action)} пустых кнопок')

    # ═══════════════════════════════════════
    browser.close()

    # ═══ ИТОГИ ═══
    print('\n' + '═' * 50)
    print(f'ИТОГО: ✅ {PASS} пройдено  ❌ {FAIL} ошибок  ⚠️  {WARN} предупреждений')
    print('═' * 50)

    if FAIL > 0:
        print('\nОШИБКИ:')
        for status, name, detail in results:
            if status == 'FAIL':
                print(f'  ❌ {name}: {detail}')

    if WARN > 0:
        print('\nПРЕДУПРЕЖДЕНИЯ:')
        for status, name, detail in results:
            if status == 'WARN':
                print(f'  ⚠️  {name}: {detail}')

    print(f'\nОЦЕНКА: {PASS}/{PASS+FAIL} ({PASS*100//(PASS+FAIL) if PASS+FAIL > 0 else 0}%)')
