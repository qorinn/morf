/**
 * Rövid, a kijelölt forrásidőnél induló loop-buffer. A végén kevert átmenet
 * illeszti vissza az elejéhez, így a scrub-hang nem kattog minden ismétlésnél.
 */
export function createPreviewLoopBuffer(
  source: AudioBuffer,
  sourceTime: number,
  loopDuration = 0.1,
  crossfadeDuration = 0.001,
): AudioBuffer {
  const startFrame = Math.min(
    Math.max(0, Math.round(sourceTime * source.sampleRate)),
    Math.max(0, source.length - 1),
  );
  const requestedLength = Math.max(1, Math.round(loopDuration * source.sampleRate));
  const loopLength = Math.max(1, Math.min(requestedLength, source.length - startFrame));
  const loop = new AudioBuffer({
    numberOfChannels: source.numberOfChannels,
    length: loopLength,
    sampleRate: source.sampleRate,
  });
  const crossfadeFrames = Math.min(
    Math.max(1, Math.round(crossfadeDuration * source.sampleRate)),
    Math.floor(loopLength / 2),
  );

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const sourceData = source.getChannelData(channel);
    const loopData = loop.getChannelData(channel);
    loopData.set(sourceData.subarray(startFrame, startFrame + loopLength));

    for (let frame = 0; frame < crossfadeFrames; frame += 1) {
      const progress = crossfadeFrames === 1 ? 1 : frame / (crossfadeFrames - 1);
      const fadeOut = Math.cos(progress * Math.PI * 0.5);
      const fadeIn = Math.sin(progress * Math.PI * 0.5);
      const endFrame = loopLength - crossfadeFrames + frame;
      loopData[endFrame] = loopData[endFrame] * fadeOut + loopData[frame] * fadeIn;
    }
  }

  return loop;
}

/**
 * Rövid, irányhelyes scrub-hang. A visszafelé húzás saját, megfordított
 * bufferből szól, mert az AudioBufferSourceNode negatív playbackRate-je nem
 * támogatott egységesen a böngészőkben.
 */
export function createPreviewScrubBuffer(
  source: AudioBuffer,
  sourceTime: number,
  direction: 1 | -1,
  duration = 0.12,
): AudioBuffer {
  const requestedLength = Math.max(1, Math.round(duration * source.sampleRate));
  const anchorFrame = Math.min(
    Math.max(0, Math.round(sourceTime * source.sampleRate)),
    Math.max(0, source.length - 1),
  );
  const startFrame = direction === 1
    ? anchorFrame
    : Math.max(0, anchorFrame - requestedLength + 1);
  const endFrame = direction === 1
    ? Math.min(source.length, anchorFrame + requestedLength)
    : anchorFrame + 1;
  const length = Math.max(1, endFrame - startFrame);
  const scrub = new AudioBuffer({
    numberOfChannels: source.numberOfChannels,
    length,
    sampleRate: source.sampleRate,
  });

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const segment = source.getChannelData(channel).subarray(startFrame, endFrame);
    const target = scrub.getChannelData(channel);
    if (direction === 1) target.set(segment);
    else {
      for (let index = 0; index < segment.length; index += 1) {
        target[index] = segment[segment.length - index - 1];
      }
    }
  }

  return scrub;
}

export type NaturalLoop = {
  channels: Float32Array[];
  duration: number;
  score: number;
};

function nearestPositiveCrossing(samples: Float32Array, target: number, radius: number): number {
  const start = Math.max(1, target - radius);
  const end = Math.min(samples.length - 1, target + radius);
  let best = target;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = start; index <= end; index += 1) {
    if (samples[index - 1] <= 0 && samples[index] > 0 && Math.abs(index - target) < distance) {
      best = index;
      distance = Math.abs(index - target);
    }
  }
  return best;
}

type VoicedPeriod = { period: number; confidence: number };

/**
 * A YIN kumulatív, normalizált különbségfüggvényének egy kis, böngészőben is
 * gyors változata. A legelső megbízható völgyet választja, nem a legnagyobb
 * autokorrelációs csúcsot: ez megakadályozza, hogy egy erős felhangot
 * alaphangnak nézzünk, ami a rövid "RA-RA" ismétlést okozta.
 */
function detectVoicedPeriodAt(
  samples: Float32Array,
  anchor: number,
  sampleRate: number,
): VoicedPeriod | undefined {
  const windowLength = Math.min(Math.round(sampleRate * 0.075), samples.length);
  const start = Math.max(0, Math.min(samples.length - windowLength, anchor - Math.floor(windowLength / 2)));
  const minPeriod = Math.max(2, Math.floor(sampleRate / 420));
  const maxPeriod = Math.min(Math.floor(sampleRate / 60), Math.floor(windowLength / 2));
  if (maxPeriod <= minPeriod) return undefined;

  let energy = 0;
  for (let index = 0; index < windowLength; index += 1) energy += samples[start + index] ** 2;
  if (energy / windowLength < 1e-6) return undefined;

  const normalizedDifference = new Float64Array(maxPeriod + 1);
  let cumulativeDifference = 0;
  for (let period = 1; period <= maxPeriod; period += 1) {
    let difference = 0;
    for (let index = 0; index < windowLength - period; index += 1) {
      const delta = samples[start + index] - samples[start + index + period];
      difference += delta * delta;
    }
    cumulativeDifference += difference;
    normalizedDifference[period] = period === 0 || cumulativeDifference === 0
      ? 1
      : (difference * period) / cumulativeDifference;
  }

  const threshold = 0.14;
  for (let period = minPeriod + 1; period < maxPeriod; period += 1) {
    const value = normalizedDifference[period];
    if (
      value <= threshold &&
      value <= normalizedDifference[period - 1] &&
      value < normalizedDifference[period + 1]
    ) {
      return { period, confidence: 1 - value };
    }
  }
  return undefined;
}

function detectStableVoicedPeriod(
  samples: Float32Array,
  anchor: number,
  sampleRate: number,
): VoicedPeriod | undefined {
  const offset = Math.round(sampleRate * 0.02);
  const candidates = [-offset, 0, offset]
    .map((position) => detectVoicedPeriodAt(samples, anchor + position, sampleRate))
    .filter((candidate): candidate is VoicedPeriod => Boolean(candidate));
  if (candidates.length < 2) return undefined;

  const averagePeriod = candidates.reduce((total, candidate) => total + candidate.period, 0) / candidates.length;
  const maximumDeviation = Math.max(...candidates.map((candidate) => Math.abs(candidate.period - averagePeriod)));
  const averageConfidence = candidates.reduce((total, candidate) => total + candidate.confidence, 0) / candidates.length;
  if (maximumDeviation > Math.max(2, averagePeriod * 0.12) || averageConfidence < 0.8) return undefined;
  return { period: Math.round(averagePeriod), confidence: averageConfidence };
}

/**
 * Több szomszédos hangperiódusból egyetlen átlagolt hullámformát készít.
 * Nem egy hangrészletet ismétel: az eredmény egy periódusnyi wavetable,
 * amely az adott pillanat hangszínét (például egy magánhangzóét) tartja meg.
 */
export function createAveragedVoicedToneBuffer(
  source: AudioBuffer,
  sourceTime: number,
): AudioBuffer | undefined {
  const anchor = Math.min(
    Math.max(0, Math.round(sourceTime * source.sampleRate)),
    Math.max(0, source.length - 1),
  );
  const reference = source.getChannelData(0);
  const voiced = detectStableVoicedPeriod(reference, anchor, source.sampleRate);
  if (!voiced) return undefined;
  const period = voiced.period;
  const sourceCycles = 12;
  const sourceLength = period * sourceCycles;
  if (sourceLength >= source.length) return undefined;
  const start = nearestPositiveCrossing(reference, anchor - Math.floor(sourceLength / 2), period);
  if (start + sourceLength > source.length) return undefined;
  const tone = new AudioBuffer({
    numberOfChannels: source.numberOfChannels,
    length: period,
    sampleRate: source.sampleRate,
  });

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    const data = source.getChannelData(channel);
    const target = tone.getChannelData(channel);
    let mean = 0;
    for (let phase = 0; phase < period; phase += 1) {
      let sum = 0;
      for (let cycle = 0; cycle < sourceCycles; cycle += 1) {
        sum += data[start + cycle * period + phase];
      }
      const average = sum / sourceCycles;
      target[phase] = average;
      mean += average;
    }
    // A lassú DC-eltolódás nem része a hangszínnek, viszont pattogást okozhat
    // a körbefutó hullámformán, ezért csak ezt távolítjuk el.
    mean /= period;
    for (let phase = 0; phase < period; phase += 1) {
      target[phase] -= mean;
    }
  }
  return tone;
}

/**
 * A tartott hanghoz a környező jelből olyan, több periódust tartalmazó
 * részletet keresünk, amelynek eleje és vége hasonló. Így nem egy rövid
 * hullámtöredék (sípolás) ismétlődik, hanem például egy magánhangzó tartása.
 */
export function findNaturalLoop(
  source: AudioBuffer,
  sourceTime: number,
): NaturalLoop | undefined {
  const sampleRate = source.sampleRate;
  const anchor = Math.min(
    Math.max(0, Math.round(sourceTime * sampleRate)),
    Math.max(0, source.length - 1),
  );
  const durations = [0.08, 0.1, 0.12, 0.16, 0.2, 0.24];
  const searchRadius = Math.round(sampleRate * 0.18);
  const step = Math.max(1, Math.round(sampleRate * 0.004));
  let best: { start: number; length: number; score: number } | undefined;
  const reference = source.getChannelData(0);

  for (const duration of durations) {
    const length = Math.round(duration * sampleRate);
    const overlap = Math.min(Math.round(sampleRate * 0.02), Math.floor(length / 3));
    if (overlap < 8 || length >= source.length) continue;
    const centeredStart = anchor - Math.floor(length / 2);
    const minStart = Math.max(0, centeredStart - searchRadius);
    const maxStart = Math.min(source.length - length, centeredStart + searchRadius);

    for (let start = minStart; start <= maxStart; start += step) {
      let error = 0;
      for (let offset = 0; offset < overlap; offset += 1) {
        const head = reference[start + offset];
        const tail = reference[start + length - overlap + offset];
        const previousHead = reference[Math.max(start, start + offset - 1)];
        const previousTail = reference[Math.max(start + length - overlap, start + length - overlap + offset - 1)];
        const valueDifference = head - tail;
        const slopeDifference = (head - previousHead) - (tail - previousTail);
        error += valueDifference * valueDifference + slopeDifference * slopeDifference * 0.2;
      }
      const score = error / overlap;
      if (!best || score < best.score) best = { start, length, score };
    }
  }

  if (!best) return undefined;
  const overlap = Math.min(Math.round(sampleRate * 0.02), Math.floor(best.length / 3));
  const channels = Array.from({ length: source.numberOfChannels }, (_, channel) => {
    const data = new Float32Array(best.length);
    data.set(source.getChannelData(channel).subarray(best.start, best.start + best.length));
    for (let offset = 0; offset < overlap; offset += 1) {
      const progress = overlap === 1 ? 1 : offset / (overlap - 1);
      const fadeOut = Math.cos(progress * Math.PI * 0.5);
      const fadeIn = Math.sin(progress * Math.PI * 0.5);
      const tailIndex = best.length - overlap + offset;
      data[tailIndex] = data[tailIndex] * fadeOut + data[offset] * fadeIn;
    }
    return data;
  });

  return { channels, duration: best.length / sampleRate, score: best.score };
}
