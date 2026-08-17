import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ClipboardCopyIcon,
  CodeIcon,
  Download04Icon,
  ImageAdd02Icon,
  MagicWand03Icon,
  Image02Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import type { SharePreviewMessages } from "@/i18n/share-preview";
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
  launchCampaignColor: string;
  launchOffer: string;
  quoteAuthor: string;
  quoteAuthorImage: string;
  editorialBadge: string;
  editorialBadgeColor: string;
  svgRef?: RefObject<SVGSVGElement | null>;
  label: string;
  ownImagePlaceholder: string;
};

function ArrowIcon({
  size = 20,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

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
  launchCampaignColor,
  launchOffer,
  quoteAuthor,
  quoteAuthorImage,
  editorialBadge,
  editorialBadgeColor,
  svgRef,
  label,
  ownImagePlaceholder,
}: ArtworkProps) {
  const { canvas: background, surface, accent, text, glow } = palette;
  const softText = withAlpha(text, "12");
  const safeLaunchCampaignColor = launchCampaignColor || "#264BB3";
  const safeEditorialBadgeColor = editorialBadgeColor || "#10B981";
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
      {ownImagePlaceholder}
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      marginTop: 80,
                      fontSize: 29,
                      fontWeight: 800,
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                <div>
                  {editorialBadge && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 68,
                        borderRadius: 999,
                        padding: "8px 17px",
                        background: glow,
                        color: safeEditorialBadgeColor,
                        fontSize: 20,
                        fontWeight: 750,
                      }}
                    >
                      {editorialBadge}
                    </span>
                  )}
                  {title && (
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
                      {title}
                    </h3>
                  )}
                  {description && (
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
                      {description}
                    </p>
                  )}
                </div>
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                  boxShadow: `0 18px 38px ${withAlpha(glow, "88")}`,
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
                {eyebrow && (
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
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {description && (
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
                    {description}
                  </p>
                )}
                {cta && (
                  <p
                    style={{
                      ...textReset,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 34,
                      color: accent,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {cta}
                    <ArrowIcon size={20} />
                  </p>
                )}
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
                  boxShadow: `0 22px 60px ${withAlpha(glow, "88")}`,
                }}
              >
                {eyebrow && (
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
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                {eyebrow && (
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
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {(quoteAuthor || quoteAuthorImage) && (
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
                  {quoteAuthorImage && (
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        overflow: "hidden",
                        borderRadius: "50%",
                        background: glow,
                      }}
                    >
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
                    </div>
                  )}
                  {quoteAuthor && (
                    <p
                      style={{
                        ...textReset,
                        fontFamily: "Courier New, monospace",
                        fontSize: 20,
                        fontWeight: 500,
                      }}
                    >
                      {quoteAuthor}
                    </p>
                  )}
                </div>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      fontSize: 20,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      marginTop: 68,
                      fontSize: 32,
                      fontWeight: 800,
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                <div>
                  {launchCampaign && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 56,
                        borderRadius: 999,
                        padding: "8px 18px",
                        background: glow,
                        color: safeLaunchCampaignColor,
                        fontSize: 20,
                        fontWeight: 800,
                      }}
                    >
                      {launchCampaign}
                    </span>
                  )}
                  {title && (
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
                      {title}
                    </h3>
                  )}
                  {description && (
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
                      {description}
                    </p>
                  )}
                  {launchOffer && (
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
                      {launchOffer}
                    </p>
                  )}
                </div>
                {cta && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
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
                    {cta}
                    <ArrowIcon size={18} />
                  </span>
                )}
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
                {eyebrow && (
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
                    {eyebrow}
                  </span>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {description && (
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
                    {description}
                  </p>
                )}
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
              {title && (
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
                  {title}
                </h3>
              )}
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
              {cta && (
                <p
                  style={{
                    ...textReset,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    position: "absolute",
                    right: 98,
                    bottom: 174,
                    zIndex: 3,
                    fontSize: 29,
                    fontWeight: 400,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {cta}
                  <ArrowIcon size={26} />
                </p>
              )}
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      color: accent,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                {eyebrow && (
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
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
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
                    boxShadow: `0 22px 32px ${withAlpha(text, "16")}`,
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
                {title && (
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
                    {title}
                  </h3>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
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
                    {dealBadge && (
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
                        {dealBadge}
                      </span>
                    )}
                    {title && (
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
                        {title}
                      </h3>
                    )}
                    {description && (
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
                        {description}
                      </p>
                    )}
                    <div
                      style={{
                        height: 10,
                        marginTop: 28,
                        background: withAlpha(text, "20"),
                      }}
                    />
                    {dealRating && (
                      <p
                        style={{
                          ...textReset,
                          marginTop: 28,
                          fontSize: 19,
                          fontWeight: 750,
                        }}
                      >
                        <span style={{ color: "#FFAC28" }}>★</span>{" "}
                        {dealRating}
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 18,
                    }}
                  >
                    {dealPrice && (
                      <span style={{ fontSize: 27, fontWeight: 850 }}>
                        {dealPrice}
                      </span>
                    )}
                    {cta && (
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
                        {cta}
                      </span>
                    )}
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      marginTop: 78,
                      fontSize: 31,
                      fontWeight: 800,
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                <div>
                  {title && (
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
                      {title}
                    </h3>
                  )}
                  <div
                    style={{
                      height: 2,
                      margin: "54px 0 22px",
                      background: withAlpha(text, "33"),
                    }}
                  />
                  {description && (
                    <p
                      style={{
                        ...textReset,
                        ...clamp(3),
                        fontSize: 18,
                        lineHeight: 1.35,
                        opacity: 0.8,
                      }}
                    >
                      {description}
                    </p>
                  )}
                </div>
                {cta && (
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
                    {cta}
                  </span>
                )}
              </div>
              <div
                style={{
                  position: "relative",
                }}
              >
                {vaultStatus && (
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
                    {vaultStatus}
                  </div>
                )}
                {vaultLabel && (
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
                    {vaultLabel}
                  </span>
                )}
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
              {eyebrow && (
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
                  {eyebrow}
                </p>
              )}
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
                {gridKicker && (
                  <p style={{ ...textReset, fontSize: 20, fontWeight: 800 }}>
                    {gridKicker}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {description && (
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
                    {description}
                  </p>
                )}
              </div>
              {cta && (
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
                  {cta}
                </span>
              )}
              {gridFooter && (
                <span
                  style={{
                    position: "absolute",
                    right: 90,
                    bottom: 34,
                    fontSize: 23,
                    fontWeight: 800,
                  }}
                >
                  {gridFooter}
                </span>
              )}
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
                    boxShadow: `0 22px 44px ${withAlpha(glow, "cc")}`,
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
                {eyebrow && (
                  <p
                    style={{
                      ...textReset,
                      display: "inline-block",
                      alignSelf: "flex-start",
                      borderRadius: 999,
                      padding: "8px 16px",
                      background: withAlpha(text, "12"),
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    {eyebrow}
                  </p>
                )}
                {title && (
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
                    {title}
                  </h3>
                )}
                {cta && (
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
                    {cta}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </foreignObject>
    </svg>
  );
}

function svgToDataUrl(svg: string) {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;charset=utf-8;base64,${btoa(binary)}`;
}

async function fetchImageAsDataUrl(
  url: string,
  copy: SharePreviewMessages["designer"],
  locale: string,
): Promise<string> {
  const response = await fetch(
    `/api/image-fetch?url=${encodeURIComponent(url)}&locale=${encodeURIComponent(locale)}`,
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || copy.imageFetchFailedFallback);
  }
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(copy.imageConversionFailed));
    };
    reader.onerror = () => reject(new Error(copy.imageReadFailed));
    reader.readAsDataURL(blob);
  });
}

// A távoli kép-URL-eket data URL-re cseréli a klónozott SVG-ben exportálás
// előtt, különben a <canvas> "tainted" lesz, és a PNG-mentés csendben
// meghiúsul (crossOrigin nélkül betöltött kép nem olvasható ki canvasból).
async function inlineRemoteImages(
  root: SVGSVGElement,
  copy: SharePreviewMessages["designer"],
  locale: string,
) {
  const images = Array.from(root.querySelectorAll("img")).filter((img) =>
    /^https?:\/\//i.test(img.getAttribute("src") ?? ""),
  );
  if (images.length === 0) return;

  const cache = new Map<string, string>();
  for (const img of images) {
    const src = img.getAttribute("src")!;
    if (!cache.has(src)) {
      cache.set(src, await fetchImageAsDataUrl(src, copy, locale));
    }
    img.setAttribute("src", cache.get(src)!);
  }
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
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        current > limit ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {current} / {limit} {messages.designer.characterCountSuffix}
    </span>
  );
}

function hexRgb(hex: string): string {
  return hex.length >= 7 ? hex.slice(0, 7) : "#000000";
}

function hexAlphaPercent(hex: string): number {
  if (hex.length < 9) return 100;
  const alpha = Number.parseInt(hex.slice(7, 9), 16);
  return Number.isNaN(alpha) ? 100 : Math.round((alpha / 255) * 100);
}

function setHexAlpha(hex: string, alphaPercent: number): string {
  const rgb = hexRgb(hex);
  const clamped = Math.max(0, Math.min(100, Math.round(alphaPercent)));
  if (clamped >= 100) return rgb;
  const alphaByte = Math.round((clamped / 100) * 255);
  return `${rgb}${alphaByte.toString(16).padStart(2, "0")}`;
}

/**
 * Egy paletta-szín saját (a felhasználó által beállított) átlátszóságát
 * kombinálja egy másodlagos, csak dekoratív célra (pl. árnyék, halvány
 * tint) alkalmazott átlátszósággal — a kettő szorzódik, nem írja felül
 * egymást, így korrekt az eredmény akkor is, ha a szín már eleve részben
 * átlátszó.
 */
function withAlpha(hex: string, effectAlphaHex: string): string {
  const rgb = hexRgb(hex);
  const baseAlpha = hex.length >= 9 ? Number.parseInt(hex.slice(7, 9), 16) : 255;
  const effectAlpha = Number.parseInt(effectAlphaHex, 16);
  const combined = Math.round((baseAlpha / 255) * (effectAlpha / 255) * 255);
  return `${rgb}${combined.toString(16).padStart(2, "0")}`;
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
    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
      <input
        type="color"
        value={hexRgb(value)}
        onChange={(event) =>
          onChange(setHexAlpha(event.target.value, hexAlphaPercent(value)))
        }
        aria-label={label}
        className="size-9 shrink-0 cursor-pointer appearance-none rounded-full border bg-background p-0 transition-shadow hover:ring-2 hover:ring-ring/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-2 [&::-moz-color-swatch]:border-background [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-background [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-foreground">{label}</span>
        <Input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          spellCheck={false}
          maxLength={9}
          placeholder="#RRGGBBAA"
          className="mt-1 h-7 w-full rounded-lg px-2 py-0 font-mono text-[0.7rem] uppercase"
        />
      </span>
    </div>
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
  scannedImage,
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
  scannedImage?: { url: string; token: number } | null;
}) {
  const { locale: uiLocale, messages } = useWorkspaceI18n<SharePreviewMessages>();
  const copy = messages.designer;
  const defaults = copy.defaults;
  const [template, setTemplate] = useState<TemplateId>("editorial");
  const [editorTab, setEditorTab] = useState<EditorTab>("image");
  const [platform, setPlatform] = useState<DesignerPreviewPlatform>("facebook");
  const [imageTitle, setImageTitle] = useState<string>(defaults.imageTitle);
  const [imageDescription, setImageDescription] = useState<string>(
    defaults.imageDescription,
  );
  const [imageEyebrow, setImageEyebrow] = useState<string>(defaults.imageEyebrow);
  const [cta, setCta] = useState<string>(defaults.cta);
  const [dealBadge, setDealBadge] = useState<string>(defaults.dealBadge);
  const [dealRating, setDealRating] = useState<string>(defaults.dealRating);
  const [dealPrice, setDealPrice] = useState<string>(defaults.dealPrice);
  const [vaultStatus, setVaultStatus] = useState<string>(defaults.vaultStatus);
  const [vaultLabel, setVaultLabel] = useState<string>(defaults.vaultLabel);
  const [gridKicker, setGridKicker] = useState<string>(defaults.gridKicker);
  const [gridFooter, setGridFooter] = useState<string>(defaults.gridFooter);
  const [launchCampaign, setLaunchCampaign] = useState<string>(defaults.launchCampaign);
  const [launchCampaignColor, setLaunchCampaignColor] = useState("#264BB3");
  const [launchOffer, setLaunchOffer] = useState<string>(defaults.launchOffer);
  const [quoteAuthor, setQuoteAuthor] = useState<string>(defaults.quoteAuthor);
  const [quoteAuthorImage, setQuoteAuthorImage] = useState("");
  const [quoteAuthorImageName, setQuoteAuthorImageName] = useState("");
  const [editorialBadge, setEditorialBadge] = useState<string>(defaults.editorialBadge);
  const [editorialBadgeColor, setEditorialBadgeColor] = useState("#10B981");
  const [palettes, setPalettes] = useState<Record<TemplateId, TemplatePalette>>(
    createInitialPalettes,
  );
  const [image, setImage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [exportState, setExportState] = useState<
    "idle" | "exporting" | "error"
  >("idle");
  const [exportErrorMessage, setExportErrorMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quoteAuthorInputRef = useRef<HTMLInputElement>(null);
  const artworkRef = useRef<SVGSVGElement>(null);
  const templateStripRef = useRef<HTMLDivElement>(null);

  // A token változása jelzi az új sikeres lekérdezést; enélkül minden
  // renderelés felülírná a felhasználó saját kiválasztott képét.
  useEffect(() => {
    if (!scannedImage?.url) return;
    setImage(scannedImage.url);
  }, [scannedImage?.token]);

  function loadImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImage(reader.result);
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
    setExportErrorMessage("");

    try {
      const clone = artworkRef.current.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", "1200");
      clone.setAttribute("height", "630");
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone
        .querySelector("foreignObject > div")
        ?.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      await inlineRemoteImages(clone, copy, uiLocale);

      const serialized = new XMLSerializer().serializeToString(clone);
      // Chrome "tainted"-nek jelöli a canvast, ha egy foreignObject-et
      // tartalmazó SVG-t blob: URL-ként töltünk be <img>-be — base64 data
      // URI-ként betöltve ez a védelem nem lép életbe.
      const rasterImage = new Image();
      rasterImage.src = svgToDataUrl(serialized);
      await rasterImage.decode();

      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) throw new Error(copy.canvasCreationFailed);
      context.drawImage(rasterImage, 0, 0, 1200, 630);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error(copy.pngCreationFailed)),
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
    } catch (error) {
      setExportErrorMessage(error instanceof Error ? error.message : "");
      setExportState("error");
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
    launchCampaignColor,
    launchOffer,
    quoteAuthor,
    quoteAuthorImage,
    editorialBadge,
    editorialBadgeColor,
    label: copy.defaultCanvasPreviewAlt,
    ownImagePlaceholder: copy.ownImagePlaceholder,
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
            {copy.eyebrow}
          </p>
          <h2
            id="og-image-designer-title"
            className="font-heading mt-2 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl"
          >
            {copy.title}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed text-pretty">
            {copy.description}
          </p>
        </header>

        <div className="overflow-hidden rounded-3xl border bg-card xl:grid xl:grid-cols-[minmax(22rem,0.42fr)_minmax(0,0.58fr)]">
          <aside className="border-b xl:border-r xl:border-b-0">
            <div
              className="flex border-b px-3 pt-3 sm:px-5"
              role="tablist"
              aria-label={copy.editingModeAriaLabel}
            >
              {[
                { id: "image", label: copy.imageTab },
                { id: "metadata", label: copy.metadataTab },
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
                        {copy.imageContentTitleLabel}
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
                        {copy.imageContentDescriptionLabel}
                      </FieldLabel>
                      <CharacterHint
                        current={imageDescription.length}
                        limit={160}
                      />
                    </div>
                    <Textarea
                      id="og-image-content-description"
                      value={imageDescription}
                      maxLength={240}
                      rows={3}
                      onChange={(event) =>
                        setImageDescription(event.target.value)
                      }
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="og-image-eyebrow">
                        {copy.eyebrowLabel}
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
                      <FieldLabel htmlFor="og-designer-cta">{copy.ctaLabel}</FieldLabel>
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
                          {copy.dealBadgeLabel}
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
                          {copy.dealRatingLabel}
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
                        <FieldLabel htmlFor="og-deal-price">{copy.dealPriceLabel}</FieldLabel>
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
                          {copy.vaultStatusLabel}
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
                          {copy.vaultLabelLabel}
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
                          {copy.gridKickerLabel}
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
                          {copy.gridFooterLabel}
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
                          {copy.launchCampaignLabel}
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
                          {copy.launchOfferLabel}
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
                          {copy.quoteAuthorLabel}
                        </FieldLabel>
                        <Input
                          id="og-quote-author"
                          value={quoteAuthor}
                          maxLength={40}
                          onChange={(event) => setQuoteAuthor(event.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel>{copy.quoteAuthorPortraitLabel}</FieldLabel>
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
                          {quoteAuthorImageName || copy.choosePhoto}
                        </Button>
                      </Field>
                    </div>
                  )}

                  {template === "editorial" && (
                    <div className="border-t pt-5">
                      <Field>
                        <FieldLabel htmlFor="og-editorial-badge">
                          {copy.editorialBadgeLabel}
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
                    <FieldLabel htmlFor="og-image-source-url">
                      {copy.selectedImageLabel}
                    </FieldLabel>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 transition-colors",
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
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <HugeiconsIcon
                            icon={Image02Icon}
                            className="text-muted-foreground size-4"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => loadImage(event.target.files?.[0])}
                      />
                      <Input
                        id="og-image-source-url"
                        type="url"
                        value={image.startsWith("data:") ? "" : image}
                        onChange={(event) => setImage(event.target.value)}
                        placeholder={copy.imageUrlPlaceholder}
                        className="h-9 min-w-0 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={copy.browseLabel}
                        title={copy.browseLabel}
                      >
                        <HugeiconsIcon icon={ImageAdd02Icon} aria-hidden="true" />
                      </Button>
                    </div>
                    <FieldDescription>
                      {copy.imageHint}
                    </FieldDescription>
                  </Field>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {copy.metadataTabIntro}
                  </p>
                  <Field>
                    <FieldLabel htmlFor="share-page-url">
                      {copy.pageUrlLabel}
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
                      <FieldLabel htmlFor="share-title">{copy.ogTitleLabel}</FieldLabel>
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
                        {copy.ogDescriptionLabel}
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
                      {copy.imagePublicUrlLabel}
                    </FieldLabel>
                    <Input
                      id="share-image-url"
                      type="url"
                      value={imageUrl}
                      onChange={(event) => onImageUrlChange(event.target.value)}
                      placeholder={copy.imagePublicUrlPlaceholder}
                    />
                    <FieldDescription>
                      {copy.imagePublicUrlHint}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="share-image-alt">
                      {copy.imageDescriptionLabel}
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
                        {copy.siteNameLabel}
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
                      <FieldLabel htmlFor="share-type">{copy.pageTypeLabel}</FieldLabel>
                      <select
                        id="share-type"
                        value={pageType}
                        onChange={(event) =>
                          onPageTypeChange(event.target.value)
                        }
                        className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                      >
                        <option value="website">{copy.pageTypeWebsite}</option>
                        <option value="article">{copy.pageTypeArticle}</option>
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="share-locale">
                        {copy.localeLabel}
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
                aria-label={copy.socialPreviewAriaLabel}
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
                    ? copy.generatingPngLabel
                    : copy.downloadPngLabel}
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
                        {copy.embeddableHtmlTitle}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {copy.embeddableHtmlHint}
                      </p>
                    </div>
                    <Button type="button" size="sm" onClick={copyCode}>
                      <HugeiconsIcon
                        icon={ClipboardCopyIcon}
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      {copyState === "copied"
                        ? copy.copiedLabel
                        : copyState === "error"
                          ? copy.copyManuallyLabel
                          : copy.copyCodeLabel}
                    </Button>
                  </div>
                  <pre className="morf-share-code max-h-[32rem] overflow-auto rounded-xl border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
                    <code>{generatedCode}</code>
                  </pre>
                  <p className="sr-only" aria-live="polite">
                    {copyState === "copied" ? copy.codeCopiedSrOnly : ""}
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
                {exportErrorMessage
                  ? copy.pngExportFailedTemplate.replace("{message}", exportErrorMessage)
                  : copy.pngExportFailedFallback}
              </p>
            )}

            <div className="border-t px-4 py-4 sm:px-5 sm:py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-foreground">
                  {activeTemplate.name} {copy.paletteOfTemplateSuffix}
                </p>
                <span className="text-muted-foreground text-xs">
                  {copy.templateOnlyNote}
                </span>
              </div>
              <div className="mb-5 flex flex-wrap gap-2">
                {activeTemplate.quickPalettes.map((quickPalette) => (
                  <button
                    key={quickPalette.name}
                    type="button"
                    onClick={() => applyQuickPalette(quickPalette.palette)}
                    className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <span className="flex -space-x-1" aria-hidden="true">
                      {activeTemplate.slots.slice(0, 4).map((slot) => (
                        <span
                          key={slot}
                          className="size-3 rounded-full border border-background"
                          style={{ background: quickPalette.palette[slot] }}
                        />
                      ))}
                    </span>
                    {(copy.paletteNames as Record<string, string>)[quickPalette.name] ?? quickPalette.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeTemplate.slots.map((slot) => (
                  <ColorControl
                    key={slot}
                    label={copy.paletteSlotLabels[slot]}
                    value={activePalette[slot]}
                    onChange={(value) => updatePalette(slot, value)}
                  />
                ))}
                {template === "launch" && (
                  <ColorControl
                    label={copy.launchCampaignColorLabel}
                    value={launchCampaignColor}
                    onChange={setLaunchCampaignColor}
                  />
                )}
                {template === "editorial" && (
                  <ColorControl
                    label={copy.editorialBadgeColorLabel}
                    value={editorialBadgeColor}
                    onChange={setEditorialBadgeColor}
                  />
                )}
              </div>
            </div>

            <div className="border-t px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading text-base font-semibold">
                    {copy.templatesHeading}
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
                    aria-label={copy.previousTemplatesAriaLabel}
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
                    aria-label={copy.nextTemplatesAriaLabel}
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
                      label={`${item.name} ${copy.templateNameSuffix}`}
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
