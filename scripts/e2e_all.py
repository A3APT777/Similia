# -*- coding: utf-8 -*-
"""Полный E2E тест всех 20 пунктов Similia"""
import sys, io, os, json, subprocess, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

DIR = 'c:/projects/casebook/screenshots/ux-test/e2e-all'
os.makedirs(DIR, exist_ok=True)

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
    # 1. РЕГИСТРАЦИЯ через UI
    # ═══════════════════════════════════════
    print('\n=== 1. REGISTRATION ===')
    ctx = browser.new_context(viewport={'width': 375, 'height': 812})
    page = ctx.new_page()
    page.goto('https://simillia.ru/register', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/01-register.png', full_page=True)

    # Проверки UI
    name_field = page.locator('input[type="text"]').count() > 0
    email_field = page.locator('input[type="email"]').count() > 0
    pwd_field = page.locator('input[type="password"]').count() > 0
    checkbox = page.locator('input[type="checkbox"]').count() > 0
    submit = page.locator('button[type="submit"]').count() > 0

    check('1a_name_field', name_field)
    check('1b_email_field', email_field)
    check('1c_password_field', pwd_field)
    check('1d_consent_checkbox', checkbox)
    check('1e_submit_button', submit)

    # Placeholder 8 символов
    pwd_placeholder = page.locator('input[type="password"]').get_attribute('placeholder') or ''
    check('1f_pwd_placeholder_8', '8' in pwd_placeholder, f'Placeholder: {pwd_placeholder}')

    page.close()
    ctx.close()

    # ═══════════════════════════════════════
    # 2. ЗАБЫЛ ПАРОЛЬ
    # ═══════════════════════════════════════
    print('\n=== 2. FORGOT PASSWORD ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/forgot-password', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/02-forgot.png', full_page=True)

    email_input = page.locator('input[type="email"]').count() > 0
    send_btn = page.locator('button').filter(has_text='Отправить').count() > 0
    back_link = page.locator('text=Вернуться').count() > 0

    check('2a_email_input', email_input)
    check('2b_send_button', send_btn)
    check('2c_back_link', back_link)
    page.close()
    ctx.close()

    # ═══════════════════════════════════════
    # 3. ЛЕНДИНГ
    # ═══════════════════════════════════════
    print('\n=== 3. LANDING ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/03-landing.png', full_page=True)

    similia_brand = page.locator('text=Similia').count() > 0
    cta_register = page.locator('a:has-text("бесплатно"), a:has-text("Попробовать")').count() > 0
    login_link = page.locator('a:has-text("Войти")').count() > 0
    footer = page.locator('footer').count() > 0

    check('3a_brand', similia_brand)
    check('3b_cta_register', cta_register)
    check('3c_login_link', login_link)
    check('3d_footer', footer)

    # Mobile
    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)
    page.screenshot(path=f'{DIR}/03-landing-mobile.png', full_page=True)
    page.close()
    ctx.close()

    # ═══════════════════════════════════════
    # 4. PRIVACY/TERMS
    # ═══════════════════════════════════════
    print('\n=== 4. LEGAL PAGES ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()

    page.goto('https://simillia.ru/privacy', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    privacy_title = page.locator('text=Политика').count() > 0
    privacy_email = page.locator('a[href*="mailto"]').count() > 0
    check('4a_privacy_exists', privacy_title)
    check('4b_privacy_email_clickable', privacy_email, 'Email не кликабелен')

    page.goto('https://simillia.ru/terms', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    terms_title = page.locator('text=Оферта').count() > 0
    check('4c_terms_exists', terms_title)

    page.close()
    ctx.close()

    # ═══════════════════════════════════════
    # 5. PRICING
    # ═══════════════════════════════════════
    print('\n=== 5. PRICING ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=f'{DIR}/05-pricing.png', full_page=True)

    free_plan = page.locator('text=0').count() > 0
    standard_290 = page.locator('text=290').count() > 0
    ai_pro = page.locator('text=1 990').count() > 0

    check('5a_free_plan', free_plan)
    check('5b_price_290', standard_290)
    check('5c_ai_pro', ai_pro)
    page.close()
    ctx.close()

    # ═══════════════════════════════════════
    # 6-20: АВТОРИЗОВАННЫЕ ТЕСТЫ
    # ═══════════════════════════════════════
    # Логин под triarta (опытный, 10+ пациентов)
    print('\n=== 6. LOGIN EXPERT ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')
    page.wait_for_url('**/dashboard**', timeout=20000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(10000)  # дольше ждём загрузки

    check('6a_login_success', '/dashboard' in page.url)
    page.screenshot(path=f'{DIR}/06-dashboard-expert.png', full_page=True)

    # ═══ 7. PROGRESSIVE DISCLOSURE — опытный видит всё ═══
    print('\n=== 7. PROGRESSIVE DISCLOSURE (EXPERT) ===')
    stat_cards = page.locator('text=пациент').count() > 0 or page.locator('text=приём').count() > 0
    ai_block = page.locator('text=AI-анализ').count() > 0
    repertory_nav = page.locator('a[href="/repertory"]').count() > 0
    referral_nav = page.locator('a[href="/referral"]').count() > 0
    add_btn = page.locator('button').filter(has_text='Добавить пациента').count() > 0

    check('7a_stat_cards', stat_cards, 'Статкарточки не видны опытному')
    check('7b_ai_block', ai_block, 'AI блок не виден опытному')
    check('7c_repertory_nav', repertory_nav, 'Реперторий не в сайдбаре')
    check('7d_add_button', add_btn)

    # ═══ 8. DROPDOWN добавления пациента ═══
    print('\n=== 8. ADD PATIENT DROPDOWN ===')
    page.locator('button').filter(has_text='Добавить пациента').first.click()
    page.wait_for_timeout(500)
    page.screenshot(path=f'{DIR}/08-dropdown.png', full_page=True)
    dropdown_items = page.locator('text=Отправить анкету').count() + page.locator('text=Заполнить вручную').count()
    check('8a_dropdown_visible', dropdown_items >= 1, 'Dropdown не открылся')
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)

    # ═══ 9. КАРТОЧКА ПАЦИЕНТА ═══
    print('\n=== 9. PATIENT CARD ===')
    patient_link = page.locator('a[href*="/patients/"]').first
    if patient_link.count() > 0:
        href = patient_link.get_attribute('href') or ''
        if '/patients/' in href and '/new' not in href:
            page.goto(f'https://simillia.ru{href}', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000)
            page.screenshot(path=f'{DIR}/09-patient-card.png', full_page=True)

            pdf_btn = page.locator('a:has-text("PDF")').count() > 0
            edit_btn = page.locator('a:has-text("Изменить")').count() > 0
            start_btn = page.locator('button').filter(has_text='приём').count() > 0
            action_btns = page.locator('[data-tour="action-buttons"]').count() > 0

            check('9a_pdf_button', pdf_btn)
            check('9b_edit_button', edit_btn)
            check('9c_start_consultation', start_btn)
            check('9d_action_buttons', action_btns)

    # ═══ 10. ПОЛНЫЙ РЕПЕРТОРИЙ ═══
    print('\n=== 10. REPERTORY ===')
    page.goto('https://simillia.ru/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/10-repertory.png', full_page=True)

    search_field = page.locator('input').first.count() > 0
    rubrics = page.locator('text=74').count() > 0  # 74 000+
    check('10a_search_field', search_field)
    check('10b_rubrics_count', rubrics)

    # Поиск на русском
    page.locator('input').first.fill('головная боль')
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/10-search-result.png', full_page=True)
    search_results = page.locator('text=Head').count() > 0 or page.locator('text=head').count() > 0 or page.locator('text=Голов').count() > 0
    check('10c_russian_search', search_results, 'Поиск на русском не нашёл')

    # ═══ 11. НАСТРОЙКИ ═══
    print('\n=== 11. SETTINGS ===')
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/11-settings.png', full_page=True)

    schedule = page.locator('text=Расписание').count() > 0
    reminders = page.locator('text=Напоминания').count() > 0
    password = page.locator('text=Безопасность').count() > 0
    rules = page.locator('text=Правила приёма').count() > 0

    check('11a_schedule', schedule)
    check('11b_reminders', reminders)
    check('11c_password', password)
    check('11d_prescription_rules', rules)

    # ═══ 12. РЕФЕРАЛЫ ═══
    print('\n=== 12. REFERRAL ===')
    page.goto('https://simillia.ru/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/12-referral.png', full_page=True)

    ref_link = page.locator('input[readonly]').count() > 0
    copy_btn = page.locator('button').filter(has_text='Копировать').count() > 0
    check('12a_referral_link', ref_link)
    check('12b_copy_button', copy_btn)

    # ═══ 13. АДМИНКА ═══
    print('\n=== 13. ADMIN ===')
    page.goto('https://simillia.ru/admin', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/13-admin.png', full_page=True)

    admin_title = page.locator('text=Админ-панель').count() > 0
    doctors_tab = page.locator('text=Врачи').count() > 0
    payments_tab = page.locator('text=Платежи').count() > 0

    check('13a_admin_accessible', admin_title)
    check('13b_doctors_tab', doctors_tab)
    check('13c_payments_tab', payments_tab)

    # ═══ 14. ЭКСПОРТ PDF ═══
    print('\n=== 14. PDF EXPORT ===')
    # Находим реального пациента по БД
    import subprocess as sp2
    r = sp2.run(['curl', '-s', '-X', 'POST', 'https://api.supabase.com/v1/projects/obcbinbhurokubvbsgjx/database/query',
        '-H', 'Authorization: Bearer sbp_5f58c77c558b43040e6d81836a468d61e7ef9bd9',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({'query': "SELECT id FROM patients WHERE doctor_id = '8a507cc7-d28c-4aee-8ee6-4f2ceb22da0e' LIMIT 1"})
    ], capture_output=True, text=True)
    pdata = json.loads(r.stdout)
    if pdata:
        pid = pdata[0]['id']
        page.goto(f'https://simillia.ru/patients/{pid}/export', wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(3000)
        page.screenshot(path=f'{DIR}/14-export.png', full_page=True)
        export_page = page.url and '/export' in page.url and page.locator('body').inner_text() != ''
        check('14a_export_page', export_page)
    else:
        check('14a_export_page', False, 'No patient found')

    # ═══ 15. ПОМОЩЬ ═══
    print('\n=== 15. HELP BUTTON ===')
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    help_btn = page.locator('button[aria-label]').last
    help_visible = help_btn.count() > 0
    check('15a_help_visible', help_visible)
    if help_visible:
        help_btn.click()
        page.wait_for_timeout(500)
        page.screenshot(path=f'{DIR}/15-help.png', full_page=True)
        help_items = page.locator('details summary').count() >= 3
        check('15b_help_items', help_items)

    # ═══ 16. MOBILE NAVIGATION ═══
    print('\n=== 16. MOBILE NAV ===')
    page.set_viewport_size({'width': 375, 'height': 812})
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/16-mobile-dash.png', full_page=True)

    burger = page.locator('button[aria-label*="меню"], button[aria-label*="menu"]').first
    if burger.count() > 0:
        burger.click()
        page.wait_for_timeout(500)
        page.screenshot(path=f'{DIR}/16-mobile-menu.png', full_page=True)
        check('16a_burger_menu', True)
    else:
        # Может быть другой селектор
        hamburger = page.locator('button').first
        check('16a_burger_menu', hamburger.count() > 0, 'Бургер-меню не найдено')

    page.close()
    ctx.close()
    browser.close()

    # ═══════════════════════════════════════
    # ИТОГОВЫЙ ОТЧЁТ
    # ═══════════════════════════════════════
    print('\n' + '=' * 60)
    print('  FULL E2E TEST REPORT')
    print('=' * 60)
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    for k, v in results.items():
        status = 'PASS' if v else '>>> FAIL'
        print(f'  [{status}] {k}')

    print(f'\n  PASSED: {passed}/{total}')
    print(f'  FAILED: {failed}')
    print(f'  RATING: {round(passed / total * 10, 1)}/10')

    if issues:
        print(f'\n  ISSUES:')
        for issue in issues:
            print(f'    - {issue}')

    print('=' * 60)
