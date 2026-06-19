import type { LucideIcon } from "lucide-react";
import {
  Backpack,
  Cable,
  CalendarDays,
  Home,
  Library,
  Luggage,
  Plane,
  Settings,
  Shirt,
  Users,
} from "lucide-react";
import { BagsScreen } from "../features/bags/BagsScreen";
import { DashboardScreen } from "../features/dashboard/DashboardScreen";
import { GadgetLibraryScreen, GadgetPlannerScreen } from "../features/gadgets";
import { ImportExportScreen } from "../features/import-export";
import { ItineraryScreen } from "../features/itinerary";
import { OutfitPlannerScreen } from "../features/outfits";
import { PackingListScreen } from "../features/packing-items/PackingListScreen";
import { PostTripReviewScreen } from "../features/reviews";
import { SettingsScreen } from "../features/settings/SettingsScreen";
import { ContextsSettingsScreen } from "../features/settings/ContextsSettingsScreen";
import { TemplateLibraryScreen, TripTemplatesScreen } from "../features/templates";
import { CreateTripScreen } from "../features/trips/CreateTripScreen";
import { EditTripScreen } from "../features/trips/EditTripScreen";
import { TripOverviewScreen } from "../features/trips/TripOverviewScreen";
import { TripsScreen } from "../features/trips/TripsScreen";
import { TravellersScreen } from "../features/travellers/TravellersScreen";
import { UsefulExtrasScreen } from "../features/useful-extras";

export type AppRoute = {
  path: string;
  title: string;
  description: string;
  comingLater: string[];
  element: JSX.Element;
};

export type NavigationItem = {
  label: string;
  to: string;
  tripPath?: "itinerary" | "pack" | "outfits" | "gadgets" | "bags";
  icon: LucideIcon;
  match: string[];
};

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    title: "Dashboard",
    description:
      "Shows the active trip and local trip summary for the current tranche.",
    comingLater: ["Packing readiness", "Outstanding actions", "Family progress"],
    element: <DashboardScreen />,
  },
  {
    path: "/trips",
    title: "Trips",
    description: "Create, review and reuse family travel plans.",
    comingLater: ["Packing items", "Deep duplication", "Post-trip review"],
    element: <TripsScreen />,
  },
  {
    path: "/trips/new",
    title: "Create Trip",
    description: "Capture trip basics, dates, travellers and contexts.",
    comingLater: ["Packing items", "Template generation"],
    element: <CreateTripScreen />,
  },
  {
    path: "/trips/:tripId/edit",
    title: "Edit Trip",
    description: "Update trip basics, dates, travellers and contexts.",
    comingLater: ["Packing items", "Template generation"],
    element: <EditTripScreen />,
  },
  {
    path: "/trips/:tripId",
    title: "Trip Overview",
    description: "Shows one trip's summary and quick links.",
    comingLater: ["Packing list", "Outfits", "Gadgets", "Bags", "Review"],
    element: <TripOverviewScreen />,
  },
  {
    path: "/trips/:tripId/itinerary",
    title: "Itinerary",
    description: "Map trip days to destinations, travel, stays and activities.",
    comingLater: ["Packing rules", "Outfit prompts", "Printable itinerary"],
    element: <ItineraryScreen />,
  },
  {
    path: "/travellers",
    title: "Travellers",
    description: "Create and manage the people included in trips.",
    comingLater: ["Traveller templates", "Per-person defaults"],
    element: <TravellersScreen />,
  },
  {
    path: "/trips/:tripId/pack",
    title: "Packing List",
    description: "Add, edit and check off packing items.",
    comingLater: ["Bags", "Templates", "Dependencies"],
    element: <PackingListScreen />,
  },
  {
    path: "/trips/:tripId/templates",
    title: "Templates",
    description: "Preview and apply trip packing suggestions.",
    comingLater: ["Template editor", "Rule builder", "Single-trip import"],
    element: <TripTemplatesScreen />,
  },
  {
    path: "/trips/:tripId/bags",
    title: "Bags",
    description: "Shows where each item is packed.",
    comingLater: ["Bag weight", "Capacity", "Printable bag lists"],
    element: <BagsScreen />,
  },
  {
    path: "/trips/:tripId/outfits",
    title: "Outfit Planner",
    description: "Plan trip outfits by day, date, type and traveller.",
    comingLater: ["Outfit photos", "Wardrobe inventory", "Laundry optimisation"],
    element: <OutfitPlannerScreen />,
  },
  {
    path: "/trips/:tripId/gadgets",
    title: "Gadget Planner",
    description: "Apply gadget bundles and track charge/download dependencies.",
    comingLater: ["Device inventory", "Smart cable inference", "Drone law automation"],
    element: <GadgetPlannerScreen />,
  },
  {
    path: "/trips/:tripId/review",
    title: "Post-Trip Review",
    description: "Capture trip learnings for future packing.",
    comingLater: ["AI summaries", "Cross-device learning sync"],
    element: <PostTripReviewScreen />,
  },
  {
    path: "/library",
    title: "Library",
    description: "Reusable family travel knowledge.",
    comingLater: ["Gadget bundles", "Past learnings", "Full editor"],
    element: <TemplateLibraryScreen />,
  },
  {
    path: "/library/templates",
    title: "Templates",
    description: "Reusable trip template suggestions.",
    comingLater: ["Full editor", "Rule builder", "Template import"],
    element: <TemplateLibraryScreen />,
  },
  {
    path: "/library/useful-extras",
    title: "Useful Extras",
    description: "Useful but easy-to-forget items.",
    comingLater: ["Custom extras", "Post-trip promotion", "Filters"],
    element: <UsefulExtrasScreen />,
  },
  {
    path: "/library/gadgets",
    title: "Gadget Bundles",
    description: "Reusable gadget, charger, cable and download kits.",
    comingLater: ["Bundle editor", "Device inventory", "Dependency inference"],
    element: <GadgetLibraryScreen />,
  },
  {
    path: "/settings/contexts",
    title: "Trip Contexts",
    description: "Manage reusable trip context options.",
    comingLater: ["Template rule editor", "Itinerary assignment"],
    element: <ContextsSettingsScreen />,
  },
  {
    path: "/settings/import-export",
    title: "Import and Export",
    description: "Create and restore local JSON backups.",
    comingLater: ["Merge import", "Single-trip import", "Automatic sync"],
    element: <ImportExportScreen />,
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Manage local data, travellers, trip options and app details.",
    comingLater: [
      "Version",
      "Local-first data",
      "Import and export",
      "Future reset options",
    ],
    element: <SettingsScreen />,
  },
];

export const desktopNavigation: NavigationItem[] = [
  { label: "Dashboard", to: "/", icon: Home, match: ["/"] },
  { label: "Trips", to: "/trips", icon: Plane, match: ["/trips"] },
  {
    label: "Itinerary",
    to: "/trips",
    tripPath: "itinerary",
    icon: CalendarDays,
    match: [],
  },
  {
    label: "Travellers",
    to: "/travellers",
    icon: Users,
    match: ["/travellers"],
  },
  {
    label: "Pack",
    to: "/trips",
    tripPath: "pack",
    icon: Backpack,
    match: [],
  },
  {
    label: "Outfits",
    to: "/trips",
    tripPath: "outfits",
    icon: Shirt,
    match: [],
  },
  {
    label: "Gadgets",
    to: "/trips",
    tripPath: "gadgets",
    icon: Cable,
    match: [],
  },
  {
    label: "Bags",
    to: "/trips",
    tripPath: "bags",
    icon: Luggage,
    match: [],
  },
  { label: "Library", to: "/library", icon: Library, match: ["/library"] },
  { label: "Settings", to: "/settings", icon: Settings, match: ["/settings"] },
];

export const mobileNavigation: NavigationItem[] = [
  { label: "Trips", to: "/trips", icon: Plane, match: ["/trips"] },
  {
    label: "Itinerary",
    to: "/trips",
    tripPath: "itinerary",
    icon: CalendarDays,
    match: [],
  },
  {
    label: "Pack",
    to: "/trips",
    tripPath: "pack",
    icon: Backpack,
    match: [],
  },
  {
    label: "Outfits",
    to: "/trips",
    tripPath: "outfits",
    icon: Shirt,
    match: [],
  },
  {
    label: "Bags",
    to: "/trips",
    tripPath: "bags",
    icon: Luggage,
    match: [],
  },
  {
    label: "More",
    to: "/settings",
    icon: Settings,
    match: ["/settings", "/travellers", "/library"],
  },
];
