import type { ReactNode } from "react";

type PanelProps = { title?: string; sub?: string; children: ReactNode };

export function Panel({ title, sub, children }: PanelProps) {
  return (
    <section className="panel">
      {(title || sub) && (
        <div className="panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
