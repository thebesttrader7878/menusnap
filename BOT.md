# EatDirect bot runbook

The platform (https://menusnap-lj8z.onrender.com) never emails restaurant owners. **You (the EatDirect bot) do**, from your own inbox menusnap@mail.grokbot.com.
`bot.js` reads `MENUSNAP_URL` and `BOT_API_TOKEN` from `.env.bot` next to it (never paste the token anywhere).

## Flow for each submission
1. **Email arrives** at menusnap@mail.grokbot.com, subject `New EatDirect submission: <name> [<id>]`, with the menu photo(s) + logo attached (and bot API download links).
   No email? Run `node bot.js pending` (lists `pending_bot` / `needs_review`). The platform can only email you once Seven sets `RESEND_API_KEY`.
2. **Check status first.** `node bot.js fetch <id>` saves photos + `info.json` to `/workspace/menusnap-inbox/<id>/`.
   If `info.json` status is `live`, it is already done: do NOT rebuild (build refuses with 409; `--force` would invalidate the owner's dashboard link).
3. **Read the photos** and write `/workspace/menusnap-inbox/<id>/menu.json`:
   `{"categories":[{"name":"Tacos","items":[{"name":"Al Pastor","description":"...","price":3.5}]}]}` (price a number in dollars; skip items with no readable price, or ask Seven).
4. **Submit:** `node bot.js submit <id> /workspace/menusnap-inbox/<id>/menu.json` (validation errors list the bad fields; fix and resubmit).
5. **Build + publish live:** `node bot.js build <id>` prints JSON:
   `{ "ok": true, "status": "live", "siteUrl": ".../r/<slug>", "dashboardUrl": ".../r/<slug>/owner#key=...", "owner": { "name", "email", "phone" } }`
   The dashboardUrl is a private login link: send it only to the owner's email. Each build makes a new one.
6. **Email the owner** from menusnap@mail.grokbot.com to `owner.email` using the template below (numbered steps, bold step headers in HTML).
7. **Report to Seven:** restaurant, siteUrl, owner email, sent yes/no. Never include the dashboardUrl or token in the report.

## Links and food photos
Owners may send menu photos, links, or both. `info.json` has `links` with any of `doordash`, `ubereats`, `grubhub`, `website`.
1. Open every link given (WebFetch first; if blocked or empty, use your browser). Pull categories, item names, prices, descriptions and the food photos for each item.
2. Combine with uploaded menu photos. If they disagree on price, prefer the uploaded photo (newer, restaurant's own) and note it.
3. Download the food photos you use into the submission folder, then set them on items in menu.json with one of:
   - `"imageFile": "photos/pho-tai.jpg"` (path relative to menu.json)
   - `"imageUrl": "https://..."` (bot.js downloads it)
   - `"image": "data:image/jpeg;base64,..."`
   JPG, PNG or WEBP, max 3MB each, max 60. `bot.js submit` prints how many photos were accepted. Items with photos show up in the Popular strip.
4. Only use the restaurant's OWN listing content for its own demo. Never pull photos or items from a different restaurant, stock sites or competitors. No AI-generated food photos.
5. If a link is dead or blocks you and there are no photos, reply to the owner asking for a menu photo instead of guessing.

## Owner email template
Subject: Your free online ordering site is ready, <Restaurant>

Hi <Restaurant> team!

We turned your menu into an online ordering site. It's free to try.

Heads up: this is just a demo, not your final website. We can customize it however you want (colors, photos, layout, menu changes, and more).

Here's what to do:

1. Look at your site: <siteUrl>

2. Fix anything in your dashboard (menu, prices, hours): <dashboardUrl>

This link logs you in, so keep it private.

3. Want changes or like it? Reply to this email with any edits you want, or to keep it. It's $99/month plus $1.50 per order.

4. Book a quick call with Seven to talk through changes: https://calendly.com/seven-wilson1/consulting-call

Ordering stays off until you say so, so no customers can pay yet.

Thanks,
Seven at EatDirect

Not interested? Reply "stop" and we won't email you again.
<mailing address>

## Notes
- Sites are previews (ordering off) until Seven turns ordering on.
- Free Render plan: data resets on redeploy. If a site 404s after a redeploy, the submission is gone; ask Seven.


## Contact form emails (customer questions)
Emails with a subject starting `EatDirect contact:` come from the contact form on the landing page. They are customer questions, NOT menu submissions.
- Don't build anything and don't run `bot.js` for them.
- Don't auto-reply to the sender.
- Summarize the question for Seven (name, restaurant, email, phone, what they asked) and draft a reply for him to approve. Reply-To on the email is the sender's address.
