import { useState } from "react";
import {
  CircleQuestionMarkIcon,
  ComputerIcon,
  Copy01Icon,
  Download04Icon,
  FileDownloadIcon,
  Loading03Icon,
  PackageProcessIcon,
  SmartPhone02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { validateManifestNavigation } from "@/features/favicon-generator/package-content";
import type {
  DisplayMode,
  FaviconExportOptions,
  FaviconExportTarget,
  FaviconGenerateResult,
  ManifestSettings,
} from "@/features/favicon-generator/types";

interface FaviconExportPanelProps {
  exportOptions: FaviconExportOptions;
  manifest: ManifestSettings;
  progress: number;
  statusLabel?: string;
  generating: boolean;
  error?: string;
  result?: FaviconGenerateResult;
  canSaveAs: boolean;
  onExportOptionsChange: (options: FaviconExportOptions) => void;
  onManifestChange: (patch: Partial<ManifestSettings>) => void;
  onGenerate: () => void;
  onDownload: () => void;
  onSaveAs: () => void;
}

const displayItems: Array<{
  value: DisplayMode;
  label: string;
  description: string;
}> = [
  {
    value: "standalone",
    label: "Önálló alkalmazás — ajánlott",
    description:
      "Saját alkalmazásablakban nyílik meg, böngésző címsor és navigáció nélkül.",
  },
  {
    value: "minimal-ui",
    label: "Minimális böngészőkeret",
    description:
      "Alkalmazásablakban nyílik meg, de néhány alap böngészővezérlő megmaradhat.",
  },
  {
    value: "fullscreen",
    label: "Teljes képernyő",
    description:
      "A teljes kijelzőt használja, böngésző- és alkalmazáskeret nélkül.",
  },
  {
    value: "browser",
    label: "Böngésző",
    description:
      "Normál böngészőlapon nyílik meg, ezért kevésbé viselkedik önálló appként.",
  },
];

function colorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff";
}

export function FaviconExportPanel({
  exportOptions,
  manifest,
  progress,
  statusLabel,
  generating,
  error,
  result,
  canSaveAs,
  onExportOptionsChange,
  onManifestChange,
  onGenerate,
  onDownload,
  onSaveAs,
}: FaviconExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasWebsite = exportOptions.targets.includes("website");
  const hasWebApp = exportOptions.targets.includes("web-app");
  const hasExportTarget = exportOptions.targets.length > 0;
  const manifestNavigationErrors =
    hasWebApp && exportOptions.includeWebManifest
      ? validateManifestNavigation(manifest)
      : {};
  const hasManifestNavigationErrors = Object.values(
    manifestNavigationErrors,
  ).some(Boolean);
  const exportConfigurationValid =
    hasExportTarget && !hasManifestNavigationErrors;

  const setTarget = (target: FaviconExportTarget, checked: boolean) => {
    const targets = checked
      ? [...new Set([...exportOptions.targets, target])]
      : exportOptions.targets.filter((item) => item !== target);

    onExportOptionsChange({
      targets,
      includeWebManifest:
        target === "web-app" && !checked
          ? false
          : exportOptions.includeWebManifest,
    });
  };

  const copyHtml = async () => {
    if (!result?.htmlCode) return;
    await navigator.clipboard.writeText(result.htmlCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Exportcsomag</CardTitle>
            <CardDescription>
              A kiválasztott ikonok, telepítési kód és README egy ZIP-ben.
            </CardDescription>
          </div>
          <HugeiconsIcon
            icon={PackageProcessIcon}
            className="size-5 text-primary"
            strokeWidth={2}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Mit tartalmazzon a csomag?</FieldLegend>
            <FieldDescription>
              Jelöld be a felhasználási célokat. Csak a kiválasztott célokhoz
              szükséges fájlok kerülnek a ZIP-be.
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group" className="gap-3">
              <FieldLabel className="morf-inset-panel cursor-pointer rounded-3xl border-border/70 transition-colors has-data-checked:border-primary/40 has-data-checked:bg-primary/5">
                <Field orientation="horizontal">
                  <Checkbox
                    checked={hasWebsite}
                    onCheckedChange={(checked) =>
                      setTarget("website", checked === true)
                    }
                  />
                  <HugeiconsIcon
                    icon={ComputerIcon}
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <FieldContent>
                    <span className="font-heading text-base">Weboldal</span>
                    <FieldDescription>
                      Böngészőfülhöz, könyvjelzőhöz és Apple kezdőképernyőhöz
                      szükséges faviconok.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>

              <FieldLabel className="morf-inset-panel cursor-pointer rounded-3xl border-border/70 transition-colors has-data-checked:border-primary/40 has-data-checked:bg-primary/5">
                <Field orientation="horizontal">
                  <Checkbox
                    checked={hasWebApp}
                    onCheckedChange={(checked) =>
                      setTarget("web-app", checked === true)
                    }
                  />
                  <HugeiconsIcon
                    icon={SmartPhone02Icon}
                    className="mt-0.5 size-5 shrink-0 text-secondary-foreground"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <FieldContent>
                    <span className="font-heading text-base">
                      Telepíthető webalkalmazás
                    </span>
                    <FieldDescription>
                      Normál és maskable ikonok a telepített webapphoz.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>

              <FieldLabel
                data-disabled={!hasWebApp || undefined}
                className="ml-5 cursor-pointer rounded-3xl border border-dashed border-border/80 bg-background/45 transition-colors has-data-checked:border-secondary/50 has-data-checked:bg-secondary/5 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 sm:ml-8"
              >
                <Field orientation="horizontal">
                  <Checkbox
                    checked={exportOptions.includeWebManifest}
                    disabled={!hasWebApp}
                    onCheckedChange={(checked) =>
                      onExportOptionsChange({
                        ...exportOptions,
                        includeWebManifest: checked === true,
                      })
                    }
                  />
                  <FieldContent>
                    <span className="font-heading text-base">
                      + site.webmanifest
                    </span>
                    <FieldDescription>
                      {hasWebApp
                        ? "Elkészíti a telepítéshez szükséges manifestet és a hozzá tartozó HTML-hivatkozást."
                        : "Előbb válaszd ki a Telepíthető webalkalmazás opciót."}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </FieldGroup>
            {!hasExportTarget && (
              <FieldError>Válassz legalább egy felhasználási célt.</FieldError>
            )}
            <a
              href="#favicon-package-guide"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <HugeiconsIcon
                icon={CircleQuestionMarkIcon}
                data-icon="inline-start"
                strokeWidth={2}
                aria-hidden="true"
              />
              Melyikre van szükségem?
            </a>
          </FieldSet>

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="favicon-project-name">
                Projekt neve
              </FieldLabel>
              <Input
                id="favicon-project-name"
                value={manifest.projectName}
                maxLength={80}
                onChange={(event) =>
                  onManifestChange({ projectName: event.target.value })
                }
              />
              <FieldDescription>Ez kerül a ZIP fájlnevébe is.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="favicon-base-path">
                Fájlok base path-ja
              </FieldLabel>
              <Input
                id="favicon-base-path"
                value={manifest.basePath}
                placeholder="/ vagy ./ vagy /assets/icons"
                onChange={(event) =>
                  onManifestChange({ basePath: event.target.value })
                }
              />
              <FieldDescription>
                Ez a HTML kódot rendezi. Annak a mappának vagy URL-útnak az
                előtagja, ahová az ikonokat másolod. Például{" "}
                <code>/assets/icons/</code> esetén a kód erre a helyre
                hivatkozik.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {hasWebApp && exportOptions.includeWebManifest && (
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="favicon-app-name">
                  Alkalmazás neve
                </FieldLabel>
                <Input
                  id="favicon-app-name"
                  value={manifest.name}
                  onChange={(event) =>
                    onManifestChange({ name: event.target.value })
                  }
                />
                <FieldDescription>
                  A telepítésnél és az alkalmazáslistában megjelenő teljes név.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="favicon-short-name">Rövid név</FieldLabel>
                <Input
                  id="favicon-short-name"
                  value={manifest.shortName}
                  maxLength={24}
                  onChange={(event) =>
                    onManifestChange({ shortName: event.target.value })
                  }
                />
                <FieldDescription>
                  Helyszűkében, például az ikon alatt használt rövid változat.
                </FieldDescription>
              </Field>
              <Field data-invalid={Boolean(manifestNavigationErrors.id)}>
                <FieldLabel htmlFor="favicon-app-id">
                  Alkalmazásazonosító (id)
                </FieldLabel>
                <Input
                  id="favicon-app-id"
                  value={manifest.id}
                  placeholder="/ vagy /app/"
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.id)}
                  onChange={(event) =>
                    onManifestChange({ id: event.target.value })
                  }
                />
                <FieldDescription>
                  Stabil, gyökérrel kezdődő URL-azonosító. Telepítés után ne
                  változtasd meg; általában <code>/</code> vagy az alkalmazás
                  útvonala, például <code>/app/</code>.
                </FieldDescription>
                {manifestNavigationErrors.id && (
                  <FieldError>{manifestNavigationErrors.id}</FieldError>
                )}
              </Field>
              <Field data-invalid={Boolean(manifestNavigationErrors.startUrl)}>
                <FieldLabel htmlFor="favicon-start-url">
                  Indulási URL (start_url)
                </FieldLabel>
                <Input
                  id="favicon-start-url"
                  value={manifest.startUrl}
                  placeholder="/ vagy /app/"
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.startUrl)}
                  onChange={(event) =>
                    onManifestChange({ startUrl: event.target.value })
                  }
                />
                <FieldDescription>
                  Ezt az oldalt nyitja meg a telepített alkalmazás ikonja.
                </FieldDescription>
                {manifestNavigationErrors.startUrl && (
                  <FieldError>{manifestNavigationErrors.startUrl}</FieldError>
                )}
              </Field>
              <Field
                className="md:col-span-2"
                data-invalid={Boolean(manifestNavigationErrors.scope)}
              >
                <FieldLabel htmlFor="favicon-scope">
                  Navigációs hatókör (scope)
                </FieldLabel>
                <Input
                  id="favicon-scope"
                  value={manifest.scope}
                  placeholder="/ vagy /app/"
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.scope)}
                  onChange={(event) =>
                    onManifestChange({ scope: event.target.value })
                  }
                />
                <FieldDescription>
                  Az ide tartozó URL-ek maradnak az alkalmazás felületén belül.
                  Tartalmaznia kell az indulási URL-t; általában ugyanaz vagy
                  egy tágabb útvonal.
                </FieldDescription>
                {manifestNavigationErrors.scope && (
                  <FieldError>{manifestNavigationErrors.scope}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="favicon-theme-color">
                  Theme color
                </FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    className="size-10 shrink-0 p-1"
                    type="color"
                    value={colorInputValue(manifest.themeColor)}
                    aria-label="Theme color választása"
                    onChange={(event) =>
                      onManifestChange({ themeColor: event.target.value })
                    }
                  />
                  <Input
                    id="favicon-theme-color"
                    value={manifest.themeColor}
                    onChange={(event) =>
                      onManifestChange({ themeColor: event.target.value })
                    }
                  />
                </div>
                <FieldDescription>
                  A webapp körüli böngésző- vagy rendszerfelület ajánlott színe.
                </FieldDescription>
              </Field>
              <Field className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="favicon-display">
                    Megjelenítési mód
                  </FieldLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        aria-label="A megjelenítési módok magyarázata"
                        className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <HugeiconsIcon
                          icon={CircleQuestionMarkIcon}
                          className="size-4"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm items-start py-3 text-left whitespace-normal">
                        <dl className="grid gap-3">
                          {displayItems.map((item) => (
                            <div
                              key={item.value}
                              className="flex flex-col gap-0.5"
                            >
                              <dt className="font-medium">{item.label}</dt>
                              <dd className="text-background/80">
                                {item.description}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  items={displayItems}
                  value={manifest.display}
                  onValueChange={(value) =>
                    value && onManifestChange({ display: value as DisplayMode })
                  }
                >
                  <SelectTrigger id="favicon-display" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {displayItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          )}
        </FieldGroup>

        {generating && (
          <Progress
            value={progress}
            aria-label={statusLabel || "Favicon csomag készítése"}
          >
            <ProgressLabel>{statusLabel}</ProgressLabel>
            <ProgressValue>{() => `${Math.round(progress)}%`}</ProgressValue>
          </Progress>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>A csomagot nem sikerült elkészíteni</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <Alert>
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              <AlertTitle>A favicon csomag elkészült</AlertTitle>
              <AlertDescription>
                {result.assetNames.length} fájl került a ZIP-be. Új beállítás
                után bármikor újragenerálhatod.
              </AlertDescription>
            </Alert>
            {result.htmlCode && (
              <div className="morf-inset-panel flex flex-col gap-3 rounded-3xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">HTML-kód</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyHtml}
                  >
                    <HugeiconsIcon
                      icon={copied ? Tick02Icon : Copy01Icon}
                      data-icon="inline-start"
                      strokeWidth={2}
                    />
                    {copied ? "Másolva" : "Másolás"}
                  </Button>
                </div>
                <pre className="text-muted-foreground max-h-44 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">
                  <code>{result.htmlCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          disabled={generating || !exportConfigurationValid}
          onClick={onGenerate}
        >
          <HugeiconsIcon
            icon={generating ? Loading03Icon : PackageProcessIcon}
            data-icon="inline-start"
            className={
              generating ? "animate-spin motion-reduce:animate-none" : undefined
            }
            strokeWidth={2}
          />
          {generating
            ? "Csomag készítése"
            : result
              ? "Csomag újragenerálása"
              : "Favicon csomag letöltése"}
        </Button>
        {canSaveAs && (
          <Button
            type="button"
            variant="outline"
            disabled={generating || !exportConfigurationValid}
            onClick={onSaveAs}
          >
            <HugeiconsIcon
              icon={FileDownloadIcon}
              data-icon="inline-start"
              strokeWidth={2}
            />
            Mentés másként
          </Button>
        )}
        {result && (
          <Button type="button" variant="outline" onClick={onDownload}>
            <HugeiconsIcon
              icon={Download04Icon}
              data-icon="inline-start"
              strokeWidth={2}
            />
            ZIP letöltése újra
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
