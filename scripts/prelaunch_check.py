# -*- coding: utf-8 -*-
"""Предрекламная проверка: демо-данные, тексты, юридическое"""
import sys, io, os, json, subprocess, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
from pathlib import Path

DIR = 'c:/projects/casebook/screenshots/ux-test/prelaunch'
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
    except:
        return []

# ═══════════════════════════════════════
# 6. ДЕМО-ПАЦИЕНТЫ — реалистичность
# ═══════════════════════════════════════
print('\n=== 6. DEMO PATIENTS ===')

# Проверяем демо у triarta
DOCTOR_ID = '8a507cc7-d28c-4aee-8ee6-4f2ceb22da0e'
demos = supabase_query(f"""
    SELECT p.name, p.birth_date, p.phone, p.constitutional_type, p.gender,
           count(c.id) as consultations
    FROM patients p
    LEFT JOIN consultations c ON c.patient_id = p.id
    WHERE p.doctor_id = '{DOCTOR_ID}' AND p.is_demo = true
    GROUP BY p.id, p.name, p.birth_date, p.phone, p.constitutional_type, p.gender
""")

check('6a_demo_exist', len(demos) >= 3, f'Только {len(demos)} демо-пациентов')

# Разнообразие
names = [d['name'] for d in demos]
genders = set(d.get('gender') or 'none' for d in demos)
has_consultations = all(d['consultations'] > 0 for d in demos)

check('6b_diverse_names', len(set(names)) == len(names), 'Дублирующиеся имена')
check('6c_have_consultations', has_consultations, 'Не все демо имеют консультации')

# Реалистичные имена (русские)
russian_names = all(any(c in n for c in 'абвгдежзиклмнопрстуфхцчшщэюя') for n in [n.lower() for n in names])
check('6d_russian_names', russian_names, f'Имена: {names}')

print(f'  Demo patients: {len(demos)}')
for d in demos:
    print(f'    - {d["name"]} | {d.get("constitutional_type", "?")} | {d["consultations"]} consults')

# ═══════════════════════════════════════
# 7. ТЕКСТЫ — опечатки, английские слова, placeholder'ы
# ═══════════════════════════════════════
print('\n=== 7. TEXT QUALITY ===')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Проверяем лендинг
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://simillia.ru/', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    landing_text = page.locator('body').inner_text()

    # Lorem ipsum
    check('7a_no_lorem', 'lorem' not in landing_text.lower() and 'ipsum' not in landing_text.lower())

    # TODO/FIXME/placeholder
    check('7b_no_todo', 'TODO' not in landing_text and 'FIXME' not in landing_text and 'xxx' not in landing_text.lower())

    # Английские слова где не должны быть (исключая бренды и термины)
    english_patterns = ['Click here', 'Submit', 'Loading...', 'Error:', 'undefined', 'null', 'NaN']
    found_english = [w for w in english_patterns if w in landing_text]
    check('7c_no_english_ui', len(found_english) == 0, f'Английские слова: {found_english}')

    # Проверяем pricing
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    pricing_text = page.locator('body').inner_text()

    check('7d_price_consistent', '290' in pricing_text, 'Цена 290 не найдена на pricing')

    # Проверяем login
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    login_text = page.locator('body').inner_text()

    check('7e_login_russian', 'Войти' in login_text or 'Добро пожаловать' in login_text)

    # Регистрация
    page.goto('https://simillia.ru/register', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    reg_text = page.locator('body').inner_text()

    check('7f_register_russian', 'Создать аккаунт' in reg_text or 'Зарегистрироваться' in reg_text)
    pwd_ph = page.locator('input[type="password"]').get_attribute('placeholder') or ''
    check('7g_password_8', '8' in pwd_ph, f'Placeholder: {pwd_ph}')

    page.close()

    # ═══════════════════════════════════════
    # 8. ЮРИДИЧЕСКОЕ
    # ═══════════════════════════════════════
    print('\n=== 8. LEGAL ===')

    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Privacy
    page.goto('https://simillia.ru/privacy', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    privacy = page.locator('body').inner_text()

    check('8a_has_inn', '500717175199' in privacy, 'ИНН не найден')
    check('8b_has_name', 'Назаретян' in privacy, 'ФИО исполнителя не найдено')
    check('8c_has_email', 'simillia@mail.ru' in privacy, 'Email не найден')
    check('8d_has_152fz', '152' in privacy, 'Ссылка на 152-ФЗ не найдена')

    # Terms
    page.goto('https://simillia.ru/terms', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)
    terms = page.locator('body').inner_text()

    check('8e_terms_inn', '500717175199' in terms, 'ИНН не найден в оферте')
    check('8f_terms_price', '290' in terms, 'Цена 290 не найдена в оферте')
    check('8g_terms_refund', 'возврат' in terms.lower() or 'отказ' in terms.lower(), 'Нет условий возврата')

    # Email кликабелен
    email_link = page.locator('a[href*="mailto:simillia@mail.ru"]').count()
    check('8h_email_clickable', email_link > 0, 'Email не кликабелен в оферте')

    page.close()

    # ═══════════════════════════════════════
    # 4. СКОРОСТЬ (базовая проверка)
    # ═══════════════════════════════════════
    print('\n=== 4. SPEED (basic) ===')

    import time

    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Лендинг
    t0 = time.time()
    page.goto('https://simillia.ru/', wait_until='networkidle', timeout=30000)
    landing_time = time.time() - t0
    check('4a_landing_speed', landing_time < 5, f'{landing_time:.1f}s (should be < 5s)')

    # Login
    t0 = time.time()
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    login_time = time.time() - t0
    check('4b_login_speed', login_time < 5, f'{login_time:.1f}s')

    # Pricing
    t0 = time.time()
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    pricing_time = time.time() - t0
    check('4c_pricing_speed', pricing_time < 5, f'{pricing_time:.1f}s')

    print(f'  Landing: {landing_time:.1f}s | Login: {login_time:.1f}s | Pricing: {pricing_time:.1f}s')

    page.close()
    browser.close()

# ═══════════════════════════════════════
# ОТЧЁТ
# ═══════════════════════════════════════
print('\n' + '=' * 60)
print('  PRELAUNCH CHECK REPORT')
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
    print(f'\n  ISSUES TO FIX:')
    for issue in issues:
        print(f'    - {issue}')
print('=' * 60)
