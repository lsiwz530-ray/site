import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images: string[] | null;
  youtube_url: string | null;
  stock: number;
  visible: boolean;
  sort_order: number;
};
type Cat = { id: string; name: string };

type Draft = Partial<Product> & { images?: string[] };

const emptyDraft: Draft = {
  visible: true,
  price: 0,
  stock: 0,
  sort_order: 0,
  images: [],
};

async function uploadOne(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/storage/product-images", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.publicUrl || (j.path ? `/uploads/product-images/${j.path}` : null);
}

function ytEmbed(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/) ||
    url.match(/^([A-Za-z0-9_-]{6,})$/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function DashProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"main" | "media" | "extra">("main");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("sort_order");
    const rows = (data as any[]) ?? [];
    setItems(
      rows.map((p) => ({
        ...p,
        images: Array.isArray(p.images) ? p.images : [],
      })),
    );
    const { data: c } = await supabase.from("categories").select("id,name").order("sort_order");
    setCats((c as Cat[]) ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, query]);

  function open(p?: Product) {
    setTab("main");
    if (p) {
      setEdit({
        ...p,
        images: Array.isArray(p.images) && p.images.length ? p.images : p.image_url ? [p.image_url] : [],
      });
    } else {
      setEdit({ ...emptyDraft });
    }
  }

  async function onAddImages(files: FileList | null) {
    if (!files || !files.length || !edit) return;
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const u = await uploadOne(f);
      if (u) urls.push(u);
    }
    setEdit({ ...edit, images: [...(edit.images ?? []), ...urls] });
    setUploading(false);
  }

  function removeImage(i: number) {
    if (!edit) return;
    const next = [...(edit.images ?? [])];
    next.splice(i, 1);
    setEdit({ ...edit, images: next });
  }

  function moveImage(i: number, dir: -1 | 1) {
    if (!edit) return;
    const next = [...(edit.images ?? [])];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setEdit({ ...edit, images: next });
  }

  async function save() {
    if (!edit) return;
    setBusy(true);
    try {
      const images = edit.images ?? [];
      const payload: any = {
        name: (edit.name ?? "").trim(),
        description: edit.description ?? "",
        price: Number(edit.price ?? 0),
        stock: Number(edit.stock ?? 0),
        category_id: edit.category_id ?? null,
        visible: edit.visible ?? true,
        sort_order: Number(edit.sort_order ?? 0),
        image_url: images[0] ?? null,
        images,
        youtube_url: (edit.youtube_url ?? "").trim() || null,
      };
      if (edit.id) await supabase.from("products").update(payload).eq("id", edit.id);
      else await supabase.from("products").insert(payload);
      setEdit(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("حذف المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <div className="dp-wrap">
      <div className="dp-toolbar">
        <div>
          <h2 className="dp-h">المنتجات</h2>
          <div className="dp-sub">إجمالي {items.length} منتج</div>
        </div>
        <div className="dp-tools">
          <input
            className="input dp-search"
            placeholder="بحث بالاسم…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => open()}>
            + إضافة منتج
          </button>
        </div>
      </div>

      <div className="dp-grid">
        {filtered.map((p) => {
          const cover = (p.images && p.images[0]) || p.image_url;
          return (
            <div key={p.id} className="dp-card">
              <div className="dp-cover">
                <ProductImage path={cover} alt={p.name} fit="contain" />
                {p.images && p.images.length > 1 && (
                  <span className="dp-pill">+{p.images.length - 1}</span>
                )}
                {p.youtube_url && <span className="dp-pill dp-pill-yt">▶ فيديو</span>}
                {!p.visible && <span className="dp-pill dp-pill-off">مخفي</span>}
              </div>
              <div className="dp-body">
                <div className="dp-title" title={p.name}>{p.name}</div>
                <div className="dp-row">
                  <span className="dp-price">{Number(p.price).toFixed(2)} ر.س</span>
                  <span className="dp-stock">مخزون: {p.stock}</span>
                </div>
                <div className="dp-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => open(p)}>
                    تعديل
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>
                    حذف
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="dp-empty">لا توجد منتجات مطابقة.</div>
        )}
      </div>

      {edit && (
        <div className="dp-modal" role="dialog" onClick={(e) => {
          if (e.currentTarget === e.target) setEdit(null);
        }}>
          <div className="dp-sheet">
            <div className="dp-sheet-head">
              <div>
                <div className="dp-sheet-title">{edit.id ? "تعديل منتج" : "إضافة منتج جديد"}</div>
                <div className="dp-sheet-sub">أدخل بيانات المنتج ثم احفظ</div>
              </div>
              <button className="dp-x" onClick={() => setEdit(null)} aria-label="إغلاق">✕</button>
            </div>

            <div className="dp-tabs">
              <button className={`dp-tab ${tab === "main" ? "on" : ""}`} onClick={() => setTab("main")}>
                <span>①</span> بيانات المنتج
              </button>
              <button className={`dp-tab ${tab === "media" ? "on" : ""}`} onClick={() => setTab("media")}>
                <span>②</span> الصور والفيديو
              </button>
              <button className={`dp-tab ${tab === "extra" ? "on" : ""}`} onClick={() => setTab("extra")}>
                <span>③</span> إعدادات إضافية
              </button>
            </div>

            <div className="dp-sheet-body">
              {tab === "main" && (
                <div className="dp-form">
                  <div className="dp-field">
                    <label>اسم المنتج <span className="req">*</span></label>
                    <input
                      className="input"
                      placeholder="مثال: تتبع ألوان DrawAi (6 أشهر)"
                      value={edit.name ?? ""}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    />
                  </div>

                  <div className="dp-grid2">
                    <div className="dp-field">
                      <label>السعر (ر.س) <span className="req">*</span></label>
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        value={edit.price ?? 0}
                        onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dp-field">
                      <label>القسم</label>
                      <select
                        className="input"
                        value={edit.category_id ?? ""}
                        onChange={(e) => setEdit({ ...edit, category_id: e.target.value || null })}
                      >
                        <option value="">(بدون قسم)</option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="dp-field">
                    <label>وصف المنتج</label>
                    <textarea
                      className="input"
                      rows={8}
                      placeholder="اكتب وصفاً كاملاً للمنتج، المميزات، طريقة التسليم…"
                      value={edit.description ?? ""}
                      onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {tab === "media" && (
                <div className="dp-form">
                  <div className="dp-field">
                    <label>صور المنتج (يمكن رفع أكثر من صورة)</label>
                    <div className="dp-drop">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => onAddImages(e.target.files)}
                        id="dp-file-in"
                        style={{ display: "none" }}
                      />
                      <label htmlFor="dp-file-in" className="dp-drop-inner">
                        <div className="dp-drop-icon">＋</div>
                        <div className="dp-drop-title">{uploading ? "جاري الرفع…" : "اضغط لرفع الصور"}</div>
                        <div className="dp-drop-sub">PNG · JPG · WEBP — يتم عرض الصور بمقاسها الطبيعي</div>
                      </label>
                    </div>

                    {edit.images && edit.images.length > 0 && (
                      <div className="dp-thumbs">
                        {edit.images.map((src, i) => (
                          <div key={src + i} className={`dp-thumb ${i === 0 ? "primary" : ""}`}>
                            <img src={src} alt="" />
                            {i === 0 && <span className="dp-thumb-tag">الغلاف</span>}
                            <div className="dp-thumb-tools">
                              <button title="لليسار" onClick={() => moveImage(i, -1)} disabled={i === 0}>←</button>
                              <button title="لليمين" onClick={() => moveImage(i, 1)} disabled={i === (edit.images!.length - 1)}>→</button>
                              <button title="حذف" className="danger" onClick={() => removeImage(i)}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="dp-field">
                    <label>رابط فيديو YouTube (اختياري)</label>
                    <input
                      className="input"
                      placeholder="https://www.youtube.com/watch?v=…"
                      value={edit.youtube_url ?? ""}
                      onChange={(e) => setEdit({ ...edit, youtube_url: e.target.value })}
                    />
                    {ytEmbed(edit.youtube_url) && (
                      <div className="dp-yt-preview">
                        <iframe
                          src={ytEmbed(edit.youtube_url)!}
                          title="معاينة الفيديو"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "extra" && (
                <div className="dp-form">
                  <div className="dp-grid2">
                    <div className="dp-field">
                      <label>المخزون</label>
                      <input
                        className="input"
                        type="number"
                        value={edit.stock ?? 0}
                        onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })}
                      />
                    </div>
                    <div className="dp-field">
                      <label>ترتيب العرض</label>
                      <input
                        className="input"
                        type="number"
                        value={edit.sort_order ?? 0}
                        onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <label className="dp-check">
                    <input
                      type="checkbox"
                      checked={edit.visible ?? true}
                      onChange={(e) => setEdit({ ...edit, visible: e.target.checked })}
                    />
                    <span>عرض المنتج للعملاء</span>
                  </label>
                </div>
              )}
            </div>

            <div className="dp-sheet-foot">
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={save} disabled={busy || !edit.name}>
                {busy ? "جاري الحفظ…" : edit.id ? "حفظ التعديلات" : "إنشاء المنتج"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
