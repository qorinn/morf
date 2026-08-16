import type { APIRoute } from "astro";

import { SafeFetchError, safeFetch } from "@/lib/safe-fetch";

export const prerender = false;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function readBodyWithLimit(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let result = "";
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Az oldal válasza túl nagy méretű.");
    }

    result += decoder.decode(value, { stream: true });
  }

  result += decoder.decode();
  return result;
}

export const GET: APIRoute = async ({ url }) => {
  const targetParam = url.searchParams.get("url");
  if (!targetParam) return jsonError("Hiányzó url paraméter.", 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { response, finalUrl } = await safeFetch(targetParam, {
      signal: controller.signal,
      timeoutMs: REQUEST_TIMEOUT_MS,
      accept: "text/html",
    });

    let html: string;
    try {
      html = await readBodyWithLimit(response);
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "A válasz feldolgozása sikertelen.",
        502,
      );
    }

    return new Response(JSON.stringify({ html, url: finalUrl.href }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SafeFetchError) return jsonError(error.message, error.status);
    return jsonError("Az oldal ellenőrzése nem sikerült.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
