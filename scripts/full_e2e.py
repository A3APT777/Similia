# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
import os

DIR = 'c:/projects/casebook/screenshots/ux-test/full-e2e'
os.makedirs(DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()

    # 1. ЛОГИН
    print('\n=== 1. LOGIN ===')
    page.goto('https://simillia.ru/login', wait_until='networkidle', timeout=30000)
    page.evaluate('localStorage.setItem("cookie_consent", "true")')
    page.wait_for_timeout(1000)
    page.fill('input[type="email"]', 'full-e2e-test@simillia.ru')
    page.fill('input[type="password"]', 'E2Etest2026!')
    page.click('button[type="submit"]')
    page.wait_for_timeout(25000)
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(5000)
    url = page.url
    print(f'  URL: {url}')
    print(f'  Redirect to demo: {"/patients/" in url and "welcome=1" in url}')
    page.screenshot(path=f'{DIR}/01-first-screen.png', full_page=True)

    welcome = page.locator('text=Добро пожаловать').count() > 0
    start_btns = page.locator('button').filter(has_text='приём').count()
    pdf_hidden = page.locator('a:has-text("PDF")').count() == 0
    extra = page.locator('text=Остальные функции').count() > 0
    print(f'  Welcome: {welcome} | Start: {start_btns} | PDF hidden: {pdf_hidden} | Extra text: {extra}')

    page.set_viewport_size({'width': 375, 'height': 812})
    page.wait_for_timeout(1000)
    page.screenshot(path=f'{DIR}/01-mobile.png', full_page=True)
    page.set_viewport_size({'width': 1440, 'height': 900})

    # 2. CONSULTATION
    print('\n=== 2. CONSULTATION ===')
    start = page.locator('button').filter(has_text='приём').first
    if start.count() > 0:
        start.click()
        page.wait_for_timeout(10000)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        url2 = page.url
        is_consult = '/consultations/' in url2
        print(f'  URL: {url2}')
        print(f'  On consultation: {is_consult}')
        page.screenshot(path=f'{DIR}/02-consultation.png', full_page=True)

        if is_consult:
            hint = page.locator('text=Запишите жалобы').count() > 0
            collapsible = page.locator('summary').count()
            ai_btn = page.locator('button').filter(has_text='AI').count()
            print(f'  Hint: {hint} | Collapsible: {collapsible} | AI btn: {ai_btn}')

            # Fill complaints
            page.locator('textarea').first.fill('Головная боль слева, хуже от солнца')
            page.wait_for_timeout(2000)
            page.screenshot(path=f'{DIR}/03-filled.png', full_page=True)

            # Expand modalities
            if collapsible > 0:
                page.locator('summary').first.click()
                page.wait_for_timeout(500)
                page.screenshot(path=f'{DIR}/04-expanded.png', full_page=True)

            # Prescription
            remedy = page.locator('input').filter(has_text='').all()
            for inp in remedy:
                ph = inp.get_attribute('placeholder') or ''
                if 'ulphur' in ph or 'ульс' in ph:
                    inp.fill('Natrum muriaticum')
                    break

            btn30 = page.locator('button:has-text("30C")').first
            if btn30.count() > 0:
                btn30.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=f'{DIR}/05-prescription.png', full_page=True)
            print('  Prescription done')

            # Finish
            finish = page.locator('button').filter(has_text='Завершить').first
            if finish.count() > 0:
                finish.scroll_into_view_if_needed()
                page.wait_for_timeout(500)
                finish.click()
                page.wait_for_timeout(8000)
                page.screenshot(path=f'{DIR}/06-completed.png', full_page=True)
                completed = page.locator('text=Приём завершён').count() > 0
                add_own = page.locator('text=Добавить своего пациента').count() > 0
                print(f'  Completed: {completed} | Add own: {add_own}')

    # 3. DASHBOARD
    print('\n=== 3. DASHBOARD ===')
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=f'{DIR}/07-dashboard.png', full_page=True)
    add_btn = page.locator('button').filter(has_text='Добавить пациента').count()
    nav = page.locator('nav a').count()
    cal = page.locator('text=2026').count()
    print(f'  Add btn: {add_btn} | Nav links: {nav} | Calendar: {cal > 0}')

    # 4. SETTINGS
    print('\n=== 4. SETTINGS ===')
    page.goto('https://simillia.ru/settings', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/08-settings.png', full_page=True)
    pwd = page.locator('text=Безопасность').count() > 0
    print(f'  Password section: {pwd}')

    # 5. HELP
    print('\n=== 5. HELP ===')
    page.goto('https://simillia.ru/dashboard', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    hlp = page.locator('button[aria-label]').last
    if hlp.count() > 0:
        hlp.click()
        page.wait_for_timeout(500)
        page.screenshot(path=f'{DIR}/09-help.png', full_page=True)
        items = page.locator('details summary').count()
        print(f'  Help items: {items}')

    # 6. REPERTORY
    print('\n=== 6. REPERTORY ===')
    page.goto('https://simillia.ru/repertory', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/10-repertory.png', full_page=True)
    search = page.locator('input').first.count() > 0
    print(f'  Search: {search}')

    # 7. REFERRAL (hidden for newbie?)
    print('\n=== 7. REFERRAL ===')
    page.goto('https://simillia.ru/referral', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/11-referral.png', full_page=True)
    ref_code = page.locator('input[readonly]').count() > 0
    print(f'  Referral code: {ref_code}')

    # 8. PRICING
    print('\n=== 8. PRICING ===')
    page.goto('https://simillia.ru/pricing', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=f'{DIR}/12-pricing.png', full_page=True)
    price_290 = page.locator('text=290').count() > 0
    print(f'  Price 290: {price_290}')

    browser.close()
    print('\n=== E2E TEST COMPLETE ===')
