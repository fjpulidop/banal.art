---
paths:
  - "src/**"
---

# Fullstack Conventions (Next.js 16)

## TypeScript
- Strict mode enabled. No `any` unless absolutely necessary.
- Prefer `interface` over `type` for object shapes.
- Use `as const` for literal types, not enums.

## React & Next.js
- Functional components only, with React hooks.
- `"use client"` directive required for components using hooks, browser APIs, or event handlers.
- App Router patterns: route handlers in `src/app/api/*/route.ts`, pages in `src/app/*/page.tsx`.
- Path alias: `@/*` maps to `./src/*` — always use it for imports.

## Naming
- Files: camelCase for utilities (`canvas.ts`), PascalCase for components (`UserMenu.tsx`).
- Variables/functions: camelCase.
- Components/interfaces: PascalCase.
- CSS variables: kebab-case (`--font-serif`, `--accent`).

## Styling
- Tailwind CSS v4 with CSS variables defined in `src/app/globals.css`.
- Use `var(--font-serif)` via `font-[family-name:var(--font-serif)]` for museum aesthetic.
- Use `var(--accent)`, `var(--muted)`, `var(--border)` for consistent theming.
- Mobile-first responsive: base styles for mobile, `md:` for desktop.

## API Routes
- Validate all inputs from `request.formData()` or `request.json()`.
- Return proper HTTP status codes (400, 429, 500).
- Always handle missing `ANTHROPIC_API_KEY` with mock/fallback data.
- `ELEVENLABS_API_KEY` is optional — degrade gracefully.

## i18n
- All user-facing strings go through `src/lib/i18n.ts`.
- Support EN and ES. Detect locale from browser via `detectLocale()`.
- Translation keys use camelCase.

## Error Handling
- API routes: try/catch with fallback to mock data on Claude API errors.
- Client: display user-friendly error messages from `t.genericError`.
- Audio: fail silently — audio is a nice-to-have feature.
