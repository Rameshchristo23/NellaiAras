import type { Language } from "@/lib/models";

export const formatMoney = (value: number) =>
  "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const localDay = (value: string | Date) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const formatDay = (value: string, language: Language) =>
  new Intl.DateTimeFormat(language === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
