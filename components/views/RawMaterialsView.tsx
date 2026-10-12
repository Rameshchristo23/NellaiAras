import { useState, type FormEvent } from "react";
import { Panel } from "@/components/Panel";
import type { RawMaterial } from "@/lib/models";
import type { AppCopy } from "@/lib/i18n";

type Props = {
  materials: RawMaterial[];
  w: AppCopy;
  busy: boolean;
  onAdd: (material: Omit<RawMaterial, "id">) => Promise<boolean>;
  onAdjust: (id: string, delta: number) => Promise<void>;
  onDelete: (material: RawMaterial) => Promise<void>;
};

export function RawMaterialsView({ materials, w, busy, onAdd, onAdjust, onDelete }: Props) {
  const [adding, setAdding] = useState(false);
  const [newUnit, setNewUnit] = useState<RawMaterial["unit"]>("kg");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const lowCount = materials.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold)).length;

  async function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const saved = await onAdd({
      name: String(data.get("name")).trim(),
      quantity: Number(data.get("quantity")),
      unit: String(data.get("unit")) as RawMaterial["unit"],
      low_stock_threshold: Number(data.get("threshold")),
    });
    if (saved) {
      form.reset();
      setAdding(false);
    }
  }

  function adjust(material: RawMaterial, direction: 1 | -1) {
    const amount = Number(amounts[material.id] ?? "");
    if (!Number.isFinite(amount) || amount <= 0) return;
    void onAdjust(material.id, direction * amount);
    setAmounts((current) => ({ ...current, [material.id]: "" }));
  }

  return <>
    <div className="page-title"><div><h1>{w.materialsTitle}</h1><p>{w.materialsSub}</p></div><button className="primary" onClick={() => setAdding((value) => !value)}>{adding ? w.cancel : `＋ ${w.addMaterial}`}</button></div>
    <div className="metrics material-metrics"><div className="metric"><div className="metric-top">{w.material}</div><div className="metric-value">{materials.length}</div></div><div className="metric"><div className="metric-top">{w.lowMaterial}</div><div className="metric-value">{lowCount}</div></div></div>
    {adding && <Panel title={w.addMaterial}><form className="material-form" onSubmit={(event) => void submitMaterial(event)}>
      <label>{w.materialName}<input name="name" required maxLength={120} placeholder="e.g. Sugar"/></label>
      <label>{w.unit}<select name="unit" value={newUnit} onChange={(event) => setNewUnit(event.target.value as RawMaterial["unit"])}><option value="kg">{w.unitKg}</option><option value="units">{w.unitUnits}</option></select></label>
      <label>{w.availableQuantity}<input name="quantity" type="number" min="0" step={newUnit === "units" ? "1" : "0.001"} required defaultValue="0"/></label>
      <label>{w.lowAt}<input name="threshold" type="number" min="0" step={newUnit === "units" ? "1" : "0.001"} required defaultValue="5"/></label>
      <button className="primary" disabled={busy}>{w.save}</button>
    </form></Panel>}
    {materials.length === 0 ? <Panel><p className="empty">{w.noMaterials}</p></Panel> : <div className="material-list">{materials.map((material) => {
      const isLow = Number(material.quantity) <= Number(material.low_stock_threshold);
      return <Panel key={material.id}>
        <div className="material-card-head"><div><h2>{material.name}</h2><p>{w.lowAt} {material.low_stock_threshold} {material.unit}</p></div><span className={`badge ${isLow ? "low" : ""}`}>{isLow ? `⚠ ${w.lowMaterial}` : w.inStockLabel}</span></div>
        <div className="material-quantity"><span>{w.availableQuantity}</span><strong>{Number(material.quantity).toLocaleString(undefined, { maximumFractionDigits: 3 })} <small>{material.unit}</small></strong></div>
        <div className="material-actions"><label>{w.quantity}<input type="number" min={material.unit === "units" ? "1" : "0.001"} step={material.unit === "units" ? "1" : "0.001"} inputMode={material.unit === "units" ? "numeric" : "decimal"} value={amounts[material.id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [material.id]: event.target.value }))} placeholder="0"/></label><button className="action" disabled={busy || !(Number(amounts[material.id]) > 0)} onClick={() => adjust(material, 1)}>＋ {w.addStock}</button><button className="action" disabled={busy || !(Number(amounts[material.id]) > 0) || Number(amounts[material.id]) > Number(material.quantity)} onClick={() => adjust(material, -1)}>− {w.useStock}</button><button className="material-remove" disabled={busy} onClick={() => void onDelete(material)}>{w.deleteMaterial}</button></div>
      </Panel>;
    })}</div>}
  </>;
}
