# Code Review — desk.js & proxy/ tools

Date: 2026-10-14
Scope: `desk.js` (the HTTP/Socket.IO server) and `proxy/` (`proxy.js`,
`manage.mjs`, `deskSU.js`). Behavior cross-checked against `desk-base`
(`lib/config.js`, `lib/cl-rpc.js`, `lib/index.js`).

Severity guide: **Critical** (crash/security, must fix) · **High** (incorrect
behavior, should fix) · **Medium** (edge case / robustness) · **Low** (style /
ergonomics).

## Resolution status

Remaining open items.

| Item | Severity | Status |
|------|----------|--------|
| M2 | Medium | not addressed |
| M3 | Medium | not addressed |
| M8 | Medium | not addressed |
| Low | — | not addressed |
| N1 | High (security) | not addressed |
| N2 | High (security) | not addressed |
| N3 | Medium | not addressed |
| N4 | Medium | not addressed |
| N6 | Low | not addressed |

---

## High

### N1. High — per-user desk servers bind 0.0.0.0 and bypass the proxy
`desk.js:342` `server.listen(port)` binds all interfaces. Each user's desk is
directly reachable at `http://<machine-ip>:<port>` — no HTTPS, no routing, no
`httpAllowed` policy. It has basic auth, but over plain HTTP and exposes the
root (see M2). Fix: bind loopback (`127.0.0.1`) since the proxy is the only
intended entry, or firewall per-user ports.

### N2. High — debug-mode path traversal via unvalidated username + `rootDir`
`manage.mjs:24-32` `path.join(config.rootDir, user)`. In debug mode the
username is never validated (`id -u` is skipped when `isDebug`,
manage.mjs:58), so `manage.mjs add "../../x" --config config_debug.json` can
create paths outside `rootDir`. Production is partly protected by `id -u`.
Fix: validate `user` (reject `/`, `..`, leading `-`, whitespace/control)
before `userRoot()`/PM2 name.

---

## Medium

### M2. `desk.js` serves `password.json` (and everything under the root) via static
`desk.js:134-135` serves `express.static(deskDir, { dotfiles: "allow" })` +
`directory(deskDir)`. `password.json` lives directly in `deskDir`, so
`GET /password.json` returns the credential hash to any authenticated user. The
whole root (including `cache`, `actions`, other users' data on a proxy host) is
also browsable. If per-user isolation is a requirement, this undermines it.
Consider excluding `password.json` and not serving the raw root (or only the
declared dataDirs).

### M3. `desk.js` default credentials are weak and static
`desk.js:27` `{ username: process.env.USER, password: "password" }`. On a
multi-user proxy install, every newly-created user shares the same default
password until changed. Consider forcing a per-user random password or
first-login change.

### M8. `desk.js` monkeypatches `actions.emit`
`desk.js:211-212` overrides the shared `desk-base` emit on the singleton to add
`io.emit`. Since `desk-base` is a shared singleton (and the IPC server /
cacheCleaner also emit through it), this changes emit semantics globally for
the process and can duplicate log delivery. Fragile; prefer a dedicated
`log`/event bridge.

### N3. Medium — `subdomains` config live-flip breaks manager/proxy parity
`manage.mjs` decides `DESK_PREFIX` from `config.subdomains` only at app start,
while `proxy.js` hot-reloads `subdomains` (proxy.js:258). Flipping it re-routes
the proxy immediately but leaves desk servers serving the old prefix → 404s.
Fix: require `remove`/`add` (restart) after flipping, and/or log drift.

### N4. Medium — Host normalization inconsistency + unvalidated Host reflection
Routing lowercases the host (proxy.js:46,53,259) but `httpAllowed[...]`
(proxy.js:154,170) uses the raw header, so an uppercase/port-variant host won't
match and the HTTP→HTTPS redirect (proxy.js:160) reflects the raw Host into
`Location`. CRLF is blocked by Node's parser; normalize once and validate
against `baseDomain`/known hosts. (The subdomain redirect itself is not an
open redirect — it only fires when `host === baseDomain` and `seg` matches a
configured route.)

---

## Low / Style / Robustness

- **`desk.js:304`** `server.listen(port)` with no error handler — an
  `EADDRINUSE`/`EACCES` becomes an unhandled stack trace with no friendly
  message.
- **`desk.js:94`** `maxFileSize: 200 * 1024 * 1024 * 1024` (200 GiB) is an
  effective DoS vector for disk fill; consider a configurable, sane cap.
- **`proxy.js:152`** `fs.watchFile` is polling-based and deprecated; `fs.watch`
  is preferred (with a debounce to avoid partial writes).
- **`proxy.js`** `routes`/`httpAllowed`/`defaultRoutes` all rebuilt on reload;
  a transient malformed save (partial write) makes `updateRoutes` fail and
  keeps **stale** routes silently (no fallback to previous good state).
- **`manage.mjs`** `pm2.listAsync()` can hang or reject if the PM2 daemon
  isn't running; no guard before use.
- **`deskSU.js`** hardcodes `process.title = 'desk'`; both `desk.js` and
  `deskSU.js` set it, which can confuse PM2 log/title inspection (both look
  identical in `ps`).
- **`desk.js`** `unescape()` deprecated (see C3); also `if (id.username ===
  undefined) return true;` (desk.js:34) means an account with no username skips
  auth entirely — worth an explicit decision.
- No graceful shutdown / SIGTERM handling anywhere; PM2 cluster kills are hard.
- **`manage.mjs:89` / `deskSU.js:45`** `config.env` is spread into every user
  app and `DESK_STARTUP` (from the user's desk `config.json`) is `require`d by
  `deskSU.js`. Both are operator/user-controlled and run as the target user, so
  no privilege escalation — worth documenting.
