declare module "heic-decode" {
  export type HeicDecodeResult = {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };

  export type HeicDecodeOptions = {
    buffer: ArrayBuffer | Uint8Array;
  };

  export default function decodeHeic(
    options: HeicDecodeOptions,
  ): Promise<HeicDecodeResult>;
}
