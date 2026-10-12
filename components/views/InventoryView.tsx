import { useState, type FormEvent } from "react";
import { Panel } from "@/components/Panel";
import type { Product } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type ProductChanges = Pick<Product, "name" | "category" | "stock" | "unit" | "price" | "low_stock_threshold">;
type InventoryViewProps = {
  w: AppCopy;
  products: Product[];
  categories: Record<string, string>;
  units: Record<string, string>;
  stockFilter: string;
  setStockFilter: (value: string) => void;
  status: (product: Product) => string;
  busy: boolean;
  loading: boolean;
  onSaveProduct: (id: string, changes: ProductChanges) => Promise<boolean>;
  onRemoveProduct: (product: Product) => void;
  onAddProduct: () => void;
  lang: "en" | "ta";
};

export function InventoryView({ w, products, categories, units, stockFilter, setStockFilter, status, busy, loading, onSaveProduct, onRemoveProduct, onAddProduct, lang }: InventoryViewProps) {
  const [editing, setEditing] = useState<Product | null>(null);
  const filteredProducts = products.filter((product) => stockFilter === "all" || (stockFilter === "low" ? Number(product.stock) <= Number(product.low_stock_threshold) : Number(product.stock) > Number(product.low_stock_threshold)));

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    const saved = await onSaveProduct(editing.id, {
      name: String(data.get("name")).trim(),
      category: String(data.get("category")),
      stock: Number(data.get("stock")),
      unit: String(data.get("unit")),
      price: Number(data.get("price")),
      low_stock_threshold: Number(data.get("threshold")),
    });
    if (saved) setEditing(null);
  }

  return <>
    <div className="page-title"><div><h1>{w.inventory}</h1><p>{lang === "ta" ? "உங்கள் பொருட்களையும் கையிருப்பையும் கண்காணிக்கவும்." : "Track your products and keep stock up to date."}</p></div><button className="primary" onClick={onAddProduct}>＋ {w.addProduct}</button></div>
    <div className="toolbar"><select className="filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="all">{w.allStock}</option><option value="low">{w.lowOnly}</option><option value="available">{w.inStock}</option></select></div>
    <Panel><div className="table-wrap"><table><thead><tr><th>{w.product}</th><th>{w.category}</th><th>{w.stock}</th><th>{w.unit}</th><th>{w.price}</th><th>{w.status}</th><th>{w.actions}</th></tr></thead><tbody>
      {filteredProducts.map((product) => <tr key={product.id}><td className="strong">🥨 {product.name}</td><td>{categories[product.category] || product.category}</td><td>{product.stock}</td><td>{units[product.unit] || product.unit}</td><td>₹{Number(product.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td><span className={`badge ${status(product) === w.inStockLabel ? "" : "low"}`}>{status(product)}</span></td><td><div className="row-actions"><button className="action" onClick={() => setEditing(product)}>{w.edit}</button><button className="action danger-action" onClick={() => onRemoveProduct(product)}>{w.remove}</button></div></td></tr>)}
      {!loading && products.length === 0 && <tr><td colSpan={7} className="empty">{w.emptyProducts}</td></tr>}
      {products.length > 0 && filteredProducts.length === 0 && <tr><td colSpan={7} className="empty">{lang === "ta" ? "பொருட்கள் இல்லை." : "No matching products."}</td></tr>}
    </tbody></table></div></Panel>
    {editing && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="modal product-edit-modal" onSubmit={(event) => void saveProduct(event)}>
      <h2>{w.editProduct}</h2>
      <label>{w.name}<input name="name" required maxLength={120} defaultValue={editing.name}/></label>
      <div className="form-row"><label>{w.category}<select name="category" defaultValue={editing.category}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>{w.unit}<select name="unit" defaultValue={editing.unit}>{Object.entries(units).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="form-row"><label>{w.stock}<input name="stock" type="number" min="0" step="0.001" required defaultValue={editing.stock}/></label><label>{w.price}<input name="price" type="number" min="0" step="0.01" required defaultValue={editing.price}/></label></div>
      <label>{w.threshold}<input name="threshold" type="number" min="0" step="0.001" required defaultValue={editing.low_stock_threshold}/></label>
      <div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>{w.cancel}</button><button className="primary" disabled={busy}>{w.save}</button></div>
    </form></div>}
  </>;
}
