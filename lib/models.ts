export type Product = {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  low_stock_threshold: number;
};

export type RawMaterial = {
  id: string;
  name: string;
  quantity: number;
  unit: "kg" | "units";
  low_stock_threshold: number;
};

export type Sale = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  customer_name: string;
  created_at: string;
  order_id: string | null;
};

export type CustomerOrder = { id: string; customer_name: string; total: number; amount_paid: number; created_at: string };
export type Customer = { id: string; name: string };

export type Employee = { id: string; name: string; daily_wage: number; active: boolean };
export type Attendance = { id: string; employee_id: string; work_date: string; status: "present" | "half_day" | "absent"; employee?: Employee };
export type SalaryPayment = { id: string; employee_id: string; work_month: string; amount: number; paid_at: string };

export type AppPage = "dashboard" | "inventory" | "rawMaterials" | "sales" | "customers" | "attendance";
export type Language = "en" | "ta";
