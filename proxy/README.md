# DESK multi-user proxy kit (`proxy/`)

This directory is a **deployment kit** for running many isolated DESK instances
on a single machine and exposing them through one HTTPS endpoint. It builds on
top of the server in the parent directory (`desk.js`) and uses
[PM2](https://pm2.keymetrics.io/) for process management.

It is made of three cooperating parts:

| File | Role |
|------|------|
| [`manage.mjs`](manage.mjs) | PM2 instance manager. Adds/removes per-user DESK apps and (re)builds the routing table. |
| [`proxy.js`](proxy.js) | The reverse proxy. Serves HTTPS/HTTP and forwards each path to the right per-user DESK server. |
| [`deskSU.js`](deskSU.js) | Setuid launcher. Runs each user's DESK server under that user's identity. |
| [`args.mjs`](args.mjs) | Side-effect-free CLI parser for `manage.mjs` (unit-testable). |
| [`config.json`](config.json) | **Shared** configuration consumed by both `manage.mjs` and `proxy.js`. |
| [`config.json.example`](config.json.example) | Template; copy to `config.json` (production/HTTPS). |
| [`config_debug.json`](config_debug.json) | Example config for the single-user debug (HTTP-only) mode. |

## Quick start

### Production (root, HTTPS)

```bash
cd proxy
npm install                # installs pm2, http-proxy, get-port, mkdirp
cp config.json.example config.json

# as root (must bind ports 80/443 and run PM2 for all users):
node manage.mjs            # "init": start every user in config.ports + the proxy
node manage.mjs add alice  # start a new DESK instance for user "alice"
node manage.mjs remove bob # stop user "bob"
```

After `init`, `https://<baseURL>/<user>/` proxies to
`http://<baseURL>:<port>` where the DESK server for `<user>` listens.

Set `"subdomains": true` in `config.json` to instead serve each user under its
own subdomain: `https://<user>.<baseURL>/`. This requires a wildcard DNS record
(`*.<baseURL>`) and a wildcard TLS certificate. A request to the bare
`https://<baseURL>/<user>/...` is then `302`-redirected to the subdomain. See
`docs/configuration.md`.

### Debug: single non-root user, HTTP only

For local testing you can run the whole stack as **one non-root user**: no
root, no per-user Unix accounts, no privileged ports, no setuid. Passing a
custom config via `--config` switches the proxy to HTTP-only (unless `--https`
is also given), and running as non-root makes every "user" map to an isolated
`DESK_ROOTDIR` under your own home.

```bash
cd proxy
npm install
cp config_debug.json config.json   # or edit your own
HTTP_PORT=8080 node manage.mjs --config config_debug.json
```

Open `http://localhost:8080/alice/` and `http://localhost:8080/bob/`. Each
virtual user's desk data lives in `~/desk/debug/<user>/`.

Add/remove users at runtime the same way:

```bash
HTTP_PORT=8080 node manage.mjs add carol --config config_debug.json
HTTP_PORT=8080 node manage.mjs remove bob  --config config_debug.json
```

> **Security**: debug mode does **not** provide OS-level isolation between
> users (they all share your account). Use it for development/QA only. See
> `docs/deployment.md` for the flags and details.

## How it fits together

1. `manage.mjs` allocates a free port per user, creates the user's desk dir,
   and starts `deskSU.js` under PM2 with per-user environment variables
   (`PORT`, `USER`, `DESK_USER`, `DESK_PREFIX`, `DESK_ROOTDIR`, ...).
2. `deskSU.js` runs the real DESK server. As root (production) it first drops
   privileges to `<user>` (`initgroups`/`setgid`/`setuid`); as a non-root user
   (debug) it skips the drop and runs as the invoking user. Either way it then
   `require`s the real server (parent `desk.js`, or a custom `DESK_STARTUP`
   script).
3. `manage.mjs` also starts `proxy.js` in PM2 cluster mode (4 instances),
   passing it the config path and the HTTPS mode via its environment.
4. `proxy.js` reads the same `config.json`, and forwards
   `http(s)://<baseURL>/<user>/...` to the matching per-user port. In
   production it binds HTTP (redirect→HTTPS) + HTTPS and forwards WebSockets
   (Socket.IO + xterm); in debug it serves plain HTTP on one port.

## Command-line flags (`manage.mjs`)

| Flag | Effect |
|------|--------|
| `--config <file>` | Use `<file>` as the shared config instead of `config.json`. **Also disables HTTPS** (proxy becomes HTTP-only) unless `--https` is passed. |
| `--https` | Force HTTPS on even when a custom config was given with `--config`. |
| `-h`, `--help` | Print usage/help and exit. |

The config path is transmitted to `proxy.js` via the `DESK_CONFIG` env var on
the PROXY PM2 app, and the HTTPS mode via `DESK_HTTPS` (`1`/`0`). The proxy's
HTTP port is passed as `HTTP_PORT` (debug/HTTP-only mode defaults to **8080**;
production to **80**) and the TLS port as `HTTPS_PORT` (default **443**). Both
`manage.mjs` and `proxy.js` print the listening port(s) on startup.

## Documentation

- [docs/architecture.md](docs/architecture.md) — internal design, routing, privileges.
- [docs/configuration.md](docs/configuration.md) — full `config.json` schema.
- [docs/deployment.md](docs/deployment.md) — step-by-step setup and troubleshooting.

## Files

- The shared config is read at startup by `proxy.js` and reloaded automatically
  when it changes (via `fs.watchFile`). `manage.mjs` writes it back after each
  add/remove/init (sorted, with `unmanaged` merged in). Its path defaults to
  `config.json` next to the scripts, or to the `--config` argument.
- TLS certificates are expected under `cert/` next to `proxy.js`:
  `privatekey.pem`, `certificate.pem`, and optional `chain.pem`. They are only
  required when HTTPS is enabled (production default).
- Proxy port(s) come from `HTTP_PORT` (default 80) and, when HTTPS is on,
  `HTTPS_PORT` (default 443). Debug runs use a high `HTTP_PORT`.
- In production `proxy.js` drops to user `dproxy` after binding; that user owns
  the log directory `/home/dproxy/desk/`. In debug the logs go to
  `~/desk/log.txt`.

## License

`package.json` declares CECILL-B. See the repository top-level `LICENSE.txt`.
