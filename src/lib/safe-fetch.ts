import { lookup as dnsLookup } from "node:dns/promises";

import { Agent, fetch as undiciFetch } from "undici";

import { isPrivateNetworkAddress } from "./private-network";

const USER_AGENT = "MorfFetchBot/1.0 (+https://morfkit.com)";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 5;

export class SafeFetchError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
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
    throw new SafeFetchError("A megadott domain nem oldható fel.", 400);
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateNetworkAddress(a.address))) {
    throw new SafeFetchError("A megadott cím nem érhető el.", 400);
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

/**
 * SSRF-védett fetch tetszőleges felhasználó által megadott URL-hez: csak
 * http/https, csak publikus IP-cím felé enged kapcsolódni, a validált címre
 * pinneli a tényleges kapcsolatot, és korlátozott számú átirányítást követ
 * (mindegyiket újra ellenőrizve).
 */
export async function safeFetch(
  targetUrl: string,
  options: {
    signal: AbortSignal;
    timeoutMs?: number;
    maxRedirects?: number;
    accept?: string;
  },
): Promise<{ response: Response; finalUrl: URL }> {
  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch {
    throw new SafeFetchError("Érvénytelen URL.", 400);
  }

  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  for (let redirectCount = 0; ; redirectCount++) {
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new SafeFetchError("Csak http/https URL engedélyezett.", 400);
    }

    const pinnedAddresses = await resolvePublicAddresses(target.hostname);

    let response: Response;
    try {
      response = (await undiciFetch(target, {
        redirect: "manual",
        signal: options.signal,
        headers: { "User-Agent": USER_AGENT, Accept: options.accept ?? "*/*" },
        dispatcher: dispatcherFor(pinnedAddresses),
      })) as unknown as Response;
    } catch (error) {
      throw new SafeFetchError(
        error instanceof Error && error.name === "AbortError"
          ? "A lekérés túllépte az időkorlátot."
          : "A cím nem érhető el.",
        502,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new SafeFetchError("Érvénytelen átirányítás.", 502);
      if (redirectCount >= maxRedirects) {
        throw new SafeFetchError("Túl sok átirányítás.", 502);
      }
      try {
        target = new URL(location, target);
      } catch {
        throw new SafeFetchError("Érvénytelen átirányítási cél.", 502);
      }
      continue;
    }

    if (!response.ok) {
      throw new SafeFetchError(`A szerver ${response.status} választ adott.`, 502);
    }

    return { response, finalUrl: target };
  }
}

export { DEFAULT_TIMEOUT_MS };
