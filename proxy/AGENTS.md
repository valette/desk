# AGENTS.md — proxy/ multi-user deployment kit

Guidance for AI coding agents (and human contributors) editing anything under
this `proxy/` directory. Read this before modifying the kit. The parent repo
conventions in `../AGENTS.md` still apply; this file only adds proxy-specific
rules.

## What this directory is

`proxy/` is the **deployment layer** that lets one machine host many isolated
DESK instances behind a single HTTPS endpoint. It does **not** implement any
DESK action logic — that lives in the parent `desk.js` + `desk-base`. The three
scripts here orchestrate processes (PM2) and proxy traffic:

- `manage.mjs` — PM2 manager (`add`, `remove`, `init`).
- `proxy.js` — reverse proxy (HTTP 80 + HTTPS 443).
- `deskSU.js` — setuid launcher that drops to the target user then loads the
  real DESK server.

Language note: `proxy.js`/`deskSU.js` are **CommonJS** (matching the repo);
`manage.mjs` is **ESM** (uses top-level `await` and `import`). Keep it that way.

## Key invariants (do not break these)

1. **Shared config contract**: `manage.mjs` and `proxy.js` both read/write the
   same `config.json` in this directory. `manage.mjs` owns the file (writes it
   back after every action, sorted); `proxy.js` reads it live and hot-reloads
   on change via `fs.watchFile`. Any schema change must stay compatible with
   **both** consumers.
2. **`ports` is an object**, not an array: `{ "user": <port> }` iterated with
   `Object.entries`. (The old `config.json.example` mistakenly showed array
   syntax — do not reintroduce it.) A `port` of `0` in a template means "pick
   one at runtime"; `manage.mjs` fills in real values.
3. **Routing key** = `req.headers.host + '/' + req.url.split('/')[1]`
   (host plus the first path segment). For the WebSocket upgrade path it is
   computed the same way. Never change the key shape without updating both
   `proxy.js` `processRequest` and the `upgrade` handler.
4. **`unmanaged` users are never started** by `manage.mjs` (they map to an
   external/independent service), but they are still merged into `config.ports`
   before the file is saved so `proxy.js` keeps routing to them.
5. **Root + privileged ports**: `proxy.js` binds ports **80** and **443**, so it
   must start as root and drops to user `dproxy` (`process.setgid`/`setuid`)
   only **after** both servers are listening. Do not move the privilege drop
   before `listen`, or binding will fail.
6. **Per-user isolation**: every DESK app is started via `deskSU.js`, which uses
   `process.initgroups`/`setgid`/`setuid` to run as `<user>`, then `require`s
   the real server. `DESK_PREFIX` is set to the username, so each instance is
   served under `/home/<user>/desk/`-rooted, `/ <user>/`-prefixed URLs. Do not
   break the user→prefix→port mapping.

## Environment variables (`manage.mjs` sets per user)

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | allocated free port | the user's DESK HTTP port |
| `USER` | username | default auth identity |
| `DESK_USER` | username | used by `deskSU.js` for the uid/gid switch |
| `DESK_PREFIX` | username | URL prefix so `proxy.js` can route to it |
| `HOME` | `/home/<user>` | home for the user's server |
| `LOGNAME` | username | login name |
| `CCACHE_DIR` | `/home/<user>/.ccache` | compiler cache location |
| `DESK_STARTUP` | optional custom script path | from `/home/<user>/desk/config.json` `boot` field; overrides `../desk.js` |
| `env.*` | from `config.json` | extra vars applied to every user app |

## Commands

```bash
npm install                     # get deps (pm2, http-proxy, get-port, mkdirp)
node manage.mjs                 # init: start all ports users + PROXY cluster
node manage.mjs add <user>      # start a DESK instance for <user>
node manage.mjs remove <user>   # stop <user>'s app and drop its port
node --check proxy.js deskSU.js # sanity-check the CommonJS scripts
```

- PM2 state is dumped after every action (`pm2 dump`) so apps survive reboots.
- The proxy runs as the PM2 app named `PROXY`, in `cluster_mode` with 4
  instances. The manager app names are the **usernames** themselves.

## Files & paths (hardcoded, do not guess)

- `file = __dirname + '/config.json'` — shared config.
- TLS: `cert/privatekey.pem`, `cert/certificate.pem`, optional `cert/chain.pem`
  (relative to `proxy.js`).
- User desk dir: `/home/<user>/desk/` (created + chowned by `manage.mjs`).
- Logs: `/home/<user>/desk/log.txt` and `/home/dproxy/desk/log.txt`.
- Proxy system user: `dproxy` (also `proxyUser`); proxy PM2 app: `PROXY`
  (also `proxyApp`).

## Conventions

- Do not hardcode the machine hostname; `proxy.js` falls back to
  `os.hostname()` when `baseURL` is absent.
- Keep the manager's read/parse of `/home/<user>/desk/config.json` defensive:
  a broken file sets `settings = null` and the app is not started.
- Validate changes against both consumers (see invariant 1). When adding a new
  config field, decide which part consumes it and document it in
  `docs/configuration.md`.
