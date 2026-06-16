import type { ReactNode } from "react";

type PageSectionProps = {
  title: string;
  children: ReactNode;
};

export function PageSection({ title, children }: PageSectionProps) {
  return (
    <section className="rounded-lg border border-charcoal/10 bg-paper p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-normal text-charcoal">
        <span className="h-2.5 w-2.5 rounded-full bg-coral shadow-tactile" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
