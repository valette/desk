# AGENTS.md

Guidance for AI coding agents (and human contributors) working in this
repository. Read this before editing.

## What this repo is

`desk` is the **Node.js server component** of the DESK remote desktop
environment. It is a thin HTTP + Socket.IO server built on top of the
`desk-base` action engine and serves the `desk-ui` web frontend. It does **not**
implement actions itself — action execution lives in `desk-base`
(`lib/cl-rpc.js`, `lib/config.js`, `lib/includes/*`).

- Language: JavaScript (CommonJS, Node).
- Entry point: `desk.js`.
- License: BSD-3-Clause.
- Frontend source: [valette/desk-ui](https://github.com/valette/desk-ui)
- Engine library: [valette/desk-base](https://github.com/valette/desk-base)

## Key invariants (do not break these)

1. **Root directory**: `deskDir` is `desk-base`'s `getRootDir()`, resolved in
   `desk-base/lib/index.js` as `process.env.DESK_ROOTDIR || ~/desk` (trailing
   slash normalized). Everything the server reads/writes lives under this root.
2. **Exposed directories**: only sub-directories declared in the action
   `dataDirs` (default: `data`, `code`, `home`, plus hidden `cache`, `actions`)
   may be accessed. Any `output_directory`/file path must resolve inside one of
   them — root (`/`) or arbitrary absolute paths are rejected by
   `validatePath` ("path ... not allowed"). Test/demo paths should use `data/...`
   or `code/...`.
3. **Authentication**: HTTP Basic auth. `id` is read from
   `<rootDir>/password.json` (stored as a SHA-256 hash); if absent, the default
   `{ username: process.env.USER, password: "password" }` is converted and
   written on first launch. The Socket.IO connection is authenticated from
   `socket.request.headers.authorization`.
4. **Socket protocol** (client → server): `action`, `setEmitLog`, `newTerminal`,
   `password`, ... Server → client: `actions updated` (settings on connect),
   `action started`, `action finished`, `actionEvent` (stdout/stderr/output),
   `log`.
5. **Serving**: `homeURL` (`/` or `/DESK_PREFIX/`) serves `desk-ui`'s
   `compiled/dist` (from `node_modules`) as static, then `deskDir` (with
   dotfiles allowed), then a directory listing. Socket.IO path is
   `<homeURL>socket.io`.

## Environment variables

| Variable | Meaning |
|----------|---------|
| `DESK_ROOTDIR` | Absolute root directory of the server (see above). Use this to isolate/test with a custom root. |
| `PORT` | HTTP port (default `8080`). |
| `DESK_PREFIX` | URL path prefix, e.g. `desk` → served under `/desk/`. |
| `DESK_SINGLE` | Disables the IPC server and cron cache cleaner (used in tests). |
| `USER` | Default username when `password.json` is absent. |

## Testing

For an isolated test run (no touch of the real `~/desk`), launch with a custom
root on a free port:

```bash
DESK_ROOTDIR=$(mktemp -d) DESK_SINGLE=1 PORT=8080 node desk.js
```

The desk-web library integration test does exactly this — see
`desk-web/scripts/test-integration.cjs`.

## Conventions

- CommonJS `require`/`module.exports`; keep `desk.js` thin — push logic into
  `desk-base`.
- Do not hardcode the root directory; always go through
  `desk-base`'s `getRootDir()` so `DESK_ROOTDIR` keeps working.
