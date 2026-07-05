import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type GalleryCritique = {
  id: string;
  user_id: string;
  titulo: string;
  critica: string;
  image_path: string;
  audio_path?: string | null;
  share_token: string | null;
};

export type ShareApiResponse = {
  titulo: string;
  critica: string;
  imageUrl: string;
  audioUrl?: string;
};

export type GallerySharePatchResponse = {
  id: string;
  share_token: string | null;
  shareUrl: string | null;
};

type SessionUser = {
  id?: string | null;
  email?: string | null;
} | null;

type ApiResult<T> = {
  status: number;
  body: T | null;
};

let storeCache: Map<string, GalleryCritique> | null = null;

function galleryStorePath() {
  return process.env.BANAL_ART_GALLERY_STORE_PATH ?? join(process.cwd(), ".data", "gallery-critiques.json");
}

function normalizeCritique(row: GalleryCritique): GalleryCritique {
  return {
    ...row,
    audio_path: row.audio_path ?? null,
    share_token: row.share_token ?? null,
  };
}

function readCritiques() {
  if (storeCache) {
    return storeCache;
  }

  const path = galleryStorePath();
  if (!existsSync(path)) {
    storeCache = new Map();
    return storeCache;
  }

  const rows = JSON.parse(readFileSync(path, "utf8")) as GalleryCritique[];
  storeCache = new Map(rows.map((row) => [row.id, normalizeCritique(row)]));
  return storeCache;
}

function writeCritiques(rows: Map<string, GalleryCritique>) {
  const path = galleryStorePath();
  mkdirSync(dirname(path), { recursive: true });
  const serialized = JSON.stringify([...rows.values()].map(normalizeCritique), null, 2);
  writeFileSync(path, `${serialized}\n`, "utf8");
  storeCache = new Map(rows);
}

export function createInitialShareState(critique: GalleryCritique): GallerySharePatchResponse {
  return {
    id: critique.id,
    share_token: critique.share_token ?? null,
    shareUrl: critique.share_token ? `/share/${critique.share_token}` : null,
  };
}

export function seedGalleryCritiquesForTests(rows: GalleryCritique[]) {
  writeCritiques(new Map(rows.map((row) => [row.id, normalizeCritique(row)])));
}

export function resetGalleryCritiquesForTests() {
  storeCache = null;
  rmSync(galleryStorePath(), { force: true });
}

export function simulateGalleryStoreReloadForTests() {
  storeCache = null;
}

function sessionOwnsCritique(sessionUser: SessionUser, critique: GalleryCritique) {
  const userId = sessionUser?.id ?? sessionUser?.email;
  return Boolean(userId && userId === critique.user_id);
}

function publicOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

export async function patchGalleryShare(
  id: string,
  body: { shared?: unknown },
  sessionUser: SessionUser,
  origin: string,
): Promise<ApiResult<GallerySharePatchResponse>> {
  if (!sessionUser) {
    return { status: 401, body: null };
  }

  const critiques = readCritiques();
  const critique = critiques.get(id);
  if (!critique || !sessionOwnsCritique(sessionUser, critique)) {
    return { status: 404, body: null };
  }

  if (typeof body.shared !== "boolean") {
    return { status: 400, body: null };
  }

  const shareToken = body.shared ? critique.share_token ?? randomUUID() : null;
  const updated = { ...critique, share_token: shareToken };
  critiques.set(id, updated);
  writeCritiques(critiques);

  return {
    status: 200,
    body: {
      id: updated.id,
      share_token: updated.share_token,
      shareUrl: updated.share_token
        ? `${publicOrigin(origin)}/share/${updated.share_token}`
        : null,
    },
  };
}

export async function resolveShareToken(token: string): Promise<ApiResult<ShareApiResponse>> {
  if (!token) {
    return { status: 404, body: null };
  }

  const critique = [...readCritiques().values()].find((row) => row.share_token !== null && row.share_token === token);
  if (!critique?.share_token) {
    return { status: 404, body: null };
  }

  return {
    status: 200,
    body: {
      titulo: critique.titulo,
      critica: critique.critica,
      imageUrl: signStorageUrl(critique.image_path),
      ...(critique.audio_path ? { audioUrl: signStorageUrl(critique.audio_path) } : {}),
    },
  };
}

export function signStorageUrl(path: string) {
  const normalized = path.replace(/^\/+/, "");
  return `/storage/${normalized}?signed=true`;
}
