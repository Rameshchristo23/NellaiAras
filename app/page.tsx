"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { AuthScreen } from "@/components/AuthScreen";
import { ProductSaleDialog } from "@/components/ProductSaleDialog";
import { words } from "@/lib/i18n";
import { DashboardView } from "@/components/views/DashboardView";
import { InventoryView } from "@/components/views/InventoryView";
import { SalesView } from "@/components/views/SalesView";
import { CustomersView } from "@/components/views/CustomersView";
import { AttendanceView } from "@/components/views/AttendanceView";
import type { Attendance, Customer, CustomerOrder, Employee, Product, Sale, SalaryPayment, AppPage as Page } from "@/lib/models";

function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; }



export default function Home() {
  const [lang, setLang] = useState<"en"|"ta">("en");
  const [theme, setTheme] = useState<"light"|"dark">("light");
  const [page, setPage] = useState<Page>("dashboard");
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabase>>(null);
  const [user, setUser] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [savedCustomers, setSavedCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(() => localDate());
  const [filterCustomer, setFilterCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialog, setDialog] = useState<"product"|"sale"|null>(null);
  const w = words[lang];

  useEffect(() => { setLang(localStorage.getItem("ml_lang") === "ta" ? "ta" : "en"); const savedTheme=localStorage.getItem("ml_theme");if(savedTheme==="dark"||savedTheme==="light"){setTheme(savedTheme);document.documentElement.dataset.theme=savedTheme;} const db=getSupabase(); setSupabase(db); if(!db){setLoading(false);return;} db.auth.getUser().then(({data})=>{setUser(data.user?.id??null);if(!data.user)setLoading(false);}); const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{setUser(session?.user.id??null);if(!session?.user)setLoading(false);}); return()=>subscription.unsubscribe(); },[]);

  const refresh = useCallback(async () => {
    if(!supabase||!user)return;
    setLoading(true);setError("");
    const month=attendanceDate.slice(0,7), monthEnd=`${month}-${String(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).padStart(2,"0")}`, attendanceEnd=month===localDate().slice(0,7)?localDate():monthEnd;
    const [p,s,o,c,e,a,pay]=await Promise.all([supabase.from("products").select("id,name,category,stock,unit,price,low_stock_threshold").order("name"),supabase.from("sales").select("id,product_id,product_name,quantity,unit_price,total,customer_name,created_at,order_id").order("created_at",{ascending:false}),supabase.from("customer_orders").select("id,customer_name,total,amount_paid,created_at").order("created_at",{ascending:false}),supabase.from("customers").select("id,name").order("name"),supabase.from("employees").select("id,name,daily_wage,active").order("name"),supabase.from("attendance").select("id,employee_id,work_date,status").gte("work_date",`${month}-01`).lte("work_date",attendanceEnd),supabase.from("salary_payments").select("id,employee_id,work_month,amount,paid_at").eq("work_month",`${month}-01`)]);
    if(p.error||s.error||o.error||c.error||e.error||a.error||pay.error)setError((p.error||s.error||o.error||c.error||e.error||a.error||pay.error)?.message||"Could not load data.");else{setProducts((p.data||[]) as Product[]);setSales((s.data||[]) as Sale[]);setOrders((o.data||[]) as CustomerOrder[]);setSavedCustomers((c.data||[]) as Customer[]);setEmployees((e.data||[]) as Employee[]);setAttendance((a.data||[]) as Attendance[]);setSalaryPayments((pay.data||[]) as SalaryPayment[]);}setLoading(false);
  },[supabase,user,attendanceDate]);
  useEffect(()=>{void refresh();},[refresh]);

  const customers=useMemo(()=>{const map=new Map<string,string>();sales.forEach(s=>{const n=s.customer_name.trim();if(n)map.set(n.toLocaleLowerCase(),n);});savedCustomers.forEach(c=>map.set(c.name.toLocaleLowerCase(),c.name));return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1]));},[sales,savedCustomers]);
  const lowProducts=products.filter(p=>Number(p.stock)<=Number(p.low_stock_threshold));
  const recent=sales.slice(0,6);

  async function authenticate(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;setBusy(true);setError("");const fd=new FormData(e.currentTarget),email=String(fd.get("email")),password=String(fd.get("password"));const result=isSignup?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(result.error){setError(result.error.message);return;}if(isSignup&&!result.data.session){setNotice(w.signUpSuccess);setIsSignup(false);}else setUser(result.data.user?.id??null);}
  async function signOut(){await supabase?.auth.signOut();setProducts([]);setSales([]);setUser(null);}
  function toggleLanguage(){const next=lang==="en"?"ta":"en";setLang(next);localStorage.setItem("ml_lang",next);}
  function toggleTheme(){const next=theme==="light"?"dark":"light";setTheme(next);document.documentElement.dataset.theme=next;localStorage.setItem("ml_theme",next);}
  async function addProduct(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;setBusy(true);setError("");const fd=new FormData(e.currentTarget),payload={name:String(fd.get("name")).trim(),category:String(fd.get("category")),stock:Number(fd.get("stock")),unit:String(fd.get("unit")),price:Number(fd.get("price")),low_stock_threshold:Number(fd.get("threshold"))};const {error}=await supabase.from("products").insert(payload);setBusy(false);if(error){setError(error.message);return;}setDialog(null);setNotice(w.saved);await refresh();}
  async function recordSale(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;setBusy(true);setError("");const fd=new FormData(e.currentTarget);let items:unknown;try{items=JSON.parse(String(fd.get("order_items")||"[]"));}catch{setBusy(false);setError("Invalid order items.");return;}const {error}=await supabase.rpc("record_order",{p_items:items,p_customer_name:String(fd.get("customer")||""),p_amount_paid:Number(fd.get("amount_paid")||0)});setBusy(false);if(error){setError(error.message);return;}setDialog(null);setNotice(w.saved);await refresh();}
  async function restock(p:Product){if(!supabase)return;const input=prompt(`${w.restock} · ${p.name}`);if(input===null)return;const amount=Number(input);if(!Number.isFinite(amount)||amount<=0){setError(w.quantity);return;}setBusy(true);const {error}=await supabase.rpc("restock_product",{p_product_id:p.id,p_quantity:amount});setBusy(false);if(error)setError(error.message);else{setNotice(w.saved);await refresh();}}
  async function addEmployee(name:string,wage:number){if(!supabase||!name||!Number.isFinite(wage)||wage<0)return;setBusy(true);const {error}=await supabase.from("employees").insert({name,daily_wage:wage});setBusy(false);if(error){setError(error.message);return;}setNotice(w.saved);await refresh();}
  async function saveAttendance(employeeId:string,workDate:string,status:Attendance["status"]|""){if(!supabase)return;if(workDate>localDate()){setError("Future attendance cannot be recorded.");return;}setBusy(true);const result=status?await supabase.from("attendance").upsert({employee_id:employeeId,work_date:workDate,status},{onConflict:"employee_id,work_date"}):await supabase.from("attendance").delete().eq("employee_id",employeeId).eq("work_date",workDate);setBusy(false);if(result.error)setError(result.error.message);else{setNotice(w.saved);await refresh();}}
  async function deleteEmployee(employee:Employee){if(!supabase||!window.confirm(`Delete ${employee.name} and all of their attendance records?`))return;setBusy(true);const {error}=await supabase.from("employees").delete().eq("id",employee.id);setBusy(false);if(error)setError(error.message);else{setNotice(w.saved);await refresh();}}
  async function markSalaryPaid(employeeId:string,amount:number){if(!supabase||amount<=0)return;setBusy(true);const {error}=await supabase.from("salary_payments").insert({employee_id:employeeId,work_month:`${attendanceDate.slice(0,7)}-01`,amount});setBusy(false);if(error)setError(error.message);else{setNotice("Salary marked as paid.");await refresh();}}
  async function updateOrderPayment(orderId:string,amount:number):Promise<boolean>{if(!supabase||!Number.isFinite(amount)||amount<0)return false;const order=orders.find(row=>row.id===orderId);if(!order||amount>Number(order.total)){setError("Paid amount must be between zero and the order total.");return false;}setBusy(true);const {error}=await supabase.from("customer_orders").update({amount_paid:amount}).eq("id",orderId);setBusy(false);if(error){setError(error.message);return false;}setNotice(w.saved);await refresh();return true;}
  async function addCustomer(name:string){if(!supabase||!name)return;if(customers.some(([,existing])=>existing.toLocaleLowerCase()===name.toLocaleLowerCase())){setError("That customer already exists.");return;}setBusy(true);const {error}=await supabase.from("customers").insert({name});setBusy(false);if(error)setError(error.message);else{setNotice(w.saved);await refresh();}}
  const categories:Record<string,string>={snacks:lang==="ta"?"சிற்றுண்டி":"Snacks",sweets:lang==="ta"?"இனிப்புகள்":"Sweets",mixtures:lang==="ta"?"கலவை":"Mixtures",other:lang==="ta"?"மற்றவை":"Other"};
  const units:Record<string,string>={packets:lang==="ta"?"பொட்டலங்கள்":"packets",pieces:lang==="ta"?"துண்டுகள்":"pieces",kg:lang==="ta"?"கிலோ":"kg"};
  const status=(p:Product)=>Number(p.stock)<=0?w.outLabel:Number(p.stock)<=Number(p.low_stock_threshold)?w.lowLabel:w.inStockLabel;

  if(!supabase)return <main className="center-screen"><section className="auth-card"><div className="logo">🥨</div><h1>{w.configTitle}</h1><p>{w.configText}</p><p className="muted">{w.schemaHint}</p><code>cp .env.example .env.local</code></section></main>;
  if(!user)return <AuthScreen lang={lang} theme={theme} w={w} busy={busy} error={error} notice={notice} isSignup={isSignup} onSubmit={authenticate} onToggleSignup={()=>{setIsSignup(!isSignup);setError("");}} onToggleLanguage={toggleLanguage} onToggleTheme={toggleTheme}/>;

  return <AppShell page={page} lang={lang} theme={theme} w={w} user={user} error={error} notice={notice} onPageChange={setPage} onToggleLanguage={toggleLanguage} onToggleTheme={toggleTheme} onSignOut={()=>void signOut()} onDismissError={()=>setError("")} onDismissNotice={()=>setNotice("")}>
      {page==="dashboard"&&<DashboardView w={w} lang={lang} sales={sales} recent={recent} products={products} lowProducts={lowProducts} categories={categories} units={units} loading={loading}/> }
      {page==="inventory"&&<InventoryView w={w} products={products} categories={categories} units={units} stockFilter={stockFilter} setStockFilter={setStockFilter} status={status} onAddProduct={()=>{setError("");setDialog("product");}} onRestock={(product)=>void restock(product)} loading={loading} lang={lang}/> }
      {page==="sales"&&<SalesView w={w} lang={lang} sales={sales} orders={orders} busy={busy} onRecordSale={()=>{setError("");setDialog("sale");}} onUpdatePayment={updateOrderPayment}/> }
      {page==="customers"&&<CustomersView w={w} lang={lang} sales={sales} orders={orders} customers={customers} selectedCustomer={filterCustomer} onCustomerChange={setFilterCustomer} from={from} to={to} onFromChange={setFrom} onToChange={setTo} onAddCustomer={addCustomer}/> }
      {page==="attendance"&&<AttendanceView employees={employees} attendance={attendance} payments={salaryPayments} date={attendanceDate} today={localDate()} busy={busy} onDateChange={setAttendanceDate} onAddEmployee={addEmployee} onDeleteEmployee={deleteEmployee} onSaveAttendance={saveAttendance} onMarkPaid={markSalaryPaid}/>}
      {loading&&<div className="loading-line">{w.loading}</div>}
      {dialog&&<ProductSaleDialog kind={dialog} lang={lang} w={w} products={products} customerNames={customers.map(([,name])=>name)} categories={categories} units={units} busy={busy} onClose={()=>setDialog(null)} onSubmit={dialog==="product"?addProduct:recordSale}/> }
  </AppShell>;
}

