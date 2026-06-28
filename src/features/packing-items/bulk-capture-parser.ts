import type { PackingStatus } from "../../db/types";
import type { BulkParsedLine } from "./bulk-capture-types";

const ACTION_VERBS: Record<string, PackingStatus> = {
  buy: "to-buy",
  charge: "to-charge",
  decide: "to-decide",
  download: "to-download",
  wash: "to-wash",
};

export function parseBulkCaptureText(text: string): BulkParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((line, index) => parseBulkCaptureLine(line, index + 1))
    .filter((line): line is BulkParsedLine => Boolean(line));
}

export function parseBulkCaptureLine(
  line: string,
  lineNumber = 1,
): BulkParsedLine | undefined {
  const originalLine = line;
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const [head, ...metadataParts] = trimmed.split("/").map((part) => part.trim());
  let working = head ?? "";
  let ownerToken: string | undefined;
  const warnings: string[] = [];

  const ownerMatch = working.match(/^([^:]{1,48}):\s*(.+)$/);
  if (ownerMatch) {
    ownerToken = ownerMatch[1].trim();
    working = ownerMatch[2].trim();
  }

  const actionMatch = working.match(/^(buy|charge|download|wash|decide)\s+(.+)$/i);
  const status = actionMatch
    ? ACTION_VERBS[actionMatch[1].toLocaleLowerCase()]
    : undefined;
  if (actionMatch) {
    working = actionMatch[2].trim();
  }

  const quantityMatch = working.match(/\s+x\s*(\S+)$/i);
  let quantity = 1;
  if (quantityMatch) {
    const rawQuantity = quantityMatch[1];
    if (/^[1-9]\d*$/.test(rawQuantity)) {
      quantity = Number(rawQuantity);
      working = working.slice(0, quantityMatch.index).trim();
    } else {
      warnings.push(`Invalid quantity "${rawQuantity}".`);
    }
  }

  if (!working) {
    warnings.push("Enter an item name.");
  }

  return {
    id: `bulk-line:${lineNumber}`,
    lineNumber,
    originalLine,
    ownerToken,
    name: working,
    quantity,
    slashTokens: metadataParts.filter(Boolean),
    status,
    warnings,
  };
}
