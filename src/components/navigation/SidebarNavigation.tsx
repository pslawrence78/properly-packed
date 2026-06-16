import { Compass, Luggage } from "lucide-react";
import { APP_NAME, APP_VERSION } from "../../lib/app-version";
import { desktopNavigation } from "../../app/routes";
import { NavLinkItem } from "./NavLinkItem";

export function SidebarNavigation() {
  return (
    <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-72 shrink-0 self-start py-4 lg:block">
      <div className="flex h-full flex-col rounded-[1.75rem] border border-sandMuted/50 bg-white/80 p-4 shadow-travel backdrop-blur-xl">
        <div className="rounded-[1.35rem] border border-sandMuted/40 bg-creamSoft/80 p-4 shadow-tactile">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 rotate-[-4deg] items-center justify-center rounded-2xl bg-teal text-white shadow-tactile">
              <Luggage aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-normal text-charcoal">
                {APP_NAME}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-teal">
                Travel Joy v{APP_VERSION}
              </p>
            </div>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="mt-5 space-y-1.5">
          {desktopNavigation.map((item) => (
            <NavLinkItem key={item.label} item={item} variant="desktop" />
          ))}
        </nav>
        <div className="mt-auto rounded-[1.25rem] border border-dashed border-teal/35 bg-tealSoft/80 px-4 py-4 text-sm leading-6 text-charcoalSoft">
          <div className="mb-2 flex items-center gap-2 font-semibold text-tealDeep">
            <Compass aria-hidden="true" className="h-4 w-4" />
            Next adventure
          </div>
          Demo trip links follow the active trip when one is set.
        </div>
      </div>
    </aside>
  );
}
