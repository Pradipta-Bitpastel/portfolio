# Developer Control Core

Alex Chen's portfolio — a single long-scroll Next.js 14 experience driving a live 3D "developer control core" with GSAP-choreographed sections.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alexchen/developer-control-core)

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- React Three Fiber + drei + postprocessing
- GSAP 3 (ScrollTrigger + Club plugins) with Lenis smooth-scroll fallback
- Tailwind CSS
- Playwright (E2E), Vitest (unit), Lighthouse CI (perf)

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

## Commands

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Local dev server at http://localhost:3000      |
| `npm run build`      | Production build (`next build`)                |
| `npm run start`      | Serve the production build (`next start`)     |
| `npm run lint`       | `next lint`                                    |
| `npm run typecheck`  | `tsc --noEmit`                                 |
| `npm run test:e2e`   | Playwright E2E suite                           |
| `npm run lighthouse` | Lighthouse CI (performance budget enforcement) |

Typical local flow:

```bash
npm run build && npm run start      # serve the optimized bundle
npm run test:e2e                    # Playwright across sections
npm run lighthouse                  # LHCI perf budget check
```

## Environment

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SITE_URL=https://portfolio.vercel.app
```

Used by `app/sitemap.ts` and any canonical-URL metadata.

## Mobile / low-power fallback

Visitors on narrow viewports, low core counts, or with `prefers-reduced-motion` get a lightweight SVG stand-in of the scene instead of the WebGL canvas. See `components/SvgCoreFallback.tsx`.

## Deploy

Designed for Vercel. `vercel.json` pins the IAD region and adds baseline security headers. Click the Deploy button above or push to main.
