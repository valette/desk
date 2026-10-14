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

- `manage.mjs` — PM2 manager (`add`, `remove`, `init`); CLI flags `--config`,
  `--https`.
- `proxy.js` — reverse proxy. HTTPS (default) on `HTTP_PORT`/`HTTPS_PORT`, or
  HTTP-only in debug mode.
- `deskSU.js` — setuid launcher that drops to the target user then loads the
  real DESK server (skips the drop when run as a non-root user).
- `args.mjs` — side-effect-free `parseArgs` used by `manage.mjs`; keep it pure
  so it stays unit-testable.

Language note: `proxy.js`/`deskSU.js` are **CommonJS** (matching the repo);
`manage.mjs`/`args.mjs` are **ESM** (uses top-level `await` and `import`). Keep
it that way.

## Key invariants (do not break these)

1. **Shared config contract**: `manage.mjs` and `proxy.js` both read/write the
   same config file. Its path comes from `manage.mjs`'s `--config` flag
   (default `config.json` in this directory) and is passed to `proxy.js` via
   the `DESK_CONFIG` env var — **never hardcode a second path**. `manage.mjs`
   owns the file (writes it back after every action, sorted); `proxy.js` reads
   it live and hot-reloads on change via `fs.watchFile`. Any schema change must
   stay compatible with **both** consumers.
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
5. **HTTPS + ports**: HTTPS is **on by default** (`DESK_HTTPS !== '0'`). In
   HTTPS mode `proxy.js` binds the HTTP redirect server on `HTTP_PORT` (default
   80) and the TLS server on `HTTPS_PORT` (default 443), so it must start as
   root and drops to user `dproxy` (`process.setgid`/`setuid`) only **after**
   both servers are listening. A `--config` run sets `DESK_HTTPS=0`
   (HTTP-only, single `HTTP_PORT`, no certs) unless `--https` is passed. Do not
   move the privilege drop before `listen`, or binding will fail.
6. **Per-user isolation**: every DESK app is started via `deskSU.js`, which
   uses `process.initgroups`/`setgid`/`setuid` to run as `<user>` (skipped when
   running as a non-root user — then isolation comes from a distinct
   `DESK_ROOTDIR` = `~/desk/debug/<user>`), then `require`s the real server.
   `DESK_PREFIX` is set to the username, so each instance is served under
   `<user>/`-prefixed URLs. Do not break the user→prefix→port mapping.

## Environment variables (`manage.mjs` sets per user)

| Variable | Value | Purpose |
|----------|-------|---------|
| `PORT` | allocated free port | the user's DESK HTTP port |
| `USER` | username | default auth identity |
| `DESK_USER` | username | used by `deskSU.js` for the uid/gid switch |
| `DESK_PREFIX` | username | URL prefix so `proxy.js` can route to it |
| `DESK_ROOTDIR` | user desk root | `~/desk/debug/<user>` in debug, `/home/<user>/desk` in production |
| `HOME` | user home | `/home/<user>` in production, the invoking user's home in debug |
| `LOGNAME` | username | login name |
| `CCACHE_DIR` | `~/.ccache` | compiler cache location |
| `DESK_STARTUP` | optional custom script path | from the user desk `config.json` `boot` field; overrides `../desk.js` |
| `env.*` | from `config.json` | extra vars applied to every user app |

## Commands

```bash
npm install                     # get deps (pm2, http-proxy, get-port, mkdirp)
node manage.mjs                 # init: start all ports users + PROXY cluster
node manage.mjs add <user>      # start a DESK instance for <user>
node manage.mjs remove <user>   # stop <user>'s app and drop its port
node --check proxy.js deskSU.js # sanity-check the CommonJS scripts

# debug: single non-root user, HTTP only (--config also disables HTTPS)
HTTP_PORT=8080 node manage.mjs --config config_debug.json
node manage.mjs --config config.json --https   # custom config, keep HTTPS
node manage.mjs --help                         # usage/help
```

- `--config <file>` selects the shared config path **and** disables HTTPS unless
  `--https` is also passed. The chosen path is forwarded to `proxy.js` as
  `DESK_CONFIG`. Running as a non-root user triggers single-user debug (no
  setuid, `~/desk/debug/<user>` roots). In debug the proxy HTTP port defaults
  to **8080** (overridable via `HTTP_PORT`); `manage.mjs` and `proxy.js` both
  print the listening port(s) on startup.
- PM2 state is dumped after every action (`pm2 dump`) so apps survive reboots.
- The proxy runs as the PM2 app named `PROXY`, in `cluster_mode` with 4
  instances. The manager app names are the **usernames** themselves.

## Files & paths (hardcoded, do not guess)

- Shared config: `--config` argument, default `__dirname + '/config.json'`;
  forwarded to `proxy.js` as `DESK_CONFIG`. Do not hardcode a second path.
- TLS (only used when HTTPS is enabled): `cert/privatekey.pem`,
  `cert/certificate.pem`, optional `cert/chain.pem` (relative to `proxy.js`).
- User desk dir (production): `/home/<user>/desk/` (created + chowned by
  `manage.mjs`); debug: `~/desk/debug/<user>`.
- Logs: `/home/<user>/desk/log.txt` and `/home/dproxy/desk/log.txt`
  (production), `~/desk/log.txt` and `~/desk/debug/<user>/log.txt` (debug).
- Proxy system user: `dproxy` (also `proxyUser`); proxy PM2 app: `PROXY`
  (also `proxyApp`).

## Conventions

- Do not hardcode the machine hostname; `proxy.js` falls back to
  `os.hostname()` when `baseURL` is absent.
- Keep the manager's read/parse of the user's `config.json` (under the user's
  `DESK_ROOTDIR`) defensive: a broken file sets `settings = null` and the app
  is not started.
- Validate changes against both consumers (see invariant 1). When adding a new
  config field, decide which part consumes it and document it in
  `docs/configuration.md`.
