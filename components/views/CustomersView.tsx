import { useState, type FormEvent } from "react";
import { MetricCard } from "@/components/MetricCard";
import { Panel } from "@/components/Panel";
import { formatDay, formatMoney } from "@/lib/format";
import type { Customer, CustomerOrder, Language, Sale } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type CustomersViewProps = {
  w: AppCopy;
  lang: Language;
  sales: Sale[];
  orders: CustomerOrder[];
  customers: [string, string][];
  savedCustomers: Customer[];
  selectedCustomer: string;
  onCustomerChange: (value: string) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onAddCustomer: (name: string) => Promise<void>;
  onUpdateCustomer: (id: string, name: string) => Promise<boolean>;
  onRemoveCustomer: (customer: Customer) => void;
  busy: boolean;
};

export function CustomersView({ w, lang, sales, orders, customers, savedCustomers, selectedCustomer, onCustomerChange, from, to, onFromChange, onToChange, onAddCustomer, onUpdateCustomer, onRemoveCustomer, busy }: CustomersViewProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const name = String(new FormData(form).get("name") || "").trim(); if (!name) return; await onAddCustomer(name); form.reset(); setAdding(false); }
  async function submitEdit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!editing) return; const name = String(new FormData(event.currentTarget).get("name") || "").trim(); if (name && await onUpdateCustomer(editing.id, name)) setEditing(null); }
  const filteredOrders = orders.filter(order => {
    const key = order.customer_name.trim().toLocaleLowerCase() || "__walkin__";
    const date = new Date(order.created_at);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return (!selectedCustomer || key === selectedCustomer) && (!from || day >= from) && (!to || day <= to);
  });
  const grouped = new Map<string, { name: string; orders: CustomerOrder[] }>();
  customers.forEach(([key, name]) => grouped.set(key, { name, orders: [] }));
  filteredOrders.forEach(order => {
    const key = order.customer_name.trim().toLocaleLowerCase() || "__walkin__";
    const group = grouped.get(key) ?? { name: order.customer_name.trim() || w.walkIn, orders: [] };
    group.orders.push(order);
    grouped.set(key, group);
  });
  const groups = [...grouped.entries()].filter(([key]) => !selectedCustomer || key === selectedCustomer);
  const pendingTotal = filteredOrders.reduce((sum, order) => sum + Math.max(0, Number(order.total) - Number(order.amount_paid)), 0);
  const salesTotal = filteredOrders.reduce((sum, order) => sum + Number(order.total), 0);

  return <>
    <div className="page-title"><div><h1>{w.customers}</h1><p>{w.customersSub}</p></div><button className="primary" onClick={() => setAdding(!adding)}>{adding ? w.cancel : `＋ ${w.addCustomer}`}</button></div>
    {adding && <form className="employee-form customer-form" onSubmit={event => void submit(event)}><label>{w.customer}<input name="name" required maxLength={120} placeholder={w.customer}/></label><button className="primary" disabled={busy}>{w.saveCustomer}</button></form>}
    <div className="toolbar"><select className="filter" value={selectedCustomer} onChange={event => onCustomerChange(event.target.value)}><option value="">{w.allCustomers}</option>{customers.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select><label className="date-label">{w.from}<input className="filter" type="date" value={from} onChange={event => onFromChange(event.target.value)}/></label><label className="date-label">{w.to}<input className="filter" type="date" value={to} onChange={event => onToChange(event.target.value)}/></label></div>
    <div className="metrics customer-metrics"><MetricCard icon="♙" label={w.customersCount} value={String(groups.length)}/><MetricCard icon="▤" label={w.orders} value={String(filteredOrders.length)}/><MetricCard icon="₹" label={w.salesTotal} value={formatMoney(salesTotal)}/><MetricCard icon="₹" label="Total pending" value={formatMoney(pendingTotal)}/></div>
    <Panel title={selectedCustomer ? `${w.salesFor} ${customers.find(([key]) => key === selectedCustomer)?.[1] || ""}` : w.allCustomersLabel}>
      <div className="table-wrap"><table className="customer-orders-table"><thead><tr><th>Order</th>{[w.date, w.product, w.salesTotal, "Paid", "Balance"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        {groups.map(([key, group]) => {
          const groupPending = group.orders.reduce((sum, order) => sum + Math.max(0, Number(order.total) - Number(order.amount_paid)), 0);
          return <tbody key={key}>
            <tr className="customer-group-heading"><th colSpan={3}><div className="customer-group-meta"><span>{group.name}<small>{group.orders.length} {w.orders.toLowerCase()}</small></span>{savedCustomers.find(customer => customer.name.toLocaleLowerCase() === key) && <span className="row-actions"><button className="action" onClick={() => setEditing(savedCustomers.find(customer => customer.name.toLocaleLowerCase() === key) || null)}>{w.edit}</button><button className="action danger-action" onClick={() => { const customer = savedCustomers.find(row => row.name.toLocaleLowerCase() === key); if (customer) onRemoveCustomer(customer); }}>{w.remove}</button></span>}</div></th><th colSpan={3}>{w.pendingTotal}: {formatMoney(groupPending)}</th></tr>
            {group.orders.map(order => {
              const lines = sales.filter(sale => sale.order_id === order.id);
              const balance = Math.max(0, Number(order.total) - Number(order.amount_paid));
              return <tr key={order.id}><td>#{order.id.slice(0, 6).toUpperCase()}</td><td>{formatDay(order.created_at, lang)}</td><td className="customer-order-lines">{lines.map(line => <div key={line.id}>{line.product_name}<small>× {line.quantity}</small></div>)}</td><td>{formatMoney(Number(order.total))}</td><td>{formatMoney(Number(order.amount_paid))}</td><td className="strong">{formatMoney(balance)}</td></tr>;
            })}
            <tr className="customer-group-total"><td colSpan={5}>{w.totalPendingFor} {group.name}</td><td className="strong">{formatMoney(groupPending)}</td></tr>
          </tbody>;
        })}
      </table>{!groups.length && <p className="empty">No customers or orders match these filters.</p>}</div>
    </Panel>
    {editing && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null); }}><form className="modal" onSubmit={event => void submitEdit(event)}><h2>{w.editCustomer}</h2><label>{w.customer}<input name="name" required maxLength={120} defaultValue={editing.name}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>{w.cancel}</button><button className="primary" disabled={busy}>{w.save}</button></div></form></div>}
  </>;
}
