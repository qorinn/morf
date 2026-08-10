import type { ReactNode } from "react";
import {
  DiscordIcon,
  Facebook01Icon,
  Linkedin02Icon,
  NewTwitterIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export type PreviewPlatform =
  "facebook" | "x" | "linkedin" | "whatsapp" | "discord";

export const previewPlatformItems = [
  { id: "facebook", label: "Facebook", icon: Facebook01Icon },
  { id: "x", label: "X", icon: NewTwitterIcon },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin02Icon },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsappIcon },
  { id: "discord", label: "Discord", icon: DiscordIcon },
] satisfies Array<{
  id: PreviewPlatform;
  label: string;
  icon: typeof Facebook01Icon;
}>;

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value || "webhely.hu";
  }
}

function MissingImage({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "morf-share-image-empty text-muted-foreground flex items-center justify-center text-center text-xs font-semibold tracking-wide uppercase",
        compact ? "h-full min-h-32" : "aspect-[1.91/1]",
      )}
    >
      Nincs OG:image
    </div>
  );
}

function PreviewMedia({
  image,
  imageAlt,
  media,
  compact = false,
}: {
  image?: string;
  imageAlt: string;
  media?: ReactNode;
  compact?: boolean;
}) {
  if (media) {
    return (
      <div
        className={cn(
          "overflow-hidden bg-muted",
          compact
            ? "h-full [&_svg]:h-full [&_svg]:w-[191%] [&_svg]:max-w-none [&_svg]:translate-x-[-24%]"
            : "[&_svg]:h-auto [&_svg]:w-full",
        )}
      >
        {media}
      </div>
    );
  }

  if (!image) return <MissingImage compact={compact} />;

  return (
    <img
      src={image}
      alt={imageAlt}
      className={cn(
        "block w-full object-cover",
        compact ? "h-full min-h-32" : "aspect-[1.91/1]",
      )}
    />
  );
}

type PlatformPreviewCardProps = {
  platform: PreviewPlatform;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  media?: ReactNode;
  siteName?: string;
  pageUrl: string;
};

export function PlatformPreviewCard({
  platform,
  title,
  description,
  image,
  imageAlt = "Megosztási kép előnézete",
  media,
  siteName,
  pageUrl,
}: PlatformPreviewCardProps) {
  const host = hostname(pageUrl);
  const safeTitle = title || "Az oldal címe";
  const safeDescription = description || "Az oldal leírása itt jelenik meg.";

  if (platform === "x") {
    return (
      <div className="morf-platform-x-card w-full max-w-5xl">
        <div className="relative overflow-hidden rounded-[1.75rem] border bg-inherit">
          <PreviewMedia image={image} imageAlt={imageAlt} media={media} />
          <p className="morf-platform-x-overlay absolute right-5 bottom-4 left-5 w-fit max-w-[calc(100%-2.5rem)] rounded-lg px-4 py-2 text-base font-medium sm:text-xl">
            <span className="line-clamp-1">{safeTitle}</span>
          </p>
        </div>
        <p className="morf-platform-muted mt-3 text-sm sm:text-base">
          From {host}
        </p>
      </div>
    );
  }

  if (platform === "linkedin") {
    return (
      <div className="morf-platform-linkedin-card flex w-full max-w-5xl items-center gap-4 rounded-2xl border p-4 sm:gap-6 sm:p-5">
        <div className="aspect-[1.91/1] w-36 shrink-0 overflow-hidden rounded-xl sm:w-56">
          <PreviewMedia image={image} imageAlt={imageAlt} media={media} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base leading-tight font-semibold sm:text-xl">
            {safeTitle}
          </h3>
          <p className="morf-platform-muted mt-2 text-sm sm:text-base">
            {host}
          </p>
        </div>
      </div>
    );
  }

  if (platform === "whatsapp") {
    return (
      <div className="morf-platform-whatsapp-card w-full max-w-xl rounded-2xl p-2">
        <div className="morf-platform-whatsapp-content overflow-hidden rounded-xl">
          <PreviewMedia image={image} imageAlt={imageAlt} media={media} />
          <div className="px-4 py-3">
            <h3 className="line-clamp-2 text-base leading-snug font-semibold sm:text-lg">
              {safeTitle}
            </h3>
            <p className="morf-platform-muted mt-1 line-clamp-2 text-sm leading-relaxed">
              {safeDescription}
            </p>
            <p className="morf-platform-muted mt-2 text-xs uppercase">{host}</p>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "discord") {
    return (
      <div className="morf-platform-discord-card w-full max-w-2xl rounded-lg border-l-4 p-4">
        <p className="morf-platform-muted text-xs font-medium">
          {siteName || host}
        </p>
        <h3 className="morf-platform-accent mt-2 line-clamp-2 text-base font-semibold">
          {safeTitle}
        </h3>
        <p className="morf-platform-muted mt-1 line-clamp-2 text-sm leading-relaxed">
          {safeDescription}
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border">
          <PreviewMedia image={image} imageAlt={imageAlt} media={media} />
        </div>
      </div>
    );
  }

  return (
    <div className="morf-platform-facebook-card w-full max-w-5xl overflow-hidden border">
      <PreviewMedia image={image} imageAlt={imageAlt} media={media} />
      <div className="morf-platform-facebook-footer border-t px-5 py-4 sm:px-7 sm:py-5">
        <p className="morf-platform-muted text-sm font-medium tracking-wide uppercase">
          {host}
        </p>
        <h3 className="mt-1 line-clamp-2 text-lg leading-tight font-semibold sm:text-2xl">
          {safeTitle}
        </h3>
      </div>
    </div>
  );
}
