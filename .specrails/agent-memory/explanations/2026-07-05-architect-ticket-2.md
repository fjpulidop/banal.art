# Architect - ticket #2

## Goal
Add a revocable public share link for saved critiques. The owner can opt in from gallery detail, unauthenticated recipients can view exactly that critique read-only, and share actions point at the real `/share/[token]` URL instead of the generic homepage.

## Stack
The worktree is a Next.js 16 App Router TypeScript app using React 19, NextAuth, ESLint, and Tailwind-style global CSS. Current code has the critique generator in `src/app/page.tsx`, API routes under `src/app/api`, auth in `src/auth.ts`, and translations in `src/lib/i18n.ts`; this worktree does not currently include the ticket's assumed `gallery` routes/components or `supabase/migrations` directory.

## OpenSpec change
- Slug: `add-public-read-only-share-link`
- Path: `openspec/changes/add-public-read-only-share-link/`
- Proposal: `openspec/changes/add-public-read-only-share-link/proposal.md`
- Design: `openspec/changes/add-public-read-only-share-link/design.md`
- Tasks: `openspec/changes/add-public-read-only-share-link/tasks.md`
- Spec deltas: public-share

## Files to touch
- `supabase/migrations/<timestamp>_add_share_token_to_critiques.sql` - add nullable `share_token` column to saved critiques.
- `src/app/api/gallery/[id]/route.ts` - add owner-checked `PATCH` to enable or revoke `share_token`.
- `src/app/api/share/[token]/route.ts` - add public unauthenticated token resolver with signed media URLs.
- `src/app/share/[token]/page.tsx` - add unlisted noindex/nofollow read-only share page.
- `src/components/gallery/GalleryDetailClient.tsx` - add share toggle, revoke confirmation, and share URL display/copy behavior.
- `src/components/gallery/CritiqueResultCard.tsx` - accept optional `shareUrl` and use it in WhatsApp, X, and copy-link actions.
- `src/lib/i18n.ts` - add EN/ES strings for sharing controls and public share page copy.
- `src/app/page.tsx` - if the result-card logic still lives inline, extract or adapt the existing card/share helpers so the gallery card contract exists.

## Invariants
- `share_token === null` means public token lookup returns 404.
- Tokens are generated with `randomUUID()` or an equivalent cryptographically unguessable UUID source.
- Revoke sets `share_token` to null and takes effect on the next request.
- Only the owner authenticated by `auth()` can toggle or revoke sharing through `PATCH /api/gallery/[id]`.
- Public share APIs never expose owner identity or private gallery metadata.
- `/share/[token]` always emits noindex/nofollow metadata.
- Read-only shared cards do not expose reset, variation, delete, or revoke controls.
- Share handlers use a provided share URL and only fall back to `window.location.origin` when no share URL exists.

## Edge cases
- Unknown token, malformed token, and revoked token all return not found.
- Enabling sharing twice should not rotate an existing token unless the row was revoked first.
- Audio is optional; absence of `audio_path` or signed audio URL must not block image/text rendering.
- Missing ticket #1 gallery/Supabase files in this worktree means the developer may need to create the required gallery persistence/API/component surfaces.
- Clipboard APIs or browser share APIs may be unavailable and should keep existing graceful fallback behavior.

## Validation
Run `npm run lint` for the current project validation baseline. If tests are added as part of the implementation, also run the new test command and keep it documented in `package.json`. Run `npm run build` before review because this change adds routes, server components, and typed props.

## Decisions
- Use a nullable `share_token` column instead of a separate share table because the ticket needs one active revocable URL per critique.
- Keep public token resolution in `GET /api/share/[token]` so page rendering and tests share one data-access contract.
- Treat this as `both, security-sensitive` because it adds public unauthenticated access plus owner-only mutation.
- Preserve existing share fallback behavior for unshared critiques so current generated critiques remain shareable even before they are saved.
