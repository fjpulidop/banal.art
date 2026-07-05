import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  createInitialShareState,
  patchGalleryShare,
  resolveShareToken,
  resetGalleryCritiquesForTests,
  seedGalleryCritiquesForTests,
  simulateGalleryStoreReloadForTests,
  type GalleryCritique,
} from "../src/lib/galleryShare";
import {
  buildCopyText,
  buildTwitterUrl,
  buildWhatsAppUrl,
  CritiqueResultCard,
} from "../src/components/gallery/CritiqueResultCard";
import { GalleryDetailClient } from "../src/components/gallery/GalleryDetailClient";
import SharePage, { metadata } from "../src/app/share/[token]/page";
import { getTranslations } from "../src/lib/i18n";

const ownerId = "owner@example.com";
const otherUserId = "other@example.com";

function critique(overrides: Partial<GalleryCritique> = {}): GalleryCritique {
  return {
    id: "critique-1",
    user_id: ownerId,
    titulo: "Chair with Existential Burden",
    critica: "The chair refuses the room while becoming the room.",
    image_path: "images/chair.jpg",
    audio_path: "audio/chair.mp3",
    share_token: null,
    ...overrides,
  };
}

test.afterEach(() => {
  resetGalleryCritiquesForTests();
});

test("migration adds nullable share_token defaulting to null", () => {
  const migrationDir = join(process.cwd(), "supabase", "migrations");
  const migration = readdirSync(migrationDir).find((file) =>
    file.endsWith("_add_share_token_to_critiques.sql"),
  );

  assert.ok(migration, "expected add_share_token migration");
  const sql = readFileSync(join(migrationDir, migration), "utf8");
  assert.match(sql, /share_token\s+uuid/i);
  assert.match(sql, /default\s+null/i);
  assert.match(sql, /unique/i);
});

test("gallery share state exposes share_token null by default", () => {
  const state = createInitialShareState(critique());
  assert.equal(state.share_token, null);
  assert.equal(state.shareUrl, null);
});

test("PATCH gallery share rejects unauthenticated and non-owner callers", async () => {
  seedGalleryCritiquesForTests([critique()]);

  assert.equal(
    (await patchGalleryShare("critique-1", { shared: true }, null, "https://banal.art")).status,
    401,
  );
  assert.equal(
    (
      await patchGalleryShare(
        "critique-1",
        { shared: true },
        { id: otherUserId },
        "https://banal.art",
      )
    ).status,
    404,
  );
});

test("PATCH gallery share enables stable token and revokes to null", async () => {
  seedGalleryCritiquesForTests([critique()]);

  const enabled = await patchGalleryShare(
    "critique-1",
    { shared: true },
    { id: ownerId },
    "https://banal.art",
  );
  assert.equal(enabled.status, 200);
  assert.match(enabled.body?.share_token ?? "", /^[0-9a-f-]{36}$/i);
  assert.equal(enabled.body?.shareUrl, `https://banal.art/share/${enabled.body?.share_token}`);

  const reenabled = await patchGalleryShare(
    "critique-1",
    { shared: true },
    { id: ownerId },
    "https://banal.art",
  );
  assert.equal(reenabled.body?.share_token, enabled.body?.share_token);

  const revoked = await patchGalleryShare(
    "critique-1",
    { shared: false },
    { id: ownerId },
    "https://banal.art",
  );
  assert.equal(revoked.body?.share_token, null);
  assert.equal(revoked.body?.shareUrl, null);
});

test("gallery share mutations persist across store reloads", async () => {
  seedGalleryCritiquesForTests([critique()]);

  const enabled = await patchGalleryShare(
    "critique-1",
    { shared: true },
    { id: ownerId },
    "https://banal.art",
  );
  const token = enabled.body?.share_token;
  assert.ok(token);

  simulateGalleryStoreReloadForTests();
  const found = await resolveShareToken(token);
  assert.equal(found.status, 200);
  assert.equal(found.body?.titulo, "Chair with Existential Burden");

  await patchGalleryShare("critique-1", { shared: false }, { id: ownerId }, "https://banal.art");
  simulateGalleryStoreReloadForTests();
  assert.equal((await resolveShareToken(token)).status, 404);
});

test("public share resolver returns display fields and signed media only for valid tokens", async () => {
  seedGalleryCritiquesForTests([critique({ share_token: "8bbd0d81-2eda-4ed9-8958-f0d32db4c639" })]);

  const found = await resolveShareToken("8bbd0d81-2eda-4ed9-8958-f0d32db4c639");
  assert.equal(found.status, 200);
  assert.deepEqual(Object.keys(found.body ?? {}).sort(), [
    "audioUrl",
    "critica",
    "imageUrl",
    "titulo",
  ]);
  assert.match(found.body?.imageUrl ?? "", /signed=true/);
  assert.match(found.body?.audioUrl ?? "", /signed=true/);

  assert.equal((await resolveShareToken("unknown")).status, 404);
  seedGalleryCritiquesForTests([critique({ share_token: null })]);
  assert.equal((await resolveShareToken("8bbd0d81-2eda-4ed9-8958-f0d32db4c639")).status, 404);
});

test("share page is noindex and renders valid token as a read-only card", async () => {
  seedGalleryCritiquesForTests([critique({ share_token: "8bbd0d81-2eda-4ed9-8958-f0d32db4c639" })]);

  assert.deepEqual(metadata.robots, { index: false, follow: false });
  const pageSource = readFileSync(join(process.cwd(), "src/app/share/[token]/page.tsx"), "utf8");
  assert.match(pageSource, /api\/share\/\[token\]\/route/);
  assert.doesNotMatch(pageSource, /resolveShareToken/);

  const element = await SharePage({ params: Promise.resolve({ token: "8bbd0d81-2eda-4ed9-8958-f0d32db4c639" }) });
  const html = renderToStaticMarkup(element);
  assert.match(html, /Chair with Existential Burden/);
  assert.match(html, /The chair refuses/);
  assert.doesNotMatch(html, /Generate Another Critique|New Exhibit|Delete|Revoke/i);
});

test("gallery detail renders share controls with enabled URL and revoke copy", () => {
  const html = renderToStaticMarkup(
    <GalleryDetailClient
      critique={critique({ share_token: "8bbd0d81-2eda-4ed9-8958-f0d32db4c639" })}
      initialShareUrl="https://banal.art/share/8bbd0d81-2eda-4ed9-8958-f0d32db4c639"
      locale="en"
    />,
  );

  assert.match(html, /https:\/\/banal\.art\/share\/8bbd0d81-2eda-4ed9-8958-f0d32db4c639/);
  assert.match(html, /Revoke share link/);
  assert.match(html, /Public sharing/);
});

test("result-card share helpers prefer public share URL and keep origin fallback", () => {
  const shareUrl = "https://banal.art/share/token-1";
  assert.match(decodeURIComponent(buildWhatsAppUrl("Title", "Critique", shareUrl)), /token-1/);
  assert.match(decodeURIComponent(buildTwitterUrl("Title", shareUrl)), /token-1/);
  assert.match(buildCopyText("Title", "Critique", shareUrl), /token-1/);

  assert.match(
    decodeURIComponent(buildWhatsAppUrl("Title", "Critique", undefined, "https://banal.art")),
    /https:\/\/banal\.art/,
  );
  assert.match(
    decodeURIComponent(buildTwitterUrl("Title", undefined, "https://banal.art")),
    /https:\/\/banal\.art/,
  );
  assert.match(buildCopyText("Title", "Critique", undefined, "https://banal.art"), /https:\/\/banal\.art/);
});

test("i18n includes public sharing copy in English and Spanish", () => {
  for (const locale of ["en", "es"] as const) {
    const t = getTranslations(locale);
    assert.equal(typeof t.shareToggle, "string");
    assert.equal(typeof t.revokeShareConfirm, "string");
    assert.equal(typeof t.shareUrlCopied, "string");
    assert.equal(typeof t.publicShareUnavailable, "string");
    assert.equal(typeof t.readOnlyShareLabel, "string");
  }
});

test("CritiqueResultCard renders read-only without owner controls", () => {
  const html = renderToStaticMarkup(
    <CritiqueResultCard
      titulo="Title"
      critica="Critique"
      imageUrl="/image.jpg"
      audioUrl="/audio.mp3"
      locale="en"
      readOnly
      shareUrl="https://banal.art/share/token-1"
    />,
  );

  assert.match(html, /Title/);
  assert.match(html, /Critique/);
  assert.match(html, /audio/);
  assert.doesNotMatch(html, /Generate Another Critique|New Exhibit|Delete|Revoke/i);
});
