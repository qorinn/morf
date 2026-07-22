export interface IcoFrame {
  size: number;
  png: Uint8Array;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

/** ICO-konténer PNG-kódolású, eltérő méretű frame-ekből. */
export function encodePngIco(frames: IcoFrame[]): Uint8Array {
  if (frames.length === 0) {
    throw new Error("Az ICO legalább egy képméretet igényel.");
  }

  const directorySize = 6 + frames.length * 16;
  const payloadSize = frames.reduce((sum, frame) => sum + frame.png.length, 0);
  const output = new Uint8Array(directorySize + payloadSize);
  const view = new DataView(output.buffer);

  writeUint16(view, 0, 0);
  writeUint16(view, 2, 1);
  writeUint16(view, 4, frames.length);

  let payloadOffset = directorySize;
  frames.forEach((frame, index) => {
    if (!Number.isInteger(frame.size) || frame.size < 1 || frame.size > 256) {
      throw new Error("Az ICO képméretnek 1 és 256 px közé kell esnie.");
    }

    const entryOffset = 6 + index * 16;
    output[entryOffset] = frame.size === 256 ? 0 : frame.size;
    output[entryOffset + 1] = frame.size === 256 ? 0 : frame.size;
    output[entryOffset + 2] = 0;
    output[entryOffset + 3] = 0;
    writeUint16(view, entryOffset + 4, 1);
    writeUint16(view, entryOffset + 6, 32);
    writeUint32(view, entryOffset + 8, frame.png.length);
    writeUint32(view, entryOffset + 12, payloadOffset);
    output.set(frame.png, payloadOffset);
    payloadOffset += frame.png.length;
  });

  return output;
}
