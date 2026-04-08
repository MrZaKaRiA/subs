# Subs

Open source subscription tracker built for people who want a fast, simple way to understand recurring costs.

Subs helps you log your subscriptions, view totals across currencies, and keep track of upcoming payments without sending your data to third-party services.

## Live Demo

Try it now: [subs.ajnart.fr](https://subs.ajnart.fr)

![Demo GIF](https://github.com/user-attachments/assets/ffb88333-6c4d-46c9-9ca7-49602106e5f1)

## What You Can Do

- Add, edit, and delete subscriptions
- Track billing cycles (daily, weekly, monthly, yearly)
- Show next payment date with automatic future-date calculation
- Search, sort, and filter subscriptions
- View totals in multiple currencies with conversion rates
- Import and export your subscriptions as JSON
- Use keyboard shortcuts for common actions
- Use a responsive interface on desktop and mobile

## Tech Stack

- Remix + React
- Tailwind CSS + shadcn/ui
- Zustand for client-side state
- Playwright for end-to-end tests
- Biome for linting/formatting

## Storage Options

Subs supports two persistence modes:

1. Browser storage
2. Server-side JSON file storage

The mode is controlled by `USE_LOCAL_STORAGE`.

- `USE_LOCAL_STORAGE=true`: use browser local storage
- `USE_LOCAL_STORAGE=false` (default): use server endpoint storage in `data/config.json`

## Quick Start

### Requirements

- Node.js 20+
- npm or Bun

### Install

Using npm:

```bash
npm install
```

Using Bun:

```bash
bun install
```

### Run Development Server

Using npm:

```bash
npm run dev
```

Using Bun:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run production build
- `npm run test` - run Playwright tests
- `npm run test:ui` - open Playwright UI mode
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - lint with Biome
- `npm run format` - format with Biome

## Docker

Run with Docker:

```bash
docker run -p 7574:7574 -v ./data:/app/data --name subs --rm ghcr.io/ajnart/subs
```

Then open [http://localhost:7574](http://localhost:7574).

### Docker Compose

```yaml
services:
  subs:
    image: ghcr.io/ajnart/subs
    container_name: subs
    ports:
      - "7574:7574"
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    # environment:
    #   - USE_LOCAL_STORAGE=true
```

Start it:

```bash
docker compose up -d
```

## Keyboard Shortcuts

- `n` - open Add Subscription
- `/` - focus Search
- `Ctrl/Cmd + e` - export JSON
- `Ctrl/Cmd + i` - import JSON
- `?` - open keyboard shortcuts dialog
- `Escape` - close open dialog/popover

## Project Structure

- `app/routes/_index.tsx` - main dashboard view
- `app/components/` - UI and feature components
- `app/store/subscriptionStore.ts` - subscription state and persistence
- `app/utils/nextPaymentDate.ts` - billing cycle date logic
- `tests/` - Playwright test suite

## Contributing

Contributions are welcome.

1. Fork and clone the repository.
2. Create a feature branch.
3. Run checks before opening a PR:

```bash
npm run typecheck
npm run test
```

4. Open a pull request with a clear description of changes.

## License

MIT
