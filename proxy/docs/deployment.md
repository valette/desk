# Deployment

Step-by-step guide to setting up the multi-user DESK proxy kit on a single
machine. These steps must be run as **root** (ports 80/443 and starting PM2 on
behalf of all users require it).

## Prerequisites

- Node.js (the kit uses ESM + top-level `await`, so Node ≥ 14 is expected).
- `npm` for dependency install.
- A user account per DESK user you want to host (e.g. `alice`, `bob`).
- A system user `dproxy` that the proxy will drop privileges to:
  ```bash
  useradd --system --create-home dproxy
  ```

## Single-user debug mode (no root)

For local development you can run the whole stack as **one non-root user**:
no root, no per-user Unix accounts, no privileged ports, no setuid. This is
useful for debugging because all processes run under your account and can be
inspected/attached directly.

```bash
cd proxy
npm install
cp config_debug.json config.json   # or write your own --config file

# run everything as the current (non-root) user, HTTP only
HTTP_PORT=8080 node manage.mjs --config config.json
```

What changes in debug mode:

- **Custom config disables HTTPS.** Passing `--config <file>` switches the
  proxy to HTTP-only unless `--https` is also given. (With `--https` you must
  still provide TLS certs under `cert/`.)
- **Non-root → single-user.** When run as a non-root user, `deskSU.js` skips
  the setuid drop, the proxy skips the `dproxy` drop, and each configured
  "user" maps to an isolated `DESK_ROOTDIR` under your home:
  `~/desk/debug/<user>/`. Ports are high (allocated by `get-port`), and the
  proxy binds `HTTP_PORT` (default 80, so set it high, e.g. 8080).
- Logs go to `~/desk/log.txt` (proxy) and `~/desk/debug/<user>/log.txt` (per
  user).

```bash
# add / remove virtual users at runtime
HTTP_PORT=8080 node manage.mjs add carol --config config.json
HTTP_PORT=8080 node manage.mjs remove bob  --config config.json
```

Open `http://localhost:8080/alice/` and `http://localhost:8080/bob/`.

> **Security**: debug mode does **not** provide OS-level isolation between
> users — they all share your account. Use it for development/QA only.

## 1. Install dependencies

```bash
cd proxy
npm install        # pm2, http-proxy, get-port, mkdirp
```

## 2. Create the shared config

```bash
cp config.json.example config.json
```

Edit `config.json` (see [configuration.md](configuration.md)). At minimum set
`baseURL` to your hostname and list the users you want in `ports`:

```json
{
	"ports" : { "alice" : 0, "bob" : 0 },
	"baseURL" : "desk.example.org"
}
```

Port `0` means "pick one at runtime"; `manage.mjs` replaces them with real
ports on the first run.

## 3. Provide TLS certificates

`proxy.js` reads from `cert/` next to it:

```bash
mkdir -p cert
# Option A: real certificates from a CA, e.g. Let's Encrypt via certbot:
#   certbot certonly --standalone -d desk.example.org
#   cp /etc/letsencrypt/live/desk.example.org/privkey.pem  cert/privatekey.pem
#   cp /etc/letsencrypt/live/desk.example.org/fullchain.pem cert/certificate.pem

# Option B: self-signed for testing
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout cert/privatekey.pem -out cert/certificate.pem -days 365 \
  -subj "/CN=desk.example.org"
```

A `cert/chain.pem` is optional; the proxy logs a warning if it is missing.

## 4. Start everything

```bash
node manage.mjs            # init: start users in config.ports + the PROXY cluster
```

Verify with PM2:

```bash
pm2 list                   # "PROXY" + one app per user
pm2 logs                   # watch the logs (also in /home/<user>/desk/log.txt)
```

## 5. Add / remove users at runtime

```bash
node manage.mjs add alice   # new user -> new desk instance + route
node manage.mjs remove bob  # stop bob's app and remove his route
```

Adding a user requires a matching system account to exist. The manager creates
`/home/<user>/desk/` (and chowns it) if it is missing.

## DNS / routing summary

With `baseURL = desk.example.org`, after starting:

- `https://desk.example.org/` → `302` to your `defaultRoutes[host]` (if set).
- `https://desk.example.org/alice/` → `http://desk.example.org:<alicePort>/`
- WebSocket (Socket.IO + xterm) traffic on those URLs is forwarded too.

## Persistence across reboots

`manage.mjs` runs `pm2 dump` after every action. To restore on boot, install
the PM2 startup script as root:

```bash
pm2 startup
# (run the printed command), then:
pm2 resurrect
```

## Default credentials for each user

Each DESK instance is a normal `desk.js` server. On first launch it uses the
default identity `{ username: USER, password: "password" }` (see the parent
`../AGENTS.md`), written to `<root>/password.json` in that user's root dir.
Users should change their password from the desk-ui.

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `EACCES` binding port 80/443 | Proxy must start as root; ensure the privilege drop happens after `listen`. For non-root debug use a high `HTTP_PORT` (e.g. 8080). |
| `proxy: missing TLS files ...` | HTTPS is on (default) but `cert/*.pem` absent. Either add certs, or disable HTTPS with a `--config` run (debug/HTTP-only). |
| `no .ca file provided` warning | `cert/chain.pem` missing — only a warning; supply a chain if your CA requires it. |
| User's app not starting | Check `/home/<user>/desk/log.txt` (or `~/desk/debug/<user>/log.txt` in debug); a malformed per-user `config.json` prevents startup. |
| Route returns `404 Not Found` | The routing key `host + '/' + firstPathSegment` has no match — check `config.json` (baseURL must match the requested host, including the port when serving on a non-standard port). |
| Proxy not reloading routes | `fs.watchFile` uses mtime; ensure the file is actually saved with a newer mtime. |
| Users see each other's files | Should not happen: each `deskSU.js` drops to its own uid. Verify no app is accidentally running as root (`pm2 list`, check log). Note that debug mode (non-root) intentionally shares one account — not isolated. |

## Security notes

- Run everything as root **only** because privileged ports and per-user
  privilege drops are needed; the proxy and each desk app drop to unprivileged
  users immediately.
- Keep `config.json` and `cert/` permissions tight (`chmod 600` / root-owned)
  since `config.json` reveals per-user ports and `cert/` holds private keys.
- `httpAllowed` disables the HTTP→HTTPS redirect for listed hosts — only enable
  it on trusted networks.
