import { Luggage, Sparkles } from "lucide-react";
import { APP_NAME, APP_TAGLINE, APP_VERSION } from "../../lib/app-version";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-sandMuted/40 bg-cream/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:static lg:border-b-0 lg:bg-transparent lg:px-8 lg:pb-2 lg:pt-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 rotate-[-3deg] items-center justify-center rounded-[1.15rem] border border-sandMuted/50 bg-white shadow-tactile">
            <Luggage aria-hidden="true" className="h-6 w-6 text-teal" />
          </div>
          <div>
            <p className="text-xl font-bold leading-tight tracking-normal text-charcoal sm:text-2xl">
              {APP_NAME}
            </p>
            <p className="mt-1 max-w-[18rem] text-sm font-medium leading-snug text-charcoalSoft sm:max-w-none">
              {APP_TAGLINE}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-sandMuted/50 bg-white/80 px-3 py-2 text-xs font-semibold text-charcoalSoft shadow-tactile lg:flex">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-coral" />
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </header>
  );
}
