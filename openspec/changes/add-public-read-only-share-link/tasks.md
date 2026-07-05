# Implementation Tasks

> The developer agent runs these in order. Each "## N." block is
> a single TDD cycle: write the failing test, run it to confirm
> it fails, write production code, run again to confirm it
> passes. Do NOT skip the failing-test step.

## 1. Persist share tokens on saved critiques
- [x] 1.1 Write a failing schema or route-level test that expects saved critique records to expose `share_token: string | null` and defaults it to null. Run the test runner; the new test MUST fail.
- [x] 1.2 Implement the minimum persistence change in `supabase/migrations/<timestamp>_add_share_token_to_critiques.sql` and any local type used by gallery APIs so `share_token` exists and defaults to null. Run the test runner; ALL tests MUST pass.
- [x] 1.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 2. Toggle and revoke sharing through the owner-only gallery API
- [x] 2.1 Write failing API tests for `PATCH /api/gallery/[id]` covering unauthenticated rejection, non-owner rejection, enabling share with a random token, stable re-enable behavior, and revoking to null. Run the test runner; the new tests MUST fail.
- [x] 2.2 Implement the minimum production code in `src/app/api/gallery/[id]/route.ts` to verify ownership and set or clear `share_token`. Run the test runner; ALL tests MUST pass.
- [x] 2.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 3. Resolve public share tokens without authentication
- [x] 3.1 Write failing API tests for `GET /api/share/[token]` covering valid token response, missing token 404, revoked/null token 404, and signed image/audio URL behavior. Run the test runner; the new tests MUST fail.
- [x] 3.2 Implement the minimum production code in `src/app/api/share/[token]/route.ts` to query by exact non-null token and return only `titulo`, `critica`, `imageUrl`, and optional `audioUrl`. Run the test runner; ALL tests MUST pass.
- [x] 3.3 Refactor signed-URL generation into a shared helper only if it removes duplication with gallery routes. Run the test runner; all tests still pass.

## 4. Render the public read-only share page
- [x] 4.1 Write failing page/component tests for `src/app/share/[token]/page.tsx` asserting a valid token renders title, critique, image, optional audio, no reset/variation/delete controls, and noindex/nofollow metadata. Run the test runner; the new tests MUST fail.
- [x] 4.2 Implement the minimum production code in `src/app/share/[token]/page.tsx` and `src/components/gallery/CritiqueResultCard.tsx` to render a read-only card from the share API response. Run the test runner; ALL tests MUST pass.
- [x] 4.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 5. Expose share controls in gallery detail
- [x] 5.1 Write failing component tests for `src/components/gallery/GalleryDetailClient.tsx` covering enable, copyable `/share/[token]` URL display, revoke confirmation, loading/error states, and owner-only API interaction. Run the test runner; the new tests MUST fail.
- [x] 5.2 Implement the minimum production code in `src/components/gallery/GalleryDetailClient.tsx` to call `PATCH /api/gallery/[id]`, show the share URL when enabled, and revoke immediately when requested. Run the test runner; ALL tests MUST pass.
- [x] 5.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 6. Use public share URLs in result-card share actions
- [x] 6.1 Write failing component tests for `src/components/gallery/CritiqueResultCard.tsx` asserting WhatsApp, X, and copy-link actions include the provided public share URL and fall back to `window.location.origin` only when no share URL exists. Run the test runner; the new tests MUST fail.
- [x] 6.2 Implement the minimum production code in `src/components/gallery/CritiqueResultCard.tsx` to accept a `shareUrl` prop and thread it through `buildWhatsAppUrl`, `buildTwitterUrl`, and `handleCopy`. Run the test runner; ALL tests MUST pass.
- [x] 6.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 7. Add localized public-sharing copy
- [x] 7.1 Write failing i18n tests or type assertions that require EN and ES strings for share toggle, revoke confirmation, copied share URL, public page unavailable copy, and read-only page labels. Run the test runner; the new tests MUST fail.
- [x] 7.2 Implement the minimum production code in `src/lib/i18n.ts` and consuming components to use those strings. Run the test runner; ALL tests MUST pass.
- [x] 7.3 Refactor if needed without changing behavior. Run the test runner; all tests still pass.

## 8. Validation gate
- [x] 8.1 Run the full project test suite (`npm test` if added, otherwise `npm run lint`); all pass.
- [x] 8.2 Run the project build (`npm run build`); succeeds.
- [x] 8.3 No `console.log`, debug prints, or commented-out code in the diff.
