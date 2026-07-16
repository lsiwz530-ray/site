import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Cat = { id: string; name: string; slug: string; sort_order: number; visible: boolean };

export function DashCategories() {
  const [items, setItems] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    setItems((data as Cat[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit || !edit.name) return;
    const slug = (edit.slug || edit.name).toString().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = { name: edit.name, slug, sort_order: Number(edit.sort_order ?? 0), visible: edit.visible ?? true };
    if (edit.id) await supabase.from("categories").update(payload).eq("id", edit.id);
    else await supabase.from("categories").insert(payload);
    setEdit(null); load();
  }
  async function del(id: string) {
    if (!confirm("حذف القسم؟")) return;
    await supabase.from("categories").delete().eq("id", id); load();
  }
  async function move(id: string, dir: -1 | 1) {
    const it = items.find((x) => x.id === id); if (!it) return;
    await supabase.from("categories").update({ sort_order: it.sort_order + dir }).eq("id", id); load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 style={{ color: "var(--tx-1)" }}>الأقسام</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ visible: true, sort_order: items.length + 1 })}>+ قسم جديد</button>
      </div>
      {edit && (
        <div className="pc-card" style={{ padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="input" placeholder="اسم القسم" value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <input className="input" placeholder="slug (اختياري)" value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
          <input className="input" type="number" placeholder="الترتيب" value={edit.sort_order ?? 0} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} />
          <label style={{ color: "var(--tx-2)", fontSize: 12 }}><input type="checkbox" checked={edit.visible ?? true} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} /> مرئي</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>حفظ</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>إلغاء</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((c) => (
          <div key={c.id} className="pc-card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "var(--tx-1)" }}>{c.name}</strong>
              <span style={{ color: "var(--tx-2)", fontSize: 11, marginRight: 8 }}>#{c.sort_order} · /{c.slug}</span>
              {!c.visible && <span style={{ color: "#f87171", fontSize: 10 }}>(مخفي)</span>}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => move(c.id, -1)}>↑</button>
              <button className="btn btn-ghost btn-sm" onClick={() => move(c.id, 1)}>↓</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(c)}>تعديل</button>
              <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
