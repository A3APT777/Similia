# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import os

DIR = 'c:/projects/casebook/screenshots/ux-test/final-10-10'
os.makedirs(DIR, exist_ok=True)

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()

    # Login
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.wait_for_timeout(500)
    page.fill('input[type="email"]', 'final-10-10@simillia.ru')
    page.fill('input[type="password"]', 'Final1010!')
    page.click('button[type="submit"]')
    page.wait_for_timeout(25000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)

    url = page.url
    results['1_redirect'] = '/patients/' in url and 'welcome=1' in url
    results['1_welcome'] = page.locator('text=Добро пожаловать').count() > 0
    results['1_start_btn'] = page.locator('button').filter(has_text='приём').count() == 1
    results['1_pdf_hidden'] = page.locator('a:has-text("PDF")').count() == 0
    results['1_extra_hidden'] = page.locator('text=Остальные функции').count() > 0
    page.screenshot(path=f'{DIR}/01-welcome.png', full_page=True)

    # Mobile
    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)
    page.screenshot(path=f'{DIR}/01-mobile.png', full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 900})

    # Consultation
    page.locator('button').filter(has_text='приём').first.click()
    page.wait_for_timeout(10000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    url2 = page.url
    results['2_consultation'] = '/consultations/' in url2
    results['2_hint'] = page.locator('text=Запишите жалобы').count() > 0
    results['2_collapsible'] = page.locator('summary').count() >= 1
    results['2_ai_hidden'] = page.locator('button').filter(has_text='AI').count() == 0
    page.screenshot(path=f'{DIR}/02-consultation.png', full_page=True)

    # Fill & finish
    page.locator('textarea').first.fill('Головная боль слева')
    page.wait_for_timeout(3000)  # autosave

    # Scroll to finish
    finish = page.locator('button').filter(has_text='Завершить').first
    if finish.count() > 0:
        finish.scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        finish.click()
        page.wait_for_timeout(8000)
        page.screenshot(path=f'{DIR}/03-after-finish.png', full_page=True)

        # Check prescription modal OR completed screen
        modal = page.locator('text=Назначение препарата').count() > 0
        completed = page.locator('text=Приём завершён').count() > 0
        results['3_modal_or_completed'] = modal or completed

        if modal:
            # Close modal - skip prescription
            close = page.locator('button:has-text("Закрыть"), button:has-text("close")').first
            if close.count() > 0:
                close.click()
                page.wait_for_timeout(1000)

    # Dashboard
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=f'{DIR}/04-dashboard.png', full_page=True)
    results['4_add_btn'] = page.locator('button').filter(has_text='Добавить пациента').count() == 1
    results['4_nav_minimal'] = page.locator('nav a').count() <= 4

    # Settings
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    results['5_password'] = page.locator('text=Безопасность').count() > 0

    # Help
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    hlp = page.locator('button[aria-label]').last
    if hlp.count() > 0:
        hlp.click()
        page.wait_for_timeout(500)
        page.screenshot(path=f'{DIR}/05-help.png', full_page=True)
        results['6_help'] = page.locator('details summary').count() >= 3

    # Pricing
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    results['7_price_290'] = page.locator('text=290').count() > 0

    browser.close()

    # Report
    print('\n' + '=' * 50)
    print('  FINAL E2E REPORT')
    print('=' * 50)
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    for k, v in results.items():
        status = 'PASS' if v else 'FAIL'
        print(f'  [{status}] {k}')
    print(f'\n  SCORE: {passed}/{total}')
    print(f'  RATING: {round(passed / total * 10, 1)}/10')
    print('=' * 50)
