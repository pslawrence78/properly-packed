import { Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { AppRecoveryBoundary } from "../components/app-shell/AppRecoveryBoundary";
import { AppStatusBanners } from "../components/app-shell/AppStatusBanners";
import { Header } from "../components/app-shell/Header";
import { MobileNavigation } from "../components/navigation/MobileNavigation";
import { SidebarNavigation } from "../components/navigation/SidebarNavigation";
import { useDatabaseBootstrap } from "../hooks/use-database-bootstrap";
import { appRoutes } from "./routes";

export function AppShell() {
  useDatabaseBootstrap();

  return (
    <div className="min-h-screen text-charcoal">
      <a
        className="fixed left-4 top-3 z-50 -translate-y-24 rounded-lg bg-charcoal px-4 py-3 font-semibold text-white transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex min-h-screen w-full max-w-[92rem] lg:px-5">
        <SidebarNavigation />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <AppStatusBanners />
          <main
            className="flex-1 px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6"
            id="main-content"
          >
            <AppRecoveryBoundary>
              <Suspense fallback={<RouteLoadingState />}>
                <Routes>
              {appRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={route.element}
                />
              ))}
              <Route
                path="*"
                element={
                  <section className="rounded-lg border border-charcoal/10 bg-paper p-6 shadow-soft sm:p-8">
                    <p className="text-sm font-semibold uppercase tracking-wide text-teal">
                      Page unavailable
                    </p>
                    <h1 className="mt-3 text-3xl font-bold tracking-normal">
                      Page not found
                    </h1>
                    <p className="mt-3 max-w-2xl text-base text-charcoal/75">
                      This link may be out of date. Return to your trips or start a
                      new one.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link className="trip-action" to="/trips">
                        View trips
                      </Link>
                      <Link className="trip-action" to="/trips/new">
                        Create trip
                      </Link>
                    </div>
                  </section>
                }
              />
                </Routes>
              </Suspense>
            </AppRecoveryBoundary>
          </main>
        </div>
      </div>
      <MobileNavigation />
    </div>
  );
}

function RouteLoadingState() {
  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-charcoal/10 bg-paper p-6 text-sm text-charcoal/70 shadow-soft"
    >
      Opening this screen...
    </section>
  );
}
