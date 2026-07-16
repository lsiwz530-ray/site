import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type P = { id: string; username: string; display_name: string | null; created_at?: string };

export function DashUsers() {
  const [users, setUsers] = useState<P[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false } as any);
    setUsers((data as P[]) ?? []);
    const { data: r } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    setAdmins(new Set((r ?? []).map((x: any) => x.user_id)));
  }
  useEffect(() => { load(); }, []);

  async function toggleAdmin(u: P) {
    setBusy(u.id);
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, role: "admin", grant: !admins.has(u.id) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "فشل التحديث");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  }

  const filtered = users.filter((u) => !q || u.username.toLowerCase().includes(q.toLowerCase()) || (u.display_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <style>{`
        .du-card{padding:14px 16px;background:linear-gradient(180deg,rgba(167,139,250,.06),rgba(167,139,250,.02));border:1px solid rgba(167,139,250,.18);border-radius:14px;display:flex;justify-content:space-between;align-items:center;gap:10px;transition:border .2s,transform .15s}
        .du-card:hover{border-color:rgba(167,139,250,.4);transform:translateY(-1px)}
        .du-avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(139,92,246,.35)}
        .du-badge{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a0a00;padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800}
        .du-btn{padding:8px 14px;border-radius:10px;border:0;cursor:pointer;font-weight:700;font-size:12px}
        .du-btn.promote{background:linear-gradient(135deg,#10b981,#059669);color:#fff}
        .du-btn.demote{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}
        .du-btn:disabled{opacity:.5;cursor:wait}
      `}</style>
      <h2 style={{ color: "var(--t1)", marginBottom: 6 }}>فريق العمل والمستخدمون</h2>
      <p style={{ color: "var(--t2)", fontSize: 12, marginBottom: 14 }}>عيّن مستخدمين كأعضاء فريق (أدمن) أو ألغِ صلاحياتهم. الأدمن الأول يجب تعيينه يدوياً بأمر SQL.</p>
      <input className="input" placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((u) => {
          const isAdmin = admins.has(u.id);
          const initial = (u.display_name || u.username).trim().charAt(0).toUpperCase();
          return (
            <div key={u.id} className="du-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="du-avatar">{initial || "?"}</div>
                <div>
                  <div style={{ color: "var(--t1)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    {u.username}
                    {isAdmin && <span className="du-badge">TEAM · ADMIN</span>}
                  </div>
                  {u.display_name && u.display_name !== u.username && <div style={{ color: "var(--t2)", fontSize: 11 }}>{u.display_name}</div>}
                  <div style={{ color: "var(--t3)", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>{u.id.slice(0, 12)}...</div>
                </div>
              </div>
              <button
                className={`du-btn ${isAdmin ? "demote" : "promote"}`}
                disabled={busy === u.id}
                onClick={() => toggleAdmin(u)}
              >
                {busy === u.id ? "..." : isAdmin ? "إزالة من الفريق" : "إضافة للفريق"}
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="pc-empty">لا يوجد مستخدمون.</div>}
      </div>
    </div>
  );
}
