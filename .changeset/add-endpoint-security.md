---
"@billsdk/core": minor
"billsdk": minor
---

Added endpoint security: origin validation, CSRF token protection, and Bearer secret for server-to-server calls.

**Breaking:** `secret` is now required. Set `BILLSDK_SECRET` env var or pass `secret` to `billsdk()`. Generate one with `openssl rand -base64 32`.

New options:
- `trustedOrigins` — origins allowed to make mutating requests (supports wildcards)
- Bearer auth — server-to-server calls can send `Authorization: Bearer <secret>` to bypass browser security checks

Mutating endpoints (`POST`/`PUT`/`PATCH`/`DELETE`) are now protected by default. `GET` requests and `/webhook` are exempt. The BillSDK client handles CSRF tokens automatically.
