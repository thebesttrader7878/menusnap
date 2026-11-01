import glob, json, re, os
from playwright.sync_api import sync_playwright
out = 'shots'; os.makedirs(out, exist_ok=True)
mail = json.load(open(sorted(glob.glob('data/outbox/*.json'))[-1])); dash = re.search(r'(http://\S+/owner#key=\S+)', mail['text']).group(1)
site = 'http://rosa-s-taqueria.localhost:3000'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--host-resolver-rules=MAP *.localhost 127.0.0.1'])
    c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = c.new_page()
    def shot(url, name, full=False, wait=1200):
        pg.goto(url); pg.wait_for_timeout(wait); pg.screenshot(path=f'{out}/{name}.png', full_page=full)
    shot('http://localhost:3000/', '01-landing')
    pg.goto('http://localhost:3000/start'); pg.set_input_files('#menu', 'test/sample-menu.jpg'); pg.set_input_files('#logo', 'test/sample-logo.png')
    pg.fill('[data-testid=in-name]', "Rosa's Taqueria"); pg.fill('[data-testid=in-email]', 'rosa@example.com'); pg.fill('[data-testid=in-phone]', '(816) 555-0142'); pg.fill('[data-testid=in-address]', '123 Main St, Kansas City, MO'); pg.fill('[data-testid=in-hours]', 'Mon-Sat 11am-9pm')
    pg.wait_for_timeout(800); pg.screenshot(path=f'{out}/02-intake-form.png', full_page=True)
    print('logo colors', pg.input_value('#c1'), pg.input_value('#c2'))
    shot(site + '/', '03-site-home'); pg.screenshot(path=f'{out}/04-site-full.png', full_page=True)
    pg.click('[data-testid^=item-]'); pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/05-site-item.png')
    shot(dash, '06-owner-dashboard', wait=2500)
    print('dash text:', pg.inner_text('body')[:300].replace('\n', ' | '))
    pg.goto('http://localhost:3000/admin'); pg.fill('[data-testid=admin-pass]', 'test-admin-pass-123'); pg.press('[data-testid=admin-pass]', 'Enter'); pg.wait_for_timeout(1500); pg.screenshot(path=f'{out}/07-admin.png', full_page=True)
    b.close()
