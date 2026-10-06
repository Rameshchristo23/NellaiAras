import { useState, type FormEvent } from "react";
import { Panel } from "@/components/Panel";
import { formatDay, formatMoney } from "@/lib/format";
import type { CustomerOrder, Language, Sale } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type Settlement = "pending" | "partial" | "full";
type EditingPayment = { orderId: string; status: Settlement; paid: string };

export function SalesView({ w, lang, sales, orders, busy, onRecordSale, onUpdatePayment }: { w: AppCopy; lang: Language; sales: Sale[]; orders: CustomerOrder[]; busy: boolean; onRecordSale: () => void; onUpdatePayment: (orderId: string, amount: number) => Promise<boolean> }) {
  const [editing, setEditing] = useState<EditingPayment | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const editingOrder = editing && orders.find(order => order.id === editing.orderId);
  function openPayment(order: CustomerOrder) { const paid = Number(order.amount_paid); setPaymentError(""); setEditing({ orderId: order.id, status: paid <= 0 ? "pending" : paid >= Number(order.total) ? "full" : "partial", paid: String(paid) }); }
  function changeStatus(status: Settlement) { if (!editing) return; const order = orders.find(row => row.id === editing.orderId); if (!order) return; let paid = editing.paid; if (status === "pending") paid = "0"; if (status === "full") paid = String(order.total); if (status === "partial" && (Number(paid) <= 0 || Number(paid) >= Number(order.total))) paid = String(Math.max(0.01, Math.round(Number(order.total) * 50) / 100)); setEditing({ ...editing, status, paid }); setPaymentError(""); }
  async function submitPayment(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!editing || !editingOrder) return; const amount = editing.status === "pending" ? 0 : editing.status === "full" ? Number(editingOrder.total) : Number(editing.paid); if (!Number.isFinite(amount) || (editing.status === "partial" && (amount <= 0 || amount >= Number(editingOrder.total)))) { setPaymentError("Enter an amount greater than zero and less than the order total."); return; } if (await onUpdatePayment(editing.orderId, amount)) setEditing(null); }
  return <>
    <div className="page-title"><div><h1>{w.sales}</h1><p>{lang === "ta" ? "ஆர்டர்களைப் பதிவு செய்து விற்பனையைக் கண்காணிக்கவும்." : "Record multi-product orders and track pending or partial payments."}</p></div><button className="primary" onClick={onRecordSale}>＋ {w.recordSale}</button></div>
    <Panel><div className="table-wrap"><table className="orders-table"><thead><tr><th>{w.date}</th><th>{w.customer}</th><th>{w.product}</th><th>{w.amount}</th><th>Payment status</th><th>Paid</th><th>Balance</th><th>Payment</th></tr></thead><tbody>{orders.map(order => {
      const lines = sales.filter(sale => sale.order_id === order.id);
      const paid = Number(order.amount_paid); const total = Number(order.total); const balance = Math.max(0, total - paid);
      const status = balance === 0 ? "Fully settled" : paid > 0 ? "Partially settled" : "Pending";
      return <tr key={order.id}><td>{formatDay(order.created_at, lang)}<small className="order-number">#{order.id.slice(0, 6).toUpperCase()}</small></td><td>{order.customer_name || w.walkIn}</td><td className="order-lines">{lines.map(line => <div key={line.id}><b>{line.product_name}</b><small>{line.quantity} × {formatMoney(Number(line.unit_price))}</small></div>)}</td><td className="strong">{formatMoney(total)}</td><td><span className={`badge ${status === "Pending" ? "low" : ""}`}>{status}</span></td><td>{formatMoney(paid)}</td><td className="strong">{formatMoney(balance)}</td><td><button className="action" disabled={busy} onClick={() => openPayment(order)}>Update</button></td></tr>;
    })}</tbody></table>{orders.length === 0 && <p className="empty">{w.emptySales}</p>}</div></Panel>
    {editing && editingOrder && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEditing(null); }}><form className="modal payment-modal" onSubmit={event => void submitPayment(event)}>
      <h2>Update order payment</h2><p>Order #{editingOrder.id.slice(0, 6).toUpperCase()} · Total {formatMoney(Number(editingOrder.total))}</p>
      <label>Settlement status<select value={editing.status} onChange={event => changeStatus(event.target.value as Settlement)}><option value="pending">Pending</option><option value="partial">Partially settled</option><option value="full">Fully settled</option></select></label>
      {editing.status === "partial" && <label>Amount paid<input type="number" min="0.01" max={Number(editingOrder.total) - 0.01} step="0.01" value={editing.paid} onChange={event => setEditing({ ...editing, paid: event.target.value })} required/></label>}
      <div className="payment-balance-preview"><span>Paid: {formatMoney(editing.status === "pending" ? 0 : editing.status === "full" ? Number(editingOrder.total) : Number(editing.paid) || 0)}</span><b>Balance: {formatMoney(Math.max(0, Number(editingOrder.total) - (editing.status === "pending" ? 0 : editing.status === "full" ? Number(editingOrder.total) : Number(editing.paid) || 0)))}</b></div>
      {paymentError && <div className="error">{paymentError}</div>}
      <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>{w.cancel}</button><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save payment"}</button></div>
    </form></div>}
  </>;
}
