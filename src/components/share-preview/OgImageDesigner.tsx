import { type CSSProperties, type RefObject, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download04Icon,
  ImageAdd02Icon,
  MagicWand03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PlatformPreviewCard,
  previewPlatformItems,
  type PreviewPlatform,
} from "./PlatformPreviewCard";

type TemplateId =
  "editorial" | "split" | "fullbleed" | "quote" | "geometric" | "launch";

const templates: Array<{ id: TemplateId; name: string }> = [
  { id: "editorial", name: "Editorial" },
  { id: "split", name: "Split" },
  { id: "fullbleed", name: "Full bleed" },
  { id: "quote", name: "Quote" },
  { id: "geometric", name: "Geometric" },
  { id: "launch", name: "Launch" },
];

type ArtworkProps = {
  template: TemplateId;
  title: string;
  description: string;
  eyebrow: string;
  cta: string;
  image: string;
  background: string;
  accent: string;
  text: string;
  svgRef?: RefObject<SVGSVGElement | null>;
  label?: string;
};

const textReset = { margin: 0, padding: 0 } as const;
const clamp = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lines,
  overflow: "hidden",
});

function Artwork({
  template,
  title,
  description,
  eyebrow,
  cta,
  image,
  background,
  accent,
  text,
  svgRef,
  label = "Open Graph kép sablon előnézete",
}: ArtworkProps) {
  const softAccent = `${accent}26`;
  const softText = `${text}12`;
  const safeTitle = title || "A megosztási kép címe";
  const safeDescription =
    description || "Rövid, konkrét kiegészítő üzenet az oldalról.";
  const safeEyebrow = eyebrow || "Webhely neve";
  const safeCta = cta || "Tudd meg többet";
  const imageElement = image ? (
    <img
      src={image}
      alt=""
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: text,
        background: softText,
        fontSize: 25,
        fontWeight: 750,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        opacity: 0.55,
      }}
    >
      Saját kép
    </div>
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 630"
      role="img"
      aria-label={label}
      className="block h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <foreignObject width="1200" height="630">
        <div
          style={{
            width: 1200,
            height: 630,
            overflow: "hidden",
            boxSizing: "border-box",
            background,
            color: text,
            fontFamily: "Inter, Arial, sans-serif",
          }}
        >
          {template === "editorial" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "58% 42%",
                position: "relative",
                borderTop: `8px solid ${accent}`,
              }}
            >
              <div
                style={{
                  padding: "56px 34px 52px 66px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  zIndex: 2,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    color: accent,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {safeEyebrow}
                </p>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      marginBottom: 22,
                      borderRadius: 999,
                      padding: "8px 15px",
                      background: softAccent,
                      color: text,
                      fontSize: 18,
                      fontWeight: 750,
                    }}
                  >
                    Kiemelt tartalom
                  </span>
                  <h3
                    style={{
                      ...textReset,
                      ...clamp(3),
                      maxWidth: 610,
                      fontSize: 56,
                      lineHeight: 1.02,
                      letterSpacing: "-0.045em",
                      fontWeight: 850,
                    }}
                  >
                    {safeTitle}
                  </h3>
                  <p
                    style={{
                      ...textReset,
                      ...clamp(2),
                      marginTop: 22,
                      maxWidth: 570,
                      fontSize: 22,
                      lineHeight: 1.38,
                      opacity: 0.64,
                    }}
                  >
                    {safeDescription}
                  </p>
                </div>
                <span
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 10,
                    padding: "13px 20px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
              <div style={{ position: "relative", background: softText }}>
                <span
                  style={{
                    position: "absolute",
                    width: 235,
                    height: 235,
                    top: 70,
                    left: -88,
                    borderRadius: "50%",
                    background: accent,
                    opacity: 0.2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "92px 48px 72px -30px",
                    overflow: "hidden",
                    borderRadius: 30,
                  }}
                >
                  {imageElement}
                </div>
              </div>
            </div>
          )}

          {template === "split" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "46% 54%",
              }}
            >
              <div style={{ margin: 34, overflow: "hidden", borderRadius: 28 }}>
                {imageElement}
              </div>
              <div
                style={{
                  padding: "64px 66px 58px 42px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <p
                  style={{
                    ...textReset,
                    color: accent,
                    fontSize: 20,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 30,
                    fontSize: 54,
                    lineHeight: 1.03,
                    letterSpacing: "-0.04em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <p
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 22,
                    fontSize: 22,
                    lineHeight: 1.4,
                    opacity: 0.62,
                  }}
                >
                  {safeDescription}
                </p>
                <p
                  style={{
                    ...textReset,
                    marginTop: 34,
                    color: accent,
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {safeCta} →
                </p>
              </div>
            </div>
          )}

          {template === "fullbleed" && (
            <div style={{ height: "100%", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0 }}>
                {imageElement}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: "34px auto 34px 34px",
                  width: 565,
                  borderRadius: 28,
                  padding: "48px 44px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: text,
                  color: background,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    color: accent,
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(4),
                    fontSize: 54,
                    lineHeight: 1.02,
                    letterSpacing: "-0.045em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    padding: "12px 19px",
                    background: accent,
                    color: text,
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
            </div>
          )}

          {template === "quote" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "72% 28%",
              }}
            >
              <div
                style={{
                  padding: "54px 58px 52px 68px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    color: accent,
                    fontFamily: "Georgia, serif",
                    fontSize: 105,
                    lineHeight: 0.72,
                  }}
                >
                  “
                </span>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(4),
                    maxWidth: 760,
                    fontFamily: "Georgia, serif",
                    fontSize: 55,
                    lineHeight: 1.08,
                    letterSpacing: "-0.035em",
                    fontWeight: 650,
                  }}
                >
                  {safeTitle}
                </h3>
                <div>
                  <div
                    style={{
                      width: 120,
                      height: 5,
                      marginBottom: 20,
                      background: accent,
                    }}
                  />
                  <p style={{ ...textReset, fontSize: 20, fontWeight: 750 }}>
                    {safeEyebrow}
                  </p>
                </div>
              </div>
              <div style={{ overflow: "hidden" }}>{imageElement}</div>
            </div>
          )}

          {template === "geometric" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "62% 38%",
                position: "relative",
              }}
            >
              <div
                style={{
                  padding: "60px 48px 54px 66px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  zIndex: 2,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    maxWidth: 690,
                    fontSize: 58,
                    lineHeight: 1.01,
                    letterSpacing: "-0.05em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    alignSelf: "flex-start",
                    border: `3px solid ${text}`,
                    borderRadius: 10,
                    padding: "11px 18px",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateRows: "38% 62%" }}>
                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
                >
                  <div style={{ background: accent }} />
                  <div style={{ background: text }} />
                </div>
                <div style={{ overflow: "hidden" }}>{imageElement}</div>
              </div>
              <span
                style={{
                  position: "absolute",
                  right: 350,
                  bottom: 62,
                  width: 155,
                  height: 155,
                  borderRadius: "50%",
                  background: accent,
                }}
              />
            </div>
          )}

          {template === "launch" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "54% 46%",
                background: text,
                color: background,
              }}
            >
              <div
                style={{
                  padding: "60px 42px 54px 68px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderRight: `1px solid ${background}33`,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    color: accent,
                    fontSize: 20,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {safeEyebrow}
                </p>
                <div>
                  <h3
                    style={{
                      ...textReset,
                      ...clamp(3),
                      fontFamily: "Georgia, serif",
                      fontSize: 58,
                      lineHeight: 1.03,
                      letterSpacing: "-0.04em",
                      fontWeight: 650,
                    }}
                  >
                    {safeTitle}
                  </h3>
                  <p
                    style={{
                      ...textReset,
                      ...clamp(2),
                      marginTop: 22,
                      fontSize: 21,
                      lineHeight: 1.38,
                      opacity: 0.66,
                    }}
                  >
                    {safeDescription}
                  </p>
                </div>
                <p
                  style={{
                    ...textReset,
                    color: accent,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta} →
                </p>
              </div>
              <div style={{ margin: 28, overflow: "hidden", borderRadius: 24 }}>
                {imageElement}
              </div>
            </div>
          )}
        </div>
      </foreignObject>
    </svg>
  );
}

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "og-image"
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="size-9 shrink-0 rounded-full border bg-background p-1"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-foreground">{label}</span>
        <span className="mt-0.5 block font-mono text-[0.68rem] uppercase">
          {value}
        </span>
      </span>
    </label>
  );
}

export function OgImageDesigner({
  title,
  description,
  siteName,
  pageUrl = "https://webhely.hu",
}: {
  title: string;
  description: string;
  siteName: string;
  pageUrl?: string;
}) {
  const [template, setTemplate] = useState<TemplateId>("editorial");
  const [platform, setPlatform] = useState<PreviewPlatform>("facebook");
  const [cta, setCta] = useState("Tudd meg többet");
  const [background, setBackground] = useState("#f7f8f6");
  const [accent, setAccent] = useState("#2e9f7c");
  const [text, setText] = useState("#163d35");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [exportState, setExportState] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artworkRef = useRef<SVGSVGElement>(null);
  const templateStripRef = useRef<HTMLDivElement>(null);

  function loadImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
        setImageName(file.name);
      }
    };
    reader.readAsDataURL(file);
  }

  async function exportPng() {
    if (!artworkRef.current) return;
    setExportState("exporting");
    let svgUrl = "";

    try {
      const clone = artworkRef.current.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1200");
      clone.setAttribute("height", "630");
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone
        .querySelector("foreignObject > div")
        ?.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

      const serialized = new XMLSerializer().serializeToString(clone);
      svgUrl = URL.createObjectURL(
        new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
      );
      const rasterImage = new Image();
      rasterImage.src = svgUrl;
      await rasterImage.decode();

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("A vászon nem hozható létre.");
      context.drawImage(rasterImage, 0, 0, 1200, 630);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("A PNG nem készíthető el.")),
          "image/png",
        );
      });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${slugify(title)}-og.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setExportState("idle");
    } catch {
      setExportState("error");
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    }
  }

  const artworkProps = {
    template,
    title,
    description,
    eyebrow: siteName,
    cta,
    image,
    background,
    accent,
    text,
  };
  const selectedIndex = templates.findIndex((item) => item.id === template);

  return (
    <section
      id="og-image-tervezo"
      aria-labelledby="og-image-designer-title"
      className="morf-section-normal border-t"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <header className="mb-8 max-w-4xl">
          <p className="text-primary text-sm font-medium">
            Open Graph képtervező
          </p>
          <h2
            id="og-image-designer-title"
            className="font-heading mt-2 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl"
          >
            A jobb első benyomás több kattintást hozhat
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed text-pretty">
            Tartsd egyértelműen a címet, a képet és a következő lépést. A
            preview pontosan ugyanabból a kompozícióból készül, mint a
            letölthető PNG.
          </p>
        </header>

        <div className="overflow-hidden rounded-3xl border bg-card xl:grid xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="border-b p-4 sm:p-5 xl:border-r xl:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-lg font-semibold">
                Szerkesztés
              </h3>
              <a
                href="#metaadat-szerkeszto"
                className="text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
              >
                Szövegek
              </a>
            </div>

            <div className="mt-5 space-y-5">
              <Field>
                <FieldLabel>Kép</FieldLabel>
                <div
                  className={cn(
                    "flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition-colors",
                    isDragging
                      ? "border-ring bg-muted ring-3 ring-ring/20"
                      : "bg-muted/30",
                  )}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    loadImage(event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => loadImage(event.target.files?.[0])}
                  />
                  <HugeiconsIcon
                    icon={ImageAdd02Icon}
                    className="text-muted-foreground size-5"
                    aria-hidden="true"
                  />
                  <p className="mt-2 max-w-full truncate text-xs font-medium">
                    {imageName ||
                      (isDragging ? "Engedd el" : "Húzd ide a képet")}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-primary underline underline-offset-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {image ? "Csere" : "Tallózás"}
                  </button>
                </div>
                <FieldDescription>PNG, JPG vagy WebP.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="og-designer-cta">CTA</FieldLabel>
                <Input
                  id="og-designer-cta"
                  value={cta}
                  maxLength={32}
                  onChange={(event) => setCta(event.target.value)}
                />
              </Field>

              <div className="border-t pt-5">
                <p className="mb-4 text-xs font-medium text-foreground">
                  Színek
                </p>
                <div className="space-y-4">
                  <ColorControl
                    label="Háttér"
                    value={background}
                    onChange={setBackground}
                  />
                  <ColorControl
                    label="Kiemelés"
                    value={accent}
                    onChange={setAccent}
                  />
                  <ColorControl
                    label="Szöveg"
                    value={text}
                    onChange={setText}
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 border-b px-2 sm:px-4">
              <div
                className="flex min-w-0 overflow-x-auto"
                role="tablist"
                aria-label="Közösségi előnézet"
              >
                {previewPlatformItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={platform === item.id}
                    onClick={() => setPlatform(item.id)}
                    data-platform={item.id}
                    className={cn(
                      "morf-platform-tab relative flex h-12 shrink-0 items-center gap-2 px-3 text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                      platform === item.id &&
                        "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-current",
                    )}
                    title={item.label}
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      className="size-5"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="sr-only">{item.label}</span>
                  </button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={exportPng}
                disabled={exportState === "exporting"}
              >
                <HugeiconsIcon
                  icon={
                    exportState === "exporting"
                      ? MagicWand03Icon
                      : Download04Icon
                  }
                  data-icon="inline-start"
                  className={
                    exportState === "exporting" ? "animate-pulse" : undefined
                  }
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {exportState === "exporting"
                    ? "PNG készítése"
                    : "PNG letöltése"}
                </span>
                <span className="sm:hidden">PNG</span>
              </Button>
            </div>

            <div className="morf-share-preview-panel p-4 sm:p-6 lg:p-8">
              <PlatformPreviewCard
                platform={platform}
                title={title}
                description={description}
                media={<Artwork {...artworkProps} svgRef={artworkRef} />}
                siteName={siteName}
                pageUrl={pageUrl}
              />
            </div>

            {exportState === "error" && (
              <p
                role="alert"
                className="border-t px-5 py-3 text-sm text-destructive"
              >
                A PNG export nem sikerült. Próbálj másik helyben feltöltött
                képet.
              </p>
            )}

            <div className="border-t px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading text-base font-semibold">
                    Sablonok
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {selectedIndex + 1} / {templates.length} · 1200 × 630 px
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Előző sablonok"
                    onClick={() =>
                      templateStripRef.current?.scrollBy({
                        left: -360,
                        behavior: "smooth",
                      })
                    }
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Következő sablonok"
                    onClick={() =>
                      templateStripRef.current?.scrollBy({
                        left: 360,
                        behavior: "smooth",
                      })
                    }
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div
                ref={templateStripRef}
                className="flex snap-x gap-3 overflow-x-auto pb-1"
              >
                {templates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={template === item.id}
                    onClick={() => setTemplate(item.id)}
                    className={cn(
                      "w-44 shrink-0 snap-start overflow-hidden rounded-xl border bg-card text-left outline-none transition-[border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/30 sm:w-52",
                      template === item.id
                        ? "border-ring ring-2 ring-ring/20"
                        : "hover:border-foreground/25",
                    )}
                  >
                    <Artwork
                      {...artworkProps}
                      template={item.id}
                      label={`${item.name} sablon`}
                    />
                    <span className="block border-t px-3 py-2 text-xs font-medium">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
