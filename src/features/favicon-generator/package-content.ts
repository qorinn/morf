import type {
  FaviconExportOptions,
  FaviconTextCopy,
  ManifestSettings,
} from "@/features/favicon-generator/types";

function format(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in tokens ? tokens[key] : match,
  );
}

function hasTarget(
  options: FaviconExportOptions,
  target: FaviconExportOptions["targets"][number],
): boolean {
  return options.targets.includes(target);
}

function ensureHexColor(value: string, fallback = "#ffffff"): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export interface ManifestNavigationErrors {
  id?: string;
  startUrl?: string;
  scope?: string;
}

const manifestValidationOrigin = "https://manifest.local";

function parseRootRelativeManifestUrl(
  value: string,
  label: string,
  copy: FaviconTextCopy["manifestErrors"],
): { url?: URL; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { error: format(copy.needsPathTemplate, { label }) };
  }
  if (!trimmed.startsWith("/")) {
    return { error: format(copy.needsRootPathTemplate, { label }) };
  }

  try {
    const url = new URL(trimmed, manifestValidationOrigin);
    if (url.origin !== manifestValidationOrigin) {
      return { error: format(copy.sameDomainOnlyTemplate, { label }) };
    }
    return { url };
  } catch {
    return { error: format(copy.invalidPathTemplate, { label }) };
  }
}

export function validateManifestNavigation(
  settings: Pick<ManifestSettings, "id" | "startUrl" | "scope">,
  copy: FaviconTextCopy["manifestErrors"],
): ManifestNavigationErrors {
  const errors: ManifestNavigationErrors = {};
  const id = parseRootRelativeManifestUrl(settings.id, copy.appIdLabel, copy);
  const startUrl = parseRootRelativeManifestUrl(
    settings.startUrl,
    copy.startUrlLabel,
    copy,
  );
  const scope = parseRootRelativeManifestUrl(settings.scope, copy.scopeLabel, copy);

  if (id.error) errors.id = id.error;
  if (startUrl.error) errors.startUrl = startUrl.error;
  if (scope.error) errors.scope = scope.error;

  if (id.url?.hash) {
    errors.id = copy.idNoHash;
  }
  if (scope.url && (scope.url.search || scope.url.hash)) {
    errors.scope = copy.scopeNoQueryOrHash;
  }

  if (startUrl.url && scope.url && !errors.startUrl && !errors.scope) {
    const scopePath = scope.url.pathname.endsWith("/")
      ? scope.url.pathname
      : `${scope.url.pathname}/`;
    const startPath = startUrl.url.pathname;
    const startsAtScopeRoot = startPath === scope.url.pathname;
    if (!startsAtScopeRoot && !startPath.startsWith(scopePath)) {
      errors.startUrl = copy.startUrlOutsideScope;
    }
  }

  return errors;
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

export function createManifest(
  settings: ManifestSettings,
  copy: FaviconTextCopy,
): string {
  const navigationErrors = validateManifestNavigation(settings, copy.manifestErrors);
  const navigationError = Object.values(navigationErrors)[0];
  if (navigationError) {
    throw new Error(`Manifest: ${navigationError}`);
  }

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
      id: settings.id.trim(),
      name: settings.name.trim() || "Application name",
      short_name: settings.shortName.trim() || "App name",
      start_url: settings.startUrl.trim(),
      scope: settings.scope.trim(),
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
  copy,
}: {
  exportOptions: FaviconExportOptions;
  htmlCode: string;
  hasSvg: boolean;
  copy: FaviconTextCopy["readme"];
}): string {
  const includeWebsite = hasTarget(exportOptions, "website");
  const includeWebApp = hasTarget(exportOptions, "web-app");
  const includeManifest = includeWebApp && exportOptions.includeWebManifest;
  const websiteFiles = includeWebsite
    ? `- \`favicon.ico\`: ${copy.files.faviconIco}\n- \`favicon-16x16.png\`, \`favicon-32x32.png\`, \`favicon-48x48.png\`: ${copy.files.faviconPngSet}\n- \`apple-touch-icon.png\`: ${copy.files.appleTouchIcon}\n`
    : "";
  const svgLine =
    includeWebsite && hasSvg
      ? `- \`favicon.svg\`: ${copy.files.faviconSvg}\n`
      : "";
  const webAppFiles = includeWebApp
    ? `- \`web-app-manifest-*.png\`: ${copy.files.webAppManifestSet}\n`
    : "";
  const manifestLine = includeManifest
    ? `- \`site.webmanifest\`: ${copy.files.siteWebmanifest}\n`
    : "";
  const codeLine = htmlCode
    ? `- \`favicon-code.html\`: ${copy.files.faviconCode}\n`
    : "";
  const installation = htmlCode
    ? `${copy.installationHeading}\n\n${copy.installationIntro}\n\n\`\`\`html\n${htmlCode.trim()}\n\`\`\`\n\n`
    : "";

  return `${copy.title}

${copy.intro}

${copy.filesHeading}

${websiteFiles}${svgLine}${webAppFiles}${manifestLine}${codeLine}- \`README.md\`: ${copy.readmeFileDescription}

${installation}${includeManifest ? copy.manifestNote : ""}${copy.cacheNote}
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
