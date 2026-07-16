import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Content = { key: string; value: any };

const DEFAULTS: Content[] = [
  { key: "hero", value: { title: "North Store", subtitle: "متجرك الاحترافي", cta: "تسوق الآن" } },
  { key: "contact", value: { discord: "https://discord.gg/8T4cHFHJ2S", whatsapp: "966555412042" } },
  { key: "theme", value: { primary: "#8b5cf6", accent: "#a855f7", bg: "#0a0118" } },
];

const PALETTES = [
  { name: "بنفسجي (افتراضي)", primary: "#8b5cf6", accent: "#a855f7", bg: "#0a0118" },
  { name: "سماوي نيون", primary: "#06b6d4", accent: "#22d3ee", bg: "#031421" },
  { name: "أخضر ماتريكس", primary: "#10b981", accent: "#34d399", bg: "#031510" },
  { name: "أحمر جيمينج", primary: "#ef4444", accent: "#f87171", bg: "#1a0505" },
  { name: "ذهبي فاخر", primary: "#f59e0b", accent: "#fbbf24", bg: "#1a1105" },
];

export function DashContent() {
  const [items, setItems] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("site_content").select("*");
    const m: Record<string, any> = {};
    for (const d of DEFAULTS) m[d.key] = d.value;
    for (const r of (data ?? []) as Content[]) m[r.key] = r.value;
    setItems(m);
  }
  useEffect(() => { load(); }, []);

  async function save(key: string, value: any) {
    setBusy(true);
    await supabase.from("site_content").upsert({ key, value }, { onConflict: "key" });
    setItems({ ...items, [key]: value });
    setBusy(false);
  }

  async function applyPalette(p: typeof PALETTES[0]) {
    await save("theme", { primary: p.primary, accent: p.accent, bg: p.bg });
    alert("تم! حدّث الصفحة لرؤية الألوان.");
  }

  const hero = items.hero ?? DEFAULTS[0].value;
  const contact = items.contact ?? DEFAULTS[1].value;
  const theme = items.theme ?? DEFAULTS[2].value;

  return (
    <div>
      <h2 style={{ color: "var(--tx-1)", marginBottom: 12 }}>محرر المحتوى</h2>

      <div className="pc-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ color: "var(--v3)", marginBottom: 10 }}>الصفحة الرئيسية (Hero)</h3>
        <input className="input" placeholder="العنوان" value={hero.title ?? ""} onChange={(e) => setItems({ ...items, hero: { ...hero, title: e.target.value } })} style={{ marginBottom: 8 }} />
        <textarea className="input" rows={2} placeholder="الوصف" value={hero.subtitle ?? ""} onChange={(e) => setItems({ ...items, hero: { ...hero, subtitle: e.target.value } })} style={{ marginBottom: 8 }} />
        <input className="input" placeholder="زر الإجراء" value={hero.cta ?? ""} onChange={(e) => setItems({ ...items, hero: { ...hero, cta: e.target.value } })} style={{ marginBottom: 8 }} />
        <button className="btn btn-primary btn-sm" onClick={() => save("hero", hero)} disabled={busy}>حفظ</button>
      </div>

      <div className="pc-card" style={{ padding: 16, marginBottom: 16 }}>
        <h3 style={{ color: "var(--v3)", marginBottom: 10 }}>معلومات التواصل</h3>
        <input className="input" placeholder="رابط Discord" value={contact.discord ?? ""} onChange={(e) => setItems({ ...items, contact: { ...contact, discord: e.target.value } })} style={{ marginBottom: 8 }} />
        <input className="input" placeholder="رقم WhatsApp (دولي)" value={contact.whatsapp ?? ""} onChange={(e) => setItems({ ...items, contact: { ...contact, whatsapp: e.target.value } })} style={{ marginBottom: 8 }} />
        <button className="btn btn-primary btn-sm" onClick={() => save("contact", contact)} disabled={busy}>حفظ</button>
      </div>

      <div className="pc-card" style={{ padding: 16 }}>
        <h3 style={{ color: "var(--v3)", marginBottom: 10 }}>قوالب الألوان الجاهزة</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
          {PALETTES.map((p) => (
            <button key={p.name} onClick={() => applyPalette(p)} style={{ padding: 12, background: `linear-gradient(135deg,${p.primary},${p.accent})`, border: 0, borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              {p.name}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <h4 style={{ color: "var(--tx-2)", fontSize: 12 }}>أو مخصص:</h4>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input type="color" value={theme.primary} onChange={(e) => setItems({ ...items, theme: { ...theme, primary: e.target.value } })} />
            <input type="color" value={theme.accent} onChange={(e) => setItems({ ...items, theme: { ...theme, accent: e.target.value } })} />
            <input type="color" value={theme.bg} onChange={(e) => setItems({ ...items, theme: { ...theme, bg: e.target.value } })} />
            <button className="btn btn-primary btn-sm" onClick={() => save("theme", theme)}>حفظ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
