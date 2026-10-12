import { useState, type FormEvent } from "react";
import { formatMoney } from "@/lib/format";
import { Panel } from "@/components/Panel";
import type { AppCopy } from "@/lib/i18n";
import type { Attendance, Employee, SalaryPayment } from "@/lib/models";

type Props = { employees: Employee[]; attendance: Attendance[]; payments: SalaryPayment[]; date: string; today: string; busy: boolean; w: AppCopy; onDateChange: (date: string) => void; onAddEmployee: (name: string, wage: number) => Promise<void>; onDeleteEmployee: (employee: Employee) => void; onSaveAttendance: (employeeId: string, date: string, status: Attendance["status"] | "") => Promise<void>; onMarkPaid: (employeeId: string, amount: number) => Promise<void> };

export function AttendanceView({ employees, attendance, payments, date, today, busy, w, onDateChange, onAddEmployee, onDeleteEmployee, onSaveAttendance, onMarkPaid }: Props) {
  const [adding, setAdding] = useState(false);
  const month = date.slice(0, 7);
  const monthStart = `${month}-01`;
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const endDay = month === today.slice(0, 7) ? Number(today.slice(8, 10)) : lastDay;
  const dates = Array.from({ length: endDay }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const staff = employees.filter(employee => employee.active);
  const statusAt = (employeeId: string, day: string) => attendance.find(row => row.employee_id === employeeId && row.work_date === day)?.status ?? "";
  const earnedFor = (day: string) => staff.reduce((sum, employee) => { const status = statusAt(employee.id, day); return sum + Number(employee.daily_wage) * (status === "present" ? 1 : status === "half_day" ? 0.5 : 0); }, 0);
  const dueFor = (employee: Employee) => Math.max(0, dates.reduce((sum, day) => { const status = statusAt(employee.id, day); return sum + Number(employee.daily_wage) * (status === "present" ? 1 : status === "half_day" ? .5 : 0); }, 0) - payments.filter(payment => payment.employee_id === employee.id && payment.work_month === monthStart).reduce((sum, payment) => sum + Number(payment.amount), 0));
  const totalDue = staff.reduce((sum, employee) => sum + dueFor(employee), 0);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); await onAddEmployee(String(data.get("name")).trim(), Number(data.get("wage"))); form.reset(); setAdding(false); }
  function confirmDelete(employee: Employee) {
    if (window.confirm(w.confirmDeleteEmployee.replace("{name}", employee.name))) onDeleteEmployee(employee);
  }

  return <>
    <div className="page-title"><div><h1>{w.attendance}</h1><p>{w.attendanceSub}</p></div><button className="primary" onClick={() => setAdding(!adding)}>{adding ? w.cancel : `＋ ${w.addEmployee}`}</button></div>
    {adding && <form className="employee-form" onSubmit={event => void submit(event)}><label>{w.employeeName}<input name="name" required maxLength={120} placeholder={w.employeeName}/></label><label>{w.dailyWage}<input name="wage" type="number" min="0" step="0.01" required placeholder="0.00"/></label><button className="primary" disabled={busy}>{w.saveEmployee}</button></form>}
    <div className="toolbar"><label className="date-label">{w.month}<input className="filter" type="month" value={month} max={today.slice(0, 7)} onChange={event => event.target.value && onDateChange(`${event.target.value}-01`)}/></label><span className="muted attendance-hint">{w.attendanceHint}</span></div>
    <div className="metrics attendance-metrics"><div className="metric"><div className="metric-top">{w.employees}</div><div className="metric-value">{staff.length}</div></div><div className="metric"><div className="metric-top">{w.datesShown}</div><div className="metric-value">{dates.length}</div></div><div className="metric"><div className="metric-top">{w.wagesToday}</div><div className="metric-value">{formatMoney(month === today.slice(0, 7) ? earnedFor(today) : 0)}</div></div><div className="metric"><div className="metric-top">{w.wagesThisMonth}</div><div className="metric-value">{formatMoney(dates.reduce((sum, day) => sum + earnedFor(day), 0))}</div></div></div>
    <Panel title={w.dailyAttendance}><div className="table-wrap attendance-grid-wrap"><table className="attendance-grid"><thead><tr><th>{w.date}</th>{staff.map(employee => <th key={employee.id}><div className="employee-column"><b>{employee.name}</b><small>{formatMoney(Number(employee.daily_wage))} / {w.day}</small><button className="delete-employee" disabled={busy} onClick={() => confirmDelete(employee)}>{w.deleteEmployee}</button></div></th>)}<th>{w.dailyWages}</th></tr></thead><tbody>{dates.map(day => <tr key={day} className={day === today ? "attendance-today" : ""}><td className="strong">{`${day.slice(8,10)}/${day.slice(5,7)}/${day.slice(0,4)}${day === today ? ` · ${w.todayLabel}` : ""}`}</td>{staff.map(employee => <td key={employee.id}><select aria-label={`${employee.name} · ${day}`} className="filter attendance-select" value={statusAt(employee.id, day)} disabled={busy} onChange={event => void onSaveAttendance(employee.id, day, event.target.value as Attendance["status"] | "")}><option value="">—</option><option value="present">{w.fullDay}</option><option value="half_day">{w.halfDay}</option><option value="absent">{w.absent}</option></select></td>)}<td className="strong">{formatMoney(earnedFor(day))}</td></tr>)}</tbody><tfoot><tr><th>{w.unpaidSalary}</th>{staff.map(employee => <td key={employee.id} className="salary-due-cell"><strong>{formatMoney(dueFor(employee))}</strong><button className="mark-paid" disabled={busy || dueFor(employee) <= 0} onClick={() => void onMarkPaid(employee.id, dueFor(employee))}>{w.markPaid}</button></td>)}<th>{formatMoney(totalDue)}</th></tr></tfoot></table>{!staff.length && <div className="empty">{w.noEmployees}</div>}</div></Panel>
  </>;
}
