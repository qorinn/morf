# Morf képkonvertáló — UI design terv

## 1. Mit tud ma a képkonvertáló?

A jelenlegi felület nem egyszerű formátumváltó, hanem helyben futó, többképes
feldolgozó workspace:

- JPG, PNG, WebP, AVIF és HEIC/HEIF állóképeket fogad, a fájl valódi tartalmát
  is ellenőrzi.
- JPG, PNG, WebP és AVIF kimenetet készít.
- Egyszerre több képet kezel, a képek kijelölhetők, törölhetők, átnevezhetők,
  duplikálhatók és más beállításcsoportba helyezhetők.
- Egy futtatáson belül több eltérő kimeneti recept használható.
- A receptek felhasználási célból indulhatnak: weboldal, webshop, közösségi
  média, e-mail vagy egyedi.
- Receptenként állítható a kimeneti formátum, a maximális szélesség és magasság,
  a minőség, a maximum fájlméret és a veszteségmentes mód.
- Az oldalarány mindig megmarad, a metaadatok eltávolításra kerülnek, az
  EXIF-orientáció alkalmazódik.
- Maximum fájlméretnél a motor a lehető legjobb határ alatti minőséget keresi,
  és szükség esetén a felbontást is csökkenti.
- Veszteségmentes módban az eredeti felbontás megmarad; ez felülírja a
  felbontás-, minőség- és célméret-beállítást. JPG-nél a legmagasabb elérhető
  minőség használható, mert valódi veszteségmentes JPG-kimenet nincs.
- A képek és teljes csoportok bevonhatók a futtatásba vagy kihagyhatók.
- Fájlonként látható a várható méret, a célméret, az állapot, a folyamat,
  a hiba és a megtakarítás.
- A feldolgozás megszakítható és újrapróbálható.
- Az eredmények külön, választott mappába, ZIP-be vagy „mentés másként”
  művelettel menthetők, amennyiben a böngésző támogatja.
- A feldolgozás Web Workerben, a felhasználó eszközén történik.

## 2. Miért tűnik elsőre bonyolultnak?

1. A felület azonnal megmutatja a teljes belső modellt: fájl, kijelölés,
   konfigurációs csoport, aktív csoport, futtatásba bevonás, feldolgozás és
   mentés.
2. A „konfigurációs csoport” technikailag pontos, de nem természetes
   felhasználói fogalom. A felhasználó inkább „webes képeket” vagy „e-mailbe
   való képeket” akar készíteni.
3. A fontos első döntés — mire kell a kép — ugyanolyan súlyú, mint a haladó
   paraméterek.
4. A csoportkártya, a fájlkártya és a jobb oldali beállításpanel részben
   ugyanazt az összefüggést ismétli.
5. A kijelölés, a csoportváltás és a konvertálásba bevonás három külön
   kiválasztási logika, de vizuálisan közel kerülnek egymáshoz.
6. A futtatás és a mentés több helyen jelenik meg, ezért a következő lépés
   kevésbé egyértelmű.

## 3. Közös tervezési alapelvek

- Az alapfolyamat nyelve: **képek hozzáadása → felhasználási cél kiválasztása
  → konvertálás → mentés**.
- A „konfigurációs csoport” helyett az elsődleges UI-ban **kimenet** vagy
  **beállítás** szerepel.
- Alapból minden kép ugyanazt a kimenetet kapja. Az eltérő kimenetek csak
  szándékos felhasználói kérésre jelennek meg.
- A felhasználási cél az első döntés; a technikai paraméterek annak
  következményei.
- A minőség, maximum fájlméret és veszteségmentes mód egymást kizáró
  optimalizálási módokként jelenjen meg. Így a felülírási szabály nem
  magyarázószövegből derül ki.
- Egy munkaszakaszban egy kitöltött főgomb legyen.
- Az állapot és a hiba mindig az érintett fájl mellett maradjon.
- A haladó beállítások összecsukhatók, de nem rejtettek vagy eltávolítottak.
- Mobilon a sorrend: forrás → fájlok → aktív kimenet → főművelet → eredmény.

## 4. Variációk

### 1. Vezetett folyamat

Három látható fázisra bontja a munkát: Képek, Beállítások, Konvertálás és
mentés. A felhasználó először célt választ, majd csak akkor nyitja meg a
speciális paramétereket vagy az eltérő képenkénti beállításokat, ha szüksége
van rájuk.

**Erősség:** a legjobb első használat és a legkisebb kognitív terhelés.

**Kockázat:** a sok eltérő kimenettel dolgozó visszatérő felhasználónak egy
plusz megnyitás lehet.

### 2. Célok és kimenetek

A beállításcsoportokat látható kimeneti célokká alakítja: például Weboldal és
E-mail. A képek ezekbe a kimenetekbe rendezhetők, a beállítások pedig mindig
az adott kimenethez tartoznak.

**Erősség:** a többféle export logikáját ez magyarázza el a
legtermészetesebben.

**Kockázat:** sok kimenetnél vízszintes helyet kér, ezért mobilon és 4–5
kimenet felett listás nézetre kell váltania.

### 3. Fájllista és beállításvizsgáló

A kártyák helyett egy sűrűbb, könnyen pásztázható fájltáblázatot használ. A
kiválasztott kimenet összes beállítása a jobb oldali vizsgálóban szerkeszthető.

**Erősség:** a legjobb nagyobb fájlszámnál, gyors kijelölésnél, állapotkövetésnél
és eredmények mentésénél.

**Kockázat:** kezdő felhasználónak önmagában kevésbé vezetett; erős alapállapot
és jó üres állapot szükséges.

## 5. Javasolt végső irány

A legjobb megoldás egy hibrid:

1. Az első használat és az üres állapot az **1. variáció vezetett folyamatát**
   kövesse.
2. A „konfigurációs csoport” fogalmát a **2. variáció kimenet-fogalma** váltsa
   fel.
3. Feltöltés után a fájlok a **3. variáció listás nézetében** jelenjenek meg.
4. Az alapbeállítások azonnal látszanak, a speciális beállítások összecsukott
   szekcióban maradnak.
5. Az „Eltérő kimenet” művelet hozza létre a második és további recepteket.

Ez a modell a kezdő számára egyszerű eszköznek, a gyakori felhasználó számára
pedig teljes értékű batch workspace-nek érződik.

## 6. Funkciómegőrzési ellenőrzőlista

Az új UI csak akkor tekinthető késznek, ha a következő állapotok és műveletek
mind ellenőrizhetők:

- üres, drag-over, feltöltés, részben érvénytelen feltöltés;
- egy vagy több fájl, JPG/PNG/WebP/AVIF/HEIC bemenet;
- alapértelmezett és több eltérő kimenet;
- kimenet létrehozása, átnevezése, kiválasztása és kihagyása;
- preset, formátum, max. méret, minőség, célméret, veszteségmentes mód;
- a paraméterek felülírási és tiltott állapotai;
- fájl kijelölése, mind kijelölése, átmozgatása, külön kimenetek létrehozása;
- duplikálás ugyanabba vagy új kimenetbe;
- fájlnév szerkesztése és kiterjesztés-frissítés;
- várható méret, célméret és veszteségmentes összefoglaló;
- sorba állított, motorbetöltés, dekódolás, átméretezés, kódolás, kész,
  megszakított és hibaállapot;
- megszakítás és újrapróbálás;
- egyedi letöltés, mentés másként, összes mentése, mappás mentés és ZIP;
- billentyűzet, fókusz, hover, pressed, disabled, loading, success és error;
- 390, 768, 1024 és 1440 px szélesség.

## 7. Képgenerálási adatok

- Mód: beépített image generation.
- Promptkészlet:
  1. vezetett, háromlépéses konvertáló progresszív részletezéssel;
  2. felhasználási célokra épülő kimeneti munkasávok;
  3. kompakt fájltáblázat és kontextuális beállításvizsgáló.
- Közös vizuális kötöttségek: Morf világos paletta, Geist/Inter jelleg,
  sötétzöld elsődleges művelet, menta állapot, ibolya fókusz, fehér panelek,
  gradiens, üveg, glow és dekoratív dashboard-elemek nélkül.
