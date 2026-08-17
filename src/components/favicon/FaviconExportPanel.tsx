import { useState, type ReactNode } from "react";
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
import { useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import type { FaviconMessages } from "@/i18n/favicon";
import { interpolateText } from "@/lib/utils";

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
  const { messages } = useWorkspaceI18n<FaviconMessages>();
  const copy = messages.exportPanel;
  const displayItems = copy.displayMode.items as ReadonlyArray<{
    value: DisplayMode;
    label: string;
    description: string;
  }>;
  const [copied, setCopied] = useState(false);
  const hasWebsite = exportOptions.targets.includes("website");
  const hasWebApp = exportOptions.targets.includes("web-app");
  const hasExportTarget = exportOptions.targets.length > 0;
  const manifestNavigationErrors =
    hasWebApp && exportOptions.includeWebManifest
      ? validateManifestNavigation(manifest, messages.engine.manifestErrors)
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
            <CardTitle>{copy.cardTitle}</CardTitle>
            <CardDescription>{copy.cardDescription}</CardDescription>
          </div>
          <HugeiconsIcon
            icon={PackageProcessIcon}
            className="text-primary size-5"
            strokeWidth={2}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{copy.targetsLegend}</FieldLegend>
            <FieldDescription>{copy.targetsDescription}</FieldDescription>
            <FieldGroup data-slot="checkbox-group" className="gap-3">
              <FieldLabel className="border-border bg-card has-data-checked:border-primary/40 has-data-checked:bg-primary/5 cursor-pointer rounded-3xl border transition-colors">
                <Field orientation="horizontal">
                  <Checkbox
                    checked={hasWebsite}
                    onCheckedChange={(checked) =>
                      setTarget("website", checked === true)
                    }
                  />
                  <HugeiconsIcon
                    icon={ComputerIcon}
                    className="text-primary mt-0.5 size-5 shrink-0"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <FieldContent>
                    <span className="font-heading text-base">{copy.website.label}</span>
                    <FieldDescription>{copy.website.description}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>

              <FieldLabel className="border-border bg-card has-data-checked:border-primary/40 has-data-checked:bg-primary/5 cursor-pointer rounded-3xl border transition-colors">
                <Field orientation="horizontal">
                  <Checkbox
                    checked={hasWebApp}
                    onCheckedChange={(checked) =>
                      setTarget("web-app", checked === true)
                    }
                  />
                  <HugeiconsIcon
                    icon={SmartPhone02Icon}
                    className="text-secondary-foreground mt-0.5 size-5 shrink-0"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <FieldContent>
                    <span className="font-heading text-base">{copy.webApp.label}</span>
                    <FieldDescription>{copy.webApp.description}</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>

              <FieldLabel
                data-disabled={!hasWebApp || undefined}
                className="border-border/80 bg-background/45 has-data-checked:border-secondary/50 has-data-checked:bg-secondary/5 ml-5 cursor-pointer rounded-3xl border border-dashed transition-colors data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 sm:ml-8"
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
                    <span className="font-heading text-base">{copy.manifestCheckbox.label}</span>
                    <FieldDescription>
                      {hasWebApp
                        ? copy.manifestCheckbox.descriptionEnabled
                        : copy.manifestCheckbox.descriptionDisabled}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </FieldGroup>
            {!hasExportTarget && (
              <FieldError>{copy.noTargetError}</FieldError>
            )}
            <a
              href={`#${messages.guide.sectionId}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <HugeiconsIcon
                icon={CircleQuestionMarkIcon}
                data-icon="inline-start"
                strokeWidth={2}
                aria-hidden="true"
              />
              {copy.whichDoINeed}
            </a>
          </FieldSet>

          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="favicon-project-name">
                {copy.projectName.label}
              </FieldLabel>
              <Input
                id="favicon-project-name"
                value={manifest.projectName}
                maxLength={80}
                onChange={(event) =>
                  onManifestChange({ projectName: event.target.value })
                }
              />
              <FieldDescription>{copy.projectName.description}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="favicon-base-path">
                {copy.basePath.label}
              </FieldLabel>
              <Input
                id="favicon-base-path"
                value={manifest.basePath}
                placeholder={copy.basePath.placeholder}
                onChange={(event) =>
                  onManifestChange({ basePath: event.target.value })
                }
              />
              <FieldDescription>
                {copy.basePath.descriptionPrefix}{" "}
                <code>{copy.basePath.example}</code>{" "}
                {copy.basePath.descriptionSuffix}
              </FieldDescription>
            </Field>
          </FieldGroup>

          {hasWebApp && exportOptions.includeWebManifest && (
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="favicon-app-name">
                  {copy.appName.label}
                </FieldLabel>
                <Input
                  id="favicon-app-name"
                  value={manifest.name}
                  onChange={(event) =>
                    onManifestChange({ name: event.target.value })
                  }
                />
                <FieldDescription>{copy.appName.description}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="favicon-short-name">{copy.shortName.label}</FieldLabel>
                <Input
                  id="favicon-short-name"
                  value={manifest.shortName}
                  maxLength={24}
                  onChange={(event) =>
                    onManifestChange({ shortName: event.target.value })
                  }
                />
                <FieldDescription>{copy.shortName.description}</FieldDescription>
              </Field>
              <Field data-invalid={Boolean(manifestNavigationErrors.id)}>
                <FieldLabel htmlFor="favicon-app-id">
                  {copy.appId.label}
                </FieldLabel>
                <Input
                  id="favicon-app-id"
                  value={manifest.id}
                  placeholder={copy.appId.placeholder}
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.id)}
                  onChange={(event) =>
                    onManifestChange({ id: event.target.value })
                  }
                />
                <FieldDescription>
                  {interpolateText(
                    `${copy.appId.descriptionPrefix} {root} ${copy.appId.descriptionMiddle} {appPath}${copy.appId.descriptionSuffix}`,
                    { root: <code>/</code>, appPath: <code>/app/</code> },
                  ) as ReactNode[]}
                </FieldDescription>
                {manifestNavigationErrors.id && (
                  <FieldError>{manifestNavigationErrors.id}</FieldError>
                )}
              </Field>
              <Field data-invalid={Boolean(manifestNavigationErrors.startUrl)}>
                <FieldLabel htmlFor="favicon-start-url">
                  {copy.startUrl.label}
                </FieldLabel>
                <Input
                  id="favicon-start-url"
                  value={manifest.startUrl}
                  placeholder={copy.startUrl.placeholder}
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.startUrl)}
                  onChange={(event) =>
                    onManifestChange({ startUrl: event.target.value })
                  }
                />
                <FieldDescription>{copy.startUrl.description}</FieldDescription>
                {manifestNavigationErrors.startUrl && (
                  <FieldError>{manifestNavigationErrors.startUrl}</FieldError>
                )}
              </Field>
              <Field
                className="md:col-span-2"
                data-invalid={Boolean(manifestNavigationErrors.scope)}
              >
                <FieldLabel htmlFor="favicon-scope">
                  {copy.scope.label}
                </FieldLabel>
                <Input
                  id="favicon-scope"
                  value={manifest.scope}
                  placeholder={copy.scope.placeholder}
                  required
                  aria-invalid={Boolean(manifestNavigationErrors.scope)}
                  onChange={(event) =>
                    onManifestChange({ scope: event.target.value })
                  }
                />
                <FieldDescription>{copy.scope.description}</FieldDescription>
                {manifestNavigationErrors.scope && (
                  <FieldError>{manifestNavigationErrors.scope}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="favicon-theme-color">
                  {copy.themeColor.label}
                </FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    className="size-10 shrink-0 p-1"
                    type="color"
                    value={colorInputValue(manifest.themeColor)}
                    aria-label={copy.themeColor.ariaLabel}
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
                <FieldDescription>{copy.themeColor.description}</FieldDescription>
              </Field>
              <Field className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <FieldLabel htmlFor="favicon-display">
                    {copy.displayMode.label}
                  </FieldLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={copy.displayMode.tooltipAriaLabel}
                        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-6 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
            aria-label={statusLabel || copy.progressAriaFallback}
          >
            <ProgressLabel>{statusLabel}</ProgressLabel>
            <ProgressValue>{() => `${Math.round(progress)}%`}</ProgressValue>
          </Progress>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{copy.packageErrorTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <Alert>
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
              <AlertTitle>{copy.packageReadyTitle}</AlertTitle>
              <AlertDescription>
                {copy.packageReadyDescription(result.assetNames.length)}
              </AlertDescription>
            </Alert>
            {result.htmlCode && (
              <div className="morf-inset-panel flex flex-col gap-3 rounded-3xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{copy.htmlCodeLabel}</p>
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
                    {copied ? copy.copied : copy.copy}
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
            ? copy.generateButton.generating
            : result
              ? copy.generateButton.regenerate
              : copy.generateButton.initial}
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
            {copy.saveAs}
          </Button>
        )}
        {result && (
          <Button type="button" variant="outline" onClick={onDownload}>
            <HugeiconsIcon
              icon={Download04Icon}
              data-icon="inline-start"
              strokeWidth={2}
            />
            {copy.downloadAgain}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
