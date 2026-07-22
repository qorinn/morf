import type {
  FaviconExportOptions,
  ManifestSettings,
} from "@/features/favicon-generator/types";

function hasTarget(
  options: FaviconExportOptions,
  target: FaviconExportOptions["targets"][number],
): boolean {
  return options.targets.includes(target);
}

function ensureHexColor(value: string, fallback = "#ffffff"): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  if (trimmed === "." || trimmed === "./") return "./";

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  return `${withoutTrailingSlash}/`;
}

export function assetPath(basePath: string, fileName: string): string {
  return `${normalizeBasePath(basePath)}${fileName}`;
}

export function createHtmlCode({
  exportOptions,
  basePath,
  hasSvg,
  themeColor,
}: {
  exportOptions: FaviconExportOptions;
  basePath: string;
  hasSvg: boolean;
  themeColor: string;
}): string {
  const lines: string[] = [];
  const includeWebsite = hasTarget(exportOptions, "website");
  const includeManifest =
    hasTarget(exportOptions, "web-app") && exportOptions.includeWebManifest;

  if (includeWebsite) {
    lines.push(
      `<link rel="icon" href="${assetPath(basePath, "favicon.ico")}" sizes="any">`,
    );
  }

  if (includeWebsite && hasSvg) {
    lines.push(
      `<link rel="icon" type="image/svg+xml" href="${assetPath(basePath, "favicon.svg")}">`,
    );
  }

  if (includeWebsite) {
    lines.push(
      `<link rel="icon" type="image/png" sizes="48x48" href="${assetPath(basePath, "favicon-48x48.png")}">`,
      `<link rel="icon" type="image/png" sizes="32x32" href="${assetPath(basePath, "favicon-32x32.png")}">`,
      `<link rel="icon" type="image/png" sizes="16x16" href="${assetPath(basePath, "favicon-16x16.png")}">`,
      `<link rel="apple-touch-icon" sizes="180x180" href="${assetPath(basePath, "apple-touch-icon.png")}">`,
    );
  }

  if (includeManifest) {
    lines.push(
      `<link rel="manifest" href="${assetPath(basePath, "site.webmanifest")}">`,
      `<meta name="theme-color" content="${ensureHexColor(themeColor)}">`,
    );
  }

  return lines.length ? `${lines.join("\n")}\n` : "";
}

export function createManifest(settings: ManifestSettings): string {
  const icon = (
    filename: string,
    size: number,
    purpose: "any" | "maskable",
  ) => ({
    src: assetPath(settings.basePath, filename),
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose,
  });

  return `${JSON.stringify(
    {
      name: settings.name.trim() || "Application name",
      short_name: settings.shortName.trim() || "App name",
      icons: [
        icon("web-app-manifest-192x192.png", 192, "any"),
        icon("web-app-manifest-512x512.png", 512, "any"),
        icon("web-app-manifest-192x192-maskable.png", 192, "maskable"),
        icon("web-app-manifest-512x512-maskable.png", 512, "maskable"),
      ],
      theme_color: ensureHexColor(settings.themeColor),
      background_color: ensureHexColor(settings.backgroundColor),
      display: settings.display,
    },
    null,
    2,
  )}\n`;
}

export function createReadme({
  exportOptions,
  htmlCode,
  hasSvg,
}: {
  exportOptions: FaviconExportOptions;
  htmlCode: string;
  hasSvg: boolean;
}): string {
  const includeWebsite = hasTarget(exportOptions, "website");
  const includeWebApp = hasTarget(exportOptions, "web-app");
  const includeManifest = includeWebApp && exportOptions.includeWebManifest;
  const websiteFiles = includeWebsite
    ? "- `favicon.ico`: 16, 32 és 48 px-es böngészőikon egy fájlban\n- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`: modern PNG faviconok\n- `apple-touch-icon.png`: 180 px-es, átlátszóság nélküli Apple Touch ikon\n"
    : "";
  const svgLine =
    includeWebsite && hasSvg
      ? "- `favicon.svg`: a megtisztított, skálázható SVG-forrás\n"
      : "";
  const webAppFiles = includeWebApp
    ? "- `web-app-manifest-*.png`: normál és maskable webappikonok\n"
    : "";
  const manifestLine = includeManifest
    ? "- `site.webmanifest`: a telepíthető webalkalmazás metaadatai\n"
    : "";
  const codeLine = htmlCode
    ? "- `favicon-code.html`: a weboldal `<head>` részéhez szükséges kód\n"
    : "";
  const installation = htmlCode
    ? `## Telepítés\n\nA legtöbb keretrendszerben a fájlok helye a \`public/\`, \`static/\` vagy a webhely gyökérkönyvtára. Másold a következő kódot a dokumentum \`<head>\` részébe:\n\n\`\`\`html\n${htmlCode.trim()}\n\`\`\`\n\n`
    : "";

  return `# Ikoncsomag

A generált fájlokat másold a webhely publikus vagy statikus könyvtárába.

## Fájlok

${websiteFiles}${svgLine}${webAppFiles}${manifestLine}${codeLine}- \`README.md\`: ez a telepítési és fájlhasználati útmutató

${installation}${includeManifest ? "A manifest fájlt ugyanazon a domainen szolgáld ki, mint az oldalt. " : ""}A böngészők cache-elhetik az ikonokat, ezért a frissítés nem mindig azonnali.
`;
}

export function slugifyProjectName(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "morf";
}
