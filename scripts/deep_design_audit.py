# -*- coding: utf-8 -*-
"""Deep design system audit — extract EVERY unique style value across all pages"""
import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

all_radii = {}      # border-radius -> count
all_font_sizes = {} # font-size -> count
all_colors = {}     # color -> count
all_bg_colors = {}  # background-color -> count
all_borders = {}    # border-color -> count
all_heights = {}    # button height -> count
all_paddings = {}   # button padding -> count
violations = []

def collect_styles(page, page_name):
    """Extract computed styles from all visible elements"""

    # Buttons
    buttons = page.locator('button, a.btn, [class*="btn"]').all()
    for btn in buttons[:30]:
        if not btn.is_visible():
            continue
        try:
            styles = btn.evaluate("""el => {
                const s = getComputedStyle(el);
                return {
                    radius: s.borderRadius,
                    fontSize: s.fontSize,
                    height: Math.round(el.offsetHeight),
                    padding: s.padding,
                    bg: s.backgroundColor,
                    color: s.color,
                    border: s.borderColor,
                    font: s.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
                }
            }""")
            r = styles['radius']
            all_radii[r] = all_radii.get(r, 0) + 1
            all_heights[styles['height']] = all_heights.get(styles['height'], 0) + 1

            # Check violations
            r_px = float(r.replace('px','').split(' ')[0]) if 'px' in r else 0
            if 7 < r_px < 14:  # Not pill, not tiny, not card
                text = btn.inner_text()[:25].strip().replace('\n',' ')
                if text:
                    violations.append(f"{page_name}: btn '{text}' r={r}")
        except:
            pass

    # Inputs
    inputs = page.locator('input, textarea, select').all()
    for inp in inputs[:20]:
        if not inp.is_visible():
            continue
        try:
            styles = inp.evaluate("""el => {
                const s = getComputedStyle(el);
                return {
                    radius: s.borderRadius,
                    fontSize: s.fontSize,
                    border: s.borderColor,
                    bg: s.backgroundColor
                }
            }""")
            r = styles['radius']
            r_px = float(r.replace('px','').split(' ')[0]) if 'px' in r else 0
            if 0 < r_px < 10:
                violations.append(f"{page_name}: input r={r}")
        except:
            pass

    # Font sizes
    texts = page.locator('p, span, h1, h2, h3, label, div').all()
    for t in texts[:50]:
        if not t.is_visible():
            continue
        try:
            fs = t.evaluate("el => getComputedStyle(el).fontSize")
            all_font_sizes[fs] = all_font_sizes.get(fs, 0) + 1

            # Check min font size
            fs_px = float(fs.replace('px',''))
            if fs_px < 11 and fs_px > 0:
                text = t.inner_text()[:30].strip()
                if text and len(text) > 2:
                    violations.append(f"{page_name}: text '{text}' size={fs}")
        except:
            pass

    # Check for hardcoded old colors in HTML
    html = page.content()
    old_patterns = {
        '#d4c9b8': 'old-border',
        '#e5e0d8': 'old-border',
        '#ede8e0': 'old-border',
        '#6366f1': 'purple-indigo',
        '#4f46e5': 'purple-indigo',
        '#1e1b4b': 'purple-dark',
    }
    for color, kind in old_patterns.items():
        if color in html:
            violations.append(f"{page_name}: {kind} {color} in HTML")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Public
    print("=== PUBLIC ===")
    for path, name in [('/', 'landing'), ('/login', 'login'), ('/register', 'register'), ('/pricing', 'pricing')]:
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            page.goto(f'https://simillia.ru{path}', timeout=60000)
            page.wait_for_timeout(5000)
            collect_styles(page, name)
            print(f"  {name}: OK")
            page.close()
        except Exception as e:
            print(f"  {name}: SKIP ({str(e)[:40]})")

    # Auth
    print("\n=== AUTH ===")
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('https://simillia.ru/login', timeout=60000)
    page.wait_for_timeout(5000)
    try:
        page.fill('input[type="email"]', 'triarta@mail.ru')
        page.fill('input[type="password"]', '123123')
        page.click('button[type="submit"]')
        page.wait_for_timeout(15000)
    except:
        pass

    for path, name in [
        ('/dashboard', 'dashboard'),
        ('/settings', 'settings'),
        ('/referral', 'referral'),
        ('/repertory', 'repertory'),
        ('/patients/93e65223-fab4-491c-bec3-f1972b39bb76', 'patient'),
    ]:
        try:
            page.goto(f'https://simillia.ru{path}', timeout=60000)
            page.wait_for_timeout(5000)
            collect_styles(page, name)
            print(f"  {name}: OK")
        except:
            print(f"  {name}: SKIP")

    # Consultation
    try:
        page.goto('https://simillia.ru/patients/93e65223-fab4-491c-bec3-f1972b39bb76', timeout=60000)
        page.wait_for_timeout(3000)
        page.locator('button').filter(has_text='Начать').first.click()
        page.wait_for_timeout(10000)
        if '/consultations/' in page.url:
            collect_styles(page, 'consultation')
            print("  consultation: OK")
    except:
        print("  consultation: SKIP")

    page.close()
    browser.close()

# === REPORT ===
print("\n" + "=" * 70)
print("  DEEP DESIGN SYSTEM AUDIT")
print("=" * 70)

print(f"\n  UNIQUE BORDER-RADII ({len(all_radii)}):")
for r, c in sorted(all_radii.items(), key=lambda x: -x[1])[:10]:
    print(f"    {r}: {c}x")

print(f"\n  BUTTON HEIGHTS ({len(all_heights)}):")
for h, c in sorted(all_heights.items(), key=lambda x: -x[1])[:10]:
    print(f"    {h}px: {c}x")

print(f"\n  FONT SIZES ({len(all_font_sizes)}):")
for fs, c in sorted(all_font_sizes.items(), key=lambda x: -x[1])[:15]:
    print(f"    {fs}: {c}x")

print(f"\n  VIOLATIONS ({len(violations)}):")
for v in violations:
    print(f"    - {v}")

rating = max(0, round(10 - len(violations) * 0.3, 1))
print(f"\n  DESIGN SYSTEM SCORE: {min(10, rating)}/10")
print("=" * 70)
