import { type SubmitEvent, useRef, useState } from "react";
import {
  Alert02Icon,
  ArrowRight01Icon,
  ClipboardCopyIcon,
  CodeIcon,
  DiscordIcon,
  Facebook01Icon,
  ImageAdd02Icon,
  Link01Icon,
  Linkedin02Icon,
  Loading03Icon,
  NewTwitterIcon,
  Search01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OgImageDesigner } from "./OgImageDesigner";
import { AuditAndPreview } from "./SocialPreviewAudit";
import {
  createOpenGraphAudit,
  readOpenGraphData,
  type ImageInspection,
  type OpenGraphData,
} from "./open-graph";

type CheckStatus = "idle" | "loading" | "success" | "error";

const emptyImageInspection: ImageInspection = {
  status: "idle",
  width: null,
  height: null,
  bytes: null,
  mime: "",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildOpenGraphCode({
  description,
  imageAlt,
  imageUrl,
  locale,
  pageType,
  pageUrl,
  siteName,
  title,
}: {
  description: string;
  imageAlt: string;
  imageUrl: string;
  locale: string;
  pageType: string;
  pageUrl: string;
  siteName: string;
  title: string;
}) {
  const lines = [
    `<meta property="og:type" content="${escapeHtml(pageType)}" />`,
    `<meta property="og:locale" content="${escapeHtml(locale)}" />`,
    `<meta property="og:url" content="${escapeHtml(pageUrl)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
  ];

  if (imageUrl) {
    lines.push(
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
    );
  }

  if (imageAlt) {
    lines.push(
      `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    );
  }

  lines.push(
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  );

  if (imageUrl) {
    lines.push(
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    );
  }

  return lines.join("\n");
}

async function inspectImage(url: string): Promise<ImageInspection> {
  if (!url) return emptyImageInspection;

  const imageResult = await new Promise<
    Pick<ImageInspection, "status" | "width" | "height">
  >((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        status: "loaded",
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    image.onerror = () =>
      resolve({ status: "error", width: null, height: null });
    image.src = url;
  });

  let bytes: number | null = null;
  let mime = "";
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    bytes = contentLength ? Number.parseInt(contentLength, 10) : null;
    mime = response.headers.get("content-type")?.split(";")[0] ?? "";
  } catch {
    // A kép ettől még megjelenhet; sok CDN csak a fejléc lekérését tiltja CORS miatt.
  }

  return { ...imageResult, bytes, mime };
}

function CharacterHint({ current, limit }: { current: number; limit: number }) {
  return (
    <span
      className={
        current > limit
          ? "text-xs tabular-nums text-destructive"
          : "text-muted-foreground text-xs tabular-nums"
      }
    >
      {current} / {limit} karakter
    </span>
  );
}

const previewPlatforms = [
  { icon: Facebook01Icon, label: "Facebook" },
  { icon: NewTwitterIcon, label: "X" },
  { icon: Linkedin02Icon, label: "LinkedIn" },
  { icon: WhatsappIcon, label: "WhatsApp" },
  { icon: DiscordIcon, label: "Discord" },
  { icon: CodeIcon, label: "HTML" },
];

export function SharePreviewWorkspace() {
  const [checkUrl, setCheckUrl] = useState("");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [checkError, setCheckError] = useState("");
  const [scanData, setScanData] = useState<OpenGraphData | null>(null);
  const [imageInspection, setImageInspection] =
    useState<ImageInspection>(emptyImageInspection);

  const [pageUrl, setPageUrl] = useState("https://pelda.hu/oldal");
  const [title, setTitle] = useState(
    "Egyértelmű cím, ami megállítja az olvasót",
  );
  const [description, setDescription] = useState(
    "Röviden mutasd meg, mit kap az olvasó az oldalon, és miért érdemes megnyitnia.",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [siteName, setSiteName] = useState("Morf");
  const [pageType, setPageType] = useState("website");
  const [locale, setLocale] = useState("hu_HU");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generatedCode = buildOpenGraphCode({
    description,
    imageAlt,
    imageUrl,
    locale,
    pageType,
    pageUrl,
    siteName,
    title,
  });

  const previewData: OpenGraphData = {
    pageUrl,
    pageTitle: title,
    metaDescription: description,
    ogTitle: title,
    ogDescription: description,
    ogImage: imageUrl,
    ogImageAlt: imageAlt,
    ogUrl: pageUrl,
    ogSiteName: siteName,
    ogType: pageType,
    ogLocale: locale,
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
  };

  async function inspectUrl(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckError("");
    setScanData(null);
    setImageInspection({ ...emptyImageInspection, status: "loading" });

    let requestedUrl: URL;
    try {
      requestedUrl = new URL(checkUrl);
    } catch {
      setCheckStatus("error");
      setCheckError(
        "Adj meg egy teljes URL-t, például: https://pelda.hu/oldal.",
      );
      return;
    }

    setCheckStatus("loading");

    try {
      const response = await fetch(requestedUrl.href);
      if (!response.ok)
        throw new Error(`A szerver ${response.status} választ adott.`);

      const html = await response.text();
      const document = new DOMParser().parseFromString(html, "text/html");
      const data = readOpenGraphData(document, requestedUrl);
      const inspectedImage = await inspectImage(data.ogImage);

      setScanData(data);
      setImageInspection(inspectedImage);
      setPageUrl(data.ogUrl || data.pageUrl);
      setTitle(data.ogTitle || data.pageTitle);
      setDescription(data.ogDescription || data.metaDescription);
      setImageUrl(data.ogImage);
      setImageAlt(data.ogImageAlt);
      setSiteName(
        data.ogSiteName || requestedUrl.hostname.replace(/^www\./, ""),
      );
      setPageType(data.ogType === "article" ? "article" : "website");
      setLocale(data.ogLocale || "hu_HU");
      setCheckStatus("success");
    } catch (error) {
      setCheckStatus("error");
      setImageInspection(emptyImageInspection);
      setCheckError(
        error instanceof TypeError
          ? "A böngésző nem fér hozzá ehhez az oldalhoz. Más domainnél ezt gyakran a CORS-szabály korlátozza; backend nélkül csak az ezt engedélyező oldalak vizsgálhatók közvetlenül."
          : error instanceof Error
            ? error.message
            : "Az oldal ellenőrzése nem sikerült.",
      );
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
    copyResetTimeout.current = setTimeout(() => setCopyState("idle"), 2500);
  }

  const auditItems = scanData
    ? createOpenGraphAudit(scanData, imageInspection)
    : [];

  return (
    <>
      <section id="megosztasi-elozet-tervezo" className="morf-section-normal">
        <div className="mx-auto flex min-h-[42rem] w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="max-w-5xl">
            <h1 className="morf-page-heading font-heading leading-[0.96] font-semibold tracking-[-0.05em] text-balance sm:text-[clamp(3.25rem,7vw,5.5rem)]">
              Lásd a linket úgy, ahogy mások fogják
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty sm:text-xl">
              Ellenőrizd a metaadatokat és a platformonkénti megjelenést,
              mielőtt elküldöd vagy publikálod az oldalt.
            </p>
          </div>

          <form className="mt-10 w-full max-w-5xl" onSubmit={inspectUrl}>
            <div className="morf-url-scan-control flex flex-col gap-3 rounded-3xl border bg-card p-2 sm:flex-row sm:items-center">
              <label htmlFor="og-check-url" className="sr-only">
                Ellenőrizendő oldal URL-je
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
                <HugeiconsIcon
                  icon={Link01Icon}
                  className="text-muted-foreground size-6 shrink-0"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <input
                  id="og-check-url"
                  type="url"
                  value={checkUrl}
                  onChange={(event) => setCheckUrl(event.target.value)}
                  placeholder="Illeszd be az oldal URL-jét"
                  className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
                  required
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-14 px-6 sm:px-8"
                disabled={checkStatus === "loading"}
              >
                <HugeiconsIcon
                  icon={
                    checkStatus === "loading" ? Loading03Icon : Search01Icon
                  }
                  data-icon="inline-start"
                  className={
                    checkStatus === "loading" ? "animate-spin" : undefined
                  }
                  aria-hidden="true"
                />
                {checkStatus === "loading"
                  ? "Ellenőrzés"
                  : "Ellenőrzés és előnézet"}
                {checkStatus !== "loading" && (
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    data-icon="inline-end"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </div>
          </form>

          {checkStatus === "error" && (
            <div
              role="alert"
              className="mt-5 flex max-w-3xl items-start gap-3 text-left text-sm leading-relaxed text-destructive"
            >
              <HugeiconsIcon
                icon={Alert02Icon}
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <p>{checkError}</p>
            </div>
          )}

          <div className="my-7 flex w-full max-w-5xl items-center gap-5 text-sm font-medium text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            vagy
            <span className="h-px flex-1 bg-border" />
          </div>

          <a
            href="#og-image-tervezo"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <HugeiconsIcon
              icon={ImageAdd02Icon}
              data-icon="inline-start"
              aria-hidden="true"
            />
            OG kép tervezése
          </a>

          <div className="mt-14">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
              Előnézet ezekhez
            </p>
            <ul
              className="mt-5 flex flex-wrap justify-center gap-5 text-muted-foreground"
              aria-label="Támogatott előnézetek"
            >
              {previewPlatforms.map((platform) => (
                <li
                  key={platform.label}
                  className="flex items-center gap-2"
                  title={platform.label}
                >
                  <HugeiconsIcon
                    icon={platform.icon}
                    className="size-6"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{platform.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {checkStatus === "success" && scanData && (
        <section className="morf-section-normal">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <AuditAndPreview data={previewData} items={auditItems} />
          </div>
        </section>
      )}

      <OgImageDesigner
        title={title}
        description={description}
        siteName={siteName}
        pageUrl={pageUrl}
      />

      <section id="metaadat-szerkeszto" className="morf-section-normal">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <header className="mb-10 max-w-3xl">
            <h2 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Finomítsd a metaadatokat
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
              A módosítások az előnézetben és a beilleszthető kódban azonnal
              megjelennek.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-start">
            <div className="rounded-3xl border bg-card p-5 sm:p-7">
              <FieldGroup className="gap-7">
                <Field>
                  <FieldLabel htmlFor="share-page-url">
                    Az oldal URL-je
                  </FieldLabel>
                  <Input
                    id="share-page-url"
                    type="url"
                    value={pageUrl}
                    onChange={(event) => setPageUrl(event.target.value)}
                  />
                </Field>
                <Field>
                  <div className="flex items-baseline justify-between gap-4">
                    <FieldLabel htmlFor="share-title">Cím</FieldLabel>
                    <CharacterHint current={title.length} limit={60} />
                  </div>
                  <Input
                    id="share-title"
                    value={title}
                    maxLength={90}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Field>
                <Field>
                  <div className="flex items-baseline justify-between gap-4">
                    <FieldLabel htmlFor="share-description">Leírás</FieldLabel>
                    <CharacterHint current={description.length} limit={125} />
                  </div>
                  <Textarea
                    id="share-description"
                    value={description}
                    maxLength={200}
                    rows={4}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="share-image-url">
                    A kép publikus URL-je
                  </FieldLabel>
                  <Input
                    id="share-image-url"
                    type="url"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://pelda.hu/og-image.jpg"
                  />
                  <FieldDescription>
                    Az exportált PNG-t előbb töltsd fel a saját webhelyedre vagy
                    CDN-edre.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="share-image-alt">
                    A kép leírása
                  </FieldLabel>
                  <Input
                    id="share-image-alt"
                    value={imageAlt}
                    maxLength={160}
                    onChange={(event) => setImageAlt(event.target.value)}
                  />
                </Field>
                <div className="grid gap-6 border-t pt-7 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="share-site-name">
                      Webhely neve
                    </FieldLabel>
                    <Input
                      id="share-site-name"
                      value={siteName}
                      onChange={(event) => setSiteName(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="share-type">Oldal típusa</FieldLabel>
                    <select
                      id="share-type"
                      value={pageType}
                      onChange={(event) => setPageType(event.target.value)}
                      className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <option value="website">Weboldal</option>
                      <option value="article">Cikk</option>
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="share-locale">
                      Nyelv / régió
                    </FieldLabel>
                    <Input
                      id="share-locale"
                      value={locale}
                      onChange={(event) => setLocale(event.target.value)}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </div>

            <aside className="morf-share-preview-panel rounded-3xl border p-5 sm:p-6 lg:sticky lg:top-6">
              <h3 className="text-dark-section-heading font-heading text-xl font-semibold">
                Beilleszthető kód
              </h3>
              <p className="text-dark-section-muted mt-1 text-sm">
                Tedd az adott oldal &lt;head&gt; részébe.
              </p>
              <pre className="morf-share-code mt-5 max-h-[32rem] overflow-auto rounded-xl border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                <code>{generatedCode}</code>
              </pre>
              <Button type="button" className="mt-4 w-full" onClick={copyCode}>
                <HugeiconsIcon
                  icon={ClipboardCopyIcon}
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                {copyState === "copied"
                  ? "Kód kimásolva"
                  : copyState === "error"
                    ? "Nem sikerült – másold ki kézzel"
                    : "Kód másolása"}
              </Button>
              <p className="sr-only" aria-live="polite">
                {copyState === "copied" ? "A kód a vágólapra került." : ""}
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
