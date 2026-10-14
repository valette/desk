# Architecture

This document explains how the multi-user DESK deployment kit works internally.
It covers the process model, routing, the privilege model, and how WebSockets
are forwarded. It assumes familiarity with the parent `desk.js` server (see
`../AGENTS.md` and `../README.md`).

## High-level picture

```
                      ┌────────────────────────────────────────────┐
  internet ─► :80/443 │  proxy.js  (PM2 app "PROXY", 4 instances)  │
                      │  - TLS termination, HTTP→HTTPS redirect    │
                      │  - route by  host + /<firstPathSegment>    │
                      └───────┬──────────────┬──────────────┬──────┘
                              │              │              │
              /alice/         │    /bob/      │   /other/    │
                              ▼              ▼              ▼
                       http://HOST:49152  http://HOST:49153  http://external:3000
                       deskSU.js(alice)   deskSU.js(bob)     (unmanaged)
                       desk.js            desk.js
```

Everything hangs off a single shared `config.json`, which both the manager
(`manage.mjs`) and the proxy (`proxy.js`) read.

## Process model (PM2)

`manage.mjs` drives PM2 and manages two kinds of apps:

1. **Per-user DESK apps** — one PM2 app per username. The app script is
   `deskSU.js`, its `cwd` is `/home/<user>/desk/`, and its environment carries
   the user's `PORT`, `USER`, `DESK_USER`, `DESK_PREFIX`, `HOME`, etc. (see
   [configuration.md](configuration.md#environment-variables-set-per-user)).
   Each one is an independent `desk.js` server with its own root directory and
   authentication.

2. **The `PROXY` app** — a single PM2 app running `proxy.js` in **cluster mode
   with 4 instances**. This is the single public entry point.

`manage.mjs` actions:

| Command | Effect |
|---------|--------|
| `node manage.mjs` (default `init`) | Start every user listed in `config.ports`, then the `PROXY` cluster if not already running. |
| `node manage.mjs add <user>` | Create `/home/<user>/desk/` if needed, allocate a free port, start the user's app, register it in `config.ports`. |
| `node manage.mjs remove <user>` | Stop and delete the user's PM2 app and remove it from `config.ports`. |

After every action it merges `unmanaged` into `ports`, sorts the entries,
calls `pm2 dump` (to persist across reboots), and writes `config.json` back.

## The setuid launcher (`deskSU.js`)

PM2 runs apps as root (when PM2 itself is started by root). To give each DESK
instance the identity of its owner:

```js
process.initgroups(user, user);
process.setgid(user);
process.setuid(user);
process.title = 'desk';
require(process.env.DESK_STARTUP || path.join(__dirname, '../desk.js'));
```

Once privileges are dropped it cannot be regained, so this happens **before**
loading the real server. This is what guarantees each user's desk server runs
as that user and cannot touch other users' files.

**Debug (non-root):** when `deskSU.js` is run by a non-root user, the uid/gid
switch is skipped and the server simply runs as the invoking user. Isolation is
provided instead by a distinct `DESK_ROOTDIR` per configured user
(`~/desk/debug/<user>`), not by Unix accounts.

## Routing (`proxy.js`)

`updateRoutes()` builds a lookup object from `config.json`:

```js
routes[ baseURL + '/' + user ] = { target : 'http://' + baseURL + ':' + port }
```

- `baseURL` defaults to `os.hostname()`.
- `otherRoutes` entries are added verbatim as `routes[key] = { target: value }`
  (used to forward to external/independent services).
- `defaultRoutes[host]` gives a redirect target for the bare root `/`.
- `httpAllowed[host]` lets a host be served over plain HTTP instead of being
  redirected to HTTPS.

For an incoming request, `processRequest` computes the routing key:

```js
req.headers.host + '/' + req.url.split('/')[1]
```

- If `req.url == '/'` and `defaultRoutes[host]` exists → `302` redirect.
- Otherwise look up the key; if missing → `404`.
- Otherwise `proxy.web(req, res, target)` forwards the request.

The **WebSocket upgrade** handler (`proxyServer.on('upgrade', ...)`) recomputes
the same key and calls `proxy.ws(...)`. This is what keeps Socket.IO and the
xterm terminal working through the proxy.

The proxy uses `http-proxy` with `xfwd: true` (adds `X-Forwarded-For`) and a
keep-alive agent for upstream connections. `proxy.on('error')` silently ends
the response so upstream failures don't crash the process.

## Configuration reload

`proxy.js` watches `config.json` with `fs.watchFile` and calls `updateRoutes()`
whenever the file changes (mtime-based guard). This means editing
`config.json` by hand (e.g. to add an `otherRoute`) takes effect without
restarting the proxy. The manager rewrites the file on each action, which also
triggers a reload.

## Privilege model

- In production `proxy.js` binds privileged ports and therefore starts as root,
  then runs `process.setgid('dproxy'); process.setuid('dproxy')` only **after**
  the servers are listening. The proxy runs as system user **`dproxy`**, whose
  home is `/home/dproxy/desk/` (log directory).
- **Debug (non-root):** `proxy.js` detects a non-root uid, skips the root and
  `dproxy` checks and the privilege drop, and binds a high `HTTP_PORT`
  (default 80, so set it high). No `dproxy` account is required.
- Per-user DESK apps run as their owner via `deskSU.js` (production), or as the
  invoking user (debug, see above).

## TLS

HTTPS is **enabled by default** (production). `manage.mjs` disables it by
passing `DESK_HTTPS=0` when a custom `--config` is given without `--https`
(debug/HTTP-only mode).

The HTTPS server reads (only when HTTPS is enabled):

- `cert/privatekey.pem` (required key),
- `cert/certificate.pem` (required cert),
- `cert/chain.pem` (optional CA chain; a warning is printed if absent).

If HTTPS is on and the cert files are missing, `proxy.js` exits with an error.
In HTTP-only mode it serves plain HTTP on a single `HTTP_PORT` and no certs are
needed.
