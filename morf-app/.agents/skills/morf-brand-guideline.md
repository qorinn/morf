# Morf Brand Guideline

## 1. Brand alap

**Márkanév:** Morf  
**Termék:** local-first fájlkonvertáló és optimalizáló webalkalmazás  
**Alapígéret:** fájlok gyors átalakítása és optimalizálása úgy, hogy a fájlok a felhasználó eszközén maradnak.

Morf vizuális világa a modularitásra, átalakulásra és biztonságos helyi feldolgozásra épül. A brand legyen játékos és könnyen szerethető, de ne legyen gyerekes. Inkább modern, puha, európai SaaS hangulat: gyors, barátságos, tiszta, megbízható.

## 2. Vizuális személyiség

Morf három fő vizuális tulajdonsága:

1. **Átalakuló:** a formák egymásba rendeződnek, modulok válnak szét és állnak össze.
2. **Puha tech:** 3D-s, sima, matte felületek; nem hideg, nem enterprise, nem cyberpunk.
3. **Bizalmi, local-first:** meleg háttér, barátságos kontrasztok, sok tiszta tér; nincs agresszív security vizuál.

Kerülendő irányok:

- túl sötét, hacker/security jellegű felület
- generic lila-kék SaaS gradient
- gyerekes játékapp érzet
- túl sok neon vagy túl harsány szín egyszerre
- állatos vagy robotikus vizuális irány, mert Morf eredeti moduláris karakter

## 3. Színrendszer

Morf UI alapja **neutral**, de nem teljesen rideg fekete-fehér. A felület maradjon tiszta és termékszerű, miközben a márka három karakteres színe pontos szerepet kap:

- **tangerine/amber:** fő CTA, konvertálás, energia
- **ultraviolet:** brand jelenlét, fókusz, aktív állapot
- **pale mint:** optimalizálás, siker, local-first frissesség
- **blue chart scale:** analitika, megtakarítás, méretcsökkenés grafikonok

### 3.1 Fő brand paletta

| Token | Hex | OKLCH | Szerep | Használat |
| --- | --- | --- | --- | --- |
| `brand-ink` | `#25145F` | `oklch(0.272 0.124 285.036)` | fő szöveg, wordmark, erős UI kontraszt | H1, body text, nav, fő ikonok |
| `ink-soft` | `#2B214A` | `oklch(0.282 0.073 292.292)` | kevésbé brandelt sötét szöveg | body alternatíva, dense UI |
| `morf-violet` | `#6F49F2` | `oklch(0.551 0.237 285.977)` | Morf fejének fő lila színe | focus, aktív állapot, brand mark |
| `morf-violet-dark` | `#4D32D6` | `oklch(0.468 0.232 280.025)` | mély lila árnyék | hover, pressed, dark brand surface |
| `morf-violet-light` | `#9364FF` | `oklch(0.631 0.22 293.014)` | világos lila fény | mascot highlight, soft gradient |
| `morf-tangerine` | `#FF7A2F` | `oklch(0.725 0.182 46.038)` | konvertálás, energia, fő CTA | primary button, conversion action |
| `morf-tangerine-hover` | `#FF6427` | `oklch(0.695 0.201 39.452)` | CTA hover | button hover, active conversion state |
| `morf-tangerine-light` | `#FFB547` | `oklch(0.824 0.149 73.346)` | meleg amber fény | hero accent, warning, highlight |
| `morf-mint` | `#54E5BE` | `oklch(0.834 0.136 171.758)` | optimalizálás, siker, frissesség | success, optimized, completed state |
| `morf-mint-soft` | `#C9FFF0` | `oklch(0.959 0.058 176.179)` | puha mint háttér | badge, drop zone hover |
| `cream` | `#FFF8EA` | `oklch(0.981 0.02 84.59)` | meleg oldalháttér | marketing sections, empty states |
| `warm-white` | `#FFFDF8` | `oklch(0.994 0.007 88.641)` | tiszta felület | cards, inputs, dialogs |

### 3.2 Neutral UI paletta

| Token | Hex | OKLCH | Szerep |
| --- | --- | --- | --- |
| `muted` | `#5A5174` | `oklch(0.458 0.057 295.871)` | másodlagos szöveg |
| `muted-light` | `#8B849B` | `oklch(0.627 0.035 299.29)` | meta text, helper text |
| `line` | `#E8DFD0` | `oklch(0.907 0.022 80.683)` | border világos háttéren |
| `surface` | `#FFFDF8` | `oklch(0.994 0.007 88.641)` | kártyák, panelek |
| `surface-warm` | `#F6F1E8` | `oklch(0.96 0.013 82.402)` | toolbar, secondary background |
| `surface-mint` | `#F3FFF9` | `oklch(0.989 0.015 164.745)` | sikeres/optimalizált állapotok háttere |
| `dark-bg` | `#151025` | `oklch(0.191 0.042 292.986)` | sötét mód háttér |
| `dark-card` | `#201B32` | `oklch(0.24 0.044 292.804)` | sötét mód kártya |
| `dark-secondary` | `#2B2540` | `oklch(0.284 0.049 293.231)` | sötét mód secondary surface |
| `dark-border` | `#3A3352` | `oklch(0.343 0.054 293.726)` | sötét mód border |

### 3.3 Funkcionális színek

| Token | Hex | OKLCH | Használat |
| --- | --- | --- | --- |
| `success` | `#22B88F` | `oklch(0.699 0.134 168.632)` | sikeres konvertálás, mentett optimalizáció |
| `success-bg` | `#E9FFF7` | `oklch(0.982 0.025 171.991)` | success badge/card háttér |
| `warning` | `#FFB547` | `oklch(0.824 0.149 73.346)` | figyelmeztetés, nagy fájlméret |
| `warning-bg` | `#FFF3D6` | `oklch(0.966 0.04 88.196)` | warning háttér |
| `danger` | `#E6533C` | `oklch(0.637 0.187 31.467)` | hiba, törlés |
| `danger-bg` | `#FFE9E4` | `oklch(0.95 0.025 32.863)` | error háttér |
| `info` | `#4D32D6` | `oklch(0.468 0.232 280.025)` | információ, tippek |
| `info-bg` | `#F0ECFF` | `oklch(0.952 0.026 295.559)` | info háttér |

### 3.4 Chart paletta

A chart színek legyenek inkább kék/indigo irányúak. A chart ne használja túl sokszor a tangerine CTA színt, mert akkor a grafikon versenyezni kezd a fő művelettel.

| Token | Hex | OKLCH | Használat |
| --- | --- | --- | --- |
| `chart-1` | `#9CDCFF` | `oklch(0.864 0.081 232.86)` | nagyon világos kék, kisebb sorozat |
| `chart-2` | `#5BA7FF` | `oklch(0.719 0.15 253.526)` | közép kék |
| `chart-3` | `#3E7BFF` | `oklch(0.616 0.207 263.062)` | fő chart kék |
| `chart-4` | `#4D32D6` | `oklch(0.468 0.232 280.025)` | Morf violet bridge |
| `chart-5` | `#25145F` | `oklch(0.272 0.124 285.036)` | mély indigo |

## 4. Shadcn / Luma Theme

Setup döntés:

```text
Style preset: Luma
Base color: Neutral
Template: Astro
Icons: HugeIcons
Heading font: Geist
Body font: Inter
```

Telepítő parancs:

```bash
npx shadcn@latest init --preset b3XpCk5OXo --template astro --pointer
```

A shadcn által generált neutral theme-et manuálisan erre kell cserélni. Ez a Morfhoz igazított verzió neutral alapot használ, tangerine/amber primary színnel és kék chart skálával.

```css
:root {
  --background: oklch(0.981 0.02 84.59);
  --foreground: oklch(0.272 0.124 285.036);
  --card: oklch(0.994 0.007 88.641);
  --card-foreground: oklch(0.272 0.124 285.036);
  --popover: oklch(0.994 0.007 88.641);
  --popover-foreground: oklch(0.272 0.124 285.036);
  --primary: oklch(0.725 0.182 46.038);
  --primary-foreground: oklch(0.272 0.124 285.036);
  --secondary: oklch(0.96 0.013 82.402);
  --secondary-foreground: oklch(0.282 0.073 292.292);
  --muted: oklch(0.96 0.013 82.402);
  --muted-foreground: oklch(0.458 0.057 295.871);
  --accent: oklch(0.725 0.182 46.038);
  --accent-foreground: oklch(0.272 0.124 285.036);
  --destructive: oklch(0.637 0.187 31.467);
  --border: oklch(0.907 0.022 80.683);
  --input: oklch(0.907 0.022 80.683);
  --ring: oklch(0.551 0.237 285.977);
  --chart-1: oklch(0.864 0.081 232.86);
  --chart-2: oklch(0.719 0.15 253.526);
  --chart-3: oklch(0.616 0.207 263.062);
  --chart-4: oklch(0.468 0.232 280.025);
  --chart-5: oklch(0.272 0.124 285.036);
  --radius: 0.625rem;
  --sidebar: oklch(0.994 0.007 88.641);
  --sidebar-foreground: oklch(0.272 0.124 285.036);
  --sidebar-primary: oklch(0.725 0.182 46.038);
  --sidebar-primary-foreground: oklch(0.272 0.124 285.036);
  --sidebar-accent: oklch(0.96 0.013 82.402);
  --sidebar-accent-foreground: oklch(0.282 0.073 292.292);
  --sidebar-border: oklch(0.907 0.022 80.683);
  --sidebar-ring: oklch(0.551 0.237 285.977);
}

.dark {
  --background: oklch(0.191 0.042 292.986);
  --foreground: oklch(0.994 0.007 88.641);
  --card: oklch(0.24 0.044 292.804);
  --card-foreground: oklch(0.994 0.007 88.641);
  --popover: oklch(0.24 0.044 292.804);
  --popover-foreground: oklch(0.994 0.007 88.641);
  --primary: oklch(0.824 0.149 73.346);
  --primary-foreground: oklch(0.191 0.042 292.986);
  --secondary: oklch(0.284 0.049 293.231);
  --secondary-foreground: oklch(0.994 0.007 88.641);
  --muted: oklch(0.284 0.049 293.231);
  --muted-foreground: oklch(0.77 0.048 299.126);
  --accent: oklch(0.824 0.149 73.346);
  --accent-foreground: oklch(0.191 0.042 292.986);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.631 0.22 293.014);
  --chart-1: oklch(0.864 0.081 232.86);
  --chart-2: oklch(0.719 0.15 253.526);
  --chart-3: oklch(0.616 0.207 263.062);
  --chart-4: oklch(0.551 0.237 285.977);
  --chart-5: oklch(0.824 0.149 73.346);
  --sidebar: oklch(0.24 0.044 292.804);
  --sidebar-foreground: oklch(0.994 0.007 88.641);
  --sidebar-primary: oklch(0.824 0.149 73.346);
  --sidebar-primary-foreground: oklch(0.191 0.042 292.986);
  --sidebar-accent: oklch(0.284 0.049 293.231);
  --sidebar-accent-foreground: oklch(0.994 0.007 88.641);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.631 0.22 293.014);
}
```

### 4.1 Shadcn szereposztás

| Shadcn token | Morf szerep | Megjegyzés |
| --- | --- | --- |
| `--background` | `cream` | meleg, de még neutral érzetű app háttér |
| `--foreground` | `brand-ink` | a teljes app fő szövegszíne |
| `--card` | `warm-white` | feltöltő felület, panelek, modals |
| `--primary` | `morf-tangerine` | fő CTA: konvertálás, letöltés, indítás |
| `--primary-foreground` | `brand-ink` | narancson ne fehér szöveg legyen |
| `--accent` | `morf-tangerine` | Luma/shadcn aktív akcentus |
| `--ring` | `morf-violet` | fókusz állapot, keyboard navigation |
| `--chart-*` | blue/indigo scale | méretcsökkenés, teljesítmény, statisztika |

## 5. Színhasználati arány

Ajánlott felületi arány:

- **70% neutral/meleg világos alap:** `cream`, `warm-white`, `surface-warm`
- **15% sötét indigo szöveg:** `brand-ink`, `ink-soft`, `muted`
- **7% tangerine/amber:** fő CTA és kiemelt konverziós pillanatok
- **5% Morf lila:** fókusz, aktív UI, mascot/brand jelenlét
- **3% mint:** siker, optimalizálás, frissesség, local-first állapotok

A tangerine legyen a kattintási energia. A lila legyen a márka jelenléte. A mint legyen az eredmény és a nyugalom. Ha mindhárom nagy felületen egyszerre jelenik meg, Morf túl harsány lesz.

## 6. Kontraszt és accessibility

### Ajánlott szöveg/szín párosítások

| Háttér | Szöveg | Kontraszt | Megjegyzés |
| --- | --- | --- | --- |
| `cream` `#FFF8EA` | `brand-ink` `#25145F` | 14.78:1 | fő oldalháttér + fő szöveg |
| `warm-white` `#FFFDF8` | `brand-ink` `#25145F` | AA/AAA | kártyák, panelek |
| `morf-tangerine` `#FF7A2F` | `brand-ink` `#25145F` | 6.01:1 | primer CTA |
| `morf-tangerine` `#FF7A2F` | `white` `#FFFFFF` | 2.60:1 | kerülendő normál szövegnél |
| `morf-violet` `#6F49F2` | `white` `#FFFFFF` | 5.37:1 | lila gomb / aktív állapot |
| `morf-violet-dark` `#4D32D6` | `warm-white` `#FFFDF8` | 7.53:1 | erős lila felület |
| `morf-mint` `#54E5BE` | `brand-ink` `#25145F` | 9.92:1 | success/optimized badge |
| `dark-bg` `#151025` | `warm-white` `#FFFDF8` | 18.24:1 | dark mode |

### Kerülendő párosítások

- Fehér szöveg tangerine alapon normál méretben.
- Fehér szöveg mint alapon.
- Sötét indigo szöveg mély lilán.
- Túl sok lila-narancs-mint gradient egy képernyőn.

## 7. Gradientek

Morf gradientjei legyenek puhák, de ne legyenek dekoratív háttérfoltok. Használatuk inkább brand asseten, progress vizuálon, drop zone-on vagy empty state-en ajánlott.

```css
:root {
  --gradient-violet: linear-gradient(135deg, #9364FF 0%, #4D32D6 100%);
  --gradient-tangerine: linear-gradient(135deg, #FFB547 0%, #FF6427 100%);
  --gradient-mint: linear-gradient(135deg, rgba(201,255,240,.98) 0%, rgba(84,229,190,.92) 100%);
  --gradient-bg: linear-gradient(135deg, #FFF8EA 0%, #F3FFF9 100%);
}
```

UI háttérként csak nagyon finom `gradient-bg` használható. A lila-narancs-mint hármas inkább Morf karakterén vagy kis termékállapotokon jelenjen meg.

## 8. Logo használat

### Wordmark

A Morf wordmark fő színe `brand-ink`. Ez adja a brand komolyabb, megbízható részét. A logó mellett a moduláris mark használható, de kis navban a wordmark önmagában is működhet.

Alap használat:

- világos háttéren: `brand-ink` wordmark + színes mark
- sötét háttéren: `warm-white` wordmark + egyszerűsített mark
- favicon/app icon: 1:1 moduláris ikon, nem teljes wordmark

### Minimum clearspace

A logó körül legalább a wordmark `o` betűjének szélességével megegyező üres tér maradjon. Kis méretben ne legyen a logó közvetlenül más ikonok, badge-ek vagy gombok mellé szorítva.

### Tiltások

- Ne színezd át a logót random brand palette-en kívüli színekkel.
- Ne tegyél rá durva drop shadow-t vagy glow-t.
- Ne használd zsúfolt, fotós háttéren.
- Ne torzítsd vízszintesen vagy függőlegesen.
- Ne rakd a teljes wordmarkot faviconba.

## 9. Morf mascot megjelenés

Morf egy eredeti, moduláris 3D karakter. Nem állat, nem robot, nem emberi figura.

Fő karakterjegyek:

- nagy, puha, lekerekített kockafej ultraviolet lilában
- vivid tangerine kapszula törzs
- pale mint integrált foltok a törzsön
- áttetsző pale mint lebegő alsó gyűrű
- apró, leváló, lebegő kezek
- kompakt, app ikonként is felismerhető sziluett
- meleg, matte, puha 3D anyagok

Szemrendszer:

Morf arca legyen stabil és reprodukálható. Két egyező szerkezetű ovális szemegysége legyen, mindkettő meleg fehér ovális betéttel és sötét ultraviolet, fényes pupillával. A perspektíva miatt a szemek alakja kissé eltérhet, de ugyanabból a vizuális rendszerből kell készülniük. Morf karakterességét ne a különböző vagy hiányos szemek adják, hanem a fejdöntés, a lebegő modulok, az előredőlő póz és a kis mosoly.

### Mascot használati helyek

| Hely | Javasolt Morf állapot |
| --- | --- |
| Hero | Morf lebegő, aktív, konvertálásra kész |
| Upload drop zone | Morf kezeivel „fogadja” a fájlt |
| Konvertálás közben | modulok finoman átrendeződnek |
| Optimalizálás kész | mint gyűrű fényesebb, Morf elégedett |
| Empty state | Morf nyugodt, kíváncsi |
| Error state | Morf zavart, de nem pánikol |

Kerülendő mascot használat:

- Morf ne tartson túl sok tárgyat.
- Ne legyen belőle klasszikus robot asszisztens.
- Ne használj fájl ikonokat a karakter testén.
- Ne legyen túl sok arckifejezés egyszerre; a character system maradjon egyszerű.

## 10. UI irány

### Általános layout

A Morf UI legyen tiszta, gyorsan érthető és fókuszált. Az első képernyőn maga a konvertáló felület legyen, ne marketing hero. A brand személyiségét a mikrointerakciók, a mascot és a színakcentusok adják.

Fő felületi elemek:

- nagy, központi upload/drop zone
- jól látható format selector
- egyszerű output settings panel
- képoptimalizálásnál tömörítés, méret, quality slider
- konvertálás után eredménylista: eredeti méret, új méret, megtakarítás, letöltés

### Drop zone

Drop zone háttér:

- alap: `warm-white`
- border: `line`
- hover: `morf-mint-soft`
- active drag: finom `gradient-bg`, lila border

Ne legyen túl vastag, harsány upload box. Inkább puha, bizalmat adó felület, amelyen Morf kis akcentusként megjelenhet.

### Gombok

Primer CTA:

- háttér: `morf-tangerine`
- szöveg: `brand-ink`
- hover: `#FF6427`
- pressed: `#E85A22`

Alternatív primer, ha komolyabb hatás kell:

- háttér: `morf-violet-dark`
- szöveg: `warm-white`
- hover: `#3F27BF`

Secondary:

- háttér: `surface`
- border: `line`
- szöveg: `brand-ink`

Ghost:

- háttér: transparent
- szöveg: `brand-ink`
- hover: `surface-warm`

### Badges

| Állapot | Háttér | Szöveg |
| --- | --- | --- |
| Local-first | `info-bg` | `brand-ink` |
| Private | `morf-mint-soft` | `brand-ink` |
| Optimized | `success-bg` | `brand-ink` |
| Beta | `warning-bg` | `brand-ink` |

## 11. Tipográfia

Morf tipográfiai rendszere legyen modern, tiszta és termékszerű. A játékosságot Morf karaktere és a moduláris vizuális rendszer adja, nem a túl karakteres UI font.

Választott betűtípusok:

- **Heading:** Geist
- **Body/UI:** Inter
- **Code/file extension label:** Geist Mono vagy JetBrains Mono kis mennyiségben
- **Logo/brand display:** maradjon az egyedi Morf wordmark; a UI-ban ne próbáld betűtípussal utánozni

Tipográfiai arány:

- H1: 48-64 px desktop, 36-42 px mobile
- H2: 32-40 px
- Body: 16-18 px
- Small/meta: 13-14 px

Betűsúly:

- H1/H2: 700-800
- UI label: 600
- Body: 400-500

Kerüld a negatív letter spacinget normál UI szövegnél. A felület maradjon olvasható és nem túl designer-kirakat jellegű.

## 12. Ikonográfia

Választott ikon csomag: **HugeIcons**.

HugeIcons azért illik Morfhoz, mert lekerekített, puha outline ikonokat használ. Ez jobban kapcsolódik Morf moduláris, kerek formáihoz, mint egy szögletesebb vagy túl technikai ikonrendszer.

Ikonstílus:

- lekerekített stroke
- 1.75-2 px körüli stroke vastagság
- egyszerű, nem túl részletes
- outline alap, kevés tömör ikon
- ne legyen túl játékos vagy emoji-szerű

Ikonszínek:

- default: `brand-ink`
- secondary: `muted`
- active: `morf-violet-dark`
- success: `success`
- warning: `warning`

Ne használj túl sok file extension ikont. A konvertálásnál elég a formátum label: `PNG`, `WEBP`, `PDF`, `MP4`, stb.

## 13. Kártyák és panelek

Kártyák:

- háttér: `surface`
- border: `line`
- radius: 8-12 px
- shadow: nagyon finom, meleg árnyék

Ajánlott shadow:

```css
box-shadow:
  0 18px 48px rgba(37, 20, 95, 0.08),
  0 4px 14px rgba(37, 20, 95, 0.06);
```

Ne legyen sok lebegő kártya egymásban. Az app fő felülete legyen stabil és eszközszerű, ne landing page-szerű.

## 14. Motion

Morf mozgása legyen „soft modular”:

- a modulok 4-8 px-t lebeghetnek
- konvertálás közben a fej, törzs és alsó gyűrű finoman eltérő ritmusban mozoghat
- sikeres konvertáláskor a mint gyűrű 1x finoman pulzálhat
- drag hover esetén Morf kezei vagy a drop zone border reagálhat

Mozgás karakter:

- easing: `cubic-bezier(.2,.8,.2,1)`
- rövid UI transition: 160-220 ms
- mascot idle: 3-5 s lassú loop
- success animation: 500-800 ms

Kerülendő:

- túl rugós, játékos bounce
- folyamatos villogás
- nagy parallax vagy túl sok lebegő dekoráció

## 15. Képi világ

Morf vizuális világa ne stock fotós legyen. A fő képi rendszer inkább:

- termék UI screenshotok
- puha 3D Morf állapotok
- egyszerű fájl- és optimalizálás absztrakciók
- világos, meleg háttér
- kevés, pontos akcentus

Ha blog thumbnail vagy social kép készül, a Morf színekből induljon:

- `cream` háttér
- nagy, tiszta headline `brand-ink` színnel
- egy Morf modul vagy karakterpozíció
- maximum egy tangerine és egy mint akcentus

## 16. CSS design token induló készlet

```css
:root {
  --color-brand-ink: #25145F;
  --color-ink-soft: #2B214A;
  --color-muted: #5A5174;
  --color-muted-light: #8B849B;

  --color-morf-violet: #6F49F2;
  --color-morf-violet-dark: #4D32D6;
  --color-morf-violet-light: #9364FF;

  --color-morf-tangerine: #FF7A2F;
  --color-morf-tangerine-dark: #E85A22;
  --color-morf-tangerine-light: #FFB547;

  --color-morf-mint: #54E5BE;
  --color-morf-mint-soft: #C9FFF0;
  --color-morf-mint-bg: #F3FFF9;

  --color-cream: #FFF8EA;
  --color-warm-white: #FFFDF8;
  --color-surface: #FFFDF8;
  --color-surface-warm: #F6F1E8;
  --color-line: #E8DFD0;

  --color-success: #22B88F;
  --color-success-bg: #E9FFF7;
  --color-warning: #FFB547;
  --color-warning-bg: #FFF3D6;
  --color-danger: #E6533C;
  --color-danger-bg: #FFE9E4;
  --color-info: #4D32D6;
  --color-info-bg: #F0ECFF;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-pill: 999px;

  --shadow-soft:
    0 18px 48px rgba(37, 20, 95, 0.08),
    0 4px 14px rgba(37, 20, 95, 0.06);

  --ease-morf: cubic-bezier(.2,.8,.2,1);
}
```

## 17. Gyors UI recept

Egy Morf oldal/felület induló receptje:

- Page background: `cream`
- App panel: `warm-white`
- Main text: `brand-ink`
- Secondary text: `muted`
- Main CTA: `morf-tangerine` háttér + `brand-ink` szöveg
- Active/focus: `morf-violet`
- Chart colors: kék/indigo skála, ne a CTA narancs domináljon
- Drop zone hover: `morf-mint-soft`
- Success/optimized: `success-bg` + `brand-ink`
- Mascot: teljes Morf paletta, de ne legyen minden komponens Morf-színű

## 18. Brand mondatok

Rövid üzenetirányok:

- „Konvertálás, ami nálad marad.”
- „Fájlátalakítás korlátok nélkül, helyben.”
- „Gyorsabb képek, kisebb fájlok, több kontroll.”
- „A fájljaid nem utaznak szerverre.”
- „Morf átalakítja, optimalizálja, letisztítja.”

Hangnem:

- egyszerű
- direkt
- barátságos
- technikailag pontos
- nem ijesztget adatvédelemmel, inkább nyugalmat ad

## 19. Döntési szabály

Ha bizonytalan vagy egy új UI elemnél, ezt a sorrendet kövesd:

1. Legyen érthető és gyorsan használható.
2. Maradjon local-first és privacy-first érzetű.
3. Csak ezután legyen játékos.
4. A játékosságot Morf és a mikrointerakciók adják, ne a teljes UI harsánysága.
