# Veritas Frontend

Web UI for the [Veritas](https://github.com/veritas-msp/veritas) platform: MSP workspace, administration, and client portal.

**Stack:** React 18 · Create React App

## Requirements

- Node.js 20+
- Running [veritas-backend](https://github.com/veritas-msp/veritas-backend) instance

## Setup

```bash
cp .env.example .env
# REACT_APP_VERITAS_EDITION=community
npm install
npm start
```

App: http://localhost:3000

Initial setup: http://localhost:3000/setup

## Environment

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_BASE_URL` | API URL (empty = same origin in Docker) |
| `REACT_APP_VERITAS_EDITION` | `community` or `pro` |

## Build

```bash
npm run build
```

Production builds are served by nginx in Docker, with `/api` proxied to the backend.

## Docker

From the [veritas](https://github.com/veritas-msp/veritas) meta repository:

```bash
docker compose up -d --build veritas-frontend
```

## License

[GNU Affero General Public License v3.0-or-later](./LICENSE)
