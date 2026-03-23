"""Обход всех страниц Similia и создание скриншотов для аудита"""
from playwright.sync_api import sync_playwright
import os

SCREENSHOTS_DIR = 'c:/projects/casebook/screenshots/audit'
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

BASE_URL = 'https://simillia.ru'

# Публичные страницы (без авторизации)
PUBLIC_PAGES = [
    ('/', 'landing'),
    ('/login', 'login'),
    ('/register', 'register'),
    ('/forgot-password', 'forgot-password'),
    ('/pricing', 'pricing'),
    ('/privacy', 'privacy'),
    ('/terms', 'terms'),
]

# Страницы с авторизацией
AUTH_PAGES = [
    ('/dashboard', 'dashboard'),
    ('/settings', 'settings'),
    ('/referral', 'referral'),
    ('/admin', 'admin'),
    ('/repertory', 'repertory'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # === Публичные страницы ===
    print("\n=== ПУБЛИЧНЫЕ СТРАНИЦЫ ===\n")

    for path, name in PUBLIC_PAGES:
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        url = f'{BASE_URL}{path}'
        print(f'> {name}: {url}')
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(1000)

        # Полная страница
        page.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-desktop.png', full_page=True)

        # Мобильная версия
        page.set_viewport_size({'width': 375, 'height': 812})
        page.wait_for_timeout(500)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-mobile.png', full_page=True)

        page.close()

    # === Авторизованные страницы ===
    print("\n=== АВТОРИЗОВАННЫЕ СТРАНИЦЫ ===\n")

    # Логинимся
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto(f'{BASE_URL}/login', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(1000)

    # Заполняем форму
    page.fill('input[type="email"]', 'triarta@mail.ru')
    page.fill('input[type="password"]', '123456')
    page.click('button[type="submit"]')

    # Ждём редирект на дашборд
    page.wait_for_url('**/dashboard**', timeout=15000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    print('[OK] Авторизация успешна')

    # Сохраняем cookies для других страниц
    cookies = page.context.cookies()
    page.close()

    # Обходим авторизованные страницы
    for path, name in AUTH_PAGES:
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        ctx.add_cookies(cookies)
        page = ctx.new_page()

        url = f'{BASE_URL}{path}'
        print(f'> {name}: {url}')
        page.goto(url, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)

        # Desktop
        page.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-desktop.png', full_page=True)

        # Mobile
        page.set_viewport_size({'width': 375, 'height': 812})
        page.wait_for_timeout(500)
        page.screenshot(path=f'{SCREENSHOTS_DIR}/{name}-mobile.png', full_page=True)

        page.close()
        ctx.close()

    # === Карточка пациента ===
    print("\n=== КАРТОЧКА ПАЦИЕНТА ===\n")

    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_cookies(cookies)
    page = ctx.new_page()

    # Находим первого пациента на дашборде
    page.goto(f'{BASE_URL}/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(2000)

    # Клик на первого пациента
    patient_link = page.locator('[data-tour="patient-list"] a').first
    if patient_link.count() > 0:
        href = patient_link.get_attribute('href')
        if href:
            print(f'> patient-card: {BASE_URL}{href}')
            page.goto(f'{BASE_URL}{href}', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(2000)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/patient-card-desktop.png', full_page=True)

            page.set_viewport_size({'width': 375, 'height': 812})
            page.wait_for_timeout(500)
            page.screenshot(path=f'{SCREENSHOTS_DIR}/patient-card-mobile.png', full_page=True)

    page.close()
    ctx.close()
    browser.close()

    print(f'\n[OK] Готово! Скриншоты в {SCREENSHOTS_DIR}')
