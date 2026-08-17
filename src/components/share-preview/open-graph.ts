export interface AuditCopy {
  missingImageTitle: string;
  missingImageDetail: string;
  imageLoadFailedTitle: string;
  imageLoadFailedDetail: string;
  imageSizeOffTitle: string;
  imageSizeOffDetailTemplate: string;
  imageSizeOkTitle: string;
  imageSizeOkDetail: string;
  imageLoadsOkTitle: string;
  imageLoadsOkFallbackDetail: string;
  noCtaTitle: string;
  noCtaDetail: string;
  missingOgTitleTitle: string;
  missingOgTitleDetail: string;
  ogTitlePresentTitle: string;
  ogTitlePresentDetailTemplate: string;
  titleLengthOkTitle: string;
  titleLengthLongTitle: string;
  titleLengthDetailTemplate: string;
  missingPageTitleTitle: string;
  missingPageTitleDetail: string;
  pageTitlePresentTitle: string;
  missingOgDescriptionTitle: string;
  missingOgDescriptionDetail: string;
  ogDescriptionLongTitle: string;
  ogDescriptionLongDetailTemplate: string;
  ogDescriptionOkTitle: string;
  ogDescriptionOkDetailTemplate: string;
  missingMetaDescriptionTitle: string;
  missingMetaDescriptionDetail: string;
  metaDescriptionPresentTitle: string;
  metaDescriptionPresentDetailTemplate: string;
  twitterLargeCardTitle: string;
  twitterNoLargeCardTitle: string;
  twitterLargeCardDetail: string;
  twitterNoLargeCardDetail: string;
  twitterTitlePresentTitle: string;
  twitterDescriptionPresentTitle: string;
  twitterImagePresentTitle: string;
  twitterMissingTitleTemplate: string;
  twitterImagePresentDetail: string;
  twitterFieldPresentDetailTemplate: string;
  twitterFieldMissingDetail: string;
  siteNamePresentTitle: string;
  siteNameMissingTitle: string;
  siteNamePresentDetailTemplate: string;
  siteNameMissingDetail: string;
  incompleteCardTitle: string;
  incompleteCardDetail: string;
}

export type OpenGraphData = {
  pageUrl: string;
  pageTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogUrl: string;
  ogSiteName: string;
  ogType: string;
  ogLocale: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
};

export type ImageInspection = {
  status: "idle" | "loading" | "loaded" | "error";
  width: number | null;
  height: number | null;
  bytes: number | null;
  mime: string;
};

export type AuditItem = {
  severity: "error" | "warning" | "success";
  title: string;
  property: string;
  detail: string;
};

function format(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in tokens ? tokens[key] : match,
  );
}

export function readOpenGraphData(document: Document, requestedUrl: URL) {
  const readMeta = (name: string) =>
    document
      .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      ?.getAttribute("content")
      ?.trim() ?? "";

  const resolveUrl = (value: string) => {
    if (!value) return "";
    try {
      return new URL(value, requestedUrl).href;
    } catch {
      return value;
    }
  };

  return {
    pageUrl: requestedUrl.href,
    pageTitle: document.title.trim(),
    metaDescription: readMeta("description"),
    ogTitle: readMeta("og:title"),
    ogDescription: readMeta("og:description"),
    ogImage: resolveUrl(readMeta("og:image")),
    ogImageAlt: readMeta("og:image:alt"),
    ogUrl: resolveUrl(readMeta("og:url")),
    ogSiteName: readMeta("og:site_name"),
    ogType: readMeta("og:type"),
    ogLocale: readMeta("og:locale"),
    twitterCard: readMeta("twitter:card"),
    twitterTitle: readMeta("twitter:title"),
    twitterDescription: readMeta("twitter:description"),
    twitterImage: resolveUrl(readMeta("twitter:image")),
  } satisfies OpenGraphData;
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function createOpenGraphAudit(
  data: OpenGraphData,
  image: ImageInspection,
  copy: AuditCopy,
) {
  const items: AuditItem[] = [];
  const displayTitle = data.ogTitle || data.pageTitle;
  const displayDescription = data.ogDescription || data.metaDescription;

  if (!data.ogImage) {
    items.push({
      severity: "error",
      title: copy.missingImageTitle,
      property: "og:image",
      detail: copy.missingImageDetail,
    });
  } else if (image.status === "error") {
    items.push({
      severity: "error",
      title: copy.imageLoadFailedTitle,
      property: "og:image",
      detail: copy.imageLoadFailedDetail,
    });
  } else if (image.status === "loaded") {
    const dimensions = `${image.width}×${image.height}`;
    if (image.width !== 1200 || image.height !== 630) {
      items.push({
        severity: "warning",
        title: copy.imageSizeOffTitle,
        property: "og:image",
        detail: format(copy.imageSizeOffDetailTemplate, { dimensions }),
      });
    } else {
      items.push({
        severity: "success",
        title: copy.imageSizeOkTitle,
        property: "og:image",
        detail: copy.imageSizeOkDetail,
      });
    }

    const fileDetail = [formatBytes(image.bytes), image.mime]
      .filter(Boolean)
      .join(" · ");
    items.push({
      severity: "success",
      title: copy.imageLoadsOkTitle,
      property: "og:image",
      detail: fileDetail || copy.imageLoadsOkFallbackDetail,
    });

    const callToActionPattern =
      /tudd meg|nézd meg|próbáld ki|kezdd el|foglalj|kérj|vásárolj|letölt|read|learn|start|try|book|shop/i;
    if (!callToActionPattern.test(data.ogImageAlt)) {
      items.push({
        severity: "warning",
        title: copy.noCtaTitle,
        property: "og:image",
        detail: copy.noCtaDetail,
      });
    }
  }

  if (!data.ogTitle) {
    items.push({
      severity: "error",
      title: copy.missingOgTitleTitle,
      property: "og:title",
      detail: copy.missingOgTitleDetail,
    });
  } else {
    items.push({
      severity: "success",
      title: copy.ogTitlePresentTitle,
      property: "og:title",
      detail: format(copy.ogTitlePresentDetailTemplate, {
        value: data.ogTitle,
        count: String(data.ogTitle.length),
      }),
    });
    items.push({
      severity: data.ogTitle.length <= 60 ? "success" : "warning",
      title:
        data.ogTitle.length <= 60
          ? copy.titleLengthOkTitle
          : copy.titleLengthLongTitle,
      property: "og:title",
      detail: format(copy.titleLengthDetailTemplate, {
        count: String(data.ogTitle.length),
      }),
    });
  }

  if (!data.pageTitle) {
    items.push({
      severity: "error",
      title: copy.missingPageTitleTitle,
      property: "title",
      detail: copy.missingPageTitleDetail,
    });
  } else {
    items.push({
      severity: "success",
      title: copy.pageTitlePresentTitle,
      property: "title",
      detail: format(copy.ogTitlePresentDetailTemplate, {
        value: data.pageTitle,
        count: String(data.pageTitle.length),
      }),
    });
  }

  if (!data.ogDescription) {
    items.push({
      severity: "error",
      title: copy.missingOgDescriptionTitle,
      property: "og:description",
      detail: copy.missingOgDescriptionDetail,
    });
  } else if (data.ogDescription.length > 125) {
    items.push({
      severity: "warning",
      title: copy.ogDescriptionLongTitle,
      property: "og:description",
      detail: format(copy.ogDescriptionLongDetailTemplate, {
        count: String(data.ogDescription.length),
      }),
    });
  } else {
    items.push({
      severity: "success",
      title: copy.ogDescriptionOkTitle,
      property: "og:description",
      detail: format(copy.ogDescriptionOkDetailTemplate, {
        count: String(data.ogDescription.length),
      }),
    });
  }

  if (!data.metaDescription) {
    items.push({
      severity: "warning",
      title: copy.missingMetaDescriptionTitle,
      property: "description",
      detail: copy.missingMetaDescriptionDetail,
    });
  } else {
    items.push({
      severity:
        data.metaDescription.length >= 70 && data.metaDescription.length <= 160
          ? "success"
          : "warning",
      title: copy.metaDescriptionPresentTitle,
      property: "description",
      detail: format(copy.metaDescriptionPresentDetailTemplate, {
        count: String(data.metaDescription.length),
      }),
    });
  }

  items.push({
    severity: data.twitterCard === "summary_large_image" ? "success" : "warning",
    title:
      data.twitterCard === "summary_large_image"
        ? copy.twitterLargeCardTitle
        : copy.twitterNoLargeCardTitle,
    property: "twitter:card",
    detail:
      data.twitterCard === "summary_large_image"
        ? copy.twitterLargeCardDetail
        : copy.twitterNoLargeCardDetail,
  });

  for (const [value, property, title] of [
    [data.twitterTitle, "twitter:title", copy.twitterTitlePresentTitle],
    [data.twitterDescription, "twitter:description", copy.twitterDescriptionPresentTitle],
    [data.twitterImage, "twitter:image", copy.twitterImagePresentTitle],
  ] as const) {
    items.push({
      severity: value ? "success" : "warning",
      title: value ? title : format(copy.twitterMissingTitleTemplate, { property }),
      property,
      detail: value
        ? property === "twitter:image"
          ? copy.twitterImagePresentDetail
          : format(copy.twitterFieldPresentDetailTemplate, { count: String(value.length) })
        : copy.twitterFieldMissingDetail,
    });
  }

  items.push({
    severity: data.ogSiteName ? "success" : "warning",
    title: data.ogSiteName ? copy.siteNamePresentTitle : copy.siteNameMissingTitle,
    property: "og:site_name",
    detail: data.ogSiteName
      ? format(copy.siteNamePresentDetailTemplate, { value: data.ogSiteName })
      : copy.siteNameMissingDetail,
  });

  if (!displayTitle || !displayDescription) {
    items.unshift({
      severity: "error",
      title: copy.incompleteCardTitle,
      property: "Open Graph",
      detail: copy.incompleteCardDetail,
    });
  }

  return items;
}
