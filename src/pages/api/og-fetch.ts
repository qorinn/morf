import { lookup as dnsLookup } from "node:dns/promises";

import type { APIRoute } from "astro";
import { Agent, fetch as undiciFetch } from "undici";

import { isPrivateNetworkAddress } from "@/lib/private-network";

export const prerender = false;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = "MorfOgFetchBot/1.0 (+https://morfkit.com)";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * Feloldja a hostnevet, és elutasítja, ha bármelyik cím privát/belső
 * hálózatra mutat. A visszaadott címekre "pinneli" a tényleges kapcsolatot
 * (lásd `dispatcherFor`), hogy egy időközben megváltozó DNS-válasz (DNS
 * rebinding) ne kerülhesse meg ezt az ellenőrzést a fetch hívás során.
 */
async function resolvePublicAddresses(hostname: string) {
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dnsLookup(hostname, { all: true });
  } catch {
    throw new Error("A megadott domain nem oldható fel.");
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateNetworkAddress(a.address))) {
    throw new Error("A megadott cím nem érhető el.");
  }

  return addresses;
}

function dispatcherFor(pinnedAddresses: { address: string; family: number }[]) {
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, pinnedAddresses.map((a) => ({ address: a.address, family: a.family as 4 | 6 })));
      },
    },
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

  let target: URL;
  try {
    target = new URL(targetParam);
  } catch {
    return jsonError("Érvénytelen URL.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    for (let redirectCount = 0; ; redirectCount++) {
      if (target.protocol !== "http:" && target.protocol !== "https:") {
        return jsonError("Csak http/https URL engedélyezett.", 400);
      }

      let pinnedAddresses: { address: string; family: number }[];
      try {
        pinnedAddresses = await resolvePublicAddresses(target.hostname);
      } catch (error) {
        return jsonError(
          error instanceof Error ? error.message : "A cím nem ellenőrizhető.",
          400,
        );
      }

      let response: Response;
      try {
        response = (await undiciFetch(target, {
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          dispatcher: dispatcherFor(pinnedAddresses),
        })) as unknown as Response;
      } catch (error) {
        return jsonError(
          error instanceof Error && error.name === "AbortError"
            ? "Az oldal lekérése túllépte az időkorlátot."
            : "Az oldal nem érhető el.",
          502,
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return jsonError("Érvénytelen átirányítás.", 502);
        if (redirectCount >= MAX_REDIRECTS) {
          return jsonError("Túl sok átirányítás.", 502);
        }
        try {
          target = new URL(location, target);
        } catch {
          return jsonError("Érvénytelen átirányítási cél.", 502);
        }
        continue;
      }

      if (!response.ok) {
        return jsonError(`A szerver ${response.status} választ adott.`, 502);
      }

      let html: string;
      try {
        html = await readBodyWithLimit(response);
      } catch (error) {
        return jsonError(
          error instanceof Error ? error.message : "A válasz feldolgozása sikertelen.",
          502,
        );
      }

      return new Response(JSON.stringify({ html, url: target.href }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  } finally {
    clearTimeout(timeout);
  }
};
