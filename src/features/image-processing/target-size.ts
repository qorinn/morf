export type QualityEncodingResult = {
  buffer: ArrayBuffer;
  quality: number;
};

/**
 * Kevés kódolási próbával keres a célméret alatti, ahhoz közeli minőséget.
 * A fájlméretek közti arányból becsül, majd legfeljebb két finomító próbát
 * végez. Ha már az 1-es minőség is túl nagy, undefined.
 */
export async function encodeAtHighestQualityUnderLimit(
  encodeAtQuality: (quality: number) => Promise<ArrayBuffer>,
  maxBytes: number,
  minQuality = 1,
  maxQuality = 100,
  maxAttempts = 4,
): Promise<QualityEncodingResult | undefined> {
  let attempts = 0;
  const encode = async (quality: number): Promise<QualityEncodingResult> => {
    attempts += 1;
    const buffer = await encodeAtQuality(quality);
    return { buffer, quality };
  };

  let tooLarge = await encode(maxQuality);
  if (tooLarge.buffer.byteLength <= maxBytes) return tooLarge;

  const proportionalQuality = Math.floor(
    maxQuality * (maxBytes / tooLarge.buffer.byteLength) * 0.92,
  );
  const firstQuality = Math.min(
    maxQuality - 1,
    Math.max(minQuality, proportionalQuality),
  );
  const first = await encode(firstQuality);
  let best: QualityEncodingResult;

  if (first.buffer.byteLength <= maxBytes) {
    best = first;
  } else {
    tooLarge = first;
    if (firstQuality === minQuality) return undefined;

    const minimum = await encode(minQuality);
    if (minimum.buffer.byteLength > maxBytes) return undefined;
    best = minimum;
  }

  while (attempts < maxAttempts && best.quality + 1 < tooLarge.quality) {
    const byteRange = tooLarge.buffer.byteLength - best.buffer.byteLength;
    const qualityRange = tooLarge.quality - best.quality;
    const interpolated =
      byteRange > 0
        ? best.quality +
          Math.floor(
            ((maxBytes - best.buffer.byteLength) / byteRange) * qualityRange,
          )
        : Math.floor((best.quality + tooLarge.quality) / 2);
    const quality = Math.min(
      tooLarge.quality - 1,
      Math.max(best.quality + 1, interpolated),
    );
    const candidate = await encode(quality);

    if (candidate.buffer.byteLength <= maxBytes) {
      best = candidate;
    } else {
      tooLarge = candidate;
    }
  }

  return best;
}
