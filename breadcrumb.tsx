import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Review = { id: string; rating: number; comment: string | null; approved: boolean; created_at: string; user_id: string; profiles?: { username: string } };

export function DashReviews() {
  const [items, setItems] = useState<Review[]>([]);
  async function load() {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username").in("id", ids) : { data: [] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems(rows.map((r) => ({ ...r, profiles: map.get(r.user_id) })) as Review[]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, approved: boolean) { await supabase.from("reviews").update({ approved: !approved }).eq("id", id); load(); }
  async function del(id: string) { if (!confirm("حذف؟")) return; await supabase.from("reviews").delete().eq("id", id); load(); }

  return (
    <div>
      <h2 style={{ color: "var(--tx-1)", marginBottom: 12 }}>التقييمات</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((r) => (
          <div key={r.id} className="pc-card" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ color: "#fbbf24" }}>{"★".repeat(r.rating)}</div>
                <div style={{ color: "var(--tx-1)", fontSize: 13 }}>{r.comment}</div>
                <div style={{ color: "var(--tx-2)", fontSize: 11, marginTop: 4 }}>{(r as any).profiles?.username} · {new Date(r.created_at).toLocaleString("ar-SA")}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggle(r.id, r.approved)}>{r.approved ? "إخفاء" : "إظهار"}</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="pc-empty">لا يوجد تقييمات.</div>}
      </div>
    </div>
  );
}
