import { useEffect, useRef, useState } from "react";
import type Cropper from "cropperjs";
import type { CropperCanvas, CropperImage, CropperSelection } from "cropperjs";
import {
  CenterFocusIcon,
  ReloadIcon,
  RotateRight01Icon,
  ZoomInAreaIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";

export type CropCanvasGetter = () => Promise<HTMLCanvasElement>;

interface FaviconCropEditorProps {
  sourceUrl: string;
  onChange: () => void;
  onGetterChange: (getter?: CropCanvasGetter) => void;
}

const cropperTemplate = `
  <cropper-canvas background scale-step="0.08">
    <cropper-image rotatable scalable translatable></cropper-image>
    <cropper-shade hidden theme-color="rgba(0, 0, 0, 0.72)"></cropper-shade>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection initial-coverage="0.72" initial-aspect-ratio="1" aspect-ratio="1">
      <cropper-grid role="grid" rows="3" columns="3" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
      <cropper-handle action="move" plain></cropper-handle>
    </cropper-selection>
  </cropper-canvas>
`;

function fitImageToSelectionWidth(
  image: CropperImage,
  selection: CropperSelection,
) {
  image.$resetTransform();
  const imageWidth = image.getBoundingClientRect().width;

  if (imageWidth > 0 && selection.width > 0) {
    image.$scale(selection.width / imageWidth);
  }

  image.$center();
}

function waitForCropperLayout(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function sliderValue(value: number | readonly number[]): number {
  return typeof value === "number" ? value : value[0];
}

function imageScale(image: CropperImage): number {
  const [scaleX, skewY] = image.$getTransform();
  return Math.hypot(scaleX, skewY);
}

function imageRotation(image: CropperImage): number {
  const [scaleX, skewY] = image.$getTransform();
  const degrees = (Math.atan2(skewY, scaleX) * 180) / Math.PI;
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function FaviconCropEditor({
  sourceUrl,
  onChange,
  onGetterChange,
}: FaviconCropEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cropperRef = useRef<Cropper | undefined>(undefined);
  const baseScaleRef = useRef(1);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [zoomPercent, setZoomPercent] = useState(100);
  const [rotationDegrees, setRotationDegrees] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setLoadError(undefined);
    let disposed = false;
    let cropper: Cropper | undefined;
    let canvas: CropperCanvas | null = null;
    let previewFrame: number | undefined;

    const requestPreview = () => {
      if (previewFrame !== undefined) return;
      previewFrame = window.requestAnimationFrame(() => {
        previewFrame = undefined;
        onChange();
      });
    };

    const syncTransformControls = () => {
      const cropperImage = cropper?.getCropperImage();
      if (!cropperImage || baseScaleRef.current <= 0) return;

      setZoomPercent(
        Math.round(
          clamp(
            (imageScale(cropperImage) / baseScaleRef.current) * 100,
            25,
            300,
          ),
        ),
      );
      setRotationDegrees(Math.round(imageRotation(cropperImage)));
    };

    const handleActionEnd = () => {
      requestPreview();
      syncTransformControls();
    };

    void (async () => {
      const { default: CropperConstructor } = await import("cropperjs");
      if (disposed) return;

      // Cropper.js v2 owns the elements inside its container. Keep the source
      // image outside React's rendered DOM so React and Cropper never compete
      // over the same <img> node during updates.
      const image = new Image();
      image.src = sourceUrl;
      image.alt = "A vágásra kijelölt forráskép";
      image.decoding = "async";
      image.draggable = false;

      cropper = new CropperConstructor(image, {
        container,
        template: cropperTemplate,
      });
      cropperRef.current = cropper;
      canvas = cropper.getCropperCanvas();
      canvas?.addEventListener("action", requestPreview);
      canvas?.addEventListener("actionend", handleActionEnd);

      const cropperImage = cropper.getCropperImage();
      if (!cropperImage)
        throw new Error("A cropper-image elem nem jött létre.");
      await cropperImage.$ready();
      if (disposed) return;
      const selection = cropper.getCropperSelection();
      if (!selection)
        throw new Error("A cropper-selection elem nem jött létre.");
      await selection.$nextTick();
      // A CropperImage a load esemény után még alkalmazza a saját kezdeti
      // "contain" transzformációját. Várjuk meg a kész web component layoutot,
      // és csak ezután írjuk felül a selection szélességéhez igazított mérettel.
      await waitForCropperLayout();
      if (disposed) return;
      selection.$center();
      fitImageToSelectionWidth(cropperImage, selection);
      baseScaleRef.current = imageScale(cropperImage);
      setZoomPercent(100);
      setRotationDegrees(0);
      onGetterChange(() => selection.$toCanvas({ width: 1024, height: 1024 }));
      setIsReady(true);
      onChange();
    })().catch((error: unknown) => {
      if (disposed) return;
      console.error("A képvágó betöltése sikertelen.", error);
      onGetterChange(undefined);
      setIsReady(false);
      setLoadError(
        "A képvágó nem töltődött be. Indítsd újra a fejlesztői szervert, majd frissítsd az oldalt.",
      );
    });

    return () => {
      disposed = true;
      if (previewFrame !== undefined) window.cancelAnimationFrame(previewFrame);
      canvas?.removeEventListener("action", requestPreview);
      canvas?.removeEventListener("actionend", handleActionEnd);
      onGetterChange(undefined);
      cropper?.destroy();
      container.replaceChildren();
      cropperRef.current = undefined;
      setIsReady(false);
    };
  }, [onChange, onGetterChange, sourceUrl]);

  const getSelection = (): CropperSelection | null =>
    cropperRef.current?.getCropperSelection() || null;

  const reset = () => {
    const image = cropperRef.current?.getCropperImage();
    const selection = getSelection();
    selection?.$reset();
    selection?.$center();
    if (image && selection) {
      fitImageToSelectionWidth(image, selection);
      baseScaleRef.current = imageScale(image);
    }
    setZoomPercent(100);
    setRotationDegrees(0);
    onChange();
  };

  const center = () => {
    cropperRef.current?.getCropperImage()?.$center();
    onChange();
  };

  const setRotation = (degrees: number) => {
    const image = cropperRef.current?.getCropperImage();
    if (!image) return;

    const nextRotation = clamp(degrees, -180, 180);
    image.$rotate(`${nextRotation - imageRotation(image)}deg`);
    setRotationDegrees(nextRotation);
    onChange();
  };

  const setZoom = (percent: number) => {
    const image = cropperRef.current?.getCropperImage();
    if (!image) return;

    const nextZoom = clamp(percent, 25, 300);
    const currentScale = imageScale(image);
    const targetScale = baseScaleRef.current * (nextZoom / 100);
    if (currentScale > 0) image.$scale(targetScale / currentScale);
    setZoomPercent(nextZoom);
    onChange();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full">
        <div
          ref={containerRef}
          role="application"
          aria-label="Négyzetes képvágó"
          className="morf-cropper size-full overflow-hidden rounded-3xl border border-border/70 bg-muted/60"
        />
        {!isReady && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted-foreground">
            {loadError || "Képvágó betöltése…"}
          </div>
        )}
      </div>
      <div
        className="morf-inset-panel grid gap-4 rounded-3xl p-4 sm:grid-cols-2"
        aria-label="Kép transzformációs vezérlői"
      >
        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel
              htmlFor="favicon-crop-zoom"
              className="flex items-center gap-2"
            >
              <HugeiconsIcon
                icon={ZoomInAreaIcon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              Nagyítás
            </FieldLabel>
            <output
              htmlFor="favicon-crop-zoom"
              className="text-muted-foreground text-xs tabular-nums"
            >
              {zoomPercent}%
            </output>
          </div>
          <Slider
            id="favicon-crop-zoom"
            aria-label="Kép nagyítása"
            min={25}
            max={300}
            step={1}
            disabled={!isReady}
            value={[zoomPercent]}
            onValueChange={(value) => setZoom(sliderValue(value))}
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel
              htmlFor="favicon-crop-rotation"
              className="flex items-center gap-2"
            >
              <HugeiconsIcon
                icon={RotateRight01Icon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
              Forgatás
            </FieldLabel>
            <output
              htmlFor="favicon-crop-rotation"
              className="text-muted-foreground text-xs tabular-nums"
            >
              {rotationDegrees}°
            </output>
          </div>
          <Slider
            id="favicon-crop-rotation"
            aria-label="Kép forgatása"
            min={-180}
            max={180}
            step={1}
            disabled={!isReady}
            value={[rotationDegrees]}
            onValueChange={(value) => setRotation(sliderValue(value))}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Képvágás műveletei">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!isReady}
          onClick={center}
          aria-label="Kép középre igazítása"
        >
          <HugeiconsIcon icon={CenterFocusIcon} strokeWidth={2} />
          Középre helyezés
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!isReady}
          onClick={reset}
        >
          <HugeiconsIcon
            icon={ReloadIcon}
            data-icon="inline-start"
            strokeWidth={2}
          />
          Alaphelyzet
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        Húzd a képet a rögzített négyzet alatt, nagyíts érintéssel vagy a
        vezérlőkkel. A margók már ezt a körbevágott képet módosítják.
      </p>
    </div>
  );
}
