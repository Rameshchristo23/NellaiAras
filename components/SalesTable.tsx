import type { Language, Sale } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";
import { formatDay, formatMoney } from "@/lib/format";

type SalesTableProps = {
  rows: Sale[];
  lang: Language;
  w: AppCopy;
  showCustomer?: boolean;
};

export function SalesTable({ rows, lang, w, showCustomer = false }: SalesTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{w.date}</th>
            {showCustomer && <th>{w.customer}</th>}
            <th>{w.order}</th>
            <th>{w.product}</th>
            <th>{w.qty}</th>
            <th>{w.amount}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sale) => (
            <tr key={sale.id}>
              <td>{formatDay(sale.created_at, lang)}</td>
              {showCustomer && <td>{sale.customer_name || w.walkIn}</td>}
              <td>#{sale.id.slice(0, 6).toUpperCase()}</td>
              <td className="strong">🥨 {sale.product_name}</td>
              <td>{sale.quantity}</td>
              <td className="strong">{formatMoney(Number(sale.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">{w.emptySales}</p>}
    </div>
  );
}
