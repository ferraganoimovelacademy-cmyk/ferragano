import type { ReactNode } from "react";
import { SiteLayout } from "./SiteLayout";

export function PublicPage({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 py-16 md:px-8 md:py-24">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight font-semibold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{lead}</p>
        {children && <div className="mt-12">{children}</div>}
      </div>
    </SiteLayout>
  );
}
