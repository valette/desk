# Configuration (`config.json`)

Both `manage.mjs` and `proxy.js` read the **same** `config.json` file located
next to them in the `proxy/` directory. A template is provided as
`config.json.example` — copy it to `config.json` and edit.

```bash
cd proxy
cp config.json.example config.json
```

`manage.mjs` is the owner of the file: after every `add` / `remove` / `init` it
re-sorts and rewrites it (so real port numbers appear). `proxy.js` reads it at
startup and **hot-reloads** it whenever the file changes, so manual edits to
routing-only fields take effect without a restart.

## Top-level schema

| Field | Type | Required | Consumed by | Description |
|-------|------|----------|-------------|-------------|
| `ports` | object `{ user: port }` | yes | both | Per-user DESK ports. `manage.mjs` starts one DESK app per key; `proxy.js` routes `/<user>/` to `http://<baseURL>:<port>`. A `0` placeholder means "allocate at runtime". |
| `unmanaged` | object `{ name: target }` | no | both | Ports/URLs not managed by PM2. `manage.mjs` never starts these; it only merges them into `ports` when saving so `proxy.js` keeps routing to them. |
| `baseURL` | string | no | proxy | Hostname used to build routes (e.g. `desk.example.org`). Defaults to `os.hostname()`. |
| `defaultRoutes` | object `{ host: url }` | no | proxy | For a bare root request (`/`), the proxy `302`-redirects `host` to `url`. |
| `httpAllowed` | object `{ host: true }` | no | proxy | Hosts served over plain HTTP instead of redirected to HTTPS. |
| `otherRoutes` | object `{ "host/path": url }` | no | proxy | Extra external routes, added verbatim: key = routing key, value = target URL. |
| `env` | object | no | manage | Extra environment variables applied to **every** per-user DESK app. |

## Example

```json
{
	"ports" : {
		"alice" : 49152,
		"bob"   : 49153
	},
	"unmanaged" : {
		"matrix" : 3000
	},
	"baseURL" : "desk.example.org",
	"defaultRoutes" : {
		"desk.example.org" : "https://desk.example.org/alice/"
	},
	"httpAllowed" : {
		"intranet.example.org" : true
	},
	"otherRoutes" : {
		"desk.example.org/wiki" : "http://192.168.1.20:8080"
	},
	"env" : {
		"NODE_OPTIONS" : "--max-old-space-size=2048"
	}
}
```

With the above:

- `https://desk.example.org/` → `302` to `https://desk.example.org/alice/`
- `https://desk.example.org/alice/...` → `http://desk.example.org:49152/...`
- `https://desk.example.org/bob/...` → `http://desk.example.org:49153/...`
- `https://desk.example.org/wiki/...` → `http://192.168.1.20:8080/...`
- `https://desk.example.org/matrix/...` → `http://desk.example.org:3000/...`
- `http://intranet.example.org/...` → served over HTTP (no redirect)

## Field details

### `ports` vs `unmanaged`

- `ports` entries are **managed**: `manage.mjs` ensures a DESK app runs for
  each user and writes the real allocated port back here.
- `unmanaged` entries are **not** started by the manager. They let you expose a
  service that runs independently (another process, another machine) at the
  same base URL. The manager copies them into `ports` on save purely so the
  proxy can route to them, but never starts/stops them.

> Note: after a `manage.mjs` run, `unmanaged` entries are copied into `ports`
> (with the `ports` value becoming the string target). This is an internal
> detail — treat `ports` + `unmanaged` as the combined routing source of truth.

### `ports` is an object

`ports` must be a JSON **object** mapping usernames to port numbers, iterated
with `Object.entries`. Do not use an array — the manager and proxy rely on
key/value semantics. (An early template incorrectly showed array syntax; it has
been fixed.)

## TLS certificates

Separate from `config.json`, `proxy.js` reads TLS material from `cert/` next to
itself:

| File | Required | Purpose |
|------|----------|---------|
| `cert/privatekey.pem` | yes | TLS private key |
| `cert/certificate.pem` | yes | TLS certificate |
| `cert/chain.pem` | no | CA chain; a warning is logged if absent |

See [deployment.md](deployment.md) for generating certificates.

## Per-user desk config (`/home/<user>/desk/config.json`)

Independent of `config.json`, the manager also reads
`/home/<user>/desk/config.json` for an optional `boot` field:

```json
{ "boot": "/home/alice/desk/startup.js" }
```

If present, `manage.mjs` sets `DESK_STARTUP` to that path, and `deskSU.js`
loads it instead of the default `../desk.js`. A malformed file prevents that
user's app from starting (a warning is printed).

## Environment variables set per user

When starting a user's app, `manage.mjs` sets the following environment (in
addition to `env` from `config.json`):

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | allocated port | the DESK HTTP port |
| `USER` | username | default auth identity |
| `DESK_USER` | username | used by `deskSU.js` for uid/gid switch |
| `DESK_PREFIX` | username | URL prefix routed by the proxy |
| `HOME` | `/home/<user>` | user home |
| `LOGNAME` | username | login name |
| `CCACHE_DIR` | `/home/<user>/.ccache` | compiler cache |
| `DESK_STARTUP` | optional | custom boot script from desk config |
