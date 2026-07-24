import {
  APPLE_TARGET,
  ICO_SIZES,
  MASKABLE_TARGETS,
  PWA_TARGETS,
  STANDARD_PNG_TARGETS,
} from "./config.ts";
import { encodePngIco } from "./ico.ts";
import {
  createHtmlCode,
  createManifest,
  createReadme,
  slugifyProjectName,
} from "./package-content.ts";
import type {
  FaviconGenerateRequest,
  FaviconGenerateResult,
  FaviconProgress,
  RasterPayload,
} from "./types.ts";

type Target = { filename: string; width: number; height: number };

function imageDataFromPayload(payload: RasterPayload): ImageData {
  return {
    data: new Uint8ClampedArray(payload.buffer),
    width: payload.width,
    height: payload.height,
    colorSpace: "srgb",
  } as ImageData;
}

async function encodeTargets(
  source: RasterPayload,
  targets: readonly Target[],
): Promise<Map<string, Uint8Array>> {
  const { default: resize } = await import("@jsquash/resize");
  const { encode } = await import("@jsquash/png");
  const sourceImage = imageDataFromPayload(source);
  const output = new Map<string, Uint8Array>();

  for (const target of targets) {
    const image = await resize(sourceImage, {
      width: target.width,
      height: target.height,
      method: "lanczos3",
      fitMethod: "stretch",
      premultiply: true,
      linearRGB: true,
    });
    output.set(target.filename, new Uint8Array(await encode(image)));
  }

  return output;
}

function report(
  onProgress: (progress: FaviconProgress) => void,
  status: FaviconProgress["status"],
  value: number,
) {
  onProgress({ status, value });
}

export async function generateFaviconPackage(
  request: FaviconGenerateRequest,
  onProgress: (progress: FaviconProgress) => void,
): Promise<FaviconGenerateResult> {
  const includeWebsite = request.exportOptions.targets.includes("website");
  const includeWebApp = request.exportOptions.targets.includes("web-app");
  const includeManifest =
    includeWebApp && request.exportOptions.includeWebManifest;

  if (!includeWebsite && !includeWebApp) {
    throw new Error("Válassz legalább egy exportcélt.");
  }

  report(onProgress, "generating", 8);

  const standardAssets = includeWebsite
    ? await encodeTargets(request.standardMaster, STANDARD_PNG_TARGETS)
    : new Map<string, Uint8Array>();
  report(onProgress, "generating", 30);

  const appleAssets = includeWebsite
    ? await encodeTargets(request.opaqueMaster, [APPLE_TARGET])
    : new Map<string, Uint8Array>();
  report(onProgress, "creating-ico", 42);

  const faviconIco = includeWebsite
    ? encodePngIco(
        ICO_SIZES.map((size) => {
          const png = standardAssets.get(`favicon-${size}x${size}.png`);
          if (!png) throw new Error(`Hiányzó ${size} px-es ICO frame.`);
          return { size, png };
        }),
      )
    : undefined;

  let pwaAssets = new Map<string, Uint8Array>();
  let maskableAssets = new Map<string, Uint8Array>();
  if (includeWebApp) {
    report(onProgress, "generating", 52);
    pwaAssets = await encodeTargets(request.standardMaster, PWA_TARGETS);
    report(onProgress, "generating", 68);
    maskableAssets = await encodeTargets(
      request.maskableMaster,
      MASKABLE_TARGETS,
    );
  }

  report(onProgress, "creating-package", 80);
  const htmlCode = createHtmlCode({
    exportOptions: request.exportOptions,
    basePath: request.manifest.basePath,
    hasSvg: Boolean(request.sanitizedSvg),
    themeColor: request.manifest.themeColor,
  });
  const manifest = includeManifest
    ? createManifest(request.manifest)
    : undefined;
  const readme = createReadme({
    exportOptions: request.exportOptions,
    htmlCode,
    hasSvg: Boolean(request.sanitizedSvg),
  });

  const encoder = new TextEncoder();
  const files: Record<string, Uint8Array> = {
    "favicon-package/README.md": encoder.encode(readme),
  };
  if (faviconIco) {
    files["favicon-package/favicon.ico"] = faviconIco;
  }
  if (htmlCode) {
    files["favicon-package/favicon-code.html"] = encoder.encode(htmlCode);
  }

  for (const assets of [
    standardAssets,
    appleAssets,
    pwaAssets,
    maskableAssets,
  ]) {
    for (const [filename, data] of assets) {
      files[`favicon-package/${filename}`] = data;
    }
  }
  if (includeWebsite && request.sanitizedSvg) {
    files["favicon-package/favicon.svg"] = encoder.encode(request.sanitizedSvg);
  }
  if (manifest) {
    files["favicon-package/site.webmanifest"] = encoder.encode(manifest);
  }

  const { zipSync } = await import("fflate");
  const archive = zipSync(files, { level: 6 });
  const archiveBuffer = archive.slice().buffer as ArrayBuffer;
  const archiveName = `${slugifyProjectName(request.manifest.projectName)}-favicon-package.zip`;
  report(onProgress, "creating-package", 100);

  return {
    archiveBuffer,
    archiveName,
    assetNames: Object.keys(files).map((name) =>
      name.replace("favicon-package/", ""),
    ),
    htmlCode,
    manifest,
  };
}
