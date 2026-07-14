import { Link } from "@tanstack/react-router";
import { BurgerMenu } from "@/components/pim/start-go/BurgerMenu";
import { LocalStatusPill } from "@/components/pim/start-go/LocalStatusPill";
import { ModeSwitcher } from "./ModeSwitcher";
import type { ProductMode } from "./types";

export function AppHeader({ mode }: { mode: ProductMode }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0f1b3d]/85 backdrop-blur border-b border-[#3b6fa0]/25">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link
          to="/"
          className="font-serif-display text-lg text-[#e8edf3] shrink-0"
          aria-label="Project PiM — home"
        >
          PiM
        </Link>
        <div className="mx-2 hidden sm:block">
          <ModeSwitcher active={mode} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block">
            <LocalStatusPill />
          </div>
          <BurgerMenu />
        </div>
      </div>
      <div className="sm:hidden px-4 pb-3">
        <ModeSwitcher active={mode} />
      </div>
    </header>
  );
}
