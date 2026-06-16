type FeaturePreviewCardProps = {
  label: string;
};

export function FeaturePreviewCard({ label }: FeaturePreviewCardProps) {
  return (
    <li className="rounded-2xl border border-sandMuted/45 bg-creamSoft/80 px-4 py-3 text-sm font-semibold text-charcoalSoft shadow-tactile">
      {label}
    </li>
  );
}
