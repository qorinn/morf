// Az og-fetch proxy (src/pages/api/og-fetch.ts) SSRF-védelméhez: eldönti,
// hogy egy feloldott IP-cím belső/privát hálózatra mutat-e, hogy a
// felhasználó által megadott URL-ekkel ne lehessen a szerver saját belső
// hálózatát vagy a felhő metadata-végpontját elérni.

function ipv4ToInt(octets: number[]) {
  return octets.reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0;
}

function isPrivateIpv4(address: string) {
  const match = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  const value = ipv4ToInt(octets);

  const ranges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];

  return ranges.some(([base, prefix]) => {
    const baseMatch = base.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!baseMatch) return false;
    const baseValue = ipv4ToInt(baseMatch.slice(1).map(Number));
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) === (baseValue & mask);
  });
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // unique local (fc00::/7)

  // IPv4-mapped/compatible IPv6 címek (::ffff:a.b.c.d) — az ágyazott IPv4
  // cím alapján kell ellenőrizni.
  const mapped = normalized.match(
    /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );
  if (mapped) return isPrivateIpv4(mapped[1]);

  return false;
}

export function isPrivateNetworkAddress(address: string) {
  if (address.includes(":")) return isPrivateIpv6(address);
  return isPrivateIpv4(address);
}
