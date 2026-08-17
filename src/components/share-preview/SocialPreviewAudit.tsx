import { useState } from "react";
import {
  Alert02Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  CodeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { useWorkspaceI18n } from "@/components/workspace/WorkspaceI18nProvider";
import type { SharePreviewMessages } from "@/i18n/share-preview";
import type { AuditItem, OpenGraphData } from "./open-graph";
import {
  PlatformPreviewCard,
  previewPlatformItems,
  type PreviewPlatform,
} from "./PlatformPreviewCard";

type Platform = PreviewPlatform | "html";

const platforms = [
  ...previewPlatformItems,
  { id: "html", label: "HTML", icon: CodeIcon },
] satisfies Array<{
  id: Platform;
  label: string;
  icon: (typeof previewPlatformItems)[number]["icon"];
}>;

function SocialCard({
  platform,
  data,
}: {
  platform: Platform;
  data: OpenGraphData;
}) {
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  const copy = messages.platformPreview;
  const title = data.ogTitle || data.pageTitle || copy.defaultTitle;
  const description =
    data.ogDescription || data.metaDescription || copy.defaultDescription;
  const image =
    platform === "x" ? data.twitterImage || data.ogImage : data.ogImage;
  const cardTitle = platform === "x" ? data.twitterTitle || title : title;
  const cardDescription =
    platform === "x" ? data.twitterDescription || description : description;
  if (platform === "html") {
    return (
      <div className="morf-share-code max-h-[32rem] overflow-auto rounded-xl border p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
        {`<meta property="og:title" content="${data.ogTitle}" />\n<meta property="og:description" content="${data.ogDescription}" />\n<meta property="og:image" content="${data.ogImage}" />\n<meta property="og:url" content="${data.ogUrl}" />\n<meta property="og:site_name" content="${data.ogSiteName}" />\n<meta name="twitter:card" content="${data.twitterCard}" />\n<meta name="twitter:title" content="${data.twitterTitle}" />\n<meta name="twitter:description" content="${data.twitterDescription}" />\n<meta name="twitter:image" content="${data.twitterImage}" />`}
      </div>
    );
  }

  return (
    <PlatformPreviewCard
      platform={platform}
      title={cardTitle}
      description={cardDescription}
      image={image}
      imageAlt={data.ogImageAlt || copy.previewAltTemplate.replace("{platform}", platform)}
      siteName={data.ogSiteName}
      pageUrl={data.ogUrl || data.pageUrl}
    />
  );
}

export function SocialPreviews({ data }: { data: OpenGraphData }) {
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  const [platform, setPlatform] = useState<Platform>("facebook");

  return (
    <section
      aria-labelledby="platform-preview-title"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div
          className="flex overflow-x-auto px-2 sm:px-4"
          role="tablist"
          aria-label={messages.socialPreviewSection.platformTabsAriaLabel}
        >
          {platforms.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={platform === item.id}
              aria-controls="social-preview-panel"
              data-platform={item.id}
              className={cn(
                "morf-platform-tab relative flex min-h-14 shrink-0 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none sm:px-4",
                platform === item.id &&
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-current",
              )}
              onClick={() => setPlatform(item.id)}
            >
              <HugeiconsIcon
                icon={item.icon}
                className="size-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
        <div
          id="social-preview-panel"
          role="tabpanel"
          className="morf-share-preview-panel flex min-h-[28rem] flex-1 items-center justify-center p-6 sm:p-10 lg:p-12 xl:p-16"
        >
          <SocialCard platform={platform} data={data} />
        </div>
      </div>
    </section>
  );
}

const severityIcon = {
  error: CancelCircleIcon,
  warning: Alert02Icon,
  success: CheckmarkCircle02Icon,
};

function AuditCounts({
  counts,
}: {
  counts: Record<AuditItem["severity"], number>;
}) {
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  const section = messages.socialPreviewSection;
  const summary = [
    { severity: "error", count: counts.error, label: section.errorLabel },
    { severity: "warning", count: counts.warning, label: section.warningLabel },
    { severity: "success", count: counts.success, label: section.successLabel },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2" aria-label={section.auditSummaryAriaLabel}>
      {summary.map((item) => (
        <span
          key={item.severity}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold tabular-nums",
            item.severity === "error" &&
            "border-destructive/30 bg-destructive/5 text-destructive",
            item.severity === "warning" &&
            "border-warning/35 bg-warning/5 text-warning",
            item.severity === "success" &&
            "border-primary/30 bg-primary/5 text-primary",
          )}
          aria-label={`${item.count} ${item.label}`}
          title={`${item.count} ${item.label}`}
        >
          <HugeiconsIcon
            icon={severityIcon[item.severity]}
            className="size-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {item.count}
        </span>
      ))}
    </div>
  );
}

export function AuditResults({ items }: { items: AuditItem[] }) {
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  const counts = {
    error: items.filter((item) => item.severity === "error").length,
    warning: items.filter((item) => item.severity === "warning").length,
    success: items.filter((item) => item.severity === "success").length,
  };

  return (
    <section
      aria-labelledby="audit-results-title"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="mb-5 flex shrink-0 items-center justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2
          id="audit-results-title"
          className="font-heading text-lg font-semibold tracking-[-0.02em]"
        >
          {messages.socialPreviewSection.metadataHeading}
        </h2>
        <AuditCounts counts={counts} />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5 pr-1 sm:px-6 sm:pb-6">
        {items.map((item, index) => {
          const icon = severityIcon[item.severity];
          return (
            <article
              key={`${item.property}-${item.title}-${index}`}
              data-severity={item.severity}
              className="morf-audit-result-card grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border p-3 [&>p]:col-start-2"
            >
              <HugeiconsIcon
                icon={icon}
                className={cn(
                  "mt-0.5 size-4.5",
                  item.severity === "error" && "text-destructive",
                  item.severity === "warning" && "text-warning",
                  item.severity === "success" && "text-primary",
                )}
                strokeWidth={2}
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-medium">{item.title}</h3>
                <code className="text-muted-foreground mt-0.5 block text-[0.7rem]">
                  {item.property}
                </code>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {item.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AuditAndPreview({
  data,
  items,
}: {
  data: OpenGraphData;
  items: AuditItem[];
}) {
  const { messages } = useWorkspaceI18n<SharePreviewMessages>();
  const section = messages.socialPreviewSection;
  return (
    <section aria-labelledby="audit-preview-title">
      <header className="mb-8 max-w-3xl">
        <h2
          id="audit-preview-title"
          className="font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
        >
          {section.heading}
        </h2>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          {section.description}
        </p>
      </header>

      <div className="grid overflow-hidden rounded-3xl border bg-card lg:h-[46rem] lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.28fr)]">
        <div className="min-h-0 min-w-0 lg:border-r">
          <AuditResults items={items} />
        </div>
        <div className="min-w-0 border-t lg:border-t-0">
          <SocialPreviews data={data} />
        </div>
      </div>
    </section>
  );
}
