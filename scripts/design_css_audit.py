# -*- coding: utf-8 -*-
"""Playwright CSS audit — programmatically check every element's styles against design system"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

# Design system standards
STANDARDS = {
    'btn_radius': '100px',      # pill buttons
    'card_radius': '16px',      # cards
    'input_radius': '100px',    # inputs (from --sim-r-md)
    'border_color': 'rgba(0, 0, 0, 0.08)',  # soft borders
    'bg_color': 'rgb(247, 243, 237)',        # parchment
    'green': 'rgb(45, 106, 79)',             # primary
    'forest': 'rgb(26, 48, 32)',             # dark
}

violations = []
checks = 0

def audit_elements(page, page_name):
    """Check all interactive elements on current page"""
    global checks, violations

    # 1. Check all buttons
    buttons = page.locator('button').all()
    for i, btn in enumerate(buttons[:20]):  # limit to 20 per page
        if not btn.is_visible():
            continue
        try:
            radius = btn.evaluate('el => getComputedStyle(el).borderRadius')
            checks += 1
            # Allow pill (100px, 9999px, 50%) or very small (for icon buttons)
            r_val = float(radius.replace('px','').split(' ')[0]) if 'px' in radius else 0
            if r_val > 0 and r_val < 14 and r_val != 6:  # not pill, not tiny
                text = btn.inner_text()[:30].strip()
                if text and len(text) > 1:
                    violations.append(f'{page_name}: button "{text}" radius={radius}')
        except:
            pass

    # 2. Check all inputs
    inputs = page.locator('input, textarea, select').all()
    for inp in inputs[:15]:
        if not inp.is_visible():
            continue
        try:
            radius = inp.evaluate('el => getComputedStyle(el).borderRadius')
            border = inp.evaluate('el => getComputedStyle(el).borderColor')
            checks += 1
            r_val = float(radius.replace('px','').split(' ')[0]) if 'px' in radius else 0
            if r_val > 0 and r_val < 10:
                violations.append(f'{page_name}: input radius={radius}')
        except:
            pass

    # 3. Check rounded cards/containers
    cards = page.locator('[class*="rounded"]').all()
    for card in cards[:20]:
        if not card.is_visible():
            continue
        try:
            radius = card.evaluate('el => getComputedStyle(el).borderRadius')
            checks += 1
        except:
            pass

    # 4. Check for old border colors (#d4c9b8, #e0d8cc, #e5e0d8, #ede8e0, #f3ede8)
    body_html = page.content()
    old_borders = ['#d4c9b8', '#e0d8cc', '#e5e0d8', '#ede8e0', '#f3ede8']
    for ob in old_borders:
        if ob in body_html:
            violations.append(f'{page_name}: old border color {ob} found in HTML')
            checks += 1

    # 5. Check for purple/indigo (should be replaced with green)
    purple_patterns = ['#6366f1', '#4f46e5', '#1e1b4b', 'indigo']
    for pp in purple_patterns:
        if pp in body_html:
            violations.append(f'{page_name}: purple/indigo {pp} found')
            checks += 1


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # === Public pages ===
    print('=== PUBLIC PAGES ===')
    for path, name in [('/', 'landing'), ('/login', 'login'), ('/register', 'register'), ('/pricing', 'pricing')]:
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        page.goto(f'https://simillia.ru{path}', wait_until='networkidle', timeout=30000)
        page.evaluate('localStorage.setItem("cookie_consent", "true")')
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(3000)
        audit_elements(page, name)
        print(f'  [{name}] checked')
        page.close()
        ctx.close()

    # === Auth pages ===
    print('\n=== AUTH PAGES ===')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
    page = ctx.new_page()
    # Login with retry
    page.goto('https://simillia.ru/login', timeout=60000)
    page.wait_for_timeout(5000)
    try:
        page.fill('input[type="email"]', 'triarta@mail.ru')
        page.fill('input[type="password"]', '123123')
        page.click('button[type="submit"]')
        page.wait_for_timeout(15000)
    except:
        pass

    if '/dashboard' not in page.url:
        # Fallback — go directly
        page.goto('https://simillia.ru/dashboard', timeout=60000)
        page.wait_for_timeout(8000)

    for path, name in [
        ('/dashboard', 'dashboard'),
        ('/settings', 'settings'),
        ('/referral', 'referral'),
        ('/admin', 'admin'),
        ('/repertory', 'repertory'),
        ('/patients/93e65223-fab4-491c-bec3-f1972b39bb76', 'patient-card'),
    ]:
        try:
            page.goto(f'https://simillia.ru{path}', wait_until='networkidle', timeout=60000)
            page.wait_for_timeout(5000)
            audit_elements(page, name)
            print(f'  [{name}] checked')
        except Exception as e:
            print(f'  [{name}] TIMEOUT - skipped')

    # Consultation
    page.goto('https://simillia.ru/patients/93e65223-fab4-491c-bec3-f1972b39bb76', wait_until='networkidle', timeout=30000)
    page.wait_for_timeout(3000)
    start = page.locator('button').filter(has_text='Начать').first
    if start.count() > 0:
        start.click()
        page.wait_for_timeout(10000)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        if '/consultations/' in page.url:
            audit_elements(page, 'consultation')
            print('  [consultation] checked')

    page.close()
    ctx.close()
    browser.close()

# === REPORT ===
print('\n' + '=' * 60)
print('  DESIGN CSS AUDIT')
print('=' * 60)
print(f'  Total checks: {checks}')
print(f'  Violations: {len(violations)}')

if violations:
    print(f'\n  VIOLATIONS:')
    for v in violations:
        print(f'    - {v}')

rating = max(0, 10 - len(violations) * 0.5)
print(f'\n  RATING: {min(10, rating)}/10')
print('=' * 60)
