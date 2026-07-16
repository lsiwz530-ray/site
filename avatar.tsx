import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl } from "@/lib/storage";

type Order = { id: string; user_id: string; product_id?: string | null; product_name: string; amount: number; status: string; receipt_url: string | null; payment_method: string | null; delivery_key: string | null; admin_note: string | null; created_at: string; profiles?: { username: string; display_name?: string | null } };

const STATUSES = [
  { id: "pending", label: "قيد الانتظار", color: "#fbbf24" },
  { id: "reviewing", label: "قيد المراجعة", color: "#60a5fa" },
  { id: "approved", label: "مقبول", color: "#a78bfa" },
  { id: "rejected", label: "مرفوض", color: "#f87171" },
  { id: "delivered", label: "تم التسليم", color: "#34d399" },
];

const LOADERS_URL = "https://draw-loaders.up.railway.app/loaders";

export function DashOrders() {
  const [items, setItems] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [keyEdit, setKeyEdit] = useState<Record<string, string>>({});
  const [noteEdit, setNoteEdit] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username,display_name").in("id", ids) : { data: [] };
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

  async function updateOrder(id: string, patch: Partial<Order>) {
    await supabase.from("orders").update(patch as any).eq("id", id);
    load();
  }

  async function sendKeyToUser(o: Order) {
    const key = keyEdit[o.id] ?? o.delivery_key ?? "";
    if (!key.trim()) { alert("أدخل المفتاح أولاً"); return; }
    await updateOrder(o.id, { delivery_key: key, status: "delivered", admin_note: noteEdit[o.id] || o.admin_note || null } as any);
    // also drop a message into the user's chat thread if exists
    const { data: t } = await supabase.from("chat_threads").select("id").eq("user_id", o.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (t?.id) {
      await supabase.from("chat_messages").insert({ thread_id: t.id, sender_id: o.user_id, sender_name: "الإدارة", is_admin: true, body: `🎉 تم تسليم طلبك (${o.product_name}).\nالمفتاح: ${key}` });
    }
  }

  async function sendLoadersLink(o: Order) {
    const { data: t } = await supabase.from("chat_threads").select("id").eq("user_id", o.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!t?.id) { alert("لا يوجد محادثة مفتوحة مع العميل"); return; }
    await supabase.from("chat_messages").insert({ thread_id: t.id, sender_id: o.user_id, sender_name: "الإدارة", is_admin: true, body: `📥 رابط تحميل اللودر: ${LOADERS_URL}` });
    alert("تم إرسال رابط اللودرز عبر الشات");
  }

  const filtered = filter === "all" ? items : items.filter((o) => o.status === filter);
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s.id]: items.filter((o) => o.status === s.id).length }), {} as Record<string, number>);

  return (
    <div>
      <style>{`
        .do-card{background:linear-gradient(180deg,rgba(167,139,250,.06),rgba(167,139,250,.02));border:1px solid rgba(167,139,250,.18);border-radius:16px;padding:16px;transition:border .2s,transform .2s}
        .do-card:hover{border-color:rgba(167,139,250,.35)}
        .do-chip{padding:6px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(167,139,250,.25);background:rgba(167,139,250,.05);color:var(--t1);transition:all .2s;display:inline-flex;align-items:center;gap:6px}
        .do-chip:hover{background:rgba(167,139,250,.15)}
        .do-chip.active{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(139,92,246,.4)}
        .do-frame{border:2px dashed rgba(167,139,250,.35);border-radius:12px;padding:6px;background:#0a0118;display:inline-block;position:relative}
        .do-frame img{max-width:220px;max-height:220px;border-radius:8px;display:block;cursor:zoom-in}
        .do-frame::before{content:"إيصال الدفع";position:absolute;top:-10px;right:10px;background:#0a0118;color:var(--v3);font-size:10px;padding:0 8px;font-weight:700}
        .do-btn{padding:8px 14px;border-radius:10px;border:0;cursor:pointer;font-weight:700;font-size:12px;transition:transform .15s}
        .do-btn:hover{transform:translateY(-1px)}
        .do-btn.primary{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff}
        .do-btn.success{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
        .do-btn.warn{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff}
        .do-btn.ghost{background:rgba(167,139,250,.1);color:var(--t1);border:1px solid rgba(167,139,250,.25)}
        .do-lightbox{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)}
        .do-lightbox img{max-width:96vw;max-height:92vh;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.8)}
      `}</style>
      <h2 style={{ color: "var(--t1)", marginBottom: 12 }}>الطلبات <span style={{ fontSize: 13, color: "var(--t2)" }}>({items.length})</span></h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button className={`do-chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>الكل <span style={{ opacity: .8 }}>{items.length}</span></button>
        {STATUSES.map((s) => (
          <button key={s.id} className={`do-chip ${filter === s.id ? "active" : ""}`} onClick={() => setFilter(s.id)}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            {s.label} <span style={{ opacity: .8 }}>{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map((o) => {
          const st = STATUSES.find((x) => x.id === o.status);
          return (
            <div key={o.id} className="do-card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <strong style={{ color: "var(--t1)", fontSize: 15 }}>{o.product_name}</strong>
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>العميل: <b style={{ color: "var(--v3)" }}>{(o as any).profiles?.display_name || (o as any).profiles?.username || o.user_id.slice(0, 8)}</b> · {new Date(o.created_at).toLocaleString("ar-SA")}</div>
                </div>
                <div style={{ textAlign: "left" }}>
                  <span style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", color: "#fff", padding: "6px 12px", borderRadius: 10, fontWeight: 700, fontSize: 13 }}>{Number(o.amount).toFixed(2)} ر.س</span>
                  <div style={{ fontSize: 11, marginTop: 6, display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                    <span style={{ color: "var(--t2)" }}>{o.payment_method}</span>
                    <span style={{ color: st?.color, fontWeight: 700 }}>● {st?.label ?? o.status}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "start" }}>
                {receiptUrls[o.id] ? (
                  <div className="do-frame">
                    <img src={receiptUrls[o.id]} alt="receipt" onClick={() => setPreview(receiptUrls[o.id])} />
                  </div>
                ) : (
                  <div style={{ width: 200, height: 140, border: "2px dashed rgba(167,139,250,.2)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)", fontSize: 11 }}>لا يوجد إيصال</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input className="input" placeholder="مفتاح التسليم للعميل" defaultValue={o.delivery_key ?? ""} onChange={(e) => setKeyEdit({ ...keyEdit, [o.id]: e.target.value })} />
                  <input className="input" placeholder="ملاحظة للعميل (اختياري)" defaultValue={o.admin_note ?? ""} onChange={(e) => setNoteEdit({ ...noteEdit, [o.id]: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="do-btn success" onClick={() => sendKeyToUser(o)}><i className="fa-solid fa-paper-plane" /> إرسال المفتاح + تسليم</button>
                    <button className="do-btn primary" onClick={() => sendLoadersLink(o)}><i className="fa-solid fa-download" /> إرسال رابط اللودرز</button>
                    <button className="do-btn warn" onClick={() => updateOrder(o.id, { status: "approved" } as any)}>موافقة</button>
                    <button className="do-btn ghost" onClick={() => updateOrder(o.id, { status: "reviewing" } as any)}>مراجعة</button>
                    <button className="do-btn ghost" style={{ background: "rgba(239,68,68,.15)", color: "#fca5a5" }} onClick={() => updateOrder(o.id, { status: "rejected" } as any)}>رفض</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="pc-empty">لا توجد طلبات في هذا الفلتر.</div>}
      </div>

      {preview && (
        <div className="do-lightbox" onClick={() => setPreview(null)}>
          <img src={preview} alt="preview" />
        </div>
      )}
    </div>
  );
}
