# Add public read-only share link for a saved critique

## Why
Saved critiques need a real destination for share actions. Today the result sharing flow can only point recipients at the generic homepage, so a WhatsApp, X, or copied link does not show the specific artwork and critique the sender intended to share.

## What changes
- Add a nullable, random `share_token` for saved critiques and expose ownership-checked enable/revoke behavior.
- Add an unauthenticated `/api/share/[token]` resolver that returns only the opted-in critique data and signed media URLs.
- Add an unlisted `/share/[token]` page that renders the critique read-only and emits noindex/nofollow metadata.
- Update gallery detail sharing UI and result-card share handlers so shared critiques use `/share/[token]` URLs.
- Add EN and ES strings for the share toggle, revoke confirmation, and public share page copy.

## Impact
- Affected specs: public-share
- Affected code: Next.js App Router API routes and pages under `src/app`, gallery/result components under `src/components/gallery`, i18n strings under `src/lib/i18n.ts`, and the persistence migration/schema needed for saved critiques.
- Out of scope: public gallery listings, search-engine indexing, public comments/likes/social interactions, and sharing unsaved unauthenticated critiques.
