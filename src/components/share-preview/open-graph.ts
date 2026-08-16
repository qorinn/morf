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
) {
  const items: AuditItem[] = [];
  const displayTitle = data.ogTitle || data.pageTitle;
  const displayDescription = data.ogDescription || data.metaDescription;

  if (!data.ogImage) {
    items.push({
      severity: "error",
      title: "Hiányzik a megosztási kép",
      property: "og:image",
      detail:
        "Adj meg egy 1200 × 630 px-es képet, különben a link több platformon kép nélkül jelenik meg.",
    });
  } else if (image.status === "error") {
    items.push({
      severity: "error",
      title: "A kép nem tölthető be",
      property: "og:image",
      detail:
        "A megadott URL nem adott használható képet. Ellenőrizd a publikus elérhetőséget és a válasz MIME-típusát.",
    });
  } else if (image.status === "loaded") {
    const dimensions = `${image.width}×${image.height}`;
    if (image.width !== 1200 || image.height !== 630) {
      items.push({
        severity: "warning",
        title: "A kép mérete eltér az ajánlottól",
        property: "og:image",
        detail: `${dimensions} px-et találtunk — a legtöbb platformon a pontos 1200×630 px ad kiszámítható, éles eredményt.`,
      });
    } else {
      items.push({
        severity: "success",
        title: "A kép mérete megfelelő",
        property: "og:image",
        detail: "1200×630 px — a leggyakoribb közösségi előnézetekhez optimalizálva.",
      });
    }

    const fileDetail = [formatBytes(image.bytes), image.mime]
      .filter(Boolean)
      .join(" · ");
    items.push({
      severity: "success",
      title: "A kép hibamentesen betöltődik",
      property: "og:image",
      detail: fileDetail || "A kép elérhető és a böngésző be tudta tölteni.",
    });

    const callToActionPattern =
      /tudd meg|nézd meg|próbáld ki|kezdd el|foglalj|kérj|vásárolj|letölt|read|learn|start|try|book|shop/i;
    if (!callToActionPattern.test(data.ogImageAlt)) {
      items.push({
        severity: "warning",
        title: "Nem észlelhető cselekvésre ösztönző szöveg",
        property: "og:image",
        detail:
          "Az image alt szövegben nincs egyértelmű CTA. Egy rövid felszólítás segíthet kattinthatóbbá tenni a megosztási képet.",
      });
    }
  }

  if (!data.ogTitle) {
    items.push({
      severity: "error",
      title: "Hiányzik az Open Graph cím",
      property: "og:title",
      detail: "A platformok tartalék címre válthatnak, ami nem mindig ideális megosztáshoz.",
    });
  } else {
    items.push({
      severity: "success",
      title: "Az Open Graph cím jelen van",
      property: "og:title",
      detail: `„${data.ogTitle}” — ${data.ogTitle.length} karakter.`,
    });
    items.push({
      severity: data.ogTitle.length <= 60 ? "success" : "warning",
      title:
        data.ogTitle.length <= 60
          ? "A cím hossza megfelelő"
          : "A cím túl hosszú",
      property: "og:title",
      detail: `${data.ogTitle.length} karakter — a cél legfeljebb 60 karakter, hogy mobilon se vágják le.`,
    });
  }

  if (!data.pageTitle) {
    items.push({
      severity: "error",
      title: "Hiányzik az oldal címe",
      property: "title",
      detail: "A HTML <title> elem a böngészőben és a keresési találatokban is alapvető.",
    });
  } else {
    items.push({
      severity: "success",
      title: "Az oldal címe jelen van",
      property: "title",
      detail: `„${data.pageTitle}” — ${data.pageTitle.length} karakter.`,
    });
  }

  if (!data.ogDescription) {
    items.push({
      severity: "error",
      title: "Hiányzik az Open Graph leírás",
      property: "og:description",
      detail: "Adj meg külön, az oldal tartalmát pontosan összefoglaló megosztási leírást.",
    });
  } else if (data.ogDescription.length > 125) {
    items.push({
      severity: "warning",
      title: "A megosztási leírás túl hosszú",
      property: "og:description",
      detail: `${data.ogDescription.length} karakter — a közösségi előnézetek gyakran körülbelül 125 karakternél vágnak, mobilon akár korábban is.`,
    });
  } else {
    items.push({
      severity: "success",
      title: "A megosztási leírás hossza megfelelő",
      property: "og:description",
      detail: `${data.ogDescription.length} karakter — várhatóan teljesen látható marad a legtöbb kártyán.`,
    });
  }

  if (!data.metaDescription) {
    items.push({
      severity: "warning",
      title: "Hiányzik a meta description",
      property: "description",
      detail: "A keresők saját szöveget választhatnak az oldalhoz.",
    });
  } else {
    items.push({
      severity:
        data.metaDescription.length >= 70 && data.metaDescription.length <= 160
          ? "success"
          : "warning",
      title: "A meta description jelen van",
      property: "description",
      detail: `${data.metaDescription.length} karakter — a keresési találatokhoz általában 70–160 karakter az ajánlott tartomány.`,
    });
  }

  items.push({
    severity: data.twitterCard === "summary_large_image" ? "success" : "warning",
    title:
      data.twitterCard === "summary_large_image"
        ? "Az X-kártya nagy képet használ"
        : "Az X-kártya nincs nagy képre állítva",
    property: "twitter:card",
    detail:
      data.twitterCard === "summary_large_image"
        ? "A summary_large_image érték teljes szélességű képet enged az X előnézetében."
        : "Állítsd summary_large_image értékre a teljes szélességű megosztási képhez.",
  });

  for (const [value, property, title] of [
    [data.twitterTitle, "twitter:title", "Az X-cím jelen van"],
    [data.twitterDescription, "twitter:description", "Az X-leírás jelen van"],
    [data.twitterImage, "twitter:image", "Az X-kép jelen van"],
  ] as const) {
    items.push({
      severity: value ? "success" : "warning",
      title: value ? title : `Hiányzik: ${property}`,
      property,
      detail: value
        ? property === "twitter:image"
          ? "Az X külön képet kap a kártyához."
          : `${value.length} karakter — az X előnézetéhez használható.`
        : "Az X az Open Graph tartalék értékére válthat, de jobb külön megadni.",
    });
  }

  items.push({
    severity: data.ogSiteName ? "success" : "warning",
    title: data.ogSiteName ? "A webhely neve be van állítva" : "Hiányzik a webhely neve",
    property: "og:site_name",
    detail: data.ogSiteName
      ? `„${data.ogSiteName}” — a Discord és más platformok ezt használhatják kiegészítő címkeként.`
      : "Add meg a márka vagy webhely nevét a következetes azonosításhoz.",
  });

  if (!displayTitle || !displayDescription) {
    items.unshift({
      severity: "error",
      title: "A linkkártya nem állítható össze teljesen",
      property: "Open Graph",
      detail: "Legalább cím és leírás szükséges az értelmezhető megosztási előnézethez.",
    });
  }

  return items;
}
