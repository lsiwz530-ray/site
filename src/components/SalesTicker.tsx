import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = { product_name: string; created_at: string; user_id: string };

export function SalesTicker() {
  const [current, setCurrent] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    supabase.from("orders").select("product_name,created_at,user_id").in("status", ["approved", "delivered"]).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  useEffect(() => {
    if (rows.length === 0) return;
    setCurrent(rows[idx % rows.length]);
    const t = setTimeout(() => { setCurrent(null); setTimeout(() => setIdx((i) => i + 1), 500); }, 5000);
    return () => clearTimeout(t);
  }, [idx, rows]);

  if (!current) return null;
  return (
    <div style={{ position: "fixed", bottom: 20, left: 20, zIndex: 55, background: "rgba(15,5,32,0.95)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 12, padding: 12, maxWidth: 280, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", animation: "slideIn 0.4s ease" }}>
      <div style={{ fontSize: 11, color: "var(--v3)", marginBottom: 4 }}>🔔 عملية شراء أخيرة</div>
      <div style={{ fontSize: 13, color: "var(--tx-1)", fontWeight: 600 }}>{current.product_name}</div>
      <div style={{ fontSize: 10, color: "var(--tx-2)", marginTop: 4 }}>{new Date(current.created_at).toLocaleString("ar-SA")}</div>
    </div>
  );
}
