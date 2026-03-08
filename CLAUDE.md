# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

banal.art is a Next.js 16 app that turns photos of mundane objects into pretentious museum-style art critiques using Claude's vision API. Users upload an image, receive an AI-generated pompous critique with title, and can download/share a museum plaque image or listen to the critique via text-to-speech.

## Commands

- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- No test framework is configured

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `AUTH_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — NextAuth/Google OAuth
- `ANTHROPIC_API_KEY` — Claude API (without it, the critique endpoint returns mock data)
- `ELEVENLABS_API_KEY` — TTS (optional; audio feature gracefully degrades)

## Architecture

**Auth**: NextAuth v5 (beta) with Google provider. `src/auth.ts` exports handlers. `src/middleware.ts` redirects unauthenticated users to `/login`. The auth route handler is at `src/app/api/auth/[...nextauth]/route.ts`.

**API Routes**:
- `POST /api/critique` — Accepts multipart form (image + lang). Sends image to Claude vision API (`claude-sonnet-4-20250514`) with a system prompt that returns JSON `{titulo, critica}`. Has in-memory IP rate limiting (5/day). Falls back to hardcoded mock critiques if no API key or on error.
- `POST /api/tts` — Sends critique text to ElevenLabs streaming TTS API, returns audio/mpeg.

**Client** (`src/app/page.tsx`): Single-page client component. Handles image upload, compression, API calls, audio playback, and result display. Uses Canvas API to generate a shareable 1080x1920 museum plaque image.

**Key libraries**:
- `src/lib/canvas.ts` — Generates the downloadable/shareable museum plaque PNG via Canvas API (9:16 format)
- `src/lib/compress.ts` — Client-side image compression to JPEG, max 2MB / 1600px
- `src/lib/i18n.ts` — Simple EN/ES translations object, browser locale detection

**Styling**: Tailwind CSS v4 with CSS variables defined in `globals.css`. Uses `var(--font-serif)` for museum aesthetic. Path alias `@/*` maps to `./src/*`.

## Agent Workflow

This project uses an agent workflow system with specialized agents and commands.

### Agents (`.claude/agents/`)
- **architect** — Designs features, creates implementation plans from OpenSpec changes
- **developer** — Implements features across the full stack
- **reviewer** — CI/CD quality gate, fixes issues before PR

### Personas (`.claude/agents/personas/`)
- **"Carlos" — The Comedian** — Casual user who wants laughs from mundane photos
- **"Lucia" — The Content Creator** — Social media user who wants shareable, aesthetic content

### Commands
- `/implement` — Full pipeline: architect → develop → review → ship
- `/product-backlog` — View prioritized backlog with VPC persona scores
- `/update-product-driven-backlog` — Generate new feature ideas via product discovery

### Layer Rules
- `.claude/rules/fullstack.md` — Conventions for all code in `src/`

### OpenSpec
- **Specs**: `openspec/specs/` is the source of truth
- **Changes**: `openspec/changes/<name>/`. Use `/opsx:ff` → `/opsx:apply` → `/opsx:archive`

### Backlog
- **Provider**: GitHub Issues (Read & Write)
- **Label**: `product-driven-backlog` (create once remote is configured)
- **Git workflow**: Automatic (branch, commit, push, PR)
