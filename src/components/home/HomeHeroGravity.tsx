"use client";

import {
  BrowserIcon,
  Image02Icon,
  ImageCropIcon,
  MagicWand02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useReducedMotion } from "motion/react";

import Gravity, { MatterBody } from "@/components/fancy/physics/gravity";
import { buttonVariants } from "@/components/ui/button";
import morfPeeking from "../../assets/morf-actions/morf-peeking.webp";

function HomeHeroGravity() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="morf-section-normal relative h-[max(42rem,calc(100svh-5.75rem))] overflow-hidden sm:h-[max(44rem,calc(100svh-5.75rem))]">
      <Gravity
        gravity={{ x: 0, y: 0.72 }}
        autoStart={!shouldReduceMotion}
        grabCursor={!shouldReduceMotion}
        className="h-full w-full"
      >
        <MatterBody
          isDraggable={false}
          x="24%"
          y="17%"
          angle={-3}
          className="z-10"
        >
          <a
            href="/kep-konvertalo"
            className="bg-card/90 text-card-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-4xl border px-4 py-3 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5 sm:py-3.5 sm:text-base"
          >
            <HugeiconsIcon
              icon={Image02Icon}
              strokeWidth={1.8}
              className="size-5"
              aria-hidden="true"
            />
            Képkonvertáló
          </a>
        </MatterBody>

        <MatterBody
          isDraggable={false}
          x="73%"
          y="79%"
          angle={3}
          className="z-10"
        >
          <a
            href="/favicon-generator"
            className="bg-card/90 text-card-foreground focus-visible:ring-ring inline-flex items-center gap-2 rounded-4xl border px-4 py-3 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors hover:bg-card focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none sm:px-5 sm:py-3.5 sm:text-base"
          >
            <HugeiconsIcon
              icon={BrowserIcon}
              strokeWidth={1.8}
              className="size-5"
              aria-hidden="true"
            />
            Favicon generátor
          </a>
        </MatterBody>

        <MatterBody
          bodyType="circle"
          matterBodyOptions={{ friction: 0.35, restitution: 0.62 }}
          x="85%"
          y="18%"
          angle={8}
        >
          <div
            className="bg-accent/90 text-accent-foreground flex size-16 items-center justify-center rounded-full shadow-sm sm:size-20"
            aria-hidden="true"
          >
            <HugeiconsIcon
              icon={MagicWand02Icon}
              strokeWidth={1.8}
              className="size-7 sm:size-8"
            />
          </div>
        </MatterBody>

        <MatterBody
          bodyType="rectangle"
          matterBodyOptions={{ friction: 0.42, restitution: 0.48 }}
          x="18%"
          y="64%"
          angle={-9}
        >
          <div
            className="bg-secondary/90 text-secondary-foreground flex h-16 w-24 items-center justify-center rounded-3xl shadow-sm sm:h-20 sm:w-28"
            aria-hidden="true"
          >
            <HugeiconsIcon
              icon={ImageCropIcon}
              strokeWidth={1.8}
              className="size-7 sm:size-8"
            />
          </div>
        </MatterBody>

        <MatterBody
          bodyType="rectangle"
          matterBodyOptions={{ friction: 0.38, restitution: 0.58 }}
          x="84%"
          y="55%"
          angle={12}
        >
          <svg
            viewBox="0 0 64 64"
            className="text-primary size-14 sm:size-20"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M32 4 39.4 22.3 59 23.6 44 36.3 48.8 55.4 32 45 15.2 55.4 20 36.3 5 23.6 24.6 22.3Z"
            />
          </svg>
        </MatterBody>

        <MatterBody
          bodyType="svg"
          matterBodyOptions={{ friction: 0.4, restitution: 0.52 }}
          sampleLength={8}
          x="14%"
          y="35%"
          angle={-6}
        >
          <svg
            viewBox="0 0 56 64"
            className="text-ring h-16 w-14 sm:h-20 sm:w-16"
            aria-hidden="true"
          >
            <path fill="currentColor" d="M31 3 7 35h17l-3 26 28-37H31Z" />
          </svg>
        </MatterBody>
      </Gravity>

      <div className="pointer-events-none relative z-20 mx-auto flex h-full w-full flex-col items-center justify-center gap-7 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex flex-col items-center gap-4 text-center">
          <h1 className="morf-page-heading from-foreground from-25% via-foreground/80 via-60% to-foreground/55 font-heading -mx-[0.05em] -mb-[0.12em] bg-linear-to-b bg-clip-text px-[0.05em] pb-[0.12em] leading-[0.95] font-semibold tracking-[-0.055em] text-transparent text-balance sm:text-[clamp(3.5rem,7.2vw,6.5rem)]">
            <span className="block">Eszközök a digitális</span>
            <span className="block">mindennapokhoz.</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed sm:text-xl">
            A Morf célja, hogy a gyakori digitális feladatokhoz egyszerű,
            ingyenes és privát böngészős eszközöket kínáljon.
          </p>
        </div>

        <div className="pointer-events-auto relative mt-30">
          <img
            src={morfPeeking.src}
            className="absolute top-0 right-1/2 left-1/2 h-30 w-auto -translate-x-1/2 -translate-y-full"
            alt=""
          />
          <a href="#eszkozok" className={buttonVariants({ size: "lg" })}>
            Eszközök megnyitása
          </a>
        </div>
      </div>
    </section>
  );
}

export default HomeHeroGravity;
