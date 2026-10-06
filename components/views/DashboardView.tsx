import { MetricCard } from "@/components/MetricCard";
import { Panel } from "@/components/Panel";
import { SalesTable } from "@/components/SalesTable";
import { formatMoney, localDay } from "@/lib/format";
import type { Language, Product, Sale } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type DashboardViewProps = {
  w: AppCopy;
  lang: Language;
  sales: Sale[];
  recent: Sale[];
  products: Product[];
  lowProducts: Product[];
  categories: Record<string, string>;
  units: Record<string, string>;
  loading: boolean;
};

export function DashboardView({ w, lang, sales, recent, products, lowProducts, categories, units, loading }: DashboardViewProps) {
  const todaySales = sales.filter((sale) => localDay(sale.created_at) === localDay(new Date()));
  return <>
    <div className="greeting">
      <div><h1>{w.welcome} 👋</h1><p>{w.welcomeSub}</p></div>
      <span className="date-chip">{new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span>
    </div>
    <div className="metrics">
      <MetricCard icon="₹" label={w.todaySales} value={formatMoney(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0))}/>
      <MetricCard icon="🧾" label={w.ordersToday} value={String(todaySales.length)}/>
      <MetricCard icon="📦" label={w.products} value={String(products.length)}/>
      <MetricCard icon="⚠️" label={w.lowItems} value={String(lowProducts.length)}/>
    </div>
    <div className="two-col">
      <Panel title={w.overview} sub={w.last7}>
        <div className="week-chart">{Array.from({ length: 7 }, (_, index) => {
          const day = new Date(); day.setDate(day.getDate() - (6 - index));
          const daySales = sales.filter((sale) => localDay(sale.created_at) === localDay(day));
          const revenue = daySales.reduce((sum, sale) => sum + Number(sale.total), 0);
          const max = Math.max(1, ...sales.map((sale) => Number(sale.total)));
          return <div className="day-bar" key={index}><div className="bar-track"><i style={{ height: `${Math.max(revenue ? 5 : 0, revenue / max * 100)}%` }}/></div><small>{new Intl.DateTimeFormat(lang === "ta" ? "ta-IN" : "en-IN", { weekday: "short" }).format(day)}</small></div>;
        })}</div>
      </Panel>
      <Panel title={w.alerts} sub={`${lowProducts.length} ${w.lowItems.toLowerCase()}`}>
        <div className="alert-list">{loading ? <p>{w.loading}</p> : lowProducts.length ? lowProducts.slice(0, 6).map((product) => <div className="alert-row" key={product.id}><span className="food">🥨</span><div><b>{product.name}</b><small>{categories[product.category] || product.category}</small></div><strong>{product.stock} {units[product.unit] || product.unit}</strong></div>) : <p className="muted">{w.noAlerts}</p>}</div>
      </Panel>
    </div>
    <Panel title={w.recent}><SalesTable rows={recent} lang={lang} w={w}/></Panel>
  </>;
}
