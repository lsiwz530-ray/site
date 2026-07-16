import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";

type Banner = { id: string; title: string | null; image_url: string; link_url: string | null; position: string; sort_order: number; visible: boolean };
type Cat = { slug: string; name: string };

export function DashBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Partial<Banner> | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setItems((data as Banner[]) ?? []);
    const { data: c } = await supabase.from("categories").select("slug,name");
    setCats((c as Cat[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    let image_url = edit.image_url ?? "";
    if (file) {
      const path = `banners/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("banners").upload(path, file);
      if (error) { alert(error.message); return; }
      image_url = path;
    }
    if (!image_url) { alert("ارفع صورة"); return; }
    const payload = { title: edit.title ?? null, image_url, link_url: edit.link_url ?? null, position: edit.position ?? "top", sort_order: Number(edit.sort_order ?? 0), visible: edit.visible ?? true };
    if (edit.id) await supabase.from("banners").update(payload).eq("id", edit.id);
    else await supabase.from("banners").insert(payload);
    setEdit(null); setFile(null); load();
  }

  async function del(id: string) { if (!confirm("حذف؟")) return; await supabase.from("banners").delete().eq("id", id); load(); }

  const positions = [{ v: "top", l: "أعلى الصفحة" }, ...cats.map((c) => ({ v: `after_category:${c.slug}`, l: `تحت قسم ${c.name}` })), { v: "bottom", l: "أسفل الصفحة" }];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ color: "var(--tx-1)" }}>البنرات</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ visible: true, position: "top" })}>+ بنر جديد</button>
      </div>
      {edit && (
        <div className="pc-card" style={{ padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" placeholder="العنوان (اختياري)" value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
          <input className="input" placeholder="رابط عند الضغط (اختياري)" value={edit.link_url ?? ""} onChange={(e) => setEdit({ ...edit, link_url: e.target.value })} />
          <select className="input" value={edit.position ?? "top"} onChange={(e) => setEdit({ ...edit, position: e.target.value })}>
            {positions.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <input className="input" type="number" placeholder="الترتيب" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
          <label style={{ color: "var(--tx-2)", fontSize: 12 }}><input type="checkbox" checked={edit.visible ?? true} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} /> مرئي</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>حفظ</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEdit(null); setFile(null); }}>إلغاء</button>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {items.map((b) => (
          <div key={b.id} className="pc-card">
            <div style={{ height: 140, overflow: "hidden" }}><ProductImage path={b.image_url} bucket="banners" alt={b.title ?? ""} /></div>
            <div className="pc-body">
              <div className="pc-title">{b.title || "(بدون عنوان)"}</div>
              <div className="pc-meta"><span style={{ fontSize: 11 }}>{b.position}</span>{!b.visible && <span style={{ color: "#f87171", fontSize: 10 }}>مخفي</span>}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEdit(b)}>تعديل</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(b.id)}>حذف</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
