# TikTok connect - the contract the bot must implement

The website (`www.tiyulplus.com`) owns the OAuth **redirect**. The bot owns the
**client secret and the tokens**. This file is the interface between them.

Hand this to whoever is building the bot side. Nothing here is implemented on
the bot yet - the website calls it, and it does not exist until you build it.

---

## The decision: option B, the bot exchanges the code

You offered two designs and preferred B on security grounds. B is implemented,
and I agree with the reasoning - but for a sharper reason than "the secret
stays put".

Under option A the website would hold `TIKTOK_CLIENT_SECRET` **and** a live
`access_token` and `refresh_token` for the account that publishes to
@tiyulplus. That is a publishing credential for the brand's TikTok sitting on
a public web server that also runs an AI agent, a payments webhook and a
database. Under B the website holds one public `client_key`, one shared secret
whose only power is "may hand a code to the bot", and never sees a token at
all. If the website were fully compromised, the attacker could start an OAuth
flow and would still have nothing to post with.

The cost of B is one real drawback, and it is worth stating: the authorization
code is **short-lived and single-use**, so if the bot is unreachable at that
moment the code dies and the connect has to be restarted. The callback page
says exactly that rather than offering a refresh that cannot work.

---

## What the website sends

```
POST  <TIKTOK_BOT_URL>
Authorization: Bearer <TIKTOK_BOT_SECRET>
Content-Type: application/json
```

```jsonc
{
  "code": "hGF9...",                                  // already URL-DECODED, see below
  "scopes": "user.info.basic,video.publish",          // what TikTok said was granted
  "redirect_uri": "https://www.tiyulplus.com/tiktok/callback"
}
```

Three things about this body:

- **`code` is already URL-decoded.** TikTok's docs say the code arrives
  URL-encoded and "should be URL decoded" before the exchange. Next decodes
  query parameters for us, so the value above is the decoded one. **Do not
  decode it again** - a code containing `%` or `*` would be corrupted.
- **`redirect_uri` is echoed** because the token exchange requires the same
  value that was used to obtain the code. Use the one sent here rather than a
  constant on the bot, so the two can never drift apart.
- **`scopes` is what the callback reported.** The token response carries the
  authoritative `scope`; prefer that one and treat this as a hint.

Timeout: the website gives up after **15 seconds**. Answer faster than that.

---

## What the bot must do

1. Reject the request unless `Authorization` is exactly
   `Bearer <TIKTOK_BOT_SECRET>`, compared in constant time. Return `401`.
2. Exchange the code (verified against TikTok's docs on 2026-09-21):

   ```
   POST https://open.tiktokapis.com/v2/oauth/token/
   Content-Type: application/x-www-form-urlencoded

   client_key=<TIKTOK_CLIENT_KEY>
   &client_secret=<TIKTOK_CLIENT_SECRET>
   &code=<code from the body>
   &grant_type=authorization_code
   &redirect_uri=<redirect_uri from the body>
   ```

   The response carries `access_token`, `refresh_token`, `expires_in`,
   `refresh_expires_in`, `open_id`, `scope`, `token_type`. **All of them are
   worth storing** - `refresh_expires_in` is the one that decides when a
   silent re-auth is no longer possible and a human has to press the button
   again.

3. Store the tokens in the bot's own store, replacing whatever was there.
4. Optionally call `user.info.basic` to resolve the account name, so the
   success page can say *"מחובר כ-@tiyulplus"* rather than printing an
   `open_id`. If you skip it, the page falls back to the `open_id` - it will
   not invent a handle.

### On refresh, later

`POST https://open.tiktokapis.com/v2/oauth/token/` with `client_key`,
`client_secret`, `grant_type=refresh_token`, `refresh_token`. The docs warn:
**the returned `refresh_token` may differ from the one you sent, and you must
store the new one.** Reusing the old one after a rotation is the usual cause of
a bot that works for a month and then silently stops.

---

## What the bot must return

`200` with this JSON. **No tokens in this response** - the website does not
need them and must not have them.

```jsonc
{
  "ok": true,
  "open_id": "_000AbC...",            // required
  "scope": "user.info.basic,video.publish",  // from the token response
  "expires_in": 86400,                // seconds, display only
  "username": "tiyulplus",            // optional, from user.info
  "display_name": "טיול+"             // optional
}
```

On failure, any status, with:

```jsonc
{ "ok": false, "error": "short machine-readable reason" }
```

`error` is rendered on the page verbatim, so keep it to something like
`token_exchange_failed` or `invalid_code`. **Never put the client secret, a
token, or a raw TikTok response body in it.**

---

## Environment

On the **website** (Vercel):

| Variable | What it is |
|---|---|
| `TIKTOK_CLIENT_KEY` | Public key from the developer portal; travels in the authorize URL. |
| `TIKTOK_BOT_URL` | Full https URL of the endpoint above. |
| `TIKTOK_BOT_SECRET` | Shared secret. Generate with `openssl rand -base64 32`. |

There is deliberately **no `TIKTOK_CLIENT_SECRET` on the website.**

On the **bot**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, and the same
`TIKTOK_BOT_SECRET`.

The redirect URI is **not** an environment variable. It is derived in code from
`SITE_URL`, so it is always exactly `https://www.tiyulplus.com/tiktok/callback`
- with the `www`, no trailing slash - and cannot drift from the registered
value by someone editing a config field.

---

## The flow end to end

```
/tiktok                     the filmable page, with the connect button
  -> GET /tiktok/connect    sets an httpOnly state cookie, 302 to TikTok
  -> TikTok authorize       the user approves
  -> GET /tiktok/callback   validates state, POSTs the code to the bot
       -> bot               exchanges, stores tokens, returns the summary above
  <- success page           "מחובר כ-@tiyulplus" + the granted scopes
```
