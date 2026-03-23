"""Скриншоты авторизованных страниц Similia"""
from playwright.sync_api import sync_playwright
import os

SCREENSHOTS_DIR = 'c:/projects/casebook/screenshots/audit'
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

BASE_URL = 'https://simillia.ru'

AUTH_PAGES = [
    ('/dashboard', 'dashboard'),
    ('/settings', 'settings'),
    ('/referral', 'referral'),
    ('/admin', 'admin'),
    ('/repertory', 'repertory'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = context.new_page()

    # Логин
    print('> Login...')
    page.goto(f'{BASE_URL}/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123123')
    page.click('button[type="submit"]')

    # Ждем редирект
    try:
        page.wait_for_url('**/dashboard**', timeout=20000)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        print('[OK] Login success')
    except Exception as e:
        print(f'[FAIL] Login failed: {e}')
        # Скриншот ошибки
        page.screenshot(path=f'{SCREENSHOTS_DIR}/login-error.png', full_page=True)
        browser.close()
        exit(1)

    # Сохраняем cookies
    cookies = context.cookies()

    # Обходим страницы
    for path, name in AUTH_PAGES:
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx.add_cookies(cookies)
        pg = ctx.new_page()

        url = f'{BASE_URL}{path}'
        print(f'> {name}: {url}')
        pg.goto(url, wait_until='networkidle', timeout=30000)
        pg.wait_for_timeout(3000)

        # Desktop
        pg.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-desktop.png', full_page=True)

        # Mobile
        pg.set_viewport_size({'width': 375, 'height': 812})
        pg.wait_for_timeout(1000)
        pg.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-mobile.png', full_page=True)

        pg.close()
        ctx.close()

    # Карточка пациента
    print('> patient-card...')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_cookies(cookies)
    pg = ctx.new_page()
    pg.goto(f'{BASE_URL}/dashboard', wait_until='networkidle', timeout=30000)
    pg.wait_for_timeout(3000)

    # Найти первого пациента
    links = pg.locator('a[href*="/patients/"]').all()
    if links:
        href = links[0].get_attribute('href')
        if href and '/patients/' in href:
            patient_url = href if href.startswith('http') else f'{BASE_URL}{href}'
            print(f'> patient: {patient_url}')
            pg.goto(patient_url, wait_until='networkidle', timeout=30000)
            pg.wait_for_timeout(3000)
            pg.screenshot(path=f'{SCREENSHOTS_DIR}/patient-card-desktop.png', full_page=True)

            pg.set_viewport_size({'width': 375, 'height': 812})
            pg.wait_for_timeout(1000)
            pg.screenshot(path=f'{SCREENSHOTS_DIR}/patient-card-mobile.png', full_page=True)

    pg.close()
    ctx.close()
    browser.close()
    print(f'\n[OK] Screenshots saved to {SCREENSHOTS_DIR}')
