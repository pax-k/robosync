# mdsync

MDSync is the first product implementation of HA2HA, the Human-Agent to Human-Agent Protocol.

HA2HA is an open protocol for human-agent pairs to coordinate with other human-agent pairs through shared, versioned, inspectable Markdown workspaces. MDSync is the hosted app, backend, and browser/editor experience that implements it.

This project started from Better-T-Stack and now uses a Vite React web app plus a Hono Worker API.

## Protocol And Product Docs

- [Docs Index](docs/README.md)
- [Testing Strategy](TESTING_STRATEGY.md)
- [v0 Foundation And Demo Scope](docs/v0/README.md)
- [HA2HA Protocol](docs/v1/ha2ha-protocol.md)
- [MDSync Product Roadmap](docs/v2/product-roadmap.md)
- [Execution Sprints And Tasks](docs/README.md#execution-tracking)

## Features

- **TypeScript** - For type safety and improved developer experience
- **Vite + React** - Browser workspace application
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `dev` and `deploy`.

1. Generate migration files:

```bash
pnpm run db:generate
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

The Vite workspace UI lives in `apps/web/src`. Static styles are in `apps/web/src/index.css`.

## Deployment

### Cloudflare via Alchemy

- Target: web + HA2HA docs + server
- Dev: pnpm run dev
- Deploy: pnpm run deploy
- Destroy: pnpm run destroy

For more details, see the guide on [Deploying to Cloudflare with Alchemy](https://www.better-t-stack.dev/docs/guides/cloudflare-alchemy).

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

Current structure:

```
mdsync/
├── apps/
│   ├── web/         # Frontend application (Vite React)
│   └── server/      # Backend API (Hono, TRPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

Target public split:

```txt
apps/
  ha2ha/       # public HA2HA protocol website and docs
  mdsync/      # MDSync public landing/product site
  web/         # MDSync workspace application
  server/      # MDSync API/backend implementation

packages/
  ha2ha-protocol/   # schemas, constants, examples, validators
  ha2ha-http/       # HTTP profile helpers/client/conformance
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the Vite web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:generate`: Generate database client/types
- `pnpm run deploy:server`: Deploy only the backend Worker, D1, and R2 resources
- `pnpm run check`: Run Biome formatting and linting

## MDSync Backend

The workspace backend is implemented as Hono REST/raw routes on the server Worker. D1 stores workspace metadata and file indexes; R2 stores file bytes.

Backend smoke test commands are documented in [docs/v0/backend-smoke.md](docs/v0/backend-smoke.md).
