"use client"

import morfPeeking from "../../assets/morf-actions/morf-peeking.webp";
import { buttonVariants } from "@/components/ui/button";
import Gravity, { MatterBody } from "@/components/fancy/physics/gravity"

function HomeHeroGravity() {
  return (
    <section className="morf-section-normal relative">
      <Gravity gravity={{ x: 0, y: 1 }} className="w-full h-full">
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="30%"
          y="10%"
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#0015ff] text-white rounded-full hover:cursor-pointer px-8 py-4">
            react
          </div>
        </MatterBody>
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="30%"
          y="30%"
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#e794da] text-white rounded-full hover:cursor-grab px-8 py-4 ">
            typescript
          </div>
        </MatterBody>
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="40%"
          y="20%"
          angle={10}
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#1f464d] text-white rounded-full hover:cursor-grab px-8 py-4 ">
            motion
          </div>
        </MatterBody>
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="75%"
          y="10%"
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#ff5941] text-white rounded-full hover:cursor-grab px-8 py-4 ">
            tailwind
          </div>
        </MatterBody>
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="80%"
          y="20%"
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#f97316] text-white rounded-full hover:cursor-grab px-8 py-4 ">
            drei
          </div>
        </MatterBody>
        <MatterBody
          matterBodyOptions={{ friction: 0.5, restitution: 0.2 }}
          x="50%"
          y="10%"
        >
          <div className="text-xl sm:text-2xl md:text-3xl bg-[#ffd726] text-white rounded-full hover:cursor-grab px-8 py-4 ">
            matter-js
          </div>
        </MatterBody>
      </Gravity>
      <div
        className="mx-auto flex w-full flex-col items-center gap-7 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1
            className="font-heading text-5xl font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            Online eszközök egy helyen.
          </h1>
          <p
            className="text-muted-foreground max-w-2xl text-lg leading-relaxed sm:text-xl"
          >
            A Morf egyszerű böngészős eszközöket gyűjt össze képekhez,
            fájlokhoz, színekhez és online tartalmakhoz. Válassz egy feladatot,
            és nyisd meg a hozzá tartozó eszközt.
          </p>
        </div>
        <div className="relative mt-30">
          <img
            src={morfPeeking.src}
            className="absolute w-auto h-30 top-0 left-1/2 right-1/2 -translate-y-full -translate-x-1/2"
            alt=""
          />
          <a href="#eszkozok" className={buttonVariants({ size: "lg" })}>
            Elérhető eszközök megtekintése
          </a>
        </div>
      </div>
    </section>
  )
}

export default HomeHeroGravity
