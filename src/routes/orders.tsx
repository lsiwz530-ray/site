import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Order = { id: string; product_name: string; amount: number; status: string; delivery_key: string | null; admin_note: string | null; created_at: string };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "#fbbf24" },
  reviewing: { label: "قيد المراجعة", color: "#60a5fa" },
  approved: { label: "مقبول - سيصلك المفتاح", color: "#a78bfa" },
  rejected: { label: "مرفوض", color: "#f87171" },
  delivered: { label: "تم التسليم", color: "#34d399" },
};

export const Route = createFileRoute("/orders")({
  component: Orders,
});

function Orders() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) ?? []));
  }, [user]);

  if (loading) return <div className="page-shell"><PublicNav /><div className="pc-empty">جاري التحميل...</div></div>;
  if (!user) return (
    <div className="page-shell"><PublicNav />
      <div className="pc-empty" style={{ marginTop: 40 }}>
        سجّل دخولك لعرض طلباتك.<br /><br />
        <Link to="/auth" className="btn btn-primary">تسجيل الدخول</Link>
      </div>
    </div>
  );

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="page-shell">
      <PublicNav />
      <div className="pub-hero"><div className="kicker">// MY ORDERS</div><h2>طلباتي</h2></div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[["all", "الكل"], ["pending", "قيد الانتظار"], ["reviewing", "قيد المراجعة"], ["approved", "مقبول"], ["delivered", "تم التسليم"], ["rejected", "مرفوض"]].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${filter === k ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && <div className="pc-empty">لا يوجد طلبات.</div>}
        {filtered.map((o) => {
          const s = STATUS_LABEL[o.status] ?? { label: o.status, color: "#888" };
          return (
            <div key={o.id} className="pc-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx-1)" }}>{o.product_name}</div>
                  <div style={{ fontSize: 12, color: "var(--tx-2)", marginTop: 4 }}>{new Date(o.created_at).toLocaleString("ar-SA")}</div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <span className="pc-badge">{Number(o.amount).toFixed(2)} ر.س</span>
                  <div style={{ marginTop: 6, fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              </div>
              {o.admin_note && <div style={{ marginTop: 10, fontSize: 12, color: "var(--tx-2)" }}>ملاحظة الإدارة: {o.admin_note}</div>}
              {o.delivery_key && (
                <div style={{ marginTop: 10, padding: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 10, color: "#34d399", fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>
                  🔑 {o.delivery_key}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
