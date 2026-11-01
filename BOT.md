# MenuSnap bot runbook (email-triggered)

When a restaurant submits the form at `/start`, the platform emails your inbox (`BOT_INBOX_EMAIL`) from sevenwilson89@gmail.com:
- **Subject:** `New MenuSnap submission: <Restaurant name> [<id>]`
- **Body:** submission ID, restaurant name, email, phone, address, hours, brand colors.
- **Attachments:** `menu-1.jpg`, `menu-2.jpg`, … and `logo.png` (if they sent one).

No AI key is used. The submission waits in status `pending_bot` until you post the menu.

Setup (once): `cd /workspace/webdev/menu2site`. Set `BOT_API_TOKEN` (same value as on the server) and `MENUSNAP_URL` (e.g. `https://menusnap.onrender.com`; default `http://localhost:3000`).

## For each submission email
1. **Read the email.** Note the `[id]` in the subject.
2. **View every attached menu photo** with your image reader. Save the attachments to `/workspace/menusnap-inbox/<id>/` first if needed. Zoom on crops if text is small.
   Backup: `node bot.js fetch <id>` downloads the photos and `info.json` there.
3. **Write `/workspace/menusnap-inbox/<id>/menu.json`:**
   ```json
   {"categories":[
     {"name":"Tacos","items":[
       {"name":"Al Pastor Taco","description":"Marinated pork, pineapple, cilantro","price":3.50},
       {"name":"Horchata","description":"","price":3.00}
     ]}
   ]}
   ```
   Rules:
   - Keep the menu's category names and order. Each category needs at least 1 item.
   - `price` is a number in dollars (no `$`, not a string).
   - Several sizes: use the lowest price and put the sizes in the description, e.g. "Small $8 / Large $12".
   - Use `"description": ""` when the menu doesn't have one.
   - Never invent items or prices. If a price is unreadable or "market price", leave the item out and say so in your report.
4. **Submit:** `node bot.js submit <id> /workspace/menusnap-inbox/<id>/menu.json`
   If you get `Menu JSON is invalid`, fix the listed fields and submit again.
5. **Build:** `node bot.js build <id>`
   This generates the site (preview, ordering off), publishes it, and auto-emails the owner the site link and a private dashboard link. Rebuilding sends a NEW dashboard link and the old one stops working, so only rebuild on purpose.
6. **Report to Seven:** restaurant name, number of items, the site link, the email status, and anything you skipped or weren't sure about. Never share the dashboard link.

Catch-up (missed emails): `node bot.js pending` lists anything still waiting.
