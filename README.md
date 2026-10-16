# req

![CI](https://github.com/kefyusuf/req-cli/actions/workflows/ci.yml/badge.svg)
![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![deps](https://img.shields.io/badge/dependencies-0-blue)

An unbloated Postman: fire an HTTP request from the terminal in one line. A dependency-free Node CLI.

## Why
When you don't want to open a browser or a heavy GUI just to hit one API endpoint. Zero runtime dependencies, with a pure and testable core.

## Install
```
npm install -g req-tern     # the command is `req`
```
From a clone, for development:
```
git clone https://github.com/kefyusuf/req-cli && cd req-cli
npm link                    # then `req ...` works from anywhere
```
Node 20+ is the only requirement; the package has no runtime dependencies, so there is nothing to `npm install`.

## Usage
```
req [METHOD] URL [-H name:value]... [-d body | -f file] [--env path] [--timeout ms] [--no-history]
req --history
```
- `URL`: either `:PORT/path` (→ `http://localhost`) or a full `http(s)://` address.
- If no `METHOD` is given, it defaults to `GET`.
- `-H` is repeatable; its value may contain `:`.
- `{VARIABLE}` tokens are resolved from the `--env` file (default `./.env`).
- Usage errors (unknown flag, extra argument, `-d` with `-f`, a body on `GET`/`HEAD`,
  an unreadable `--env` or `-f` file, an unresolved `{VARIABLE}`) print a message and exit `2`;
  no request is sent and nothing is recorded.

### History
`req --history` lists the last 50 requests from `~/.req/history.json`, newest first.
Before an entry is stored, URL userinfo and secret-looking query parameters
(`token`, `api_key`, `password`, `auth`, …) are replaced with `***`, and the file is written
`0600` inside a `0700` directory. History failures never change the outcome of the request itself.

### Examples
```
req :8080/users
req POST :3000/login -H Content-Type:application/json -d '{"u":"a"}'
req --env .env GET '{BASE}/items' -H 'Authorization:Bearer {TOKEN}'
req --history
```

## Architecture (test-first slices)
```
src/args.js      parseArgs        — argv -> {method,url,headers,body,bodyFile}
src/request.js   sendRequest      — fetch + AbortController timeout + JSON/text normalize
src/env.js       parseEnv/interpolate
src/options.js   extractOptions   — strips req flags (--env/--timeout/--history) before parsing
src/history.js   append/loadHistory — newest-first, file-backed (default ~/.req/history.json)
src/output.js    format/formatHistory
src/cli.js       run()            — wires everything, exit codes 0/1/2
```
Network code is tested via injected `fetch`/`readFile`; integration tests run against a real `node:http` server.

## Test
```
npm test
```

## Note
This is a learning/portfolio piece, built around JavaScript fundamentals (async, I/O, parsing) and TDD practice.

## License
MIT — see [LICENSE](LICENSE).
