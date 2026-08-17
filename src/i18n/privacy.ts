import { defineMessages } from "./types.ts";

interface PrivacySectionCopy {
  title: string;
  paragraphs: string[];
}

interface PrivacyCopy {
  eyebrow: string;
  title: string;
  lead: string;
  updatedAtLabel: string;
  updatedAt: string;
  summaryStrong: string;
  summaryText: string;
  operatorName: string;
  emailLinkText: string;
  naihLinkText: string;
  sections: PrivacySectionCopy[];
}

export const privacyMessages = defineMessages({
  hu: {
    eyebrow: "Adatvédelem",
    title: "Adatvédelmi tájékoztató",
    lead: "A Morf úgy készült, hogy a fájljaid feldolgozásához ne kelljen feltöltened őket egy szerverre. Ezen az oldalon egyszerűen összefoglaljuk, mi történik az adataiddal a használat során.",
    updatedAtLabel: "Utolsó frissítés:",
    updatedAt: "2026. július 28.",
    summaryStrong: "Röviden:",
    summaryText: "a kiválasztott képek a saját eszközödön maradnak. A Morf jelenleg nem használ látogatottságmérést, marketing sütiket, felhasználói fiókot vagy hirdetési profilalkotást.",
    operatorName: "Paládi Webfejlesztés",
    emailLinkText: "hello@paladi-web.hu",
    naihLinkText: "Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH)",
    sections: [
      {
        title: "Ki kezeli az adatokat?",
        paragraphs: [
          "A Morf üzemeltetője a {operator}.",
          "Adatvédelmi kérdéssel vagy kéréssel a {emailLink} címen léphetsz kapcsolatba velünk.",
        ],
      },
      {
        title: "A fájljaid feldolgozása",
        paragraphs: [
          "Amikor képet választasz ki, a konvertálás, átméretezés, optimalizálás, előnézet és fájlkészítés a böngésződben történik. A Morf nem tölti fel a kiválasztott fájlokat a szerverére.",
          "Az ideiglenes előnézetek csak a böngésző aktuális munkamenetében léteznek. Az oldal bezárásakor vagy újratöltésekor eltűnnek, hacsak a kész fájlokat te magad nem mented el.",
        ],
      },
      {
        title: "Technikai adatok",
        paragraphs: [
          "Mint minden weboldalnál, a tárhelyszolgáltató a kiszolgálás és a biztonság érdekében technikai naplóadatokat kezelhet. Ilyen lehet például az IP-cím, a megnyitott oldal címe, a látogatás időpontja, a böngésző típusa és az esetleges hibák adata.",
          "Ezek kezelésének célja az oldal megbízható és biztonságos működtetése. Ennek jogalapja az üzemeltető jogos érdeke. A naplóadatokat nem használjuk hirdetésre vagy látogatói profil készítésére.",
        ],
      },
      {
        title: "Sütik és mérőkódok",
        paragraphs: [
          "A Morf jelenlegi verziója nem használ analitikai vagy marketing sütiket, és nem futtat látogatottságmérő vagy hirdetési kódot.",
          "Ha ez később megváltozik, előbb frissítjük ezt a tájékoztatót, és ahol szükséges, a hozzájárulásodat is kérjük.",
        ],
      },
      {
        title: "Külső oldalak",
        paragraphs: [
          "Az oldalon külső webhelyekre mutató linkek is lehetnek. Ezek megnyitása után már az adott webhely saját adatvédelmi szabályai érvényesek.",
        ],
      },
      {
        title: "A jogaid",
        paragraphs: [
          "Kérhetsz tájékoztatást a rólad kezelt személyes adatokról, valamint kérheted azok helyesbítését, törlését vagy kezelésük korlátozását. Tiltakozhatsz a jogos érdeken alapuló adatkezelés ellen, és az adott helyzettől függően az adathordozhatóság joga is megillethet.",
          "Ha úgy gondolod, hogy az adatkezelés nem megfelelő, panaszt tehetsz a {naihLink}, vagy bírósághoz fordulhatsz.",
        ],
      },
      {
        title: "A tájékoztató változásai",
        paragraphs: [
          "Ha a Morf működése vagy az adatkezelés módja változik, ezt az oldalt is frissítjük. A legújabb változat dátumát mindig az oldal tetején találod.",
        ],
      },
    ],
  } satisfies PrivacyCopy,
  en: {
    eyebrow: "Privacy",
    title: "Privacy notice",
    lead: "Morf is built so that processing your files does not require uploading them to a server. This page summarizes what happens with your data while you use it.",
    updatedAtLabel: "Last updated:",
    updatedAt: "July 28, 2026",
    summaryStrong: "In short:",
    summaryText: "the images you select stay on your own device. Morf currently does not use visitor analytics, marketing cookies, user accounts, or advertising profiling.",
    operatorName: "Paládi Webfejlesztés",
    emailLinkText: "hello@paladi-web.hu",
    naihLinkText: "the Hungarian National Authority for Data Protection and Freedom of Information (NAIH)",
    sections: [
      {
        title: "Who processes the data?",
        paragraphs: [
          "Morf is operated by {operator}.",
          "For privacy questions or requests, you can reach us at {emailLink}.",
        ],
      },
      {
        title: "Processing your files",
        paragraphs: [
          "When you select an image, conversion, resizing, optimization, preview, and file creation all happen in your browser. Morf does not upload your selected files to its server.",
          "Temporary previews exist only for the current browser session. They disappear when you close or reload the page, unless you save the finished files yourself.",
        ],
      },
      {
        title: "Technical data",
        paragraphs: [
          "As with any website, the hosting provider may process technical log data for delivery and security purposes. This can include the IP address, the requested page address, the time of the visit, the browser type, and any error data.",
          "The purpose of this processing is to run the site reliably and securely. Its legal basis is the operator's legitimate interest. Log data is not used for advertising or building visitor profiles.",
        ],
      },
      {
        title: "Cookies and tracking scripts",
        paragraphs: [
          "The current version of Morf does not use analytics or marketing cookies, and does not run visitor-tracking or advertising scripts.",
          "If this changes in the future, we will update this notice first and request your consent where required.",
        ],
      },
      {
        title: "External sites",
        paragraphs: [
          "The site may contain links to external websites. Once you open one, that website's own privacy rules apply.",
        ],
      },
      {
        title: "Your rights",
        paragraphs: [
          "You can request information about the personal data processed about you, as well as its correction, deletion, or restriction of processing. You can object to processing based on legitimate interest, and depending on the situation you may also have the right to data portability.",
          "If you believe the data processing is not appropriate, you can file a complaint with {naihLink}, or turn to a court.",
        ],
      },
      {
        title: "Changes to this notice",
        paragraphs: [
          "If Morf's operation or its data processing changes, this page will be updated too. You will always find the date of the latest version at the top of the page.",
        ],
      },
    ],
  } satisfies PrivacyCopy,
});

export type PrivacyMessages = (typeof privacyMessages)["hu"];
