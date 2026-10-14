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
| `EACCES` binding port 80/443 | Proxy must start as root; ensure the privilege drop happens after `listen`. |
| `no .ca file provided` warning | `cert/chain.pem` missing — only a warning; supply a chain if your CA requires it. |
| User's app not starting | Check `/home/<user>/desk/log.txt`; a malformed `/home/<user>/desk/config.json` prevents startup. |
| Route returns `404 Not Found` | The routing key `host + '/' + firstPathSegment` has no match — check `config.json` (baseURL must match the requested host). |
| Proxy not reloading routes | `fs.watchFile` uses mtime; ensure the file is actually saved with a newer mtime. |
| Users see each other's files | Should not happen: each `deskSU.js` drops to its own uid. Verify no app is accidentally running as root (`pm2 list`, check log). |

## Security notes

- Run everything as root **only** because privileged ports and per-user
  privilege drops are needed; the proxy and each desk app drop to unprivileged
  users immediately.
- Keep `config.json` and `cert/` permissions tight (`chmod 600` / root-owned)
  since `config.json` reveals per-user ports and `cert/` holds private keys.
- `httpAllowed` disables the HTTP→HTTPS redirect for listed hosts — only enable
  it on trusted networks.
