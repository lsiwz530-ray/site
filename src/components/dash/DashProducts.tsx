import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";

type Product = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; stock: number; visible: boolean; sort_order: number };
type Cat = { id: string; name: string };

export function DashProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("sort_order");
    setItems((data as Product[]) ?? []);
    const { data: c } = await supabase.from("categories").select("id,name").order("sort_order");
    setCats((c as Cat[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      let image_url = edit.image_url ?? null;
      if (file) {
        const path = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) throw error;
        image_url = path;
      }
      const payload = {
        name: edit.name!, description: edit.description ?? "", price: Number(edit.price ?? 0),
        stock: Number(edit.stock ?? 0), category_id: edit.category_id ?? null,
        visible: edit.visible ?? true, sort_order: Number(edit.sort_order ?? 0), image_url,
      };
      if (edit.id) await supabase.from("products").update(payload).eq("id", edit.id);
      else await supabase.from("products").insert(payload);
      setEdit(null); setFile(null); load();
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm("حذف المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id); load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ color: "var(--tx-1)" }}>المنتجات ({items.length})</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ visible: true, price: 0, stock: 0 })}>+ منتج جديد</button>
      </div>

      {edit && (
        <div className="pc-card" style={{ padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ color: "var(--tx-1)" }}>{edit.id ? "تعديل" : "منتج جديد"}</h3>
          <input className="input" placeholder="الاسم" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <textarea className="input" rows={2} placeholder="الوصف" value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <input className="input" type="number" step="0.01" placeholder="السعر" value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} />
            <input className="input" type="number" placeholder="المخزون" value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} />
            <input className="input" type="number" placeholder="الترتيب" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
          </div>
          <select className="input" value={edit.category_id ?? ""} onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}>
            <option value="">(بدون قسم)</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
          <label style={{ color: "var(--tx-2)", fontSize: 12 }}>
            <input type="checkbox" checked={edit.visible ?? true} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} /> مرئي
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !edit.name}>{busy ? "..." : "حفظ"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEdit(null); setFile(null); }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        {items.map((p) => (
          <div key={p.id} className="pc-card">
            <div style={{ height: 140, overflow: "hidden" }}><ProductImage path={p.image_url} alt={p.name} /></div>
            <div className="pc-body">
              <div className="pc-title">{p.name} {!p.visible && <span style={{ color: "#f87171", fontSize: 10 }}>(مخفي)</span>}</div>
              <div className="pc-meta"><span className="pc-badge">{Number(p.price).toFixed(2)} ر.س</span><span style={{ fontSize: 11 }}>مخزون: {p.stock}</span></div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}>تعديل</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
