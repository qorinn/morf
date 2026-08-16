import { type CSSProperties, type RefObject, useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ClipboardCopyIcon,
  CodeIcon,
  Download04Icon,
  ImageAdd02Icon,
  MagicWand03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PlatformPreviewCard,
  previewPlatformItems,
  type PreviewPlatform,
} from "./PlatformPreviewCard";

type TemplateId =
  | "editorial"
  | "split"
  | "fullbleed"
  | "quote"
  | "geometric"
  | "launch"
  | "poster"
  | "orbit"
  | "diagonal"
  | "spotlight"
  | "soft"
  | "deal"
  | "vault"
  | "grid"
  | "tilt";
type EditorTab = "image" | "metadata";
type DesignerPreviewPlatform = PreviewPlatform | "html";
type PaletteSlot = "canvas" | "surface" | "accent" | "text" | "glow";
type TemplatePalette = Record<PaletteSlot, string>;

type TemplateDefinition = {
  id: TemplateId;
  name: string;
  slots: PaletteSlot[];
  palette: TemplatePalette;
  quickPalettes: Array<{ name: string; palette: TemplatePalette }>;
};

const paletteSlotLabels: Record<PaletteSlot, string> = {
  canvas: "Vászon",
  surface: "Másodlagos felület",
  accent: "Kiemelés",
  text: "Szöveg",
  glow: "Glow / árnyalat",
};

const templateDefinitions: TemplateDefinition[] = [
  {
    id: "tilt",
    name: "Tilt",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#E9ECF0",
      accent: "#111111",
      text: "#080808",
      glow: "#B7C0CA",
    },
    quickPalettes: [
      {
        name: "Acél",
        palette: {
          canvas: "#FFFFFF",
          surface: "#E9ECF0",
          accent: "#111111",
          text: "#080808",
          glow: "#B7C0CA",
        },
      },
      {
        name: "Napsütés",
        palette: {
          canvas: "#FFFDF8",
          surface: "#F0E6CC",
          accent: "#563E20",
          text: "#201509",
          glow: "#E1B86A",
        },
      },
    ],
  },
  {
    id: "editorial",
    name: "Editorial",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#F5F6F8",
      accent: "#397AF3",
      text: "#111111",
      glow: "#C9F1E7",
    },
    quickPalettes: [
      {
        name: "Menta",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F5F6F8",
          accent: "#397AF3",
          text: "#111111",
          glow: "#C9F1E7",
        },
      },
      {
        name: "Kobalt",
        palette: {
          canvas: "#F6F7FB",
          surface: "#FFFFFF",
          accent: "#356CFF",
          text: "#152451",
          glow: "#C8D7FF",
        },
      },
    ],
  },
  {
    id: "quote",
    name: "Quote",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#FFFFFF",
      accent: "#111111",
      text: "#111111",
      glow: "#F1F1F1",
    },
    quickPalettes: [
      {
        name: "Monokróm",
        palette: {
          canvas: "#FFFFFF",
          surface: "#FFFFFF",
          accent: "#111111",
          text: "#111111",
          glow: "#F1F1F1",
        },
      },
      {
        name: "Orchidea",
        palette: {
          canvas: "#FCF8FD",
          surface: "#FFFFFF",
          accent: "#9B5DE5",
          text: "#342044",
          glow: "#E3CDF9",
        },
      },
    ],
  },
  {
    id: "split",
    name: "Split",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFDF8",
      surface: "#FFFFFF",
      accent: "#D95B43",
      text: "#2A1B16",
      glow: "#F6D7C8",
    },
    quickPalettes: [
      {
        name: "Korall",
        palette: {
          canvas: "#FFFDF8",
          surface: "#FFFFFF",
          accent: "#D95B43",
          text: "#2A1B16",
          glow: "#F6D7C8",
        },
      },
      {
        name: "Óceán",
        palette: {
          canvas: "#F4FBFC",
          surface: "#FFFFFF",
          accent: "#157D93",
          text: "#103642",
          glow: "#BCE8EE",
        },
      },
    ],
  },
  {
    id: "fullbleed",
    name: "Full bleed",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#F8F5EF",
      surface: "#FFFFFF",
      accent: "#FFCC33",
      text: "#121A2B",
      glow: "#FFDD8A",
    },
    quickPalettes: [
      {
        name: "Éjféli",
        palette: {
          canvas: "#101827",
          surface: "#19243A",
          accent: "#F7C948",
          text: "#F8FAFC",
          glow: "#36577A",
        },
      },
      {
        name: "Cseresznye",
        palette: {
          canvas: "#FFF7F7",
          surface: "#FFFFFF",
          accent: "#E84855",
          text: "#35151A",
          glow: "#FFC7CE",
        },
      },
    ],
  },
  {
    id: "geometric",
    name: "Geometric",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFF7D6",
      surface: "#FFFFFF",
      accent: "#FFB703",
      text: "#16213E",
      glow: "#FFD978",
    },
    quickPalettes: [
      {
        name: "Nap",
        palette: {
          canvas: "#FFF7D6",
          surface: "#FFFFFF",
          accent: "#FFB703",
          text: "#16213E",
          glow: "#FFD978",
        },
      },
      {
        name: "Lila",
        palette: {
          canvas: "#F4F0FF",
          surface: "#FFFFFF",
          accent: "#6C4CEB",
          text: "#241B4B",
          glow: "#CFBEFF",
        },
      },
    ],
  },
  {
    id: "launch",
    name: "Launch",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#FFFFFF",
      accent: "#2B64F6",
      text: "#111B27",
      glow: "#D8E5FA",
    },
    quickPalettes: [
      {
        name: "Kék",
        palette: {
          canvas: "#FFFFFF",
          surface: "#FFFFFF",
          accent: "#2B64F6",
          text: "#111B27",
          glow: "#D8E5FA",
        },
      },
      {
        name: "Láva",
        palette: {
          canvas: "#FFF8F4",
          surface: "#FFFFFF",
          accent: "#FF5C35",
          text: "#170B08",
          glow: "#FFB09C",
        },
      },
    ],
  },
  {
    id: "poster",
    name: "Poster",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#F1F3F6",
      accent: "#7E9EBB",
      text: "#0B0C0F",
      glow: "#F6D7BF",
    },
    quickPalettes: [
      {
        name: "Porcelán",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F1F3F6",
          accent: "#7E9EBB",
          text: "#0B0C0F",
          glow: "#F6D7BF",
        },
      },
      {
        name: "Levendula",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F3F1FA",
          accent: "#8F7AC8",
          text: "#16121E",
          glow: "#D9D0FA",
        },
      },
      {
        name: "Éjkék",
        palette: {
          canvas: "#F8FBFF",
          surface: "#E8EDF5",
          accent: "#5D7FA3",
          text: "#0B1B33",
          glow: "#B8D1EE",
        },
      },
    ],
  },
  {
    id: "orbit",
    name: "Orbit",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#F5F5F5",
      accent: "#C8C8C8",
      text: "#0B0B0B",
      glow: "#E7E7E7",
    },
    quickPalettes: [
      {
        name: "Mono",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F5F5F5",
          accent: "#C8C8C8",
          text: "#0B0B0B",
          glow: "#E7E7E7",
        },
      },
      {
        name: "Rózsaszín",
        palette: {
          canvas: "#FFF9FC",
          surface: "#FFF0F7",
          accent: "#E7488A",
          text: "#250D19",
          glow: "#F0D7E2",
        },
      },
    ],
  },
  {
    id: "diagonal",
    name: "Diagonal",
    slots: ["canvas", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#F4F1FF",
      accent: "#4020B8",
      text: "#281280",
      glow: "#BDB2FF",
    },
    quickPalettes: [
      {
        name: "Ultra violet",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F4F1FF",
          accent: "#4020B8",
          text: "#281280",
          glow: "#BDB2FF",
        },
      },
      {
        name: "Tengerzöld",
        palette: {
          canvas: "#F7FFFD",
          surface: "#E8FFF8",
          accent: "#007C67",
          text: "#06443A",
          glow: "#9EE7D5",
        },
      },
    ],
  },
  {
    id: "spotlight",
    name: "Spotlight",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#06080B",
      surface: "#F3F4F6",
      accent: "#FFCC33",
      text: "#FFFFFF",
      glow: "#1A2840",
    },
    quickPalettes: [
      {
        name: "Éjféli",
        palette: {
          canvas: "#06080B",
          surface: "#F3F4F6",
          accent: "#FFCC33",
          text: "#FFFFFF",
          glow: "#1A2840",
        },
      },
      {
        name: "Rubin",
        palette: {
          canvas: "#190A12",
          surface: "#321020",
          accent: "#FF6B6B",
          text: "#FFF7F8",
          glow: "#FF2E7A",
        },
      },
    ],
  },
  {
    id: "soft",
    name: "Soft studio",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFFFF",
      surface: "#F4B7C7",
      accent: "#5345D8",
      text: "#121C70",
      glow: "#BDBBEF",
    },
    quickPalettes: [
      {
        name: "Púder",
        palette: {
          canvas: "#FFFFFF",
          surface: "#F4B7C7",
          accent: "#5345D8",
          text: "#121C70",
          glow: "#BDBBEF",
        },
      },
      {
        name: "Mentás",
        palette: {
          canvas: "#FFFFFF",
          surface: "#EAFBF5",
          accent: "#178C6E",
          text: "#0E493B",
          glow: "#A7E9D1",
        },
      },
    ],
  },
  {
    id: "deal",
    name: "Deal",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFFDF4",
      surface: "#FFFFFF",
      accent: "#FFC400",
      text: "#080808",
      glow: "#F59E0B",
    },
    quickPalettes: [
      {
        name: "Sárga deal",
        palette: {
          canvas: "#FFFDF4",
          surface: "#FFFFFF",
          accent: "#FFC400",
          text: "#080808",
          glow: "#F59E0B",
        },
      },
      {
        name: "Kék deal",
        palette: {
          canvas: "#F7FAFF",
          surface: "#FFFFFF",
          accent: "#3B82F6",
          text: "#08152E",
          glow: "#93C5FD",
        },
      },
    ],
  },
  {
    id: "vault",
    name: "Vault",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#050505",
      surface: "#141414",
      accent: "#D6FF00",
      text: "#F8F8F8",
      glow: "#A3FF12",
    },
    quickPalettes: [
      {
        name: "Lime vault",
        palette: {
          canvas: "#050505",
          surface: "#141414",
          accent: "#D6FF00",
          text: "#F8F8F8",
          glow: "#A3FF12",
        },
      },
      {
        name: "Cian vault",
        palette: {
          canvas: "#061217",
          surface: "#0E252B",
          accent: "#20E3FF",
          text: "#F3FEFF",
          glow: "#77F1FF",
        },
      },
    ],
  },
  {
    id: "grid",
    name: "Grid",
    slots: ["canvas", "surface", "accent", "text", "glow"],
    palette: {
      canvas: "#FFF500",
      surface: "#FFFBE0",
      accent: "#FFF500",
      text: "#151515",
      glow: "#FFB800",
    },
    quickPalettes: [
      {
        name: "Sárga grid",
        palette: {
          canvas: "#FFF500",
          surface: "#FFFBE0",
          accent: "#FFF500",
          text: "#151515",
          glow: "#FFB800",
        },
      },
      {
        name: "Korall grid",
        palette: {
          canvas: "#FF775D",
          surface: "#FFEAE5",
          accent: "#FF775D",
          text: "#27100B",
          glow: "#FFB5A6",
        },
      },
    ],
  },
];

const templates = templateDefinitions;

function createInitialPalettes(): Record<TemplateId, TemplatePalette> {
  return Object.fromEntries(
    templateDefinitions.map(({ id, palette }) => [id, { ...palette }]),
  ) as Record<TemplateId, TemplatePalette>;
}

const designerPreviewPlatforms = [
  ...previewPlatformItems,
  { id: "html", label: "HTML", icon: CodeIcon },
] satisfies Array<{
  id: DesignerPreviewPlatform;
  label: string;
  icon: (typeof previewPlatformItems)[number]["icon"];
}>;

type ArtworkProps = {
  template: TemplateId;
  title: string;
  description: string;
  eyebrow: string;
  cta: string;
  image: string;
  palette: TemplatePalette;
  dealBadge: string;
  dealRating: string;
  dealPrice: string;
  vaultStatus: string;
  vaultLabel: string;
  gridKicker: string;
  gridFooter: string;
  launchCampaign: string;
  launchOffer: string;
  quoteAuthor: string;
  quoteAuthorImage: string;
  editorialBadge: string;
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
  palette,
  dealBadge,
  dealRating,
  dealPrice,
  vaultStatus,
  vaultLabel,
  gridKicker,
  gridFooter,
  launchCampaign,
  launchOffer,
  quoteAuthor,
  quoteAuthorImage,
  editorialBadge,
  svgRef,
  label = "Open Graph kép sablon előnézete",
}: ArtworkProps) {
  const { canvas: background, surface, accent, text, glow } = palette;
  const softText = `${text}12`;
  const safeTitle = title || "A megosztási kép címe";
  const safeDescription =
    description || "Rövid, konkrét kiegészítő üzenet az oldalról.";
  const safeEyebrow = eyebrow || "Webhely neve";
  const safeCta = cta || "Tudj meg többet";
  const safeDealBadge = dealBadge || "Kiemelt ajánlat";
  const safeDealRating = dealRating || "4,97 (155 értékelés)";
  const safeDealPrice = dealPrice || "69 000 Ft / egyszeri díj";
  const safeVaultStatus = vaultStatus || "Követés aktív";
  const safeVaultLabel = vaultLabel || "Biztonságos tár";
  const safeGridKicker = gridKicker || "Kiemelt kreatív";
  const safeGridFooter = gridFooter || "Kiegészítő";
  const safeLaunchCampaign = launchCampaign || "Kiemelt kampány";
  const safeLaunchOffer = launchOffer || "Egyedi ajánlat";
  const safeQuoteAuthor = quoteAuthor || "Szerző neve";
  const safeEditorialBadge = editorialBadge || "Kiemelt tartalom";
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
                gridTemplateColumns: "62.5% 37.5%",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  zIndex: 3,
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: 8,
                  background: "linear-gradient(90deg, #397AF3, #16BB87)",
                }}
              />
              <div
                style={{
                  padding: "0 70px",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 2,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    marginTop: 80,
                    fontSize: 29,
                    fontWeight: 800,
                  }}
                >
                  {safeEyebrow}
                </p>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 68,
                      borderRadius: 999,
                      padding: "8px 17px",
                      background: glow,
                      color: "#10B981",
                      fontSize: 20,
                      fontWeight: 750,
                    }}
                  >
                    {safeEditorialBadge}
                  </span>
                  <h3
                    style={{
                      ...textReset,
                      ...clamp(3),
                      marginTop: 24,
                      maxWidth: 575,
                      fontSize: 52,
                      lineHeight: 1.12,
                      letterSpacing: "-0.045em",
                      fontWeight: 850,
                    }}
                  >
                    {safeTitle}
                  </h3>
                  <p
                    style={{
                      ...textReset,
                      ...clamp(3),
                      marginTop: 18,
                      maxWidth: 570,
                      fontSize: 18,
                      lineHeight: 1.35,
                      opacity: 0.6,
                    }}
                  >
                    {safeDescription}
                  </p>
                </div>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 24,
                    borderRadius: 8,
                    padding: "14px 24px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
              <div style={{ position: "relative", background: surface }}>
                <span
                  style={{
                    position: "absolute",
                    width: 250,
                    height: 250,
                    top: 80,
                    left: -100,
                    borderRadius: "50%",
                    background: glow,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    width: 250,
                    height: 250,
                    bottom: 80,
                    left: 100,
                    borderRadius: "50%",
                    background: "#D6E2FF",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 115,
                    left: -70,
                    width: 450,
                    height: 400,
                    overflow: "hidden",
                    borderRadius: 32,
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
              <div
                style={{
                  margin: 34,
                  overflow: "hidden",
                  border: `5px solid ${glow}`,
                  borderRadius: 28,
                  boxShadow: `0 18px 38px ${glow}88`,
                }}
              >
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
                  boxShadow: `0 22px 60px ${glow}88`,
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
                gridTemplateColumns: "50% 50%",
                background,
              }}
            >
              <div
                style={{
                  position: "relative",
                }}
              >
                <p
                  style={{
                    ...textReset,
                    position: "absolute",
                    top: 213,
                    left: 93,
                    fontFamily: "Courier New, monospace",
                    fontSize: 26,
                    fontWeight: 500,
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    position: "absolute",
                    top: 287,
                    left: 93,
                    width: 425,
                    fontFamily: "Courier New, monospace",
                    fontSize: 31,
                    lineHeight: 1.1,
                    letterSpacing: "-0.025em",
                    fontWeight: 800,
                  }}
                >
                  {safeTitle}
                </h3>
                <div
                  style={{
                    position: "absolute",
                    top: 386,
                    left: 93,
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      overflow: "hidden",
                      borderRadius: "50%",
                      background: glow,
                    }}
                  >
                    {quoteAuthorImage && (
                      <img
                        src={quoteAuthorImage}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      ...textReset,
                      fontFamily: "Courier New, monospace",
                      fontSize: 20,
                      fontWeight: 500,
                    }}
                  >
                    {safeQuoteAuthor}
                  </p>
                </div>
                <span
                  style={{
                    position: "absolute",
                    zIndex: 2,
                    top: 506,
                    left: 474,
                    padding: "13px 40px",
                    background: text,
                    color: background,
                    fontFamily: "Courier New, monospace",
                    fontSize: 20,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  {safeCta}
                </span>
              </div>
              <div style={{ overflow: "hidden", background: glow }}>
                {imageElement}
              </div>
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
                  background: glow,
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
                background,
                color: text,
                borderLeft: `12px solid ${accent}`,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  padding: "0 48px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    ...textReset,
                    marginTop: 68,
                    fontSize: 32,
                    fontWeight: 800,
                  }}
                >
                  {safeEyebrow}
                </p>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 56,
                      borderRadius: 999,
                      padding: "8px 18px",
                      background: glow,
                      color: "#264BB3",
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {safeLaunchCampaign}
                  </span>
                  <h3
                    style={{
                      ...textReset,
                      ...clamp(2),
                      marginTop: 44,
                      fontSize: 48,
                      lineHeight: 0.98,
                      letterSpacing: "-0.05em",
                      fontWeight: 800,
                    }}
                  >
                    {safeTitle}
                  </h3>
                  <p
                    style={{
                      ...textReset,
                      ...clamp(3),
                      marginTop: 46,
                      fontSize: 19,
                      lineHeight: 1.35,
                      opacity: 0.68,
                    }}
                  >
                    {safeDescription}
                  </p>
                  <p
                    style={{
                      ...textReset,
                      ...clamp(2),
                      marginTop: 4,
                      fontSize: 19,
                      lineHeight: 1.28,
                      fontWeight: 800,
                    }}
                  >
                    {safeLaunchOffer}
                  </p>
                </div>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 10,
                    borderRadius: 999,
                    padding: "14px 27px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta} →
                </span>
              </div>
              <div
                style={{
                  margin: "40px 60px 40px 12px",
                  overflow: "hidden",
                  borderRadius: 42,
                }}
              >
                {imageElement}
              </div>
            </div>
          )}

          {template === "poster" && (
            <div
              style={{
                height: "100%",
                position: "relative",
                boxSizing: "border-box",
                textAlign: "center",
                overflow: "hidden",
                background,
                backgroundImage: `radial-gradient(ellipse 52% 58% at 10% 88%, ${accent}78 0%, transparent 69%), radial-gradient(ellipse 46% 52% at 91% 83%, ${glow}76 0%, transparent 70%)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 50,
                  left: 120,
                  right: 120,
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    borderRadius: 999,
                    padding: "8px 16px",
                    background: surface,
                    color: text,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {safeEyebrow}
                </span>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(2),
                    margin: "27px auto 22px",
                    maxWidth: 740,
                    fontSize: 48,
                    lineHeight: 1.04,
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
                    margin: "0 auto",
                    maxWidth: 850,
                    fontSize: 23,
                    lineHeight: 1.22,
                    opacity: 0.72,
                  }}
                >
                  {safeDescription}
                </p>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: "298px 136px -26px",
                  overflow: "hidden",
                  border: `7px solid ${background}`,
                  borderRadius: "28px 28px 0 0",
                  boxSizing: "border-box",
                }}
              >
                {imageElement}
              </div>
            </div>
          )}

          {template === "orbit" && (
            <div
              style={{
                height: "100%",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: -150,
                  bottom: -285,
                  width: 450,
                  height: 440,
                  border: `1px solid ${glow}`,
                  borderRadius: 28,
                  transform: "rotate(-18deg)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: -120,
                  right: -145,
                  width: 455,
                  height: 430,
                  border: `1px solid ${glow}`,
                  borderRadius: 28,
                  transform: "rotate(18deg)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 238,
                  bottom: 57,
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: accent,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 155,
                  right: 137,
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: accent,
                }}
              />
              <h3
                style={{
                  ...textReset,
                  ...clamp(2),
                  position: "absolute",
                  zIndex: 1,
                  top: 220,
                  left: 120,
                  right: 120,
                  textAlign: "center",
                  fontSize: 60,
                  lineHeight: 1.08,
                  letterSpacing: "-0.055em",
                  fontWeight: 400,
                }}
              >
                {safeTitle}
              </h3>
              <div
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 50,
                  left: 146,
                  width: 260,
                  height: 190,
                  overflow: "hidden",
                  borderRadius: 20,
                  transform: "rotate(20deg)",
                }}
              >
                {imageElement}
              </div>
              <div
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 48,
                  right: 170,
                  width: 260,
                  height: 190,
                  overflow: "hidden",
                  borderRadius: 20,
                  transform: "rotate(-20deg)",
                }}
              >
                {imageElement}
              </div>
              <div
                style={{
                  position: "absolute",
                  zIndex: 2,
                  top: 370,
                  left: "50%",
                  width: 260,
                  height: 190,
                  overflow: "hidden",
                  borderRadius: 20,
                  transform: "translateX(-50%) rotate(12deg)",
                }}
              >
                {imageElement}
              </div>
              <p
                style={{
                  ...textReset,
                  position: "absolute",
                  right: 98,
                  bottom: 174,
                  zIndex: 3,
                  fontSize: 29,
                  fontWeight: 400,
                  letterSpacing: "-0.03em",
                }}
              >
                {safeCta} →
              </p>
            </div>
          )}

          {template === "diagonal" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "50% 50%",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -140,
                  bottom: -140,
                  left: -90,
                  width: 330,
                  transform: "skewX(13deg)",
                  background: accent,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  width: 420,
                  height: 420,
                  right: -160,
                  bottom: -220,
                  borderRadius: "50%",
                  background: glow,
                  opacity: 0.46,
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 430,
                    height: 330,
                    overflow: "hidden",
                    borderRadius: 24,
                  }}
                >
                  {imageElement}
                </div>
              </div>
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  padding: "74px 68px 54px 44px",
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
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 30,
                    color: accent,
                    fontSize: 53,
                    lineHeight: 1.02,
                    letterSpacing: "-0.05em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 32,
                    borderRadius: 8,
                    padding: "13px 22px",
                    background: accent,
                    color: background,
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
            </div>
          )}

          {template === "spotlight" && (
            <div
              style={{
                height: "100%",
                position: "relative",
                background: surface,
                color: text,
              }}
            >
              <div style={{ position: "absolute", inset: 0 }}>
                {imageElement}
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(180deg, ${background}42 0%, ${background}f0 100%)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: "46px 90px",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    ...textReset,
                    position: "absolute",
                    top: 250,
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: 999,
                    padding: "7px 16px",
                    background: surface,
                    color: background,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(2),
                    position: "absolute",
                    top: 312,
                    left: "50%",
                    width: 560,
                    transform: "translateX(-50%)",
                    fontSize: 43,
                    lineHeight: 1.06,
                    letterSpacing: "-0.045em",
                    fontWeight: 500,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    position: "absolute",
                    top: 430,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: text,
                    color: background,
                    fontWeight: 400,
                    padding: 15,
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </span>
              </div>
            </div>
          )}

          {template === "soft" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "42% 58%",
                background: `radial-gradient(ellipse 68% 118% at 100% 100%, ${glow} 0%, transparent 68%), linear-gradient(116deg, ${surface} 0%, ${background} 49%, ${background} 100%)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 44px 0 68px",
                }}
              >
                <div
                  style={{
                    width: 392,
                    height: 206,
                    overflow: "hidden",
                    boxShadow: `0 22px 32px ${text}16`,
                  }}
                >
                  {imageElement}
                </div>
              </div>
              <div
                style={{
                  padding: "0 72px 0 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 90,
                    fontSize: 55,
                    lineHeight: 1.07,
                    letterSpacing: "-0.045em",
                    fontWeight: 800,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 84,
                    borderRadius: 5,
                    padding: "13px 31px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
              </div>
            </div>
          )}

          {template === "deal" && (
            <div
              style={{
                height: "100%",
                padding: 60,
                boxSizing: "border-box",
                background: accent,
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  gridTemplateColumns: "52.5% 47.5%",
                  overflow: "hidden",
                  border: `4px solid ${text}`,
                  borderRadius: 18,
                  background: surface,
                  boxShadow: `22px 22px 0 ${text}`,
                }}
              >
                <div
                  style={{
                    padding: "50px 36px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        borderRadius: 7,
                        padding: "8px 12px",
                        background: text,
                        color: background,
                        fontSize: 15,
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {safeDealBadge}
                    </span>
                    <h3
                      style={{
                        ...textReset,
                        ...clamp(2),
                        marginTop: 28,
                        fontSize: 60,
                        lineHeight: 0.98,
                        letterSpacing: "-0.06em",
                        fontWeight: 900,
                      }}
                    >
                      {safeTitle}
                    </h3>
                    <p
                      style={{
                        ...textReset,
                        ...clamp(3),
                        marginTop: 18,
                        fontSize: 20,
                        lineHeight: 1.35,
                        opacity: 0.72,
                      }}
                    >
                      {safeDescription}
                    </p>
                    <div
                      style={{
                        height: 10,
                        marginTop: 28,
                        background: `${text}20`,
                      }}
                    />
                    <p
                      style={{
                        ...textReset,
                        marginTop: 28,
                        fontSize: 19,
                        fontWeight: 750,
                      }}
                    >
                      <span style={{ color: "#FFAC28" }}>★</span>{" "}
                      {safeDealRating}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 18,
                    }}
                  >
                    <span style={{ fontSize: 27, fontWeight: 850 }}>
                      {safeDealPrice}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        borderRadius: 8,
                        padding: "13px 18px",
                        background: text,
                        color: background,
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      {safeCta}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    margin: "36px 34px 36px 0",
                    overflow: "hidden",
                    borderRadius: 18,
                  }}
                >
                  {imageElement}
                </div>
              </div>
            </div>
          )}

          {template === "vault" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "58% 42%",
                background,
                color: text,
                borderBottom: `2px solid ${accent}`,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  padding: "0 60px",
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: `14px solid ${accent}`,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    marginTop: 78,
                    fontSize: 31,
                    fontWeight: 800,
                  }}
                >
                  {safeEyebrow}
                </p>
                <div>
                  <h3
                    style={{
                      ...textReset,
                      ...clamp(2),
                      marginTop: 80,
                      fontSize: 54,
                      lineHeight: 1.04,
                      letterSpacing: "-0.055em",
                      fontWeight: 800,
                    }}
                  >
                    {safeTitle}
                  </h3>
                  <div
                    style={{
                      height: 2,
                      margin: "54px 0 22px",
                      background: `${text}33`,
                    }}
                  />
                  <p
                    style={{
                      ...textReset,
                      ...clamp(3),
                      fontSize: 18,
                      lineHeight: 1.35,
                      opacity: 0.8,
                    }}
                  >
                    {safeDescription}
                  </p>
                </div>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 82,
                    padding: "17px 32px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 900,
                    textTransform: "uppercase",
                  }}
                >
                  {safeCta}
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 48,
                    left: 44,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    color: accent,
                    fontSize: 22,
                    fontWeight: 850,
                    textTransform: "uppercase",
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: accent,
                    }}
                  />
                  {safeVaultStatus}
                </div>
                <span
                  style={{
                    position: "absolute",
                    top: 88,
                    left: 54,
                    padding: "12px 16px",
                    background: accent,
                    color: background,
                    fontSize: 21,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    zIndex: 2,
                  }}
                >
                  {safeVaultLabel}
                </span>
                <div
                  style={{
                    position: "absolute",
                    top: 120,
                    left: 24,
                    width: 396,
                    height: 400,
                    overflow: "hidden",
                    border: `4px solid ${surface}`,
                  }}
                >
                  {imageElement}
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 136,
                    left: 420,
                    width: 20,
                    height: 400,
                    background: accent,
                  }}
                />
              </div>
            </div>
          )}

          {template === "grid" && (
            <div
              style={{
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background,
                backgroundImage: `linear-gradient(${text}22 1px, transparent 1px), linear-gradient(90deg, ${text}22 1px, transparent 1px)`,
                backgroundPosition: "60px 100px",
                backgroundSize: "540px 430px",
              }}
            >
              <p
                style={{
                  ...textReset,
                  position: "absolute",
                  top: 42,
                  left: 90,
                  fontSize: 26,
                  fontWeight: 800,
                }}
              >
                {safeEyebrow}
              </p>
              {[
                [60, 100],
                [600, 100],
                [1140, 100],
                [60, 530],
                [600, 530],
                [1140, 530],
              ].map(([left, top]) => (
                <span
                  key={`${left}-${top}`}
                  style={{
                    position: "absolute",
                    top: top - 5,
                    left: left - 5,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: text,
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  top: 150,
                  left: 90,
                  width: 525,
                }}
              >
                <p style={{ ...textReset, fontSize: 20, fontWeight: 800 }}>
                  {safeGridKicker}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 28,
                    fontSize: 53,
                    lineHeight: 0.97,
                    letterSpacing: "-0.055em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <p
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 48,
                    fontSize: 19,
                    lineHeight: 1.35,
                    opacity: 0.76,
                  }}
                >
                  {safeDescription}
                </p>
              </div>
              <span
                style={{
                  position: "absolute",
                  bottom: 24,
                  left: 90,
                  borderRadius: 999,
                  padding: "14px 24px",
                  background: text,
                  color: background,
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                {safeCta}
              </span>
              <span
                style={{
                  position: "absolute",
                  right: 90,
                  bottom: 34,
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                {safeGridFooter}
              </span>
              <div
                style={{
                  position: "absolute",
                  top: 130,
                  right: 90,
                  width: 480,
                  height: 370,
                  overflow: "hidden",
                  borderRadius: 62,
                }}
              >
                {imageElement}
              </div>
            </div>
          )}

          {template === "tilt" && (
            <div
              style={{
                height: "100%",
                display: "grid",
                gridTemplateColumns: "44% 56%",
                background,
                backgroundImage: `linear-gradient(116deg, ${glow}58 0%, ${glow}24 30%, ${background} 63%)`,
              }}
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 74,
                    left: 78,
                    width: 390,
                    height: 450,
                    overflow: "hidden",
                    border: `7px solid ${background}`,
                    borderRadius: 26,
                    transform: "rotate(-7deg)",
                    boxShadow: `0 22px 44px ${glow}cc`,
                  }}
                >
                  {imageElement}
                </div>
              </div>
              <div
                style={{
                  padding: "0 70px 0 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  paddingTop: 149,
                }}
              >
                <p
                  style={{
                    ...textReset,
                    display: "inline-block",
                    alignSelf: "flex-start",
                    borderRadius: 999,
                    padding: "8px 16px",
                    background: `${text}12`,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {safeEyebrow}
                </p>
                <h3
                  style={{
                    ...textReset,
                    ...clamp(3),
                    marginTop: 28,
                    fontSize: 55,
                    lineHeight: 1.08,
                    letterSpacing: "-0.05em",
                    fontWeight: 850,
                  }}
                >
                  {safeTitle}
                </h3>
                <span
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 40,
                    borderRadius: 999,
                    padding: "14px 24px",
                    background: accent,
                    color: background,
                    fontSize: 19,
                    fontWeight: 800,
                  }}
                >
                  {safeCta}
                </span>
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

function CharacterHint({ current, limit }: { current: number; limit: number }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        current > limit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {current} / {limit} karakter
    </span>
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
  imageUrl,
  imageAlt,
  siteName,
  pageType,
  locale,
  pageUrl = "https://webhely.hu",
  onTitleChange,
  onDescriptionChange,
  onImageUrlChange,
  onImageAltChange,
  onSiteNameChange,
  onPageTypeChange,
  onLocaleChange,
  onPageUrlChange,
}: {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  siteName: string;
  pageType: string;
  locale: string;
  pageUrl?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onImageAltChange: (value: string) => void;
  onSiteNameChange: (value: string) => void;
  onPageTypeChange: (value: string) => void;
  onLocaleChange: (value: string) => void;
  onPageUrlChange: (value: string) => void;
}) {
  const [template, setTemplate] = useState<TemplateId>("editorial");
  const [editorTab, setEditorTab] = useState<EditorTab>("image");
  const [platform, setPlatform] = useState<DesignerPreviewPlatform>("facebook");
  const [imageTitle, setImageTitle] = useState("A megosztásra kész üzenet");
  const [imageDescription, setImageDescription] = useState(
    "Rövid, egyértelmű kiegészítő szöveg a megosztási képen.",
  );
  const [imageEyebrow, setImageEyebrow] = useState("Márkanév vagy címke");
  const [cta, setCta] = useState("Tudj meg többet");
  const [dealBadge, setDealBadge] = useState("Élethosszig tartó ajánlat");
  const [dealRating, setDealRating] = useState("4,97 (155 értékelés)");
  const [dealPrice, setDealPrice] = useState("69 000 Ft / egyszeri díj");
  const [vaultStatus, setVaultStatus] = useState("Követés aktív");
  const [vaultLabel, setVaultLabel] = useState("Biztonságos tár");
  const [gridKicker, setGridKicker] = useState("UX/UI designer ügynökség");
  const [gridFooter, setGridFooter] = useState("Kiegészítő");
  const [launchCampaign, setLaunchCampaign] = useState("Kiemelt kampány");
  const [launchOffer, setLaunchOffer] = useState("Egyedi ajánlat");
  const [quoteAuthor, setQuoteAuthor] = useState("Szerző neve");
  const [quoteAuthorImage, setQuoteAuthorImage] = useState("");
  const [quoteAuthorImageName, setQuoteAuthorImageName] = useState("");
  const [editorialBadge, setEditorialBadge] = useState("Kiemelt tartalom");
  const [palettes, setPalettes] = useState<Record<TemplateId, TemplatePalette>>(
    createInitialPalettes,
  );
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [exportState, setExportState] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quoteAuthorInputRef = useRef<HTMLInputElement>(null);
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

  function loadQuoteAuthorImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setQuoteAuthorImage(reader.result);
        setQuoteAuthorImageName(file.name);
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
      link.download = `${slugify(imageTitle)}-og.png`;
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
    title: imageTitle,
    description: imageDescription,
    eyebrow: imageEyebrow,
    cta,
    image,
    palette: palettes[template],
    dealBadge,
    dealRating,
    dealPrice,
    vaultStatus,
    vaultLabel,
    gridKicker,
    gridFooter,
    launchCampaign,
    launchOffer,
    quoteAuthor,
    quoteAuthorImage,
    editorialBadge,
  };
  const generatedCode = buildOpenGraphCode({
    title,
    description,
    imageUrl,
    imageAlt,
    siteName,
    pageType,
    locale,
    pageUrl,
  });
  const selectedIndex = templates.findIndex((item) => item.id === template);
  const activeTemplate = templates.find((item) => item.id === template)!;
  const activePalette = palettes[template];

  function updatePalette(slot: PaletteSlot, value: string) {
    setPalettes((current) => ({
      ...current,
      [template]: { ...current[template], [slot]: value },
    }));
  }

  function applyQuickPalette(palette: TemplatePalette) {
    setPalettes((current) => ({
      ...current,
      [template]: { ...palette },
    }));
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  }

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

        <div className="overflow-hidden rounded-3xl border bg-card xl:grid xl:grid-cols-[minmax(22rem,0.42fr)_minmax(0,0.58fr)]">
          <aside className="border-b xl:border-r xl:border-b-0">
            <div
              className="flex border-b px-3 pt-3 sm:px-5"
              role="tablist"
              aria-label="Szerkesztési mód"
            >
              {[
                { id: "image", label: "Kép szerkesztése" },
                { id: "metadata", label: "Metaadatok" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={editorTab === item.id}
                  onClick={() => setEditorTab(item.id as EditorTab)}
                  className={cn(
                    "relative h-11 px-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    editorTab === item.id &&
                    "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-ring",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {editorTab === "image" ? (
                <>
                  <Field>
                    <div className="flex items-baseline justify-between gap-3">
                      <FieldLabel htmlFor="og-image-content-title">
                        Képen szereplő cím
                      </FieldLabel>
                      <CharacterHint current={imageTitle.length} limit={64} />
                    </div>
                    <Input
                      id="og-image-content-title"
                      value={imageTitle}
                      maxLength={90}
                      onChange={(event) => setImageTitle(event.target.value)}
                    />
                  </Field>

                  <Field>
                    <div className="flex items-baseline justify-between gap-3">
                      <FieldLabel htmlFor="og-image-content-description">
                        Képen szereplő leírás
                      </FieldLabel>
                      <CharacterHint
                        current={imageDescription.length}
                        limit={120}
                      />
                    </div>
                    <Textarea
                      id="og-image-content-description"
                      value={imageDescription}
                      maxLength={180}
                      rows={3}
                      onChange={(event) =>
                        setImageDescription(event.target.value)
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="og-image-eyebrow">
                        Címke / márkanév
                      </FieldLabel>
                      <Input
                        id="og-image-eyebrow"
                        value={imageEyebrow}
                        maxLength={40}
                        onChange={(event) =>
                          setImageEyebrow(event.target.value)
                        }
                      />
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
                  </div>

                  {template === "deal" && (
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="og-deal-badge">
                          Ajánlatcímke
                        </FieldLabel>
                        <Input
                          id="og-deal-badge"
                          value={dealBadge}
                          maxLength={32}
                          onChange={(event) =>
                            setDealBadge(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="og-deal-rating">
                          Értékelés szövege
                        </FieldLabel>
                        <Input
                          id="og-deal-rating"
                          value={dealRating}
                          maxLength={40}
                          onChange={(event) =>
                            setDealRating(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="og-deal-price">Ár</FieldLabel>
                        <Input
                          id="og-deal-price"
                          value={dealPrice}
                          maxLength={36}
                          onChange={(event) => setDealPrice(event.target.value)}
                        />
                      </Field>
                    </div>
                  )}

                  {template === "vault" && (
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="og-vault-status">
                          Állapotjelző
                        </FieldLabel>
                        <Input
                          id="og-vault-status"
                          value={vaultStatus}
                          maxLength={28}
                          onChange={(event) =>
                            setVaultStatus(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="og-vault-label">
                          Zöld címke
                        </FieldLabel>
                        <Input
                          id="og-vault-label"
                          value={vaultLabel}
                          maxLength={28}
                          onChange={(event) =>
                            setVaultLabel(event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {template === "grid" && (
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="og-grid-kicker">
                          Felső kategória
                        </FieldLabel>
                        <Input
                          id="og-grid-kicker"
                          value={gridKicker}
                          maxLength={40}
                          onChange={(event) =>
                            setGridKicker(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="og-grid-footer">
                          Jobb alsó felirat
                        </FieldLabel>
                        <Input
                          id="og-grid-footer"
                          value={gridFooter}
                          maxLength={40}
                          onChange={(event) =>
                            setGridFooter(event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  )}

                  {template === "launch" && (
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="og-launch-campaign">
                          Kampánycímke
                        </FieldLabel>
                        <Input
                          id="og-launch-campaign"
                          value={launchCampaign}
                          maxLength={44}
                          onChange={(event) =>
                            setLaunchCampaign(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="og-launch-offer">
                          Ajánlati sor
                        </FieldLabel>
                        <Input
                          id="og-launch-offer"
                          value={launchOffer}
                          maxLength={56}
                          onChange={(event) => setLaunchOffer(event.target.value)}
                        />
                      </Field>
                    </div>
                  )}

                  {template === "quote" && (
                    <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="og-quote-author">
                          Szerző neve
                        </FieldLabel>
                        <Input
                          id="og-quote-author"
                          value={quoteAuthor}
                          maxLength={40}
                          onChange={(event) => setQuoteAuthor(event.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Szerző portréja</FieldLabel>
                        <input
                          ref={quoteAuthorInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="sr-only"
                          onChange={(event) =>
                            loadQuoteAuthorImage(event.target.files?.[0])
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => quoteAuthorInputRef.current?.click()}
                        >
                          <HugeiconsIcon
                            icon={ImageAdd02Icon}
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          {quoteAuthorImageName || "Kép kiválasztása"}
                        </Button>
                      </Field>
                    </div>
                  )}

                  {template === "editorial" && (
                    <div className="border-t pt-5">
                      <Field>
                        <FieldLabel htmlFor="og-editorial-badge">
                          Kampánycímke
                        </FieldLabel>
                        <Input
                          id="og-editorial-badge"
                          value={editorialBadge}
                          maxLength={44}
                          onChange={(event) =>
                            setEditorialBadge(event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  )}

                  <Field>
                    <FieldLabel>Kiválasztott kép</FieldLabel>
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
                    <FieldDescription>
                      PNG, JPG vagy WebP. Ez csak a megosztási kép tartalmát
                      módosítja.
                    </FieldDescription>
                  </Field>

                  <div className="border-t pt-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-foreground">
                        {activeTemplate.name} palettája
                      </p>
                      <span className="text-muted-foreground text-xs">
                        Csak ezt a sablont érinti
                      </span>
                    </div>
                    <div className="mb-5 flex flex-wrap gap-2">
                      {activeTemplate.quickPalettes.map((quickPalette) => (
                        <button
                          key={quickPalette.name}
                          type="button"
                          onClick={() =>
                            applyQuickPalette(quickPalette.palette)
                          }
                          className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                          <span className="flex -space-x-1" aria-hidden="true">
                            {activeTemplate.slots.slice(0, 4).map((slot) => (
                              <span
                                key={slot}
                                className="size-3 rounded-full border border-background"
                                style={{
                                  background: quickPalette.palette[slot],
                                }}
                              />
                            ))}
                          </span>
                          {quickPalette.name}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                      {activeTemplate.slots.map((slot) => (
                        <ColorControl
                          key={slot}
                          label={paletteSlotLabels[slot]}
                          value={activePalette[slot]}
                          onChange={(value) => updatePalette(slot, value)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Ezek az értékek jelennek meg a platformok kártyáin és a
                    HTML-kódban. Nem módosítják a tervezett kép szövegét.
                  </p>
                  <Field>
                    <FieldLabel htmlFor="share-page-url">
                      Az oldal URL-je
                    </FieldLabel>
                    <Input
                      id="share-page-url"
                      type="url"
                      value={pageUrl}
                      onChange={(event) => onPageUrlChange(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-baseline justify-between gap-3">
                      <FieldLabel htmlFor="share-title">OG cím</FieldLabel>
                      <CharacterHint current={title.length} limit={60} />
                    </div>
                    <Input
                      id="share-title"
                      value={title}
                      maxLength={90}
                      onChange={(event) => onTitleChange(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-baseline justify-between gap-3">
                      <FieldLabel htmlFor="share-description">
                        OG leírás
                      </FieldLabel>
                      <CharacterHint current={description.length} limit={125} />
                    </div>
                    <Textarea
                      id="share-description"
                      value={description}
                      maxLength={200}
                      rows={4}
                      onChange={(event) =>
                        onDescriptionChange(event.target.value)
                      }
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
                      onChange={(event) => onImageUrlChange(event.target.value)}
                      placeholder="https://pelda.hu/og-image.jpg"
                    />
                    <FieldDescription>
                      Az exportált PNG-t előbb töltsd fel a saját webhelyedre
                      vagy CDN-edre.
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
                      onChange={(event) => onImageAltChange(event.target.value)}
                    />
                  </Field>
                  <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="share-site-name">
                        Webhely neve
                      </FieldLabel>
                      <Input
                        id="share-site-name"
                        value={siteName}
                        onChange={(event) =>
                          onSiteNameChange(event.target.value)
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="share-type">Oldal típusa</FieldLabel>
                      <select
                        id="share-type"
                        value={pageType}
                        onChange={(event) =>
                          onPageTypeChange(event.target.value)
                        }
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
                        onChange={(event) => onLocaleChange(event.target.value)}
                      />
                    </Field>
                  </div>
                </>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div
                className="flex min-w-0 overflow-x-auto"
                role="tablist"
                aria-label="Közösségi előnézet"
              >
                {designerPreviewPlatforms.map((item) => (
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

            <div className="morf-share-preview-panel px-6 py-6 sm:p-10 lg:px-24 lg:py-12">
              {platform === "html" ? (
                <div className="w-full max-w-4xl">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-semibold">
                        Beilleszthető HTML
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Tedd az adott oldal &lt;head&gt; részébe.
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={copyCode}>
                      <HugeiconsIcon
                        icon={ClipboardCopyIcon}
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {copyState === "copied"
                        ? "Kimásolva"
                        : copyState === "error"
                          ? "Másold ki kézzel"
                          : "Kód másolása"}
                    </Button>
                  </div>
                  <pre className="morf-share-code max-h-[32rem] overflow-auto rounded-xl border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                    <code>{generatedCode}</code>
                  </pre>
                  <p className="sr-only" aria-live="polite">
                    {copyState === "copied" ? "A kód a vágólapra került." : ""}
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[30rem] w-full items-center justify-center">
                  <PlatformPreviewCard
                    platform={platform}
                    title={title}
                    description={description}
                    media={<Artwork {...artworkProps} svgRef={artworkRef} />}
                    siteName={siteName}
                    pageUrl={pageUrl}
                  />
                </div>
              )}
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
                      palette={palettes[item.id]}
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
