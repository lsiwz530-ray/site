import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/storage";

type Order = { id: string; user_id: string; product_name: string; amount: number; status: string; receipt_url: string | null; payment_method: string | null; delivery_key: string | null; admin_note: string | null; created_at: string; profiles?: { username: string } };

const STATUSES = ["pending", "reviewing", "approved", "rejected", "delivered"];

export function DashOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [keyEdit, setKeyEdit] = useState<Record<string, string>>({});
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username").in("id", ids) : { data: [] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const withProfiles = rows.map((r) => ({ ...r, profiles: map.get(r.user_id) })) as Order[];
    setItems(withProfiles);
    const urls: Record<string, string> = {};
    for (const o of withProfiles) {
      if (o.receipt_url) { const u = await signedUrl("receipts", o.receipt_url); if (u) urls[o.id] = u; }
    }
    setReceiptUrls(urls);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    const update: any = { status };
    if (keyEdit[id]) update.delivery_key = keyEdit[id];
    if (noteEdit[id]) update.admin_note = noteEdit[id];
    await supabase.from("orders").update(update).eq("id", id); load();
  }

  const filtered = filter === "all" ? items : items.filter((o) => o.status === filter);

  return (
    <div>
      <h2 style={{ color: "var(--tx-1)", marginBottom: 12 }}>الطلبات ({items.length})</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter("all")}>الكل</button>
        {STATUSES.map((s) => <button key={s} className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-ghost"}`} onClick={() => setFilter(s)}>{s}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((o) => (
          <div key={o.id} className="pc-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div>
                <strong style={{ color: "var(--tx-1)" }}>{o.product_name}</strong>
                <div style={{ fontSize: 11, color: "var(--tx-2)" }}>العميل: {(o as any).profiles?.username ?? o.user_id.slice(0, 8)} · {new Date(o.created_at).toLocaleString("ar-SA")}</div>
              </div>
              <div style={{ textAlign: "left" }}>
                <span className="pc-badge">{Number(o.amount).toFixed(2)} ر.س</span>
                <div style={{ fontSize: 11, color: "var(--v3)", marginTop: 4 }}>{o.payment_method} · {o.status}</div>
              </div>
            </div>
            {receiptUrls[o.id] && (
              <a href={receiptUrls[o.id]} target="_blank" rel="noreferrer">
                <img src={receiptUrls[o.id]} alt="receipt" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: "1px solid rgba(139,92,246,0.3)" }} />
              </a>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <input className="input" placeholder="مفتاح التسليم" defaultValue={o.delivery_key ?? ""} onChange={(e) => setKeyEdit({ ...keyEdit, [o.id]: e.target.value })} />
              <input className="input" placeholder="ملاحظة للعميل" defaultValue={o.admin_note ?? ""} onChange={(e) => setNoteEdit({ ...noteEdit, [o.id]: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button key={s} className={`btn btn-sm ${o.status === s ? "btn-primary" : "btn-ghost"}`} onClick={() => updateStatus(o.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="pc-empty">لا توجد طلبات.</div>}
      </div>
    </div>
  );
}
