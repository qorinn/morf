# Morf – implementációs specifikáció

> Állapot: első, fejlesztésre használható termék- és technikai specifikáció  
> Célközönség: Codex és a projekt fejlesztői  
> Nyelv: magyar felület és magyar SEO-oldalak  
> Vizuális forrás: egy későbbi, külön brand/UI specifikáció

## 0. A dokumentum használata

Ez a fájl a Morf terméklogikájának, funkcióinak, technikai architektúrájának és megvalósítási sorrendjének elsődleges forrása. A fejlesztés során:

1. először ezt a dokumentumot és a repository aktuális állapotát kell elolvasni;
2. a vizuális megjelenést nem ebből kell kitalálni;
3. a későbbi brand/UI dokumentum felülírhat minden vizuális részletet, de nem írhatja felül hallgatólagosan a privacy-, teljesítmény- vagy terméklogikát;
4. a feladatokat fázisonként, működő és tesztelhető checkpointokban kell végrehajtani;
5. egy fázis kedvéért nem szabad előre behúzni az összes jövőbeli motort és függőséget.

Ez a specifikáció szándékosan nem határoz meg színeket, tipográfiát, kártyastílust, térközöket, árnyékokat, illusztrációs stílust vagy konkrét layoutot.

## 1. Termékösszefoglaló

### 1.1 Név és identitás

- Az alkalmazás neve: **Morf**.
- A logó és a favicon már meg van tervezve, ezeket a fejlesztés során meglévő brand assetként kell kezelni.
- A mascot neve szintén **Morf**; a figura nem puszta dekoráció, hanem a rendszer állapotait és kontextuális tanácsait is kommunikálhatja.
- A projekt készítője a **Paládi Webfejlesztés / Paládi Bálint**.
- A projekt célja szerint nyílt forráskódú lesz.

### 1.2 A termék lényege

Morf nem egy újabb, különálló „PNG → WebP”, „képtömörítés” és „képátméretezés” eszközökből álló gyűjtemény.

Morf egy:

> **egységes, célalapú fájl-előkészítő workspace, amely használatra kész fájlokat és fájlcsomagokat állít elő közvetlenül a felhasználó böngészőjében.**

A megkülönböztetés alapja:

- a felhasználó megmondhatja, mire kell a fájl, nem kell ismernie a pontos technikai lépéseket;
- több művelet egyetlen workflow-ban kombinálható;
- a végeredmény nem csupán más formátumú, hanem felhasználásra kész;
- a feldolgozás helyben történik;
- nincs regisztráció, napi limit vagy fájlszámláló;
- a korlátot a felhasználó eszközének teljesítménye és memóriája adja;
- a forráskód ellenőrizhető és a termék később közösségileg bővíthető.

### 1.3 Központi terméküzenetek

Használható irányok, nem kötelező végleges marketing copy:

- **Dobd be a fájlokat. Mondd meg, mire kellenek.**
- **Ne csak konvertáld. Tedd használatra késszé.**
- **A saját géped végzi a munkát. Cserébe nincs feltöltés, várakozási sor vagy használati korlát.**

A „korlátlan” jelentése mindig pontosan ez:

> A támogatott műveleteknél nincs napi limit, fájlszámláló vagy fizetős csomag. A maximális fájlméretet és a sebességet a felhasználó eszközének memóriája és teljesítménye határozza meg.

Nem szabad azt állítani, hogy Morf bármilyen fájlt, bármilyen méretben képes feldolgozni.

## 2. Kötelező termékelvek

### 2.1 Local-first fájlfeldolgozás

- A kiválasztott fájlokat nem szabad Morf szerverére feltölteni.
- A fájlok konvertálása, vágása, átméretezése, optimalizálása és csomagolása a böngészőben történjen.
- A fájlok tartalma, neve és metaadata ne kerüljön analitikába vagy kattintásmérésbe.
- A feltöltött fájlokat alapértelmezetten csak memóriában szabad tartani.
- A fájlokat nem szabad IndexedDB-be vagy más tartós böngészőtárba menteni.
- Preview-hoz `Blob URL` használható, base64 nem.
- Minden létrehozott `Object URL`-t fel kell szabadítani, amikor már nincs rá szükség.

Pontos privacy-állítás:

> A kiválasztott fájlok nem kerülnek feltöltésre. A feldolgozás teljes egészében a böngésződben történik.

Barátságos változat:

> A fájljaid nem hagyják el az eszközödet. Még mi sem férünk hozzájuk.

Nem használható abszolút állításként, hogy a fájl „semmilyen körülmények között nem kerülhet más kezébe”, mert Morf nem kontrollálhat rosszindulatú böngészőbővítményt vagy fertőzött eszközt.

### 2.2 Nincs fiók és nincs mesterséges korlátozás

Az alapverzióban:

- nincs regisztráció;
- nincs bejelentkezés;
- nincs felhasználói fiók;
- nincs backend adatbázis a fájlokhoz vagy receptekhez;
- nincs napi felhasználási limit;
- nincs fájlszámláló;
- nincs prémium feldolgozási sor.

A helyben mentett receptekhez sem kell fiók.

### 2.3 Őszinte korlátkommunikáció

- Feldolgozás közben jól láthatóan jelezni kell, hogy a felhasználó ne zárja be és ne frissítse az oldalt.
- Aktív feldolgozáskor használható `beforeunload` figyelmeztetés, de erre nem szabad egyedüli védelemként támaszkodni.
- A fájlméretkorlátot nem szabad kizárólag `navigator.deviceMemory` alapján meghatározni.
- Formátum- és workflow-specifikus alaplimitek szükségesek.
- Mobilon konzervatívabb, desktopon magasabb limit alkalmazható.
- Az eszközadat legfeljebb finomíthatja a limitet.
- A végleges küszöbértékeket valós böngészőtesztek és mérések alapján kell beállítani.
- A limit elérésekor Morf adjon alternatívát: kisebb fájl, kisebb felbontás, alacsonyabb minőség vagy releváns külső megoldás.

### 2.4 Lazy loading minden nehéz motornál

- Az első oldalbetöltéskor ne töltődjön le minden kodek és WASM-modul.
- A szükséges modul csak a fájl kiválasztása és a feladat azonosítása után töltődjön be.
- Amíg a motor nincs kész, a feldolgozás nem indítható el.
- A UI állapotként kezelje a motor betöltését és annak hibáját.
- A modulok tartalomhash-es vagy más verziózott fájlnevet kapjanak.
- A hosszú cache-idő célértéke változatlan assetnél: `Cache-Control: public, max-age=31536000, immutable`.
- A Service Worker gyorsítótár, nem garantált tárhely; a böngésző törölheti.

## 3. MVP és roadmap

### 3.1 Technikai spike – az MVP előtt

A teljes app építése előtt bizonyítani kell, hogy a kiválasztott motor production buildben is stabil.

Kötelező spike:

1. JPG dekódolás és WebP kódolás Web Workerben.
2. PNG dekódolás és WebP kódolás Web Workerben.
3. Átméretezés a worker pipeline részeként.
4. Progress, siker, megszakítás és hibajelzés a React workspace felé.
5. `npm run build` utáni működés ellenőrzése.
6. Chrome, Firefox és Safari desktop teszt.
7. Legalább egy iOS Safari és egy Android Chrome memória-/stabilitásteszt.

AVIF és OxiPNG csak a WebP pipeline stabilizálása után kerüljön be.

### 3.2 Első publikus MVP – képfeldolgozó workspace

Kötelező formátumok:

- bemenet: JPG/JPEG, PNG, WebP;
- kimenet: JPG/JPEG, PNG, WebP;
- AVIF: az MVP része lehet, de csak a technikai spike és a böngészőtesztek sikeres lezárása után;
- animált képeket az első MVP ne ígérjen, ha az animáció megőrzése nincs bizonyítottan implementálva.

Kötelező funkciók:

- több fájl behúzása és kiválasztása;
- MIME- és tényleges formátumellenőrzés;
- fájlonkénti állapot: várakozik, motor betöltése, feldolgozás, kész, hiba, megszakítva;
- kimeneti formátum választása;
- képarány megtartása;
- maximális szélesség és/vagy magasság;
- minőségállítás veszteséges formátumoknál;
- metaadatok eltávolítása újrakódoláskor;
- EXIF-orientáció helyes alkalmazása;
- batch feldolgozás korlátozott konkurenciával;
- eredeti és új felbontás;
- eredeti és új fájlméret;
- százalékos megtakarítás;
- egyedi fájlletöltés;
- teljes batch letöltése ZIP-ben;
- biztonságos és kiszámítható kimeneti fájlnevek;
- cancel és újrapróbálás;
- kulturált memória-, dekódolási és nem támogatott formátum hiba.

Kötelező kezdeti presetek:

- Weboldalhoz;
- Webshop termékképhez;
- Közösségi médiához;
- E-mail melléklethez;
- Egyedi beállítás.

A presetek csak kiindulópontok: a felhasználó módosíthassa a beállításokat. Minden preset egy verziózott, Zoddal validált adatobjektum legyen, ne komponensekbe szétszórt konstans.

### 3.3 MVP utáni közeli funkciók

1. **Célfájlméret**: például „legyen 200 KB alatt a lehető legjobb minőségben”.
2. **Előtte–utána összehasonlítás** nagyítható részlettel.
3. **Menthető receptek** a böngészőben.
4. **Megosztható presetlink**, amely csak a beállításokat tartalmazza, fájlt nem.
5. **Webfejlesztői képcsomag**: több felbontás, WebP/AVIF variánsok és generált `<picture>`/`srcset` kód.
6. **Batch átnevezés** és rendezett fájlnevek.
7. **Mappastruktúra megőrzése**, ha a böngészős fájl-/mappaválasztás és a ZIP-export ezt megbízhatóan támogatja.
8. **Offline/PWA használat** a már letöltött kodekekkel.

### 3.4 Célalapú workflow-roadmap

Az alábbi workflow-k ugyanarra a közös képfeldolgozó és crop motorra épüljenek, ne külön miniappok legyenek.

#### Képfelosztó

- Instagram profilgrid;
- seamless Instagram carousel;
- egyedi sor × oszlop felosztás;
- hosszú kép vagy infografika kézi vágásvonalakkal;
- megfelelő sorrendű, számozott fájlok;
- ZIP és opcionális `feltoltesi-sorrend.txt`/`manifest.json`.

SEO-belépési pontok:

- `/instagram-grid-keszito/`
- `/instagram-carousel-feloszto/`
- `/kep-felosztasa/`

A „3 részre”, „6 részre” és „9 részre” keresések kezdetben ugyanazon általános képfelosztó oldal tartalmában legyenek célozva, ne készüljenek közel azonos landing oldalak.

#### Carousel-képek egységesítése

- több eltérő álló, fekvő és négyzetes kép;
- azonos kimeneti képarány;
- kitöltés vágással;
- teljes kép elhelyezése egyszínű háttérrel;
- később elmosott háttér;
- középre vagy kézi fókuszpontra igazítás;
- sorrendezés és ZIP-export.

#### Többplatformos képcsomag

Egy forrásból választható célok, például:

- Instagram-poszt;
- Instagram Story;
- Facebook-poszt;
- LinkedIn-poszt;
- Google Cégprofil;
- YouTube thumbnail.

Minden célhoz külön kézi crop/fókuszpont engedélyezhető. A platformkövetelmények egy központi, verziózott preset registryből jöjjenek.

#### Webshop-termékkép előkészítő

Tervezett presetek:

- Shoprenter;
- Shopify;
- WooCommerce;
- Etsy;
- Amazon.

Műveletek:

- egységes képarány és vászon;
- batch vágás vagy padding;
- optimalizálás;
- fájlnévsablon;
- rendezett ZIP.

#### LinkedIn carousel PDF

- képek sorrendezése;
- egységesítés;
- egy PDF dokumentummá fűzés;
- lokális PDF-generálás;
- méret- és oldalszámellenőrzés a központi platform preset alapján.

#### További későbbi workflow-k

- Instagram Story sorozat hosszú képből;
- Instagram no-crop;
- Reels-borító és profilgrid-kivágás előnézete;
- borítókép safe-area ellenőrző;
- Google Ads képcsomag;
- favicon- és appikoncsomag;
- Google Play / app store képcsomag;
- WhatsApp matrica- vagy emote-csomag;
- hosszú infografika OCR-alapú intelligens felosztása.

## 4. Nem része az első verziónak

- videó- és hangkonvertálás;
- `ffmpeg.wasm` betöltése;
- Word/Excel/PowerPoint ↔ PDF pontos konvertálás;
- PSD, AI, INDD vagy CAD támogatás;
- DRM-védett fájlok;
- OCR;
- háttéreltávolítás;
- AI-modell;
- automatikus arc- vagy tárgyalapú crop;
- felhasználói fiók és cloud sync;
- szerveroldali fájlfeldolgozás;
- általános Photoshop-szerű képszerkesztő;
- fizetős képszerkesztő SDK;
- garantáltan korlátlan fájlméret.

A videó/hang később külön „kísérleti” vagy „nagy erőforrásigényű” kategória lehet, de nem szabad a kép-MVP architektúráját idő előtt FFmpeg köré építeni.

## 5. Technikai architektúra

### 5.1 Alap stack

Kötelező alap:

- Astro;
- React + TypeScript `strict`;
- Tailwind CSS;
- shadcn/ui Base UI alapokon;
- Hugeicons ikonok;
- Zustand;
- Zod;
- Web Workers;
- Comlink;
- jSquash formátumonkénti kodekek;
- Cropper.js v2;
- react-dropzone;
- exifr;
- fflate.

Később, csak az adott funkciónál:

- `react-compare-slider`;
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`;
- `@tanstack/react-virtual`;
- `dexie`, `dexie-react-hooks`;
- `@vite-pwa/astro`;
- `@jsquash/avif`;
- `@jsquash/oxipng`.

### 5.2 Astro és React felelőssége

Astro felelőssége:

- statikus, SEO-optimalizált landing oldalak;
- dokumentáció, útmutatók és blog;
- navigáció és általános app shell;
- szerveroldal nélkül renderelhető tartalom;
- metaadatok, canonical, sitemap és strukturált adatok.

React felelőssége:

- egyetlen összefüggő, kliensoldali workspace;
- fájllista;
- aktív preset és beállítások;
- crop koordináták;
- worker queue és progress;
- előnézet;
- export és receptek.

A workspace-t ne bontsd sok, egymással üzengető Astro-szigetre. Egy közös React island kezelje az összetartozó állapotot.

### 5.3 Egy motor, több belépési pont

Minden landing oldal ugyanazt a workspace-t indítsa, csak más validált kezdőkonfigurációval.

Példák:

```text
/kep/png-webp/
  -> inputHint: png
  -> outputFormat: webp

/felhasznalas/kep-optimalizalas-weboldalra/
  -> workflow: website-image

/instagram-grid-keszito/
  -> workflow: image-splitter
  -> gridColumns: 3
```

Ne készüljenek route-onként külön feldolgozómotorok vagy duplikált workspace-komponensek.

### 5.4 Javasolt modulhatárok

A pontos fájlszerkezet igazodhat a repositoryhoz, de a felelősségek maradjanak külön:

```text
src/
  components/
    workspace/
    mascot/
    ui/
  features/
    image-processing/
    crop/
    export/
    recipes/
    workflows/
  lib/
    presets/
    platform-requirements/
    validation/
    filenames/
    analytics/
  workers/
    image.worker.ts
    codecs/
  stores/
    workspace-store.ts
  pages/
    kep/
    felhasznalas/
  content/
    guides/
```

Elvárt rétegek:

- UI komponensek ne importáljanak közvetlenül jSquash kodeket;
- a worker publikus API-ja legyen típusos;
- a presetek ne tartalmazzanak UI-specifikus állapotot;
- az exportlogika ne függjön a konkrét crop UI-tól;
- a platformkövetelmények egy helyen legyenek karbantarthatók.

## 6. Képfeldolgozó pipeline

### 6.1 Kötelező sorrend

```text
fájl validálása
-> szükséges kodekek lazy betöltése
-> fájl beolvasása
-> dekódolás
-> EXIF-orientáció alkalmazása
-> crop
-> átméretezés
-> opcionális további pixelműveletek
-> kódolás
-> célméret-ellenőrzés
-> eredménystatisztika
-> Blob / letöltés / ZIP
```

### 6.2 Kodekek

- JPEG: `@jsquash/jpeg` / MozJPEG;
- PNG: `@jsquash/png`;
- WebP: `@jsquash/webp`;
- resize: `@jsquash/resize`;
- AVIF később: `@jsquash/avif`;
- PNG-optimalizálás később: `@jsquash/oxipng`.

Csak a tényleges input- és outputformátumhoz szükséges dekóder/kódoló töltődjön be.

### 6.3 Cropper.js szerepe

Cropper.js csak a szerkesztési interakcióért és a koordinátákért felel:

```ts
type NormalizedCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};
```

A végleges exportot a worker pipeline készítse, ne a Cropper.js preview canvas legyen automatikusan a végtermék.

A crop rétegnek később támogatnia kell:

- rögzített és szabad képarányt;
- zoomot;
- forgatást;
- visszaállítást;
- grid overlayt;
- safe-area overlayt;
- sor × oszlop felosztási overlayt.

### 6.4 Célfájlméret algoritmus

JPEG/WebP/AVIF esetén:

1. kódolás kezdő minőséggel;
2. kimeneti bájtméret mérése;
3. minőség bináris keresése konfigurált minimum és maximum között;
4. a célérték alatti legjobb minőségű eredmény megtartása;
5. maximális iterációszám és minimális minőség alkalmazása;
6. ha a cél csak elfogadhatatlan minőséggel érhető el, ne rontsd korlátlanul a képet;
7. ajánlj fel kisebb felbontást vagy jelezd, hogy a cél nem érhető el az adott korlátokkal.

PNG-nél egyértelműen jelezni kell, hogy a veszteségmentes tömörítés nem tud tetszőleges célméretet garantálni.

### 6.5 Batch és memória

- Desktopon alapértelmezetten legfeljebb 1–3 párhuzamos feldolgozás.
- Mobilon alapértelmezetten 1 worker/feldolgozás.
- A konkurencia konfigurálható legyen, ne több helyen hardcode-olt.
- Ne maradjon minden fájl teljes dekódolt pixeladata egyszerre memóriában.
- A kész eredmények és preview-k életciklusa legyen expliciten kezelve.
- `ArrayBuffer` átadáskor használj transferable objektumokat.
- Nagy listánál később virtualizálj.
- A queue tudjon megszakítást és újrapróbálást.

## 7. Állapotmodell és adatstruktúrák

### 7.1 Fájlállapot

Javasolt diszkriminált állapotok:

```ts
type FileJobStatus =
  | "queued"
  | "loading-engine"
  | "decoding"
  | "processing"
  | "encoding"
  | "completed"
  | "cancelled"
  | "error";
```

Minden job tartalmazzon stabil belső azonosítót, eredeti fájlleírást, validált beállításokat, progress állapotot, opcionális eredményt és típusos hibát.

### 7.2 Preset és recept

Minden preset/recept legyen:

- verziózott;
- Zoddal validált;
- migrálható;
- fájlfüggetlen;
- sorosítható;
- megosztható úgy, hogy ne tartalmazzon személyes vagy fájladatot.

Példa:

```ts
type ImageRecipe = {
  schemaVersion: 1;
  name: string;
  outputFormat: "jpeg" | "png" | "webp" | "avif";
  resize?: {
    maxWidth?: number;
    maxHeight?: number;
    keepAspectRatio: true;
  };
  quality?: number;
  targetBytes?: number;
  stripMetadata: boolean;
  filenameTemplate?: string;
};
```

### 7.3 Platformkövetelmény-registry

A közösségimédia-, hirdetési-, webshop- és app store limitek idővel változhatnak. Ezért:

- egy központi registryben legyen minden méret, képarány és fájlkorlát;
- minden bejegyzés tartalmazzon azonosítót, verziót és `lastVerifiedAt` dátumot;
- ahol lehetséges, forráslinket is;
- a workflow ne duplikálja ezeket az értékeket;
- lejárt vagy bizonytalan preset ne jelenjen meg tényként ellenőrzés nélkül.

## 8. Funkcionális viselkedés

### 8.1 Fájl kiválasztása

- drag and drop és natív fájlválasztó;
- több fájl;
- támogatott típusok jelzése;
- hibás kiterjesztés/MIME kezelése;
- duplikált fájlok kiszámítható kezelése;
- semmilyen fájl ne induljon el automatikusan bizonytalan vagy invalid beállítással.

### 8.2 Motor betöltése

Várt folyamat:

1. fájlok azonosítása;
2. szükséges input decoder és output encoder meghatározása;
3. „A feldolgozó előkészítése” állapot;
4. dinamikus import;
5. sikeres inicializálás;
6. feldolgozás engedélyezése.

Ha a motor nem tölthető le, különböztesd meg a hálózati, cache-, inicializálási és inkompatibilitási hibát.

### 8.3 Eredmény

Legalább ezeket kell megadni:

- fájlnév;
- kimeneti formátum;
- eredeti és új méret;
- eredeti és új felbontás;
- megtakarítás százalékban;
- sikeres és sikertelen fájlok száma;
- egyedi letöltés;
- összes letöltése ZIP-ben.

A ZIP-ben már tömörített képeknél `fflate` használható `level: 0` beállítással. A kimeneti nevek legyenek determinisztikusak és ütközésmentesek.

### 8.4 Hiba- és fallback-rendszer

Típusos hibakategóriák:

- `unsupported-format`;
- `file-too-large`;
- `decode-failed`;
- `encode-failed`;
- `out-of-memory`;
- `engine-load-failed`;
- `invalid-settings`;
- `cancelled`;
- `browser-unsupported`;
- `target-size-unreachable`.

Minden hiba tartalmazzon:

- rövid, emberi magyarázatot;
- visszaállítható következő lépést;
- technikai részletet csak fejlesztői/debug nézetben;
- opcionális, releváns külső alternatívát csak akkor, ha valódi problémát old meg.

## 9. SEO és tartalomarchitektúra

### 9.1 Kétféle belépési intent

Morf egyszerre célozza:

1. a technikai műveletet ismerő felhasználót;
2. a kívánt eredményt vagy felhasználási célt ismerő felhasználót.

Példák:

| Keresés | Belépési élmény |
|---|---|
| PNG → WebP | PNG/WebP előbeállítás, teljes workflow elérhető |
| Képoptimalizálás weboldalra | Weboldal-preset, magyarázat és kész outputcsomag |
| Webshop termékkép méret | Egységesítés, képarány, tömörítés, fájlnév |
| Kép 200 KB alá | Automatikus célméret-optimalizálás |

A termékelv:

> A formátumoldalak megszerzik a keresést. A célalapú workflow-k adják a valódi termékelőnyt.

### 9.2 Technikai formátumoldalak

Tervezett példák:

```text
/kep/png-webp/
/kep/jpg-webp/
/kep/png-jpg/
/kep/webp-jpg/
/kep/avif-webp/
/kep/kep-tomorites/
/kep/kep-atmeretezes/
```

Ezek a route-ok ne csak átirányítások legyenek. Tartalmazzanak egyedi, statikusan renderelt, hasznos magyarázatot, FAQ-t és a megfelelő presettel induló közös workspace-t.

### 9.3 Felhasználási cél szerinti oldalak

Tervezett példák:

```text
/felhasznalas/kep-optimalizalas-weboldalra/
/felhasznalas/webshop-termekkepek/
/felhasznalas/kep-meret-csokkentese-emailhez/
/felhasznalas/kozossegi-media-kepek/
/felhasznalas/reszponziv-webes-kepcsomag/
```

### 9.4 Konkrét eredményoldalak

Csak valóban eltérő workflow esetén:

```text
/kep-meret-csokkentese-200-kb-ala/
/kep-meret-csokkentese-1-mb-ala/
/kepek-egyseges-meretre-vagasa/
/kepek-kotegelt-atmeretezese/
/kep-negyzetesre-alakitasa/
/favicon-keszites-kepbol/
/srcset-generator/
```

Ne készüljenek százával olyan oldalak, amelyek csak egy számban vagy szóban térnek el, de ugyanazt a tartalmat és workflow-t adják.

### 9.5 SEO-technikai követelmények

- a landing tartalom Astro által statikusan renderelt legyen;
- route-onként egyedi title, description, H1 és canonical;
- automatikus sitemap;
- indexelhető tartalom a React betöltése előtt is;
- egyedi, hasznos leírás és FAQ;
- megfelelő strukturált adat csak akkor, ha a látható tartalom alátámasztja;
- belső linkelés formátum, cél és útmutató oldalak között;
- nincs doorway page vagy közel duplikált tartalom;
- a workspace kezdőbeállítása route-konfigurációból jöjjön, ne külön appból.

### 9.6 Kulcsszókutatás

A funkciók és route-ok végleges prioritása előtt Semrush/Google Trends kutatás szükséges. Kezdeti témacsoportok:

- kép optimalizálás;
- kép méret csökkentés;
- kép tömörítés;
- kép átméretezés;
- termékkép méret;
- webshop kép;
- kép weboldalra;
- kép e-mailhez;
- képek kötegelt átméretezése;
- kép 200 KB alá;
- favicon készítés;
- srcset generator;
- Instagram grid és carousel.

Alacsony vagy nullának jelzett magyar volumen miatt ne vess el automatikusan hasznos long-tail intentet. Külön route csak akkor indokolt, ha eltérő keresési szándékhoz eltérő eredmény vagy workflow tartozik.

## 10. Monetizáció, affiliate és reputáció

### 10.1 Elsődleges cél

A projekt nem paywallra vagy agresszív monetizációra épül. Elsődleges cél:

- saját használat;
- bárki számára elérhető ingyenes eszköz;
- open-source reputáció;
- Paládi Webfejlesztés szakmai bemutatása;
- később minimális fenntartási bevétel.

### 10.2 Reklámok helye

- Az aktív workspace legyen reklámmentes.
- Az aktív workspace-ben lehetőleg ne fusson külső reklám- vagy analitikai JavaScript.
- A kezdőoldalon, statikus formátumoldalakon és útmutatókban később megjelenhet minimális reklám.
- A reklám nem ronthatja érezhetően a betöltési időt, privacy-érzetet vagy WASM-kompatibilitást.

### 10.3 Affiliate ajánlatok

Affiliate csak releváns kontextusban jelenjen meg, például:

- túl nagy fájl;
- nem támogatott formátum;
- lokális memóriahiba;
- Morf képességein túlmutató professzionális feladat.

Jelölés:

> Külső, fizetős alternatíva  
> Partnerlink – használatával támogathatod az ingyenes projektet.

### 10.4 Saját kattintásmérés

A kliensoldali tracking script helyett saját redirect végpontot kell használni:

```text
/go/{partner}?source={source}
```

Működés:

1. partner és source validálása;
2. napi összesített számláló növelése;
3. azonnali `302` átirányítás az előre rögzített affiliate URL-re.

Tárolható:

- partner;
- source;
- dátum;
- összesített kattintásszám.

Nem tárolható:

- IP-cím saját üzleti adatként;
- cookie vagy user ID;
- fájlnév;
- fájltípus;
- feltöltött fájlhoz kapcsolható esemény;
- egyéni böngészési előzmény.

Biztonsági követelmény:

- a cél-URL-ek allowlistben legyenek;
- a kliens ne adhasson meg tetszőleges redirect URL-t;
- a végpont nem válhat open redirectté;
- ismeretlen partner vagy source kulturált hibát adjon;
- a fájlfeldolgozó alkalmazás működésétől legyen független.

A partner saját rendszere méri a vásárlásokat és a jutalékot; Morf saját számlálója csak azt méri, melyik ajánlásra kattintottak.

### 10.5 Paládi Webfejlesztés megjelenése

Természetes helyek:

- footer készítői link;
- „A projektről” oldal;
- sikeres feldolgozás után visszafogott saját CTA.

Ne használj minden oldalon mesterséges, kulcsszavas anchor textet. A kapcsolat branded és transzparens legyen.

## 11. Adatvédelem és analitika

- A workspace-ben nincs Google Analytics.
- Nincs külső reklámscript a workspace-ben.
- Az alap működéshez nincs cookie-követelmény.
- A fájlokról semmilyen telemetry nem gyűjthető.
- Hibajelentés csak anonim, technikai kategóriát tartalmazhat; fájlnév és tartalom nélkül.
- A privacy oldal pontosan különítse el a lokális fájlfeldolgozást, az opcionális tartalomoldali analitikát/reklámot és az affiliate redirect összesített számlálását.
- Az affiliate jelleg és a jutalék lehetősége legyen világosan közölve.

## 12. Mascot technikai szerepe

A vizuális megjelenést a későbbi brand dokumentum határozza meg. A kódban azonban már most külön rendszerként kell számolni vele.

Javasolt állapotok:

```text
idle
inspecting
loading-engine
tip
warning
processing
success
error
```

Példa események:

- 6000 px széles kép → `warning` → webhez valószínűleg túl nagy;
- átlátszóság nélküli PNG → `tip` → WebP-ben kisebb lehet;
- 84% megtakarítás → `success`;
- motor letöltése → `loading-engine`;
- nem támogatott fájl → `error`.

Implementációs szabályok:

- legyen külön `MascotAssistant` komponens és típusos eseményrendszer;
- a processing engine ne ismerje a mascot vizuális assetjeit;
- a mascot ne legyen az egyetlen progress- vagy hibaindikátor;
- a tanácsok kezdetben szabályalapúak és lokálisak;
- az asset elsőként SVG vagy animált WebP lehet;
- Rive csak akkor kerüljön be, ha az interaktivitás valóban indokolja;
- az assetek lazy loadolhatók és PWA cache-be tehetők.

## 13. Szabályalapú tanácsadó

Az első verzióhoz nem kell AI. A tanácsadó külön, tesztelhető szabályrendszer legyen.

Lehetséges inputok:

- szélesség és magasság;
- megapixel;
- fájlméret;
- formátum;
- átlátszóság;
- választott cél/preset;
- minőség és célméret;
- fájlnév;
- várható vagy mért megtakarítás.

Lehetséges tanácsok:

- feleslegesen nagy webes felbontás;
- PNG átlátszóság nélkül;
- túl alacsony kimeneti felbontás;
- további tömörítés várhatóan erős minőségromlást okoz;
- nem ideális fájlnév;
- veszteségmentes mód ajánlása grafikához;
- platformkövetelmény megsértése.

A szabály outputja strukturált legyen: `id`, `severity`, `messageKey`, `params`, `suggestedAction`. A szöveg ne a feldolgozómotorban legyen hardcode-olva.

## 14. PWA és offline működés

Nem az első spike része. Bevezetésekor:

- cache-eld az app shellt;
- cache-eld a már használt, verziózott kodekeket;
- cache-eld a szükséges mascot asseteket;
- ne töltsd le előre az összes nagy kodeket;
- jelezd, ha egy még nem használt motor offline nem érhető el;
- frissítéskor ne keverd az inkompatibilis app- és kodekverziókat;
- kezeld a cache migrációját és takarítását.

Offline ígéret csak azokra a funkciókra tehető, amelyekhez minden szükséges asset korábban már letöltődött.

## 15. Hosting és HTTP követelmények

A végleges hosting még nincs lezárva. Lehetséges irány a meglévő Noktürn/Plesk tárhely, opcionálisan Cloudflare-rel előtte. Telepítés előtt ellenőrizni kell:

- havi bandwidth/fair use;
- maximális statikus assetméret;
- `application/wasm` MIME;
- Brotli vagy gzip;
- egyedi `Cache-Control`;
- HTTP/2 vagy HTTP/3;
- egyedi biztonsági headerek;
- SPA/route fallback viselkedés;
- redirect endpoint futtatási lehetősége;
- CDN/cache integráció.

Az első képes jSquash MVP-t ne tedd indokolatlanul cross-origin isolated környezetfüggővé. Ha később `SharedArrayBuffer`, többszálas FFmpeg vagy wasm-vips kell, külön technikai döntésként kell megvizsgálni a COOP/COEP headereket és a külső assetek kompatibilitását.

## 16. Akadálymentesség és általános minőség

A vizuális specifikáció későbbi, de a funkcionális akadálymentesség már most kötelező:

- minden művelet billentyűzettel elérhető;
- drag and drop mellett natív fájlválasztó;
- progress és állapotváltozások megfelelő live regionnel jelezhetők;
- hibák nem csak színnel jelennek meg;
- slider mellett pontos numerikus érték és beviteli alternatíva;
- fókuszkezelés dialog/sheet esetén;
- crop alapfunkciókhoz billentyűzetes alternatíva;
- előtte–utána slider billentyűzettel is használható;
- `prefers-reduced-motion` tiszteletben tartása;
- mascot animáció nem lehet zavaró vagy információ kizárólagos hordozója.

## 17. Tesztelési stratégia

### 17.1 Unit tesztek

- preset és recipe Zod sémák;
- fájlnévgenerálás és ütközéskezelés;
- target-size bináris keresés;
- crop koordináta-normalizálás;
- grid tile koordináták és sorrend;
- platform preset validáció;
- tanácsadó szabályok;
- affiliate allowlist és source validáció;
- fájlméret- és eszközlimit logika.

### 17.2 Worker/integrációs tesztek

Fixture-ökkel:

- JPEG → WebP;
- PNG átlátszósággal → WebP;
- PNG átlátszóság nélkül → JPEG/WebP;
- EXIF-elforgatott JPEG;
- crop + resize + encode;
- többfájlos queue;
- cancel;
- hibás/csonka fájl;
- ZIP név és tartalom;
- memória felszabadítása ismételt futtatás után.

### 17.3 E2E tesztek

- landing presetből nyitja a közös workspace-t;
- egy és több fájl feldolgozása;
- kodek lazy load;
- hiba és retry;
- ZIP-letöltés;
- recipe mentés és visszatöltés;
- offline állapot a PWA fázisban;
- affiliate redirect csak allowlistelt célra.

### 17.4 Manuális browser mátrix

Minimum:

- Chrome desktop;
- Firefox desktop;
- Safari desktop;
- iOS Safari;
- Android Chrome.

Production buildet kell tesztelni, nem elég a Vite dev szerver.

## 18. Teljesítmény- és privacy-ellenőrzések

Minden nagyobb fázis végén ellenőrizendő:

- első betöltéskor mely kodekek töltődtek le;
- újrahasználatkor cache-ből jönnek-e;
- a fő thread mennyire marad reszponzív;
- vannak-e fel nem szabadított Object URL-ek;
- ismételt batch után nő-e tartósan a memória;
- került-e fájl vagy fájlnév hálózati kérésbe;
- fut-e külső script az aktív workspace-ben;
- a kimenet vizuálisan helyes-e EXIF, crop, resize és alpha esetén;
- a production bundle nem tartalmaz-e véletlenül minden kodeket eager módon.

## 19. Implementációs fázisok

### Fázis 0 – repository és brand asset audit

- aktuális projektstruktúra felmérése;
- Astro/React/Tailwind/shadcn állapot ellenőrzése;
- meglévő logó, favicon és mascot assetek azonosítása;
- későbbi brand dokumentum helyének előkészítése;
- szükségtelen függőséget ne telepíts.

Kész, ha a projekt buildel, típusellenőrzése lefut és ismert a kiinduló állapot.

### Fázis 1 – workeres kodek spike

- jSquash JPEG/PNG/WebP/resize;
- Comlink worker API;
- dinamikus import;
- minimális tesztharness;
- production browser teszt.

Kész, ha a támogatott fixture-ök helyesen konvertálódnak és a fő thread nem blokkol hosszú időre.

### Fázis 2 – workspace domainmodell

- Zod sémák;
- Zustand store;
- file job queue;
- progress, cancel, retry;
- Object URL életciklus;
- típusos hibák.

Kész, ha több fájl determinisztikusan feldolgozható és a hibás fájl nem állítja le a teljes batch-et.

### Fázis 3 – alap kép-előkészítő MVP

- dropzone;
- formátum, méret és quality beállítás;
- EXIF;
- resize;
- batch;
- eredménystatisztika;
- egyedi letöltés;
- fflate ZIP.

### Fázis 4 – crop és vizuális összehasonlítás

- Cropper.js adapter;
- worker export koordinátákból;
- képarány presetek;
- előtte–utána nézet;
- billentyűzetes működés.

### Fázis 5 – célfájlméret és receptek

- bináris kereséses célméret;
- elfogadható minőségi alsó határ;
- Dexie/localStorage tárolás;
- recipe verziózás és migráció;
- megosztható, fájlmentes konfiguráció.

### Fázis 6 – workflow-k

Első sorrend:

1. képoptimalizálás weboldalra;
2. képfelosztó / Instagram grid és carousel;
3. carousel-képek egységesítése;
4. többplatformos képcsomag;
5. webshop-termékkép előkészítő;
6. webfejlesztői responsive csomag;
7. LinkedIn carousel PDF.

### Fázis 7 – SEO landing rendszer

- route-konfiguráció;
- technikai és intent oldalak;
- canonical, sitemap, structured data;
- egyedi tartalmak;
- közös workspace eltérő presetekkel.

### Fázis 8 – mascot és szabályalapú tanácsadó

- eseményrendszer;
- placeholder assetadapter;
- brand assetek bekötése a későbbi UI specifikáció alapján;
- tanácsadó unit tesztek.

### Fázis 9 – PWA, affiliate és publikálás

- offline/cache stratégia;
- redirect endpoint és aggregált számláló;
- privacy és affiliate tájékoztatás;
- open-source dokumentáció;
- deployment és browser QA.

## 20. Codex munkaszabályok ehhez a projekthez

Minden implementációs feladatnál:

1. Olvasd el ezt a fájlt, a későbbi brand/UI fájlt és a repository instrukcióit.
2. Vizsgáld meg a meglévő kódot, mielőtt új architektúrát hozol létre.
3. Ne írj felül felhasználói változtatást vagy kész brand assetet.
4. Ne találd ki a vizuális rendszert a brand specifikáció előtt.
5. Egyetlen konkrét fázist valósíts meg, ne az egész roadmapet egyszerre.
6. Új nehéz dependency előtt indokold, milyen hiányt old meg.
7. A kodeket és nagy modult lazy importáld.
8. A fájl soha ne kerüljön szerverre vagy telemetrybe.
9. A feldolgozást workerben végezd.
10. Adj unit/integrációs tesztet a nem triviális logikához.
11. Futtasd a typechecket, teszteket és production buildet.
12. Jelentsd a browser- vagy WASM-korlátot, ne rejtsd el workaround mögött.
13. Új platform presetnél rögzítsd a forrást és az ellenőrzés dátumát.
14. Új route csak eltérő intent és hasznos egyedi tartalom esetén készülhet.
15. Ne építs szerveroldali fájlfeldolgozást külön jóváhagyás nélkül.

## 21. Definition of Done az első publikus MVP-hez

Az MVP akkor tekinthető késznek, ha:

- JPG, PNG és WebP input valós production buildben működik;
- a beígért outputformátumok működnek a támogatott böngészőkben;
- egy és több fájl feldolgozható;
- resize, minőség és metaadat-eltávolítás működik;
- EXIF-orientáció helyes;
- a fő thread használható marad;
- cancel/retry és típusos hibák működnek;
- az eredmények külön és ZIP-ben letölthetők;
- a fájlok és fájlnevek nem hagyják el az eszközt;
- nincs külső tracking vagy reklámscript a workspace-ben;
- a szükségtelen kodekek nem töltődnek le;
- Object URL-ek és nagy memóriablokkok felszabadulnak;
- a landing tartalom indexelhető JavaScript nélkül;
- legalább Chrome, Firefox, Safari, iOS Safari és Android Chrome alatt dokumentált a támogatás vagy a korlát;
- typecheck, tesztek és production build sikeres;
- az adatvédelmi és affiliate állítások megfelelnek a tényleges működésnek;
- Morf neve, logója és faviconja megfelelően be van kötve;
- a mascot komponens helye és állapot-API-ja elő van készítve, még akkor is, ha a végleges animáció később érkezik.

## 22. Nyitott, külön döntést igénylő kérdések

Ezeket nem szabad találomra véglegesíteni:

- végleges domain;
- végleges hosting: Noktürn/Plesk, Cloudflare vagy más;
- open-source licenc;
- repository nyilvánossá tételének időpontja;
- első publikus release pontos AVIF-támogatása;
- valós, böngészőnkénti fájlméretküszöbök;
- az elsőként publikálandó intent landing oldalak Semrush-kutatás után;
- első affiliate partnerek;
- redirect számláló konkrét backendje;
- tartalomoldali reklámplatform és annak privacy/teljesítmény hatása;
- a végleges brand/UI rendszer;
- a végleges mascot assetformátum és animációs technológia;
- PWA megjelenésének időpontja;
- mikor kerüljenek be dokumentum-, hang- vagy videóműveletek.

Amíg ezek nincsenek lezárva, az architektúra maradjon cserélhető és ne kódolja be egyetlen szolgáltató feltételezéseit.
