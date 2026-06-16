import { FeaturePreviewCard } from "../cards/FeaturePreviewCard";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  comingLater: string[];
};

export function PlaceholderScreen({
  title,
  description,
  comingLater,
}: PlaceholderScreenProps) {
  return (
    <section className="space-y-5">
      <div className="pp-page-hero rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-7">
        <p className="text-sm font-semibold uppercase text-teal">
          Coming later
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-normal text-charcoal sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal/74">
          {description}
        </p>
        <p className="mt-5 rounded-lg border border-dashed border-amberSoft/55 bg-amberSoft/12 px-4 py-3 text-sm leading-6 text-charcoal/74">
          This area will be implemented in a later tranche. There is no live
          trip data, checklist logic or saved content in this foundation build.
        </p>
      </div>

      <div className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-semibold text-charcoal">
          Planned foundation area
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {comingLater.map((item) => (
            <FeaturePreviewCard key={item} label={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}
