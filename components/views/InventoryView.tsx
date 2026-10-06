import { Panel } from "@/components/Panel";
import type { Product } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type InventoryViewProps = {
  w: AppCopy;
  products: Product[];
  categories: Record<string, string>;
  units: Record<string, string>;
  stockFilter: string;
  setStockFilter: (value: string) => void;
  status: (product: Product) => string;
  onAddProduct: () => void;
  onRestock: (product: Product) => void;
  loading: boolean;
  lang: "en" | "ta";
};

export function InventoryView({ w, products, categories, units, stockFilter, setStockFilter, status, onAddProduct, onRestock, loading, lang }: InventoryViewProps) {
  const filteredProducts = products.filter((product) => stockFilter === "all" || (stockFilter === "low" ? Number(product.stock) <= Number(product.low_stock_threshold) : Number(product.stock) > Number(product.low_stock_threshold)));
  return <>
    <div className="page-title"><div><h1>{w.inventory}</h1><p>{lang === "ta" ? "உங்கள் பொருட்களையும் கையிருப்பையும் கண்காணிக்கவும்." : "Track your products and keep stock up to date."}</p></div><button className="primary" onClick={onAddProduct}>＋ {w.addProduct}</button></div>
    <div className="toolbar"><select className="filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="all">{w.allStock}</option><option value="low">{w.lowOnly}</option><option value="available">{w.inStock}</option></select></div>
    <Panel><div className="table-wrap"><table><thead><tr><th>{w.product}</th><th>{w.category}</th><th>{w.stock}</th><th>{w.unit}</th><th>{w.price}</th><th>{w.status}</th><th>{w.actions}</th></tr></thead><tbody>
      {filteredProducts.map((product) => <tr key={product.id}><td className="strong">🥨 {product.name}</td><td>{categories[product.category] || product.category}</td><td>{product.stock}</td><td>{units[product.unit] || product.unit}</td><td>₹{Number(product.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td><span className={`badge ${status(product) === w.inStockLabel ? "" : "low"}`}>{status(product)}</span></td><td><button className="action" onClick={() => onRestock(product)}>＋ {w.restock}</button></td></tr>)}
      {!loading && products.length === 0 && <tr><td colSpan={7} className="empty">{w.emptyProducts}</td></tr>}
      {products.length > 0 && filteredProducts.length === 0 && <tr><td colSpan={7} className="empty">{lang === "ta" ? "பொருட்கள் இல்லை." : "No matching products."}</td></tr>}
    </tbody></table></div></Panel>
  </>;
}
