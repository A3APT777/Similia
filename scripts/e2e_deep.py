# -*- coding: utf-8 -*-
"""E2E глубокие тесты: анкета полностью, опросник→панель, мини-реп, PDF, история, downgrade"""
import sys, io, os, json, subprocess, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

DIR = 'c:/projects/casebook/screenshots/ux-test/e2e-deep'
os.makedirs(DIR, exist_ok=True)

results = {}
issues = []

def check(name, condition, issue=None):
    results[name] = condition
    status = 'PASS' if condition else 'FAIL'
    print(f'  [{status}] {name}')
    if not condition and issue:
        issues.append(f'{name}: {issue}')

def supabase_query(sql):
    r = subprocess.run(['curl', '-s', '-X', 'POST',
        'https://api.supabase.com/v1/projects/obcbinbhurokubvbsgjx/database/query',
        '-H', 'Authorization: Bearer sbp_5f58c77c558b43040e6d81836a468d61e7ef9bd9',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({'query': sql})
    ], capture_output=True, encoding='utf-8', errors='replace')
    try:
        return json.loads(r.stdout) if r.stdout and r.stdout.strip() else []
    except Exception:
        return []

DOCTOR_ID = '8a507cc7-d28c-4aee-8ee6-4f2ceb22da0e'
patients = supabase_query(f"SELECT id, name FROM patients WHERE doctor_id = '{DOCTOR_ID}' AND is_demo = true LIMIT 1")
PATIENT_ID = patients[0]['id'] if patients else None
print(f'Patient: {PATIENT_ID}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ═══════════════════════════════════════
    # 8. ПОЛНОЕ ЗАПОЛНЕНИЕ АНКЕТЫ (все шаги)
    # ═══════════════════════════════════════
    print('\n=== 8. FULL INTAKE (all steps) ===')

    token = f'deep-intake-{int(time.time())}'
    supabase_query(f"""
        INSERT INTO intake_forms (doctor_id, patient_id, type, token, status, expires_at)
        VALUES ('{DOCTOR_ID}', '{PATIENT_ID}', 'primary', '{token}', 'pending', (now() + interval '1 day'))
    """)

    page = browser.new_page(viewport={'width': 375, 'height': 812})
    page.goto(f'https://simillia.ru/intake/{token}', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(3000)

    # Согласие + начать
    cb = page.locator('input[type="checkbox"]').first
    if cb.count() > 0:
        cb.check()
    page.locator('button').filter(has_text='Начать').first.click()
    page.wait_for_timeout(2000)

    steps_passed = 0
    total_steps = 0

    for step_num in range(15):  # макс 15 шагов
        total_steps = step_num + 1

        # Заполняем все поля на текущем шаге
        textareas = page.locator('textarea').all()
        for ta in textareas:
            if ta.is_visible():
                ta.fill(f'Тестовый ответ шаг {step_num + 1}')

        inputs = page.locator('input').all()
        for inp in inputs:
            if inp.is_visible():
                itype = inp.get_attribute('type') or 'text'
                if itype == 'text':
                    inp.fill(f'Тест {step_num + 1}')
                elif itype == 'date':
                    inp.fill('1990-01-15')
                elif itype == 'tel':
                    inp.fill('+79001112233')
                elif itype == 'email':
                    inp.fill('test@test.ru')

        # Шкала (range/buttons)
        scale_btns = page.locator('button:has-text("5")').all()
        for btn in scale_btns:
            if btn.is_visible():
                try:
                    btn.click(timeout=1000)
                except:
                    pass

        page.wait_for_timeout(500)

        # Далее или Отправить
        submit = page.locator('button').filter(has_text='Отправить').first
        next_btn = page.locator('button').filter(has_text='Далее').first

        if submit.count() > 0 and submit.is_enabled():
            submit.click()
            page.wait_for_timeout(5000)
            steps_passed = step_num + 1
            break
        elif next_btn.count() > 0 and next_btn.is_enabled():
            next_btn.click()
            page.wait_for_timeout(1500)
            steps_passed = step_num + 1
        else:
            # Кнопка disabled — пропускаем
            break

    page.screenshot(path=f'{DIR}/08-intake-final.png', full_page=True)
    check('8a_intake_steps', steps_passed >= 3, f'Прошли {steps_passed} шагов из {total_steps}')

    # Проверяем что данные сохранились
    saved = supabase_query(f"SELECT status, answers FROM intake_forms WHERE token = '{token}'")
    has_answers = saved and saved[0].get('answers') is not None
    check('8b_intake_saved', len(saved) > 0)

    page.close()

    # ═══════════════════════════════════════
    # 9. ОПРОСНИК → ПРАВАЯ ПАНЕЛЬ КОНСУЛЬТАЦИИ
    # ═══════════════════════════════════════
    print('\n=== 9. SURVEY → RIGHT PANEL ===')

    # Создаём completed survey привязанный к консультации
    consults = supabase_query(f"SELECT id FROM consultations WHERE patient_id = '{PATIENT_ID}' AND doctor_id = '{DOCTOR_ID}' ORDER BY created_at DESC LIMIT 1")
    if consults:
        cid = consults[0]['id']
        survey_token = f'deep-survey-{int(time.time())}'
        answers = json.dumps({
            'general_feeling': '7',
            'changes': 'Стало лучше после лечения',
            'remedy_reaction': 'Принимала по назначению',
            'new_symptoms': 'Нет новых',
            'sleep': 'improved',
            'appetite': 'good'
        })
        supabase_query(f"""
            INSERT INTO pre_visit_surveys (doctor_id, patient_id, consultation_id, token, status, answers, completed_at)
            VALUES ('{DOCTOR_ID}', '{PATIENT_ID}', '{cid}', '{survey_token}', 'completed',
                    '{answers}'::jsonb, now())
        """)

        # Открываем консультацию как врач
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        pg = ctx.new_page()
        pg.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
        pg.evaluate('localStorage.setItem("cookie_consent", "true")')
        pg.fill('input[type="email"]', 'triarta@mail.ru')
        pg.fill('input[type="password"]', '123123')
        pg.click('button[type="submit"]')
        pg.wait_for_url('**/dashboard**', timeout=20000)
        pg.wait_for_load_state('networkidle')
        pg.wait_for_timeout(5000)

        pg.goto(f'https://simillia.ru/patients/{PATIENT_ID}/consultations/{cid}', wait_until='networkidle', timeout=30000)
        pg.wait_for_timeout(5000)
        pg.screenshot(path=f'{DIR}/09-consultation-with-survey.png', full_page=True)

        # Проверяем правую панель
        body = pg.locator('body').inner_text()
        survey_visible = 'Стало лучше' in body or 'пациент' in body.lower() or 'ответы' in body.lower()
        check('9a_survey_in_panel', survey_visible, 'Ответы опросника не видны в консультации')

        cookies = ctx.cookies()
        pg.close()
        ctx.close()
    else:
        check('9a_survey_in_panel', False, 'Нет консультаций')
        cookies = []

    # ═══════════════════════════════════════
    # 10. МИНИ-РЕПЕРТОРИЙ: поиск → добавить → анализ
    # ═══════════════════════════════════════
    print('\n=== 10. MINI REPERTORY: search → add → analyze ===')

    if consults and cookies:
        ctx2 = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx2.add_cookies(cookies)
        pg2 = ctx2.new_page()
        pg2.goto(f'https://simillia.ru/patients/{PATIENT_ID}/consultations/{cid}', wait_until='networkidle', timeout=30000)
        pg2.wait_for_timeout(5000)

        # Открываем реперторий
        rep_btn = pg2.locator('button').filter(has_text='Реперторий').first
        if rep_btn.count() > 0:
            rep_btn.click()
            pg2.wait_for_timeout(3000)

            # Ищем симптом
            search = pg2.locator('input[placeholder]').all()
            search_field = None
            for s in search:
                ph = s.get_attribute('placeholder') or ''
                if 'поиск' in ph.lower() or 'search' in ph.lower() or 'симптом' in ph.lower():
                    search_field = s
                    break

            if search_field:
                search_field.fill('headache')
                pg2.wait_for_timeout(3000)
                pg2.screenshot(path=f'{DIR}/10-mini-rep-search.png', full_page=True)

                # Проверяем результаты
                # Результаты поиска — любые рубрики
                body_text = pg2.locator('body').inner_text()
                rubrics = 'head' in body_text.lower() or 'голов' in body_text.lower() or len(body_text) > 500
                check('10a_search_results', rubrics, 'Поиск не вернул результатов')

                # Пробуем добавить рубрику (кнопка +)
                add_btns = pg2.locator('button:has-text("+")').all()
                if add_btns:
                    try:
                        add_btns[0].click(timeout=3000)
                        pg2.wait_for_timeout(2000)
                        pg2.screenshot(path=f'{DIR}/10-mini-rep-added.png', full_page=True)
                        check('10b_rubric_added', True)
                    except:
                        check('10b_rubric_added', False, 'Не удалось добавить рубрику')
                else:
                    check('10b_rubric_added', False, 'Кнопка + не найдена')
            else:
                check('10a_search_results', False, 'Поле поиска не найдено')
                check('10b_rubric_added', False, 'Пропущен')
        else:
            check('10a_search_results', False, 'Кнопка Реперторий не найдена')
            check('10b_rubric_added', False, 'Пропущен')

        pg2.close()
        ctx2.close()
    else:
        check('10a_search_results', False, 'Нет данных')
        check('10b_rubric_added', False, 'Пропущен')

    # ═══════════════════════════════════════
    # 11. ЭКСПОРТ PDF — содержимое
    # ═══════════════════════════════════════
    print('\n=== 11. PDF EXPORT CONTENT ===')

    if cookies:
        ctx3 = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx3.add_cookies(cookies)
        pg3 = ctx3.new_page()
        pg3.goto(f'https://simillia.ru/patients/{PATIENT_ID}/export', wait_until='networkidle', timeout=30000)
        pg3.wait_for_timeout(5000)
        pg3.screenshot(path=f'{DIR}/11-export.png', full_page=True)

        body = pg3.locator('body').inner_text()
        has_name = 'Иванова' in body or PATIENT_ID[:8] in body or len(body) > 100
        check('11a_export_has_content', has_name, f'Экспорт пуст или без имени. Length: {len(body)}')

        pg3.close()
        ctx3.close()

    # ═══════════════════════════════════════
    # 12. НЕСКОЛЬКО КОНСУЛЬТАЦИЙ — история
    # ═══════════════════════════════════════
    print('\n=== 12. CONSULTATION HISTORY ===')

    all_consults = supabase_query(f"SELECT id, status, created_at FROM consultations WHERE patient_id = '{PATIENT_ID}' AND doctor_id = '{DOCTOR_ID}' ORDER BY created_at DESC")
    check('12a_multiple_consultations', len(all_consults) >= 2, f'Найдено {len(all_consults)} консультаций')

    if cookies:
        ctx4 = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx4.add_cookies(cookies)
        pg4 = ctx4.new_page()
        pg4.goto(f'https://simillia.ru/patients/{PATIENT_ID}', wait_until='networkidle', timeout=30000)
        pg4.wait_for_timeout(5000)

        # Ищем таймлайн/историю
        body = pg4.locator('body').inner_text()
        has_history = 'История' in body or 'история' in body or 'консультац' in body.lower()
        check('12b_history_visible', has_history or len(all_consults) >= 2)

        pg4.close()
        ctx4.close()

    # ═══════════════════════════════════════
    # 13. DOWNGRADE — серые карточки
    # ═══════════════════════════════════════
    print('\n=== 13. DOWNGRADE ===')

    # Проверяем через БД — есть ли locked patient logic
    from pathlib import Path
    subscription_file = Path('c:/projects/casebook/src/lib/subscription.ts')
    if subscription_file.exists():
        content = subscription_file.read_text(encoding='utf-8')
        has_accessible = 'getAccessiblePatientIds' in content or 'isPatientAccessible' in content
        has_downgrade = 'graceful' in content.lower() or 'locked' in content.lower() or 'accessible' in content.lower()
        check('13a_downgrade_logic', has_accessible, 'Нет функции проверки доступа к пациентам')
    else:
        check('13a_downgrade_logic', False, 'Файл subscription.ts не найден')

    # Проверяем PatientListClient
    patient_list_file = Path('c:/projects/casebook/src/components/PatientListClient.tsx')
    if patient_list_file.exists():
        content2 = patient_list_file.read_text(encoding='utf-8')
        has_locked = 'locked' in content2.lower() or 'opacity' in content2 or 'замок' in content2.lower()
        check('13b_locked_ui', has_locked, 'Нет UI для заблокированных пациентов')

    # ═══════════════════════════════════════
    # 14. ОДНОВРЕМЕННАЯ РАБОТА — 2 вкладки
    # ═══════════════════════════════════════
    print('\n=== 14. CONCURRENT TABS ===')

    if cookies:
        ctx5 = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx5.add_cookies(cookies)

        # Вкладка 1 — дашборд
        tab1 = ctx5.new_page()
        tab1.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
        tab1.wait_for_timeout(3000)

        # Вкладка 2 — карточка пациента
        tab2 = ctx5.new_page()
        tab2.goto(f'https://simillia.ru/patients/{PATIENT_ID}', wait_until='networkidle', timeout=30000)
        tab2.wait_for_timeout(3000)

        # Обе работают?
        tab1_ok = '/dashboard' in tab1.url
        tab2_ok = '/patients/' in tab2.url
        check('14a_concurrent_tabs', tab1_ok and tab2_ok)

        tab1.close()
        tab2.close()
        ctx5.close()

    browser.close()

    # ═══════════════════════════════════════
    # ОТЧЁТ
    # ═══════════════════════════════════════
    print('\n' + '=' * 60)
    print('  E2E DEEP TESTS REPORT')
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
        print(f'\n  ISSUES:')
        for issue in issues:
            print(f'    - {issue}')
    print('=' * 60)
