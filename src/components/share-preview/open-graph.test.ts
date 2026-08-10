import assert from "node:assert/strict";
import test from "node:test";

import {
  createOpenGraphAudit,
  type ImageInspection,
  type OpenGraphData,
} from "./open-graph.ts";

const completeData: OpenGraphData = {
  pageUrl: "https://example.com/oldal",
  pageTitle: "Egyedi webfejlesztés és weboldal készítés | Paládi",
  metaDescription:
    "Egyedi, gyors és üzletileg átgondolt weboldalak tervezése és fejlesztése vállalkozásoknak.",
  ogTitle: "Egyedi webfejlesztés és weboldal készítés | Paládi",
  ogDescription:
    "Egyedi, gyors és üzletileg átgondolt weboldalak tervezése és fejlesztése vállalkozásoknak.",
  ogImage: "https://example.com/og.webp",
  ogImageAlt: "Nézd meg az egyedi webfejlesztési megoldásokat",
  ogUrl: "https://example.com/oldal",
  ogSiteName: "Paládi Webfejlesztés",
  ogType: "website",
  ogLocale: "hu_HU",
  twitterCard: "summary_large_image",
  twitterTitle: "Egyedi webfejlesztés és weboldal készítés | Paládi",
  twitterDescription: "Egyedi weboldalak vállalkozásoknak.",
  twitterImage: "https://example.com/og.webp",
};

const goodImage: ImageInspection = {
  status: "loaded",
  width: 1200,
  height: 630,
  bytes: 72704,
  mime: "image/webp",
};

test("a teljes Open Graph készlet sikeres auditpontokat ad", () => {
  const audit = createOpenGraphAudit(completeData, goodImage);

  assert.ok(
    audit.some(
      (item) =>
        item.property === "og:image" &&
        item.title === "A kép mérete megfelelő" &&
        item.severity === "success",
    ),
  );
  assert.ok(
    audit.some(
      (item) =>
        item.property === "twitter:card" && item.severity === "success",
    ),
  );
});

test("a hiányzó kép és a túl hosszú leírás hibát illetve figyelmeztetést ad", () => {
  const audit = createOpenGraphAudit(
    {
      ...completeData,
      ogImage: "",
      ogDescription: "x".repeat(138),
    },
    { ...goodImage, status: "idle", width: null, height: null },
  );

  assert.ok(
    audit.some(
      (item) => item.property === "og:image" && item.severity === "error",
    ),
  );
  assert.ok(
    audit.some(
      (item) =>
        item.property === "og:description" && item.severity === "warning",
    ),
  );
});

test("az eltérő képméret külön figyelmeztetést kap", () => {
  const audit = createOpenGraphAudit(completeData, {
    ...goodImage,
    width: 1200,
    height: 628,
  });

  assert.ok(
    audit.some(
      (item) =>
        item.title === "A kép mérete eltér az ajánlottól" &&
        item.detail.includes("1200×628"),
    ),
  );
});
