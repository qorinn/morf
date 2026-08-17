import { useCallback, useEffect, useRef, useState } from "react";
import { proxy, transfer } from "comlink";
import {
  Alert02Icon,
  Delete02Icon,
  FileImageIcon,
  ImageUploadIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

import {
  FaviconCropEditor,
  type CropCanvasGetter,
} from "@/components/favicon/FaviconCropEditor";
import { FaviconExportPanel } from "@/components/favicon/FaviconExportPanel";
import { FaviconPreviews } from "@/components/favicon/FaviconPreviews";
import { FaviconSettings } from "@/components/favicon/FaviconSettings";
import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import {
  WorkspaceI18nProvider,
  useWorkspaceI18n,
} from "@/components/workspace/WorkspaceI18nProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/toast";
import { RECOMMENDED_SOURCE_DIMENSION } from "@/features/favicon-generator/config";
import { slugifyProjectName } from "@/features/favicon-generator/package-content";
import {
  canvasToObjectUrl,
  canvasToRasterPayload,
  renderMasterCanvas,
  resolveEditorBackground,
  resolveWebAppBackground,
} from "@/features/favicon-generator/render";
import {
  FaviconSourceError,
  validateFaviconSource,
} from "@/features/favicon-generator/source";
import type {
  FaviconEditorSettings,
  FaviconExportOptions,
  FaviconGenerateResult,
  FaviconProgress,
  FaviconSource,
  ManifestSettings,
} from "@/features/favicon-generator/types";
import { createFaviconWorker } from "@/features/favicon-generator/worker-client";
import { useErrorToast } from "@/hooks/use-error-toast";
import {
  downloadFile,
  getSaveCapabilities,
  isFilePickerCancellation,
  saveFileAs,
  saveGeneratedFileAs,
} from "@/lib/downloads";
import { getFaviconMessages, type FaviconMessages } from "@/i18n/favicon";
import type { Locale } from "@/lib/locale";

class FaviconBrowserUnsupportedError extends Error {}

interface PreviewUrls {
  standard?: string;
  opaque?: string;
  maskable?: string;
}

const initialSettings: FaviconEditorSettings = {
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  dominantColor: "#7bdcb5",
  standardPadding: 0,
  maskablePadding: 0.2,
  borderRadius: 0,
};

const initialManifest: ManifestSettings = {
  name: "Application name",
  shortName: "App name",
  id: "/",
  startUrl: "/",
  scope: "/",
  themeColor: "#ffffff",
  backgroundColor: "#ffffff",
  display: "standalone",
  basePath: "/",
  projectName: "morf",
};

const initialExportOptions: FaviconExportOptions = {
  targets: ["website"],
  includeWebManifest: false,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileBaseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "") || "morf";
}

function validColor(
  value: string | null | undefined,
  fallback: string,
): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : fallback;
}

function progressLabel(
  progress: FaviconProgress | undefined,
  copy: FaviconMessages["workspace"]["progress"],
): string | undefined {
  switch (progress?.status) {
    case "generating":
      return copy.generating;
    case "creating-ico":
      return copy.creatingIco;
    case "creating-package":
      return copy.creatingPackage;
    default:
      return undefined;
  }
}

function StandardFaviconWorkspace() {
  const { messages } = useWorkspaceI18n<FaviconMessages>();
  const { workspace } = messages;
  const [source, setSource] = useState<FaviconSource>();
  const [settings, setSettings] = useState(initialSettings);
  const [manifest, setManifest] = useState(initialManifest);
  const [exportOptions, setExportOptions] = useState(initialExportOptions);
  const [previews, setPreviews] = useState<PreviewUrls>({});
  const [cropRevision, setCropRevision] = useState(0);
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourceError, setSourceError] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] =
    useState<FaviconProgress>();
  const [generationError, setGenerationError] = useState<string>();
  const [result, setResult] = useState<FaviconGenerateResult>();
  const [archiveBlob, setArchiveBlob] = useState<Blob>();
  const [canSaveAs, setCanSaveAs] = useState(false);

  useErrorToast(sourceError, workspace.sourceErrorToastTitle);
  useErrorToast(generationError, workspace.generationErrorToastTitle);
  const cropGetterRef = useRef<CropCanvasGetter | undefined>(undefined);
  const sourceRef = useRef<FaviconSource | undefined>(undefined);
  const previewsRef = useRef<PreviewUrls>({});
  const webAppBackgroundColor = resolveWebAppBackground(settings);

  const revokePreviews = useCallback((urls: PreviewUrls) => {
    Object.values(urls).forEach((url) => url && URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    setCanSaveAs(getSaveCapabilities().file);
    return () => {
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.objectUrl);
      revokePreviews(previewsRef.current);
    };
  }, [revokePreviews]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  const registerCropGetter = useCallback((getter?: CropCanvasGetter) => {
    cropGetterRef.current = getter;
  }, []);

  const handleCropChange = useCallback(() => {
    setCropRevision((revision) => revision + 1);
  }, []);

  const getDrawable = useCallback(async () => {
    const getter = cropGetterRef.current;
    if (!getter) throw new Error(workspace.cropperNotReady);
    return getter();
  }, [workspace.cropperNotReady]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const drawable = await getDrawable();
        const standardBackground = resolveEditorBackground(settings);
        const opaqueBackground = validColor(
          standardBackground || webAppBackgroundColor,
          "#ffffff",
        );
        const standardCanvas = renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.standardPadding,
          backgroundColor: standardBackground,
          size: 512,
        });
        const opaqueCanvas = renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.standardPadding,
          backgroundColor: opaqueBackground,
          forceOpaque: true,
          size: 512,
        });
        const maskableCanvas = renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.maskablePadding,
          backgroundColor: webAppBackgroundColor,
          forceOpaque: webAppBackgroundColor !== null,
          size: 512,
        });
        const [standard, opaque, maskable] = await Promise.all([
          canvasToObjectUrl(standardCanvas),
          canvasToObjectUrl(opaqueCanvas),
          canvasToObjectUrl(maskableCanvas),
        ]);
        if (cancelled) {
          revokePreviews({ standard, opaque, maskable });
          return;
        }
        setPreviews((current) => {
          revokePreviews(current);
          return { standard, opaque, maskable };
        });
      } catch {
        // A Cropper első renderje után a change esemény újrapróbálja.
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    cropRevision,
    getDrawable,
    revokePreviews,
    settings,
    source,
    webAppBackgroundColor,
  ]);

  useEffect(() => {
    setResult(undefined);
    setArchiveBlob(undefined);
  }, [exportOptions, manifest, settings, source]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setLoadingSource(true);
      setSourceError(undefined);
      setGenerationError(undefined);
      try {
        const validated = await validateFaviconSource(
          file,
          messages.sourceErrors,
        );
        if (sourceRef.current)
          URL.revokeObjectURL(sourceRef.current.objectUrl);
        setSettings((current) => ({
          ...current,
          dominantColor: validated.dominantColor,
        }));
        const baseName = fileBaseName(file.name);
        setManifest((current) => ({
          ...current,
          name: baseName,
          shortName: baseName.slice(0, 24),
          projectName: baseName,
        }));
        setSource(validated);
      } catch (error) {
        setSourceError(
          error instanceof FaviconSourceError
            ? error.message
            : workspace.decodeFailed,
        );
      } finally {
        setLoadingSource(false);
      }
    },
    [messages.sourceErrors, workspace.decodeFailed],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: loadingSource || generating,
  });

  const removeSource = () => {
    if (source) URL.revokeObjectURL(source.objectUrl);
    setSource(undefined);
    cropGetterRef.current = undefined;
    setSourceError(undefined);
    revokePreviews(previewsRef.current);
    setPreviews({});
  };

  const saveableArchive = useCallback(() => {
    if (!archiveBlob || !result) return undefined;
    return {
      blob: archiveBlob,
      fileName: result.archiveName,
      mimeType: "application/zip",
      description: workspace.archiveDescription,
    };
  }, [archiveBlob, result, workspace.archiveDescription]);

  const downloadArchive = useCallback(() => {
    const archive = saveableArchive();
    if (archive) downloadFile(archive);
  }, [saveableArchive]);

  const createArchive = useCallback(async () => {
    if (!source || generating) {
      throw new Error(workspace.packageNotReady);
    }
    if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") {
      throw new FaviconBrowserUnsupportedError(workspace.browserUnsupported);
    }

    setGenerating(true);
    setGenerationError(undefined);
    setGenerationProgress({ status: "generating", value: 2 });
    const workerHandle = createFaviconWorker();

    try {
      const drawable = await getDrawable();
      const standardBackground = resolveEditorBackground(settings);
      const opaqueBackground = validColor(
        standardBackground || webAppBackgroundColor,
        "#ffffff",
      );
      const standardMaster = canvasToRasterPayload(
        renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.standardPadding,
          backgroundColor: standardBackground,
        }),
      );
      const opaqueMaster = canvasToRasterPayload(
        renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.standardPadding,
          backgroundColor: opaqueBackground,
          forceOpaque: true,
        }),
      );
      const maskableMaster = canvasToRasterPayload(
        renderMasterCanvas({
          source: drawable,
          settings,
          padding: settings.maskablePadding,
          backgroundColor: webAppBackgroundColor,
          forceOpaque: webAppBackgroundColor !== null,
        }),
      );
      const request = transfer(
        {
          standardMaster,
          opaqueMaster,
          maskableMaster,
          exportOptions,
          manifest: {
            ...manifest,
            backgroundColor: webAppBackgroundColor || "#ffffff",
          },
          sanitizedSvg: source.sanitizedSvg,
          copy: messages.engine,
        },
        [standardMaster.buffer, opaqueMaster.buffer, maskableMaster.buffer],
      );
      const generated = await workerHandle.api.generatePackage(
        request,
        proxy((progress: FaviconProgress) => setGenerationProgress(progress)),
      );
      const blob = new Blob([generated.archiveBuffer], {
        type: "application/zip",
      });
      setResult(generated);
      setArchiveBlob(blob);
      return {
        blob,
        fileName: generated.archiveName,
        mimeType: "application/zip",
        description: workspace.archiveDescription,
      };
    } finally {
      workerHandle.worker.terminate();
      setGenerating(false);
    }
  }, [
    exportOptions,
    generating,
    getDrawable,
    manifest,
    messages.engine,
    settings,
    source,
    webAppBackgroundColor,
    workspace.archiveDescription,
    workspace.browserUnsupported,
    workspace.packageNotReady,
  ]);

  const reportGenerationError = useCallback(
    (error: unknown) => {
      setGenerationError(
        error instanceof Error && /^Manifest:/i.test(error.message)
          ? error.message.replace(/^Manifest:\s*/i, "")
          : error instanceof FaviconBrowserUnsupportedError
            ? error.message
            : error instanceof Error && /ICO/i.test(error.message)
              ? workspace.icoGenerationFailed
              : workspace.packageGenerationFailed,
      );
    },
    [workspace.icoGenerationFailed, workspace.packageGenerationFailed],
  );

  const generatePackage = useCallback(async () => {
    try {
      downloadFile(await createArchive());
    } catch (error) {
      reportGenerationError(error);
    }
  }, [createArchive, reportGenerationError]);

  const saveArchiveAs = useCallback(async () => {
    try {
      const archive = saveableArchive();
      if (archive) {
        await saveFileAs(archive);
        return;
      }

      await saveGeneratedFileAs(
        {
          fileName: `${slugifyProjectName(manifest.projectName)}-favicon-package.zip`,
          mimeType: "application/zip",
          description: workspace.archiveDescription,
        },
        async () => (await createArchive()).blob,
      );
    } catch (error) {
      if (!isFilePickerCancellation(error)) {
        reportGenerationError(error);
      }
    }
  }, [
    createArchive,
    manifest.projectName,
    reportGenerationError,
    saveableArchive,
    workspace.archiveDescription,
  ]);

  const warnings = source
    ? [
        source.width < RECOMMENDED_SOURCE_DIMENSION ||
        source.height < RECOMMENDED_SOURCE_DIMENSION
          ? workspace.warnings.smallSource
          : undefined,
        source.transparentRatio > 0.45
          ? workspace.warnings.tooSmallIcon
          : undefined,
        settings.backgroundMode === "transparent" && source.hasTransparency
          ? workspace.warnings.appleTouchOpaque
          : undefined,
      ].filter((warning): warning is NonNullable<typeof warning> =>
        Boolean(warning),
      )
    : [];

  return (
    <section
      id="favicon-workspace"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8"
    >
      <input
        {...getInputProps()}
        className="sr-only"
        aria-label={workspace.sourceInputAriaLabel}
      />
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">
          {workspace.heading}
        </h2>
        <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
          {workspace.description}
        </p>
      </div>

      {!source ? (
        <FileUploadDropzone
          getRootProps={getRootProps}
          isDragActive={isDragActive}
          onBrowse={open}
          title={workspace.dropzone.title}
          activeTitle={workspace.dropzone.activeTitle}
          description={workspace.dropzone.description}
          buttonLabel={workspace.dropzone.buttonLabel}
          busyLabel={workspace.dropzone.busyLabel}
          busy={loadingSource}
          disabled={generating}
          privacyNote={workspace.dropzone.privacyNote}
        />
      ) : (
        <>
          <div className="border-border flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="morf-icon-orb text-secondary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
                <HugeiconsIcon
                  icon={FileImageIcon}
                  className="size-5"
                  strokeWidth={2}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{source.file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {source.width} × {source.height} px,{" "}
                  {formatBytes(source.file.size)}, {source.kind.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={generating}
                onClick={open}
              >
                <HugeiconsIcon
                  icon={ImageUploadIcon}
                  data-icon="inline-start"
                  strokeWidth={2}
                />
                {workspace.changeImage}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={generating}
                onClick={removeSource}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  data-icon="inline-start"
                  strokeWidth={2}
                />
                {workspace.removeImage}
              </Button>
            </div>
          </div>

          {warnings.length > 0 && (
            <Alert>
              <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
              <AlertTitle>{workspace.warningsTitle}</AlertTitle>
              <AlertDescription>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{workspace.settingsCardTitle}</CardTitle>
                <CardDescription>
                  {workspace.settingsCardDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-7">
                <FaviconSettings
                  settings={settings}
                  onChange={(patch) =>
                    setSettings((current) => ({ ...current, ...patch }))
                  }
                />
                <FaviconCropEditor
                  sourceUrl={source.objectUrl}
                  onChange={handleCropChange}
                  onGetterChange={registerCropGetter}
                />
              </CardContent>
            </Card>

            <FaviconPreviews
              previewUrl={previews.standard}
              opaquePreviewUrl={previews.opaque}
              maskablePreviewUrl={previews.maskable}
              projectName={manifest.projectName}
            />
          </div>

          <FaviconExportPanel
            exportOptions={exportOptions}
            manifest={manifest}
            progress={generationProgress?.value || 0}
            statusLabel={progressLabel(generationProgress, workspace.progress)}
            generating={generating}
            error={generationError}
            result={result}
            canSaveAs={canSaveAs}
            onExportOptionsChange={setExportOptions}
            onManifestChange={(patch) =>
              setManifest((current) => ({ ...current, ...patch }))
            }
            onGenerate={() => void generatePackage()}
            onDownload={downloadArchive}
            onSaveAs={() => void saveArchiveAs()}
          />
        </>
      )}

      {sourceError && (
        <Alert variant="destructive">
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
          <AlertTitle>{workspace.sourceErrorAlertTitle}</AlertTitle>
          <AlertDescription>{sourceError}</AlertDescription>
        </Alert>
      )}
      <Toaster />
    </section>
  );
}

interface FaviconWorkspaceProps {
  locale?: Locale;
}

export default function FaviconWorkspace({
  locale = "hu",
}: FaviconWorkspaceProps) {
  return (
    <WorkspaceI18nProvider locale={locale} messages={getFaviconMessages(locale)}>
      <StandardFaviconWorkspace />
    </WorkspaceI18nProvider>
  );
}
