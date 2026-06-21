import { Component, type ErrorInfo, type ReactNode } from "react";

export class AppRecoveryBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Properly Packed could not render the current screen.", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section
        className="mx-auto mt-6 max-w-2xl rounded-lg border border-clay/30 bg-paper p-6 shadow-soft sm:p-8"
        role="alert"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-clay">
          Screen unavailable
        </p>
        <h1 className="mt-3 text-2xl font-bold text-charcoal">
          Properly Packed hit an unexpected problem
        </h1>
        <p className="mt-3 text-sm leading-6 text-charcoal/75">
          Your local data has not been cleared. Reload the app and try again; if
          the problem continues, create a backup from Settings before making
          further changes.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="trip-action" onClick={() => window.location.reload()} type="button">
            Reload app
          </button>
          <a
            className="trip-action"
            href={`${import.meta.env.BASE_URL}settings/import-export`}
          >
            Backup settings
          </a>
        </div>
      </section>
    );
  }
}
