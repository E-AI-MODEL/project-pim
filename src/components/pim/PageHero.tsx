import { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}

export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-32 -left-20 w-96 h-96 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -top-20 right-10 w-80 h-80 bg-cyan/10 blur-3xl rounded-full pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {eyebrow}
        </div>
        <h1 className="font-display mt-5 text-4xl md:text-6xl font-bold tracking-tight max-w-4xl leading-[1.05]">
          {title}
        </h1>
        <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
