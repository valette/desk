# Code Review — desk.js & proxy/ tools

Date: 2026-10-14
Scope: `desk.js` (the HTTP/Socket.IO server) and `proxy/` (`proxy.js`,
`manage.mjs`, `deskSU.js`). Behavior cross-checked against `desk-base`
(`lib/config.js`, `lib/cl-rpc.js`, `lib/index.js`).

Severity guide: **Critical** (crash/security, must fix) · **High** (incorrect
behavior, should fix) · **Medium** (edge case / robustness) · **Low** (style /
ergonomics).

## Resolution status

All Critical and High issues, plus M1, M4, M5, M6, M7, are **fixed**, one commit
per fix (commit list at the bottom). ✅ marks an item with a fix below.

| Item | Severity | Status |
|------|----------|--------|
| C1 | Critical | ✅ fixed |
| C2 | Critical | ✅ fixed |
| C3 | Critical (security) | ✅ fixed |
| H1 | High | ✅ fixed |
| H2 | High | ✅ fixed |
| H3 | High | ✅ fixed |
| H4 | High | ✅ fixed |
| H5 | High | ✅ fixed |
| M1 | Medium | ✅ fixed |
| M4 | Medium | ✅ fixed |
| M5 | Medium | ✅ fixed |
| M6 | Medium | ✅ fixed |
| M7 | Medium | ✅ fixed |
| M2 | Medium | not addressed |
| M3 | Medium | not addressed |
| M8 | Medium | not addressed |
| Low | — | not addressed |

---

## Critical

### C1. ✅ `manage.mjs` assigns to a `const` — malformed user config crashes the manager
`manage.mjs:55` declares `const settings = {...}`. Inside the try/catch that
reads `/home/<user>/desk/config.json`, line `94` does `settings = null;` when
the JSON is invalid. Assigning to a `const` throws
`TypeError: Assignment to constant variable`, which is *not* caught and
propagates out of `addUser()` → `init()` → the whole run aborts.

The intent (`if (!settings) return;`) is to gracefully skip a broken user
config. Fix: use `let settings`, or track a flag, and keep the skip logic.
Currently **any** malformed per-user `config.json` aborts `init`/`add` for all
users and leaves PM2/`config.json` in a partial state.

### C2. ✅ `proxy.js` crashes if `config.json` is missing/malformed at startup
`proxy.js:46-48` reads `httpAllowed[req.headers.host]` in the HTTP server
callback, and `processRequest` reads `routes[...]`. Both `httpAllowed` and
`routes` are only assigned inside `updateRoutes()`, and its `catch` block
(logged at `proxy.js:143-148`) never initializes them. If `config.json` is
absent or unparsable at boot, `httpAllowed`/`routes` remain `undefined` and the
first request throws `TypeError: Cannot read properties of undefined`, taking
down the (cluster) process. Fix: initialize `routes = {}` and
`httpAllowed = {}` as defaults before `updateRoutes()`.

### C3. ✅ Upload endpoint allows path traversal outside allowed dirs (security)
`desk.js:98`:
```js
outputDir = path.join(deskDir, unescape(fields.uploadDir));
```
- `unescape()` is **deprecated** and only partially decodes URI components.
- More importantly the resolved path is **never run through
  `actions.validatePath`** (the desk-base guard that restricts writes to the
  exposed `data`/`code`/`home`/`cache`/`actions` dirs). A client can pass
  `uploadDir = "../../../../tmp"` (or `/etc`, or another user's dir on a
  multi-user proxy host) and write files anywhere on the filesystem.
- The dest `outputDir` is computed in `form.parse`'s callback and used later in
  `form.on('end')` — also a latent ordering concern (see M1).

Fix: validate `outputDir` with `validatePath`, decode with
`decodeURIComponent`, and reject `..`/absolute traversal before writing.

---

## High

### H1. ✅ `checkPassword` socket handler always fails on modern accounts
`desk.js:231-236` compares `sha1(currPass) === id.sha`. But since the
password-format migration at `desk.js:200-208`, stored credentials use
`sha256` and `id.sha` is deleted. For every fresh install `id.sha` is
`undefined`, so `checkPasswordResult` is always `false` — the UI's
"confirm current password before changing" flow can never succeed. Should hash
with SHA-256 and compare against `id.sha256`.

### H2. ✅ `manage.mjs remove` throws when the user has no running app
`manage.mjs:103-114` deletes the port from `config.ports` first, then does
`else throw 'no app found for user ' + user;` if no matching PM2 app exists.
This turns a benign "nothing to remove" into an uncaught throw. Better to warn
and still clear the route/port.

### H3. ✅ Proxy WebSocket upgrade leaks the socket on unknown route
`proxy.js:86-92`:
```js
if ( !target ) return req.end();
```
`req.end()` does not destroy the upgraded TCP socket; a client that opens a WS
to a non-routed path leaves the connection (and file descriptor) hanging. Use
`socket.destroy()` instead. (Node/http-proxy convention.)

### H4. ✅ `proxy.js` silently swallows proxy errors
`proxy.js:25` `proxy.on('error', (err, req, res) => res.end());` drops all
upstream errors with no logging, making failures (upstream down, ECONNREFUSED)
very hard to diagnose. At minimum log the error. (Related to deployment
troubleshooting.)

### H5. ✅ Multi-user isolation relies on `deskSU.js` dropping privileges, but nothing verifies it
`deskSU.js` does `initgroups`/`setgid`/`setuid` then `require`s the server. If
PM2 is ever started as a non-root user, `setuid` throws and PM2 will restart in
a crash loop (or worse, if partially applied, run as the wrong user). There is
no startup guard that asserts the process is root before dropping, nor a check
that the target user exists. Add explicit checks with clear error messages.

---

## Medium

### M1. ✅ Upload writes outside the `form.parse` callback (ordering + async hazard)
`desk.js:96-100` sets `outputDir` inside the `form.parse` callback, then
`form.on('end')` (registered separately) reads it. This depends on formidable
invoking the parse callback before `end`, which is fragile. Compute/validate
`outputDir` up front from the already-received `fields` (or inside `end`).

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

### M4. ✅ `proxy.js` hardcodes the `dproxy` user and privileged ports with no guard
`proxy.js:7-8,103-104` hardcode ports 80/443 and the `dproxy` uid/gid. If the
`dproxy` account is missing, or the process isn't root, `setgid`/`setuid` throw
after `listen` (process dies despite sockets being open). No existence check.

### M5. ✅ `manage.mjs` shell-unsafe user interpolation
`manage.mjs:38,46` `execSync('id -u ' + user)` and `execSync('id -g ' + user)`
interpolate `user` directly into a shell string. A username containing shell
metacharacters would be executed. Use `execFileSync('id', ['-u', user])`.
(Low real-world risk, but trivial to harden.)

### M6. ✅ `manage.mjs` reuses a running app's port even if PORT env is absent
`manage.mjs:33` `config.ports[user] = app.pm2_env.PORT;` — if a same-named app
exists but has no `PORT` (e.g. started manually), this stores `undefined` and
the proxy route becomes `http://baseURL:undefined`.

### M7. ✅ HTTP-`httpAllowed` hosts get no WebSocket upgrade
`proxy.js` registers `proxyServer.on('upgrade', ...)` only on the **HTTPS**
server. A host listed in `httpAllowed` (plain HTTP) that needs WebSocket
(Socket.IO/xterm) won't have upgrades forwarded. Edge case, but inconsistent
with the documented "WebSocket is forwarded" behavior.

### M8. `desk.js` monkeypatches `actions.emit`
`desk.js:211-212` overrides the shared `desk-base` emit on the singleton to add
`io.emit`. Since `desk-base` is a shared singleton (and the IPC server /
cacheCleaner also emit through it), this changes emit semantics globally for
the process and can duplicate log delivery. Fragile; prefer a dedicated
`log`/event bridge.

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

---

## Suggested priority order

1. **C1, C2** — crash fixes; both are one-liners and break core functionality.
2. **C3** — security: validate upload paths.
3. **H1** — broken password-confirmation UX.
4. **H3** — WS socket leak.
5. **H2, H4, H5, M1–M8** — robustness and hardening.

---

## Fixes applied (one commit per fix)

| Commit | Item | Summary |
|--------|------|---------|
| `5ab051d` | C1 | `manage.mjs`: return early from `addUser` on malformed per-user config instead of assigning to a `const`. |
| `5346a04` | C2 | `proxy.js`: default `routes`/`httpAllowed`/`defaultRoutes` to `{}` so missing config no longer crashes. |
| `0cb96d5` | C3, M1 | `desk.js` upload: `decodeURIComponent` + reject absolute/`..` paths, validate top-level dir against exposed dirs, compute destination up front. |
| `7194275` | H1 | `desk.js` `checkPassword`: compare SHA-256 vs `id.sha256`. |
| `ac6dc25` | H2 | `manage.mjs removeUser`: no-op with a log instead of throwing when no app exists. |
| `5539a4e` | H3 | `proxy.js` upgrade: `socket.destroy()` instead of `req.end()`. |
| `1d5b40b` | H4 | `proxy.js`: log upstream proxy errors before ending the response. |
| `1956f6c` | H5 | `deskSU.js`: guard for missing `DESK_USER`, non-root process, unknown account. |
| `579ce2b` | M4 | `proxy.js`: pre-flight root/`dproxy` check + guarded privilege drop. |
| `c4a935a` | M5 | `manage.mjs`: `execFileSync('id', ['-u'|'-g', user])` (shell-safe). |
| `e46cf25` | M6 | `manage.mjs`: only reuse a running app's port if `PORT` is set. |
| `2254183` | M7 | `proxy.js`: forward WebSocket upgrades on the plain-HTTP server for `httpAllowed` hosts. |

Verification: `node --check` passes for all modified JS/MJS files after each fix.
