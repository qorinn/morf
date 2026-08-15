import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { proxy } from "comlink";
import {
  Delete02Icon,
  Download04Icon,
  Film01Icon,
  Settings02Icon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useDropzone } from "react-dropzone";

import { FileUploadDropzone } from "@/components/upload/FileUploadDropzone";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  createVideoConverterFileName,
  estimateOutputBytes,
  outputFormatDetails,
  outputFormats,
  qualityPresetDetails,
  qualityPresets,
  targetVideoDimensions,
} from "@/features/video-converter/converter";
import type {
  VideoConverterMetadata,
  VideoEncoderSupport,
  VideoOutputFormat,
  VideoQualityPreset,
} from "@/features/video-converter/types";
import {
  createVideoConverterWorker,
  transferableVideoConverterRequest,
  type VideoConverterWorkerHandle,
} from "@/features/video-converter/worker-client";
import { downloadFile } from "@/lib/downloads/file-saver";
import { formatBytes } from "@/lib/filenames/image-filenames";

type WorkspacePhase = "empty" | "inspecting" | "ready" | "converting" | "complete" | "error";
type ConversionResult = { blob: Blob; fileName: string; mimeType: string };

const fileAccept = {
  "video/mp4": [".mp4", ".m4v"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
  "video/x-matroska": [".mkv"],
  "video/mp2t": [".ts", ".m2ts", ".mts"],
};

function formatDuration(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${(safe % 60).toFixed(1).padStart(4, "0")}`;
}

function firstSupportedOutput(encoders: Record<VideoOutputFormat, VideoEncoderSupport>): VideoOutputFormat | undefined {
  return outputFormats.find(({ id }) => encoders[id].video && encoders[id].audio)?.id;
}

function formatChoiceDescription(format: VideoOutputFormat) {
  if (format === "webm") return "Kisebb webes fájl. Modern böngészőkhöz jó választás.";
  if (format === "mov") return "Jó választás Apple- és videós szerkesztőprogramokhoz.";
  return "Ajánlott: szinte minden készüléken és platformon működik.";
}

function scaleDescription(scalePercent: number) {
  if (scalePercent >= 95) return "Az eredeti felbontást megtartjuk.";
  if (scalePercent >= 70) return "Kisebb fájl, a kép még részletgazdag marad.";
  if (scalePercent >= 45) return "Jól látható méretcsökkentés, megosztáshoz praktikus.";
  return "Nagyon kis fájlméret, egyszerű megosztáshoz.";
}

export default function VideoConverterWorkspace() {
  const [phase, setPhase] = useState<WorkspacePhase>("empty");
  const [source, setSource] = useState<File>();
  const [metadata, setMetadata] = useState<VideoConverterMetadata>();
  const [encoders, setEncoders] = useState<Record<VideoOutputFormat, VideoEncoderSupport>>();
  const [outputFormat, setOutputFormat] = useState<VideoOutputFormat>("mp4");
  const [scalePercent, setScalePercent] = useState(100);
  const [quality, setQuality] = useState<VideoQualityPreset>("balanced");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ConversionResult>();
  const workerRef = useRef<VideoConverterWorkerHandle | undefined>(undefined);

  const busy = phase === "inspecting" || phase === "converting";
  const dimensions = useMemo(
    () => metadata && targetVideoDimensions(metadata.width, metadata.height, scalePercent),
    [metadata, scalePercent],
  );
  const estimatedBytes = useMemo(
    () => metadata && estimateOutputBytes(metadata, outputFormat, scalePercent, quality),
    [metadata, outputFormat, scalePercent, quality],
  );
  const selectedSupport = encoders?.[outputFormat];
  const exportEnabled = Boolean(selectedSupport?.video && selectedSupport.audio);

  const releaseWorker = useCallback(() => {
    workerRef.current?.worker.terminate();
    workerRef.current = undefined;
  }, []);

  const selectSource = useCallback(async (file: File) => {
    releaseWorker();
    setSource(file);
    setMetadata(undefined);
    setEncoders(undefined);
    setResult(undefined);
    setError(undefined);
    setProgress(0);
    setPhase("inspecting");
    const worker = createVideoConverterWorker();
    workerRef.current = worker;
    try {
      const inspected = await worker.api.inspectVideo(file);
      if (!inspected.valid) throw new Error(`${inspected.message} ${inspected.suggestion}`);
      const nextOutput = firstSupportedOutput(inspected.encoders);
      if (!nextOutput) {
        throw new Error("Ebben a böngészőben egyik választható videókimenet sem kódolható. Próbáld friss Chrome-mal vagy Edge-dzsel.");
      }
      setMetadata(inspected.metadata);
      setEncoders(inspected.encoders);
      setOutputFormat(nextOutput);
      setPhase("ready");
    } catch (reason) {
      setPhase("error");
      setError(reason instanceof Error ? reason.message : "A videó vizsgálata nem sikerült.");
    }
  }, [releaseWorker]);

  const dropzone = useDropzone({
    multiple: false,
    noClick: true,
    disabled: busy,
    accept: fileAccept,
    onDropAccepted: ([file]) => file && void selectSource(file),
    onDropRejected: () => {
      setPhase("error");
      setError("Válassz egyetlen MP4, MOV, WebM, MKV vagy MPEG-TS videót.");
    },
  });

  useEffect(() => () => releaseWorker(), [releaseWorker]);

  const runConversion = useCallback(async () => {
    if (!source || !metadata || !workerRef.current || !exportEnabled) return;
    setResult(undefined);
    setError(undefined);
    setProgress(0);
    setPhase("converting");
    try {
      const exported = await workerRef.current.api.convertVideo(
        transferableVideoConverterRequest({ file: source, metadata, outputFormat, scalePercent, quality }),
        proxy((event) => {
          const ratio = event.sourceDuration > 0 ? event.sourceTimestamp / event.sourceDuration : 0;
          setProgress(event.phase === "completed" ? 1 : Math.min(0.98, Math.max(0.02, ratio)));
        }),
      );
      setResult({
        blob: new Blob([exported.buffer], { type: exported.mimeType }),
        fileName: createVideoConverterFileName(source.name, outputFormat),
        mimeType: exported.mimeType,
      });
      setPhase("complete");
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setPhase("ready");
      } else {
        setPhase("error");
        setError(reason instanceof Error ? reason.message : "A videó konvertálása nem sikerült.");
      }
    }
  }, [exportEnabled, metadata, outputFormat, quality, scalePercent, source]);

  const outputChange = (value: string | null) => {
    if (!value) return;
    setOutputFormat(value as VideoOutputFormat);
    setResult(undefined);
  };

  const qualityChange = (value: string | null) => {
    if (!value) return;
    setQuality(value as VideoQualityPreset);
    setResult(undefined);
  };

  const actualDifference = result && source ? source.size - result.blob.size : undefined;

  return (
    <section id="video-converter-workspace" className="morf-section-normal scroll-mt-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <input
          {...dropzone.getInputProps({ accept: "video/mp4,video/quicktime,video/webm,video/x-matroska,video/mp2t,.mp4,.m4v,.mov,.webm,.mkv,.ts,.m2ts,.mts" })}
          className="sr-only"
          aria-label="Videó kiválasztása"
        />
        <header className="flex max-w-3xl flex-col gap-2">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Videó átalakítása</h2>
          <p className="text-muted-foreground text-base leading-relaxed">Tölts fel egy videót, válaszd ki, milyen legyen, majd töltsd le. A videód nem hagyja el a készülékedet.</p>
        </header>

        {(!source || (phase === "error" && !metadata)) && (
          <FileUploadDropzone
            getRootProps={dropzone.getRootProps}
            isDragActive={dropzone.isDragActive}
            onBrowse={dropzone.open}
            title="Tölts fel egy videót"
            description="MP4, MOV, WebM, MKV vagy TS fájl. Egyszerre egy videót alakíthatsz át."
            buttonLabel="Videó kiválasztása"
            busy={phase === "inspecting"}
            busyLabel="Videó vizsgálata"
            icon={Video01Icon}
          />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Nem sikerült folytatni</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {source && phase === "inspecting" && (
          <Card className="border border-border shadow-none">
            <CardContent className="flex min-h-32 items-center gap-4 py-7">
              <HugeiconsIcon icon={Video01Icon} className="text-primary size-7 animate-pulse motion-reduce:animate-none" strokeWidth={1.8} />
              <div className="flex flex-col gap-1"><p className="font-medium">Videó előkészítése</p><p className="text-muted-foreground text-sm">Egy pillanat, ellenőrizzük, hogy a videó átalakítható-e.</p></div>
            </CardContent>
          </Card>
        )}

        {source && metadata && dimensions && estimatedBytes && encoders && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
            <div className="flex min-w-0 flex-col gap-5">
              <Card className="border border-border shadow-none">
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><CardTitle className="truncate">Kiválasztott videó</CardTitle><CardDescription className="mt-1 truncate">{source.name}</CardDescription></div>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={dropzone.open}>Csere</Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 pt-1 sm:grid-cols-[1fr_auto] sm:items-center">
                  <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-muted-foreground">Fájlméret</dt><dd className="font-semibold tabular-nums">{formatBytes(source.size)}</dd></div>
                    <div><dt className="text-muted-foreground">Felbontás</dt><dd className="font-semibold tabular-nums">{metadata.width} × {metadata.height}</dd></div>
                    <div><dt className="text-muted-foreground">Hossz</dt><dd className="font-semibold tabular-nums">{formatDuration(metadata.duration)}</dd></div>
                  </dl>
                  <Badge variant="outline" className="w-fit">{metadata.hasAudio ? "Hanggal együtt" : "Hang nélkül"}</Badge>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-none">
                <CardHeader className="border-b border-border"><CardTitle>Hogyan legyen a kész videó?</CardTitle><CardDescription>Csak ezt a három beállítást kell kiválasztanod.</CardDescription></CardHeader>
                <CardContent className="flex flex-col gap-7 pt-1">
                  <Field>
                    <FieldLabel htmlFor="video-output-format">1. Milyen fájlt szeretnél?</FieldLabel>
                    <Select value={outputFormat} onValueChange={outputChange}>
                      <SelectTrigger id="video-output-format" className="w-full" disabled={busy}><SelectValue>{outputFormatDetails(outputFormat).label}</SelectValue></SelectTrigger>
                      <SelectContent><SelectGroup>{outputFormats.map((item) => {
                        const support = encoders[item.id];
                        return <SelectItem key={item.id} value={item.id} disabled={!support.video || !support.audio}>{item.label}</SelectItem>;
                      })}</SelectGroup></SelectContent>
                    </Select>
                    <FieldDescription>{formatChoiceDescription(outputFormat)}</FieldDescription>
                  </Field>

                  <Field>
                    <div className="flex items-center justify-between gap-3"><FieldLabel htmlFor="video-scale">2. Mekkora legyen?</FieldLabel><span className="text-primary text-sm font-semibold tabular-nums">{scalePercent}%</span></div>
                    <Slider id="video-scale" min={10} max={100} step={1} value={[scalePercent]} disabled={busy} onValueChange={(value) => { const next = Array.isArray(value) ? value[0] : value; setScalePercent(next ?? 100); setResult(undefined); }} />
                    <FieldDescription>{scaleDescription(scalePercent)} <span className="font-medium tabular-nums text-foreground">{dimensions.width} × {dimensions.height}</span></FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="video-quality">3. Mi a fontosabb?</FieldLabel>
                    <Select value={quality} onValueChange={qualityChange}>
                      <SelectTrigger id="video-quality" className="w-full" disabled={busy}><SelectValue>{qualityPresetDetails(quality).label}</SelectValue></SelectTrigger>
                      <SelectContent><SelectGroup>{qualityPresets.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} · {item.description}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                    <FieldDescription>{qualityPresetDetails(quality).description}. Ha bizonytalan vagy, hagyd a „Kiegyensúlyozott” beállítást.</FieldDescription>
                  </Field>
                </CardContent>
              </Card>
            </div>

            <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
              <Card className="border border-border bg-muted/45 shadow-none">
                <CardHeader><CardTitle className="flex items-center gap-2"><HugeiconsIcon icon={Settings02Icon} className="size-5 text-primary" strokeWidth={2} />Ezt fogod letölteni</CardTitle><CardDescription>A pontos méret elkészítés után derül ki, ez egy hasznos becslés.</CardDescription></CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <div><dt className="text-muted-foreground">Fájl típusa</dt><dd className="font-semibold">{outputFormatDetails(outputFormat).label}</dd></div>
                    <div><dt className="text-muted-foreground">Képméret</dt><dd className="font-semibold tabular-nums">{dimensions.width} × {dimensions.height}</dd></div>
                    <div className="col-span-2"><dt className="text-muted-foreground">Várható fájlméret</dt><dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">kb. {formatBytes(estimatedBytes)}</dd></div>
                  </dl>
                  {!exportEnabled && <Alert variant="destructive"><AlertTitle>Ez most nem választható</AlertTitle><AlertDescription>Próbálj másik fájltípust, vagy nyisd meg az eszközt friss Chrome-ban vagy Edge-ben.</AlertDescription></Alert>}
                  <Button size="lg" disabled={busy || !exportEnabled} onClick={() => void runConversion()}><HugeiconsIcon icon={Film01Icon} data-icon="inline-start" strokeWidth={2} />Átalakítás indítása</Button>
                  {phase === "converting" && <div className="flex flex-col gap-3"><Progress value={progress * 100}><ProgressLabel>Videó készítése</ProgressLabel><ProgressValue /></Progress><Button variant="ghost" size="sm" className="w-fit" onClick={() => workerRef.current?.api.cancel()}><HugeiconsIcon icon={Delete02Icon} data-icon="inline-start" strokeWidth={2} />Megszakítás</Button></div>}
                </CardContent>
              </Card>

              {result && <Alert><AlertTitle>Elkészült</AlertTitle><AlertDescription className="mt-3 flex flex-col gap-3"><div className="flex flex-col gap-1"><span className="tabular-nums">A kész videó mérete: {formatBytes(result.blob.size)}</span>{actualDifference !== undefined && <span className="text-muted-foreground tabular-nums">{actualDifference >= 0 ? "Ennyivel nagyobb lett:" : "Ennyit sikerült megtakarítani:"} {formatBytes(Math.abs(actualDifference))}</span>}</div><Button size="sm" className="w-fit" onClick={() => downloadFile({ blob: result.blob, fileName: result.fileName, mimeType: result.mimeType })}><HugeiconsIcon icon={Download04Icon} data-icon="inline-start" strokeWidth={2} />Videó letöltése</Button></AlertDescription></Alert>}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
