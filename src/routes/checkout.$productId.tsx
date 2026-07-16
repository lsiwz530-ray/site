import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { ProductImage } from "@/components/ProductImage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null; stock: number };

export const Route = createFileRoute("/checkout/$productId")({
  component: Checkout,
});

const METHODS = [
  { id: "stcpay", label: "STC Pay", color: "#4A1E68" },
  { id: "barq", label: "بارق (Barq)", color: "#00A651" },
  { id: "alahli", label: "الأهلي (AlAhli)", color: "#00693C" },
];

function Checkout() {
  const { productId } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [method, setMethod] = useState("stcpay");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", productId).maybeSingle().then(({ data }) => setP(data as Product));
  }, [productId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!user) { nav({ to: "/auth" }); return; }
    if (!p) return;
    if (!file) { setErr("ارفع صورة إيصال الدفع."); return; }
    setBusy(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) throw upErr;
      const { error: orderErr } = await supabase.from("orders").insert({
        user_id: user.id, product_id: p.id, product_name: p.name, amount: p.price,
        payment_method: method, receipt_url: path, status: "reviewing",
      });
      if (orderErr) throw orderErr;
      nav({ to: "/orders" });
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  if (!p) return <div className="page-shell"><PublicNav /><div className="pc-empty">جاري التحميل...</div></div>;

  return (
    <div className="page-shell">
      <PublicNav />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20, marginTop: 20 }}>
        <div className="pc-card" style={{ padding: 20 }}>
          <div style={{ height: 220, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            <ProductImage path={p.image_url} alt={p.name} />
          </div>
          <h2 style={{ color: "var(--tx-1)", marginBottom: 8 }}>{p.name}</h2>
          <p style={{ color: "var(--tx-2)", fontSize: 13 }}>{p.description}</p>
          <div className="pc-badge" style={{ marginTop: 10, fontSize: 16 }}>{Number(p.price).toFixed(2)} ر.س</div>
        </div>

        <form onSubmit={submit} className="pc-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <h3 style={{ color: "var(--tx-1)" }}>إتمام الشراء</h3>
          {!user && <div className="alert">يجب تسجيل الدخول أولاً — <Link to="/auth" className="nav-link">دخول</Link></div>}

          <div>
            <label style={{ fontSize: 12, color: "var(--tx-2)" }}>طريقة الدفع</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 6 }}>
              {METHODS.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  style={{ padding: 12, borderRadius: 10, background: method === m.id ? m.color : "rgba(139,92,246,0.1)", color: "#fff", border: method === m.id ? "2px solid #fff" : "1px solid rgba(139,92,246,0.3)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: "var(--tx-2)" }}>صورة إيصال الدفع (من الجوال أو الكمبيوتر)</label>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input" style={{ marginTop: 6 }} />
            {file && <div style={{ fontSize: 11, color: "var(--v3)", marginTop: 4 }}>✓ {file.name}</div>}
          </div>

          {err && <div className="alert" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy || !user}>{busy ? "جاري الإرسال..." : "إرسال الطلب"}</button>
          <p style={{ fontSize: 11, color: "var(--tx-2)" }}>سيتم مراجعة الإيصال وإرسال المفتاح لك في صفحة "طلباتي" بعد الموافقة.</p>
        </form>
      </div>
    </div>
  );
}
