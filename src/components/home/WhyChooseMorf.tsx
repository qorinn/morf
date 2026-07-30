"use client";

import {
  ToolCaseIcon,
  LaptopRemoveIcon,
  PiggyBankIcon,
  Infinity01Icon,
  FileLockedIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import StackingCards, {
  StackingCardItem,
} from "@/components/fancy/blocks/stacking-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const benefits = [
  {
    title: "Nincs napi limit",
    description: [
      "Nem kapsz napi fájlszámlálót, és nem kell megvárnod, hogy újra használhasd az eszközt.",
      "Annyi fájllal dolgozhatsz, amennyit a telefonod vagy a számítógéped biztonságosan tud kezelni.",
    ],
    icon: Infinity01Icon,
    surfaceClassName:
      "morf-benefit-card morf-benefit-card-mint text-card-foreground",
    iconClassName:
      "-right-14 -bottom-14 text-primary rotate-[-9deg] sm:-right-10 sm:-bottom-24",
  },
  {
    title: "Folyamatosan bővülő eszköztár",
    description: [
      "A Morf nem egyetlen feladatra készül. Új, hétköznapi böngészős eszközökkel bővül.",
      "A cél mindig ugyanaz: nyisd meg, végezd el a feladatot, és voilà.",
    ],
    icon: ToolCaseIcon,
    surfaceClassName:
      "morf-benefit-card morf-benefit-card-violet text-secondary-foreground",
    iconClassName:
      "-right-16 top-10 text-secondary-foreground rotate-[8deg] sm:-right-12 sm:top-2",
  },
  {
    title: "Ingyenes",
    description: [
      "A kész eszközöket fizetés és előfizetés nélkül használhatod.",
      "Nincs próbaidő, amely lejár, és a letöltésért sem kell külön fizetned.",
    ],
    icon: PiggyBankIcon,
    surfaceClassName:
      "morf-benefit-card morf-benefit-card-soft text-card-foreground",
    iconClassName:
      "-right-10 -bottom-16 text-primary rotate-[6deg] sm:-right-4 sm:-bottom-24",
  },
  {
    title: "A fájljaid privátak",
    description: [
      "A fájljaid feldolgozása a saját böngésződben történik és nem kerülnek a Morf szerverére.",
      "A munka helyben végződik és a letöltések is biztonságosak.",
    ],
    icon: FileLockedIcon,
    surfaceClassName: "morf-dark-card text-dark-section-foreground",
    iconClassName:
      "-right-16 -bottom-12 text-dark-section-accent rotate-[-7deg] sm:-right-8 sm:-bottom-20",
  },
  {
    title: "Telepítés nélkül",
    description: [
      "Nem kell programot telepítened vagy fiókot létrehoznod.",
      "Nyisd meg a választott eszközt egy modern böngészőben, és már kezdheted is.",
    ],
    icon: LaptopRemoveIcon,
    surfaceClassName:
      "morf-benefit-card morf-benefit-card-wash text-accent-foreground",
    iconClassName:
      "-right-14 top-8 text-accent-foreground rotate-[7deg] sm:-right-8 sm:top-0",
  },
] as const;

function WhyChooseMorf() {
  return (
    <StackingCards totalCards={benefits.length + 1}>
      <StackingCardItem index={0} className="h-[700px] sm:h-[760px]">
        <Card className="bg-transparent mx-auto h-[84%] w-11/12 max-w-6xl justify-center items-center border-0 shadow-none ring-0 sm:h-[76%]">
          <CardHeader className="max-w-5xl gap-4 pb-2 sm:pb-4 w-full">
            <CardTitle>
              <h2 className="text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance text-center">
                Miért válaszd a Morfot?
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 sm:pb-4 w-full">
            <CardDescription className="text-center text-base leading-relaxed text-current opacity-80 sm:text-lg">
              Az egyszerű használaton kívül.
            </CardDescription>
          </CardContent>
        </Card>
      </StackingCardItem>

      {benefits.map(
        (
          { description, icon, iconClassName, surfaceClassName, title },
          index,
        ) => {
          const cardNumber = index + 1;

          return (
            <StackingCardItem
              key={title}
              index={cardNumber}
              className="h-[700px] sm:h-[760px]"
            >
              <Card
                className={cn(
                  "relative isolate mx-auto h-[84%] w-11/12 max-w-6xl justify-between border-0 shadow-none ring-0 sm:h-[76%]",
                  surfaceClassName,
                )}
              >
                <HugeiconsIcon
                  icon={icon}
                  strokeWidth={0.8}
                  className={cn(
                    "pointer-events-none absolute size-64 opacity-[0.09] sm:size-96 lg:size-[28rem]",
                    iconClassName,
                  )}
                  aria-hidden="true"
                />

                <CardHeader className="relative pb-0">
                  <CardTitle>
                    <h3 className="max-w-5xl text-[clamp(2.5rem,5.5vw,5.25rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance">
                      {title}
                    </h3>
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative grid max-w-2xl gap-3 pb-2 sm:gap-4 sm:pb-4">
                  {description.map((paragraph) => (
                    <CardDescription
                      key={paragraph}
                      className="text-base leading-relaxed text-current opacity-80 sm:text-lg"
                    >
                      {paragraph}
                    </CardDescription>
                  ))}
                </CardContent>
              </Card>
            </StackingCardItem>
          );
        },
      )}
    </StackingCards>
  );
}

export default WhyChooseMorf;
