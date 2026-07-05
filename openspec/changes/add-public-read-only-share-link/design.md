# Design - add-public-read-only-share-link

## Context
The ticket assumes saved-gallery and Supabase surfaces from ticket #1, including `src/app/api/gallery/route.ts`, `src/app/api/gallery/[id]/route.ts`, `src/app/gallery/[id]/page.tsx`, `src/components/gallery/GalleryDetailClient.tsx`, `src/components/gallery/CritiqueResultCard.tsx`, and `supabase/migrations/`. This worktree currently contains the base critique generator, auth wiring, i18n, and share handlers in `src/app/page.tsx`, but not those gallery/Supabase files. The implementation therefore must either build on files added by the developer's current branch state or create the missing saved-gallery seams before adding public sharing.

Scope: both, security-sensitive

## Goal
Allow an authenticated owner to opt a saved critique into a revocable unlisted public URL that unauthenticated visitors can view read-only.

## Non-Goals
- Do not expose a public gallery, feed, search page, or directory.
- Do not allow comments, likes, or other social interaction on shared pages.
- Do not allow sharing critiques that have not been persisted to the owner's gallery.
- Do not require login to consume a valid share URL.
- Do not index shared pages in search engines.

## Design

### Architecture
Persist sharing as an optional token on the existing saved critique row. Owner-only gallery APIs mutate the token; public share APIs only resolve an existing non-null token. The share page is an App Router server page that fetches the public resolver and renders the existing critique display component in a read-only configuration.

The intended flow is:

```text
owner gallery detail
  PATCH /api/gallery/[id] { shared: true|false }
    -> verify session owns critique
    -> set share_token = randomUUID() or null
    -> return shareUrl when enabled

visitor /share/[token]
  -> GET /api/share/[token]
    -> find critique by share_token
    -> create signed media URLs
    -> render read-only CritiqueResultCard
```

### Data shapes
```ts
type Critique = {
  id: string;
  user_id: string;
  titulo: string;
  critica: string;
  image_path: string;
  audio_path?: string | null;
  share_token: string | null;
};
```

```ts
type ShareApiResponse = {
  titulo: string;
  critica: string;
  imageUrl: string;
  audioUrl?: string;
};
```

```ts
type GallerySharePatchRequest = {
  shared: boolean;
};
```

```ts
type GallerySharePatchResponse = {
  id: string;
  share_token: string | null;
  shareUrl: string | null;
};
```

### State & lifecycle
`share_token === null` means the critique is private and any previous share URL no longer resolves. Enabling sharing on a private row generates one random UUID token and stores it. Enabling an already-shared row keeps the existing token stable. Revoking sharing sets `share_token` to null, causing the next `/api/share/[token]` or `/share/[token]` request to return not found.

### Public API / surface
```ts
// Public, no auth.
GET /api/share/[token]
// 200: ShareApiResponse
// 404: invalid, missing, or revoked token
```

```ts
// Authenticated owner only.
PATCH /api/gallery/[id]
// body: GallerySharePatchRequest
// 200: GallerySharePatchResponse
// 401: unauthenticated
// 403 or 404: critique not owned by session user
```

```tsx
// Server page, unlisted and noindex/nofollow.
src/app/share/[token]/page.tsx
export const metadata = { robots: { index: false, follow: false } };
```

```ts
// Result-card share helpers should prefer the public URL when available.
buildWhatsAppUrl(shareUrl?: string)
buildTwitterUrl(shareUrl?: string)
handleCopy(shareUrl?: string)
```

### Trade-offs

| Option | Pros | Cons | Chosen? |
|---|---|---|---|
| Store nullable `share_token` on `critiques` | Simple revoke semantics, no extra join, matches ticket contract | A single active public URL per critique | Yes |
| Separate `critique_shares` table | Supports richer share audit/history later | More schema/API complexity than the requested feature | No |
| Public page queries storage/database directly | Fewer internal HTTP hops | Duplicates token resolution and signed-URL logic | No |
| Public page calls `/api/share/[token]` | Keeps public resolution in one route and makes 404 behavior testable | Requires absolute URL handling in server page | Yes |

The nullable token column is the smallest design that satisfies revocation, ownership, and unlisted URL requirements without creating a broader sharing model.

## Risks
- The worktree may not contain ticket #1's gallery/Supabase code; mitigate by creating the required files behind the ticket's named contract if they are still absent.
- Public token lookup must not leak owner identity or private rows; mitigate by selecting only display fields and requiring a non-null exact `share_token`.
- Token mutation is security-sensitive because it exposes private content; mitigate by using the existing `auth()` session and owner check in `PATCH /api/gallery/[id]`.
- Signed media URL code can drift between gallery and share routes; mitigate by reusing the same helper or exact Supabase storage pattern from gallery when available.
- Public page metadata can be easy to miss; mitigate with an explicit test/assertion for `robots.index === false` and `robots.follow === false`.

## Open questions
- The current worktree does not include the saved-gallery persistence from ticket #1; the developer must confirm whether those files exist in their branch state before deciding between extending them and creating them.
