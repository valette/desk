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
| [`config.json`](config.json) | **Shared** configuration consumed by both `manage.mjs` and `proxy.js`. |
| [`config.json.example`](config.json.example) | Template; copy to `config.json`. |

## Quick start

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

## How it fits together

1. `manage.mjs` allocates a free port per user, creates
   `/home/<user>/desk/`, and starts `deskSU.js` under PM2 with per-user
   environment variables (`PORT`, `USER`, `DESK_USER`, `DESK_PREFIX`, ...).
2. `deskSU.js` (running as root via PM2) drops privileges to `<user>`
   (`initgroups`/`setgid`/`setuid`) and then `require`s the real DESK server
   (parent `desk.js`, or a custom `DESK_STARTUP` script).
3. `manage.mjs` also starts `proxy.js` in PM2 cluster mode (4 instances).
4. `proxy.js` binds ports 80/443, reads the same `config.json`, and forwards
   `https://<baseURL>/<user>/...` to the matching per-user port. WebSockets
   (Socket.IO + xterm) are forwarded too.

## Documentation

- [docs/architecture.md](docs/architecture.md) — internal design, routing, privileges.
- [docs/configuration.md](docs/configuration.md) — full `config.json` schema.
- [docs/deployment.md](docs/deployment.md) — step-by-step setup and troubleshooting.

## Files

- `config.json` is read at startup by `proxy.js` and reloaded automatically
  when it changes (via `fs.watchFile`). `manage.mjs` writes it back after each
  add/remove/init (sorted, with `unmanaged` merged in).
- TLS certificates are expected under `cert/` next to `proxy.js`:
  `privatekey.pem`, `certificate.pem`, and optional `chain.pem`.
- `proxy.js` drops to user `dproxy` after binding ports 80/443; that user also
  owns the log directory `/home/dproxy/desk/`.

## License

`package.json` declares CECILL-B. See the repository top-level `LICENSE.txt`.
