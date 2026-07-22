import {
  AndroidIcon,
  Apple01Icon,
  BrowserIcon,
  Search02Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FaviconPreviewsProps {
  previewUrl?: string;
  opaquePreviewUrl?: string;
  maskablePreviewUrl?: string;
  projectName: string;
}

function PreviewImage({
  src,
  alt,
  className,
  size,
}: {
  src?: string;
  alt: string;
  className?: string;
  size?: number;
}) {
  if (!src) {
    return (
      <span
        className="morf-inset-panel text-muted-foreground flex aspect-square items-center justify-center rounded-2xl text-xs"
        style={size ? { width: size, height: size } : undefined}
        aria-label="Előnézet készül"
      >
        …
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

export function FaviconPreviews({
  previewUrl,
  opaquePreviewUrl,
  maskablePreviewUrl,
  projectName,
}: FaviconPreviewsProps) {
  const name = projectName.trim() || "Az oldalad";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Élő előnézet</CardTitle>
            <CardDescription>
              Nagyított környezetek és valódi pixelméretek.
            </CardDescription>
          </div>
          <Badge variant="secondary">helyi render</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="morf-inset-panel flex min-h-28 flex-col gap-3 rounded-3xl p-4">
            <figcaption className="flex items-center gap-2 text-xs font-medium">
              <HugeiconsIcon
                icon={BrowserIcon}
                className="size-4"
                strokeWidth={2}
              />
              Böngészőfül
            </figcaption>
            <div className="morf-control-surface flex items-center gap-2 rounded-2xl border border-border/60 px-3 py-2">
              <PreviewImage
                src={previewUrl}
                alt="16 pixeles böngészőfavicon"
                size={16}
              />
              <span className="min-w-0 truncate text-xs">{name}</span>
            </div>
          </figure>

          <figure className="morf-inset-panel flex min-h-28 flex-col gap-3 rounded-3xl p-4">
            <figcaption className="flex items-center gap-2 text-xs font-medium">
              <HugeiconsIcon
                icon={Search02Icon}
                className="size-4"
                strokeWidth={2}
              />
              Keresési találat
            </figcaption>
            <div className="flex items-center gap-3">
              <PreviewImage
                src={previewUrl}
                alt="48 pixeles keresési favicon"
                className="size-12 rounded-full"
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  example.com
                </p>
              </div>
            </div>
          </figure>

          <figure className="morf-inset-panel flex min-h-36 flex-col gap-3 rounded-3xl p-4">
            <figcaption className="flex items-center gap-2 text-xs font-medium">
              <HugeiconsIcon
                icon={Apple01Icon}
                className="size-4"
                strokeWidth={2}
              />
              iOS kezdőképernyő
            </figcaption>
            <div className="flex items-center gap-3">
              <PreviewImage
                src={opaquePreviewUrl}
                alt="Apple Touch ikon előnézete"
                className="size-16 rounded-[1.35rem] shadow-sm"
              />
              <span className="text-xs">{name}</span>
            </div>
          </figure>

          <figure className="morf-inset-panel flex min-h-36 flex-col gap-3 rounded-3xl p-4">
            <figcaption className="flex items-center gap-2 text-xs font-medium">
              <HugeiconsIcon
                icon={AndroidIcon}
                className="size-4"
                strokeWidth={2}
              />
              Android ikon
            </figcaption>
            <div className="flex items-center gap-4">
              <PreviewImage
                src={opaquePreviewUrl}
                alt="Normál Android ikon"
                className="size-16 rounded-2xl"
              />
              <PreviewImage
                src={opaquePreviewUrl}
                alt="Kör alakú Android ikon"
                className="size-16 rounded-full"
              />
            </div>
          </figure>
        </div>

        <section
          className="flex flex-col gap-3"
          aria-labelledby="actual-size-title"
        >
          <div>
            <h3
              id="actual-size-title"
              className="font-heading text-sm font-medium"
            >
              Tényleges méret
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Ezek az ikonok nem nagyítottak.
            </p>
          </div>
          <div className="morf-inset-panel flex min-h-20 items-center gap-6 overflow-x-auto rounded-3xl p-4">
            {[16, 32, 48].map((size) => (
              <figure key={size} className="flex shrink-0 items-center gap-2">
                <PreviewImage
                  src={previewUrl}
                  alt={`${size} × ${size} pixeles favicon`}
                  size={size}
                />
                <figcaption className="text-muted-foreground text-xs tabular-nums">
                  {size} px
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section
          className="flex flex-col gap-3"
          aria-labelledby="maskable-title"
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Shield01Icon}
              className="size-4"
              strokeWidth={2}
            />
            <h3
              id="maskable-title"
              className="font-heading text-sm font-medium"
            >
              Maskable safe-zone
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <figure className="morf-inset-panel flex flex-col items-center gap-3 rounded-3xl p-5">
              <div className="relative size-32 overflow-hidden rounded-full">
                <PreviewImage
                  src={maskablePreviewUrl}
                  alt="Kör alakú maskable ikon előnézete"
                  className="size-full"
                />
                <span className="pointer-events-none absolute inset-[10%] rounded-full border border-dashed border-foreground/70" />
              </div>
              <figcaption className="text-center text-xs">
                Kör maszk · a szaggatott vonal jelzi a biztonságos zónát
              </figcaption>
            </figure>
            <figure className="morf-inset-panel flex flex-col items-center gap-3 rounded-3xl p-5">
              <div className="relative size-32 overflow-hidden rounded-[2.35rem]">
                <PreviewImage
                  src={maskablePreviewUrl}
                  alt="Squircle alakú maskable ikon előnézete"
                  className="size-full"
                />
                <span className="pointer-events-none absolute inset-[10%] rounded-3xl border border-dashed border-foreground/70" />
              </div>
              <figcaption className="text-center text-xs">
                Squircle maszk · a maszkolás csak az előnézetre hat
              </figcaption>
            </figure>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
