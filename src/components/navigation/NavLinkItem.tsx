import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { NavigationItem } from "../../app/routes";
import { ensureDatabaseReady } from "../../db";
import { getActiveTripId } from "../../db/repositories/app-settings-repository";
import { cn } from "../../lib/cn";

type NavLinkItemProps = {
  item: NavigationItem;
  variant: "mobile" | "desktop";
};

export function NavLinkItem({ item, variant }: NavLinkItemProps) {
  const Icon = item.icon;
  const { pathname } = useLocation();
  const [activeTripId, setActiveTripId] = useState<string | undefined>();
  const to = getNavigationTarget(item, activeTripId);
  const isActive = isNavigationItemActive(item, pathname);

  useEffect(() => {
    if (
      !["Itinerary", "Pack", "Outfits", "Gadgets", "Bags"].includes(item.label)
    ) {
      return;
    }

    let cancelled = false;
    ensureDatabaseReady()
      .then(() => getActiveTripId())
      .then((tripId) => {
        if (!cancelled) {
          setActiveTripId(tripId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveTripId(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item.label, pathname]);

  return (
    <Link
      to={to}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        variant === "desktop" &&
          (isActive
            ? "min-h-12 rounded-2xl bg-teal px-3 py-2 text-white shadow-tactile hover:bg-tealDeep hover:text-white focus-visible:bg-teal focus-visible:text-white"
            : "min-h-12 rounded-2xl px-3 py-2 text-charcoalSoft hover:bg-tealSoft hover:text-tealDeep hover:shadow-tactile"),
        variant === "mobile" &&
          "min-h-14 flex-1 flex-col justify-center gap-1 rounded-[1.1rem] px-1 text-xs text-charcoalSoft",
        isActive &&
          variant === "mobile" &&
          "bg-tealSoft text-tealDeep shadow-tactile",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl transition",
          variant === "desktop" &&
            (isActive
              ? "h-9 w-9 bg-white/20 text-white group-hover:bg-white/25 group-hover:text-white"
              : "h-9 w-9 bg-creamSoft text-teal group-hover:bg-white group-hover:text-tealDeep"),
          variant === "mobile" && "h-7 w-7",
          isActive && variant === "mobile" && "bg-white text-teal",
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "shrink-0",
            variant === "desktop" && "h-5 w-5",
            variant === "mobile" && "h-4 w-4",
          )}
        />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function getNavigationTarget(item: NavigationItem, activeTripId?: string) {
  if (!activeTripId) {
    return item.to;
  }

  if (item.label === "Pack") {
    return `/trips/${activeTripId}/pack`;
  }

  if (item.label === "Itinerary") {
    return `/trips/${activeTripId}/itinerary`;
  }

  if (item.label === "Outfits") {
    return `/trips/${activeTripId}/outfits`;
  }

  if (item.label === "Gadgets") {
    return `/trips/${activeTripId}/gadgets`;
  }

  if (item.label === "Bags") {
    return `/trips/${activeTripId}/bags`;
  }

  return item.to;
}

function isNavigationItemActive(item: NavigationItem, pathname: string) {
  if (item.to === "/") {
    return pathname === "/";
  }

  if (item.label === "Trips") {
    return (
      pathname === "/trips" ||
      pathname === "/trips/new" ||
      pathname.endsWith("/edit") ||
      /^\/trips\/[^/]+$/.test(pathname)
    );
  }

  if (item.label === "Pack") {
    return pathname.endsWith("/pack");
  }

  if (item.label === "Itinerary") {
    return pathname.endsWith("/itinerary");
  }

  if (item.label === "Outfits") {
    return pathname.endsWith("/outfits");
  }

  if (item.label === "Gadgets") {
    return pathname.endsWith("/gadgets");
  }

  if (item.label === "Bags") {
    return pathname.endsWith("/bags");
  }

  return item.match.some(
    (match) => pathname === match || pathname.startsWith(`${match}/`),
  );
}
