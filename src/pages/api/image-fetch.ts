import type { APIRoute } from "astro";

import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";

export const prerender = false;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function readBodyWithLimit(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("A kép mérete túl nagy.");
    }
    chunks.push(value);
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

// Az OG-kép tervező PNG-exportjához: egy külső kép-URL-t kell ugyanarról az
// originről kiszolgálni, különben a rárajzolt <canvas> "tainted" lesz, és a
// böngésző megtagadja a képadatok kiolvasását (toBlob null-t ad vissza).
export const GET: APIRoute = async ({ url }) => {
  const targetParam = url.searchParams.get("url");
  if (!targetParam) return jsonError("Hiányzó url paraméter.", 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { response } = await safeFetch(targetParam, {
      signal: controller.signal,
      timeoutMs: REQUEST_TIMEOUT_MS,
      accept: "image/*",
    });

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!contentType.startsWith("image/")) {
      return jsonError("A megadott URL nem képet ad vissza.", 400);
    }

    let bytes: Uint8Array;
    try {
      bytes = await readBodyWithLimit(response);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "A kép nem tölthető le.", 502);
    }

    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SafeFetchError) return jsonError(error.message, error.status);
    return jsonError("A kép letöltése nem sikerült.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
