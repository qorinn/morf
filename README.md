# Morf

A Morf egy ingyenes, privát szférát tiszteletben tartó, böngészőben futó digitális eszköztár. A fájlok feldolgozása közvetlenül a felhasználó eszközén történik: a Morf nem tölti fel a kiválasztott képeket és videókat saját szerverre.

## Elérhető eszközök

- **Képkonvertáló, képoptimalizáló és átméretező** – JPG, PNG, WebP, AVIF, HEIC és HEIF képek átalakítása, tömörítése és méretezése. Több kép és teljes mappák feldolgozása is támogatott.
- **Videó képekre bontása** – MP4, MOV és WebM videók feldolgozása teljes felbontású PNG képkockákra, választható mintavételezési sebességgel.
- **Favicon generátor** – favicon, Apple Touch és PWA-ikoncsomag készítése egyetlen képből, vágási és maskable-icon beállításokkal.

## Adatvédelem

A képfeldolgozás, videódekódolás, előnézet és fájlkészítés a böngészőben fut. A kiválasztott fájlok nem kerülnek a Morf szerverére. A részletekért lásd az alkalmazás [adatvédelmi tájékoztatóját](/adatvedelmi-tajekoztato).

## Fejlesztés

Előfeltétel: Node.js 22.12 vagy újabb.

```sh
npm install
npm run dev
```

Ellenőrzés, tesztek és éles build:

```sh
npm run check
npm test
npm run build
```

## Technológia

- [Astro](https://astro.build/) és React
- Tailwind CSS
- Web Workers és WebAssembly-alapú, kliensoldali feldolgozás

## Szerzői jog és felhasználási feltételek

Copyright © 2026 Paládi Webfejlesztés. Minden jog fenntartva.

Ez a repository kizárólag átláthatósági és ellenőrzési célból nyilvános. A forráskód nyilvános elérhetősége **nem** jelent nyílt forráskódú licencet, és nem ad felhasználási engedélyt.

Előzetes, írásbeli engedély nélkül tilos különösen:

- a forráskód, annak érdemi része vagy az alkalmazás felületének másolása, módosítása, terjesztése vagy származékos mű készítése;
- a Morf vagy abból származó alkalmazás üzemeltetése, közzététele, hostolása vagy saját termékként való feltüntetése;
- a Morf neve, logója, arculata, szövegei, illusztrációi és egyéb márkaelemei használata;
- az alkalmazás vagy bármely részének kereskedelmi célú felhasználása, értékesítése vagy továbblicencelése.

A jelen repository klónozása, telepítése vagy a kódhoz való hozzáférés nem keletkeztet licencet és nem minősül hozzájárulásnak a fenti felhasználásokhoz. Az alkalmazás külső függőségei a saját licenceik szerint használhatók; ez nem terjed ki a Morf saját forráskódjára, arculatára vagy tartalmaira.

Felhasználási, együttműködési vagy licencelési kérdésben: [hello@paladi-web.hu](mailto:hello@paladi-web.hu).
