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
| `subdomains` | boolean | no | both | Route by **host/subdomain** (`user.baseURL`) instead of first path segment (`baseURL/user`). See below. Default `false` (subdir mode). |
| `rootDir` | string | no | manage | Root directory under which every user's `DESK_ROOTDIR` is created as `<rootDir>/<user>`. Empty/absent → default (`~/desk/debug/<user>` in debug, `/home/<user>/desk` in production). |
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
	"subdomains" : false,
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

### Subdomain mode (`subdomains: true`)

By default each user is served under a path of the base URL:
`https://desk.example.org/alice/...`. Setting `"subdomains": true` instead
serves each user under its own subdomain: `https://alice.desk.example.org/...`.

- `proxy.js` builds routes keyed by `user.baseURL` and routes on the **host**
  header only (no path prefix). Each user's `desk.js` serves at **root**
  (`homeURL = "/"`), so socket.io and xterm paths are clean.
- `manage.mjs` stops setting `DESK_PREFIX` for each user (it stays at root).
- A request to the **bare base domain** with a user path, e.g.
  `https://desk.example.org/alice/...`, is `302`-redirected to
  `https://alice.desk.example.org/...` (path + query preserved).
- `defaultRoutes` still applies to the bare base-domain root `/`; a subdomain's
  root `/` proxies straight to that user's desk.

> **Deployment prerequisites**: subdomain mode needs a **wildcard DNS** record
> (`*.desk.example.org`) pointing at the proxy and a **wildcard TLS certificate**
> covering `*.desk.example.org`. For local debug testing, add each test
> subdomain to `/etc/hosts` (e.g. `127.0.0.1 alice.localhost bob.localhost`) —
> `/etc/hosts` does not support `*` wildcards.

### `rootDir`

By default each user's desk data (`DESK_ROOTDIR`) lives at
`~/desk/debug/<user>` (debug) or `/home/<user>/desk` (production). Setting
`rootDir` relocates **all** of them under a single root, in both modes:

```json
{ "rootDir" : "/srv/desk" }
```

→ `alice`'s `DESK_ROOTDIR` becomes `/srv/desk/alice`, `bob`'s `/srv/desk/bob`,
etc. `manage.mjs` creates `<rootDir>/<user>` if missing (and `chown`s the leaf
to the user in production). The per-user `HOME` is **not** affected — it stays
the login home (`/home/<user>` in production, `os.homedir()` in debug).

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
| `DESK_USER` | username | used by `deskSU.js` for the uid/gid switch |
| `DESK_PREFIX` | username | URL prefix routed by the proxy (omitted in subdomain mode — the server then serves at root) |
| `DESK_ROOTDIR` | the user's desk root | `<rootDir>/<user>` if `rootDir` is set, else `~/desk/debug/<user>` in debug, `/home/<user>/desk` in production |
| `HOME` | home dir | the user's home (or the invoking user's home in debug) |
| `LOGNAME` | username | login name |
| `CCACHE_DIR` | `~/.ccache` | compiler cache location |
| `DESK_STARTUP` | optional | custom boot script from desk config |

## Debug / single-user mode

`manage.mjs` accepts two flags (in any position, before/after the action):

| Flag | Effect |
|------|--------|
| `--config <file>` | Use `<file>` as the shared config instead of `config.json`. **Also disables HTTPS** (proxy becomes HTTP-only) unless `--https` is passed. |
| `--https` | Force HTTPS on even when a custom config was given with `--config`. |
| `-h`, `--help` | Print usage/help and exit. |

Running `manage.mjs` as a **non-root user** enables single-user debug: no setuid
is attempted, and each configured user maps to an isolated
`DESK_ROOTDIR` = `~/desk/debug/<user>`. See `docs/deployment.md`.

## Proxy environment (`manage.mjs` passes these to the PROXY app)

| Variable | Meaning | Default |
|----------|---------|---------|
| `DESK_CONFIG` | path of the shared config file (from `--config` or `config.json`) | `config.json` |
| `DESK_HTTPS` | `1` enable HTTPS, `0` HTTP-only | `1` (production) |
| `HTTP_PORT` | HTTP redirect port (HTTPS mode) or the sole serving port (HTTP-only mode) | `80` (HTTP-only/debug defaults to `8080`) |
| `HTTPS_PORT` | TLS port (only used when `DESK_HTTPS=1`) | `443` |

When serving on a non-standard port, `config.baseURL` must include the port so
the routing key (`host + '/' + firstPathSegment`) matches what the browser
sends, e.g. `baseURL: "localhost:8080"`. Both `manage.mjs` and `proxy.js` print
the port(s) they bind on startup.
