import { useMemo, useState, type FormEvent } from "react";
import type { AppCopy } from "@/lib/i18n";
import type { Language, Product } from "@/lib/models";

type ProductSaleDialogProps = {
  kind: "product" | "sale";
  lang: Language;
  w: AppCopy;
  products: Product[];
  customerNames: string[];
  categories: Record<string, string>;
  units: Record<string, string>;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export function ProductSaleDialog({ kind, lang, w, products, customerNames, categories, units, busy, onClose, onSubmit }: ProductSaleDialogProps) {
  const addingProduct = kind === "product";
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [items, setItems] = useState<{ product_id: string; quantity: number }[]>([]);
  const total = useMemo(() => items.reduce((sum, item) => { const product = products.find(row => row.id === item.product_id); return sum + (product ? Number(product.price) * item.quantity : 0); }, 0), [items, products]);
  function addItem() { const product = products.find(row => row.id === selectedProduct); const qty = Number(quantity); if (!product || !Number.isFinite(qty) || qty <= 0) return; setItems(current => { const found = current.find(item => item.product_id === product.id); return found ? current.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + qty } : item) : [...current, { product_id: product.id, quantity: qty }]; }); setSelectedProduct(""); setQuantity("1"); }
  function submit(event: FormEvent<HTMLFormElement>) { if (!addingProduct && !items.length) { event.preventDefault(); return; } onSubmit(event); }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className={`modal ${!addingProduct ? "order-modal" : ""}`} onSubmit={submit}>
    <h2>{addingProduct ? w.addProduct : w.recordSale}</h2>
    <p>{addingProduct ? (lang === "ta" ? "à®‰à®™à¯à®•à®³à¯ à®šà®°à®•à¯à®•à®¿à®²à¯ à®ªà¯à®¤à®¿à®¯ à®šà®¿à®±à¯à®±à¯à®£à¯à®Ÿà®¿à®¯à¯ˆà®šà¯ à®šà¯‡à®°à¯à®•à¯à®•à®µà¯à®®à¯." : "Add a snack to your inventory.") : "Add multiple products to one order and enter any amount paid now."}</p>
    {addingProduct ? <>
      <label>{w.name}<input name="name" required maxLength={120}/></label>
      <div className="form-row"><label>{w.category}<select name="category"><option value="snacks">{categories.snacks}</option><option value="sweets">{categories.sweets}</option><option value="mixtures">{categories.mixtures}</option><option value="other">{categories.other}</option></select></label><label>{w.unit}<select name="unit"><option value="packets">{units.packets}</option><option value="pieces">{units.pieces}</option><option value="kg">{units.kg}</option></select></label></div>
      <div className="form-row"><label>{w.opening}<input name="stock" type="number" min="0" step="0.001" defaultValue="0" required/></label><label>{w.price} (₹)<input name="price" type="number" min="0" step="0.01" required/></label></div>
      <label>{w.threshold}<input name="threshold" type="number" min="0" step="0.001" defaultValue="10" required/></label>
    </> : <>
      <div className="order-item-picker"><label>{w.product}<select value={selectedProduct} onChange={event => setSelectedProduct(event.target.value)}><option value="">{w.chooseProduct}</option>{products.filter(product => Number(product.stock) > 0).map(product => <option key={product.id} value={product.id}>{product.name} · {product.stock} {units[product.unit]} · {money(Number(product.price))}</option>)}</select></label><label>{w.quantity}<input type="number" min="0.001" step="0.001" value={quantity} onChange={event => setQuantity(event.target.value)}/></label><button type="button" className="secondary" onClick={addItem} disabled={!selectedProduct}>Add item</button></div>
      <input type="hidden" name="order_items" value={JSON.stringify(items)}/>
      <div className="order-cart"><div className="cart-head"><b>Order items</b><span>{items.length} products</span></div>{items.map(item => { const product = products.find(row => row.id === item.product_id); if (!product) return null; return <div className="cart-row" key={item.product_id}><span>{product.name}<small>{item.quantity} {units[product.unit]} × {money(Number(product.price))}</small></span><b>{money(Number(product.price) * item.quantity)}</b><button type="button" aria-label={`Remove ${product.name}`} onClick={() => setItems(current => current.filter(row => row.product_id !== item.product_id))}>×</button></div>; })}{!items.length && <p className="muted">Add one or more products to this order.</p>}<div className="cart-total"><b>Order total</b><b>{money(total)}</b></div></div>
      <label>{w.customer}<select name="customer" defaultValue=""><option value="">{w.walkIn}</option>{customerNames.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label>Amount paid now<input name="amount_paid" type="number" min="0" max={total} step="0.01" defaultValue="0" required/></label>
    </>}
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>{w.cancel}</button><button className="primary" disabled={busy || (!addingProduct && !items.length)}>{busy ? "…" : w.save}</button></div>
  </form></div>;
}
