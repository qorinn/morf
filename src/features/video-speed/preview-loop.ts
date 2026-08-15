/**
 * Rövid, a kijelölt forrásidőnél induló loop-buffer. A végén kevert átmenet
 * illeszti vissza az elejéhez, így a scrub-hang nem kattog minden ismétlésnél.
 */
export function createPreviewLoopBuffer(
  source: AudioBuffer,
  sourceTime: number,
  loopDuration = 0.01,
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
