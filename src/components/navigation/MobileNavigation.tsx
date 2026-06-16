import { mobileNavigation } from "../../app/routes";
import { NavLinkItem } from "./NavLinkItem";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-between gap-1 rounded-[1.55rem] border border-sandMuted/50 bg-white/90 p-2 shadow-travel backdrop-blur-xl">
        {mobileNavigation.map((item) => (
          <NavLinkItem key={item.label} item={item} variant="mobile" />
        ))}
      </div>
    </nav>
  );
}
