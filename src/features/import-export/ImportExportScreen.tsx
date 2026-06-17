import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ensureDatabaseReady, resetDatabaseReadyCache } from "../../db";
import { PageSection } from "../../components/layout/PageSection";
import {
  exportTableNames,
  type ExportTableName,
  type ImportPreview,
  type ProperlyPackedExport,
} from "./export-schema";
import {
  createExportFilename,
  createImportPreview,
  generateExportData,
  parseImportJson,
  replaceDataFromExport,
  resetLocalData,
  stringifyExport,
} from "./import-export-service";

type PendingImport = {
  data: ProperlyPackedExport;
  fileName?: string;
  preview: ImportPreview;
};

const tableLabels: Record<ExportTableName, string> = {
  travellers: "Travellers",
  trips: "Trips",
  tripItineraryDays: "Trip itinerary days",
  packingItems: "Packing items",
  bags: "Bags",
  outfits: "Outfits",
  outfitItems: "Outfit items",
  gadgetBundles: "Gadget bundles",
  gadgetBundleItems: "Gadget bundle items",
  templates: "Templates",
  templateItems: "Template items",
  usefulExtras: "Useful extras",
  preTripTasks: "Pre-trip tasks",
  postTripReviews: "Post-trip reviews",
  reviewLearnings: "Review learnings",
  appSettings: "App settings",
  auditEvents: "Audit events",
};

export function ImportExportScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport>();
  const [pasteValue, setPasteValue] = useState("");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleExport() {
    setExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await ensureDatabaseReady();
      const exportData = await generateExportData();
      const blob = new Blob([stringifyExport(exportData)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = createExportFilename(exportData.exportedAt);
      link.click();
      URL.revokeObjectURL(url);
      setSuccessMessage("Backup export prepared.");
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelected(file?: File) {
    if (!file) {
      return;
    }

    await previewImportText(await file.text(), file.name);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function previewImportText(text: string, fileName?: string) {
    setErrorMessage("");
    setSuccessMessage("");
    setPendingImport(undefined);
    setReplaceConfirmed(false);

    try {
      if (!text.trim()) {
        throw new Error("Choose or paste a JSON backup first.");
      }

      const data = parseImportJson(text);
      setPendingImport({
        data,
        fileName,
        preview: createImportPreview(data),
      });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    }
  }

  async function handleReplaceImport() {
    if (!pendingImport || !replaceConfirmed) {
      return;
    }

    setImporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await replaceDataFromExport(pendingImport.data);
      resetDatabaseReadyCache();
      setPendingImport(undefined);
      setPasteValue("");
      setReplaceConfirmed(false);
      setSuccessMessage("Backup imported. Refreshing the app will show the restored data.");
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setImporting(false);
    }
  }

  async function handleResetLocalData() {
    const firstConfirmed = window.confirm(
      "Reset all Properly Packed data on this device? Export a backup first if you might need it.",
    );

    if (!firstConfirmed) {
      return;
    }

    const finalConfirmed = window.confirm(
      "This will permanently clear trips, packing lists, reviews, outfits and bags from this device, then restore foundation seed data.",
    );

    if (!finalConfirmed) {
      return;
    }

    setResetting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await resetLocalData();
      resetDatabaseReadyCache();
      setPendingImport(undefined);
      setPasteValue("");
      setReplaceConfirmed(false);
      setSuccessMessage("Local data reset. Foundation data has been restored.");
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-blueSoft px-3 py-1 text-sm font-bold uppercase tracking-wide text-tealDeep">
          <FileJson aria-hidden="true" className="h-4 w-4" />
          Settings
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
              Import and Export
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
              Create a portable JSON backup of this device's local data, or
              replace the local database from a valid Properly Packed export.
            </p>
          </div>
          <Link className="trip-action shrink-0" to="/settings">
            Settings
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-clay/30 bg-clay/10 p-4 text-sm leading-6 text-charcoal/78">
        <div className="flex gap-3">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-clay"
          />
          <p>
            Backup files can include names, destinations, travel dates, packing
            notes and app settings. Store exports somewhere private and trusted.
          </p>
        </div>
      </div>

      {successMessage ? <StatusMessage kind="success" message={successMessage} /> : null}
      {errorMessage ? <StatusMessage kind="error" message={errorMessage} /> : null}

      <PageSection title="Export backup">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-6 text-charcoal/72">
            Export every local table using the properly-packed-export-v1 schema.
            The JSON includes a schema version and export timestamp.
          </p>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slateAccent px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            disabled={exporting}
            onClick={handleExport}
            type="button"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {exporting ? "Preparing..." : "Export JSON"}
          </button>
        </div>
      </PageSection>

      <PageSection title="Import backup">
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="rounded-lg border border-charcoal/10 bg-cream p-4">
              <div className="flex items-start gap-3">
                <FileJson
                  aria-hidden="true"
                  className="mt-1 h-5 w-5 shrink-0 text-teal"
                />
                <div>
                  <h2 className="text-base font-semibold text-charcoal">
                    Choose JSON file
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-charcoal/70">
                    Select a previous Properly Packed export to validate and
                    preview before replacing local data.
                  </p>
                </div>
              </div>
              <input
                accept="application/json,.json"
                className="mt-4 block w-full rounded-lg border border-charcoal/15 bg-paper px-3 py-3 text-sm text-charcoal file:mr-3 file:rounded-lg file:border-0 file:bg-slateAccent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cream"
                onChange={(event) => handleFileSelected(event.currentTarget.files?.[0])}
                ref={fileInputRef}
                type="file"
              />
            </div>

            <div className="rounded-lg border border-charcoal/10 bg-cream p-4">
              <label className="block text-base font-semibold text-charcoal">
                Paste JSON
              </label>
              <textarea
                className="mt-3 min-h-36 w-full rounded-lg border border-charcoal/15 bg-paper p-3 text-sm leading-6 text-charcoal outline-none focus:border-teal"
                onChange={(event) => setPasteValue(event.target.value)}
                placeholder="{"
                value={pasteValue}
              />
              <button
                className="trip-action mt-3 gap-2"
                onClick={() => previewImportText(pasteValue)}
                type="button"
              >
                <Upload aria-hidden="true" className="h-4 w-4" />
                Preview pasted JSON
              </button>
            </div>
          </div>

          {pendingImport ? (
            <ImportPreviewPanel
              importing={importing}
              pendingImport={pendingImport}
              replaceConfirmed={replaceConfirmed}
              onConfirmChange={setReplaceConfirmed}
              onReplace={handleReplaceImport}
            />
          ) : (
            <p className="rounded-lg border border-charcoal/10 bg-paper px-4 py-3 text-sm text-charcoal/65">
              No valid backup selected yet.
            </p>
          )}
        </div>
      </PageSection>

      <PageSection title="Reset this device">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl text-sm leading-6 text-charcoal/72">
            <p>
              Clear this device's local database and restore the foundation seed
              data. This does not affect any exported backup files.
            </p>
            <p className="mt-2 font-medium text-clay">
              Export a backup first if there is anything here you might want
              again.
            </p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-clay px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            disabled={resetting}
            onClick={handleResetLocalData}
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {resetting ? "Resetting..." : "Reset local data"}
          </button>
        </div>
      </PageSection>
    </section>
  );
}

function ImportPreviewPanel({
  importing,
  onConfirmChange,
  onReplace,
  pendingImport,
  replaceConfirmed,
}: {
  importing: boolean;
  onConfirmChange: (value: boolean) => void;
  onReplace: () => void;
  pendingImport: PendingImport;
  replaceConfirmed: boolean;
}) {
  const totalRows = exportTableNames.reduce(
    (total, tableName) => total + pendingImport.preview.counts[tableName],
    0,
  );

  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Import preview</h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/70">
            {pendingImport.fileName ?? "Pasted JSON"} -{" "}
            {pendingImport.preview.schemaVersion} - exported{" "}
            {formatDateTime(pendingImport.preview.exportedAt)}
          </p>
          <p className="mt-1 text-sm text-charcoal/70">
            App version {pendingImport.preview.appVersion}, {totalRows} total
            rows.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {exportTableNames.map((tableName) => (
          <div className="rounded-lg bg-cream p-3" key={tableName}>
            <dt className="text-xs font-semibold uppercase text-charcoal/55">
              {tableLabels[tableName]}
            </dt>
            <dd className="mt-1 text-xl font-semibold text-charcoal">
              {pendingImport.preview.counts[tableName]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-lg border border-clay/30 bg-clay/10 p-4">
        <label className="flex gap-3 text-sm font-medium leading-6 text-charcoal">
          <input
            checked={replaceConfirmed}
            className="mt-1 h-4 w-4 accent-teal"
            onChange={(event) => onConfirmChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            I understand this will replace all local Properly Packed data on
            this device.
          </span>
        </label>
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-clay px-4 py-3 text-sm font-semibold text-cream shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!replaceConfirmed || importing}
          onClick={onReplace}
          type="button"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          {importing ? "Replacing..." : "Replace local data"}
        </button>
      </div>
    </section>
  );
}

function StatusMessage({ kind, message }: { kind: "error" | "success"; message: string }) {
  const isSuccess = kind === "success";

  return (
    <div
      className={`rounded-lg border p-4 text-sm leading-6 ${
        isSuccess
          ? "border-teal/30 bg-teal/10 text-charcoal/78"
          : "border-clay/30 bg-clay/10 text-charcoal/78"
      }`}
      role="status"
    >
      <div className="flex gap-3">
        {isSuccess ? (
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-teal"
          />
        ) : (
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-clay"
          />
        )}
        <p>{message}</p>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
