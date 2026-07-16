import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Review = { id: string; rating: number; comment: string | null; created_at: string; user_id: string; profiles?: { username: string; display_name: string | null } };

export function ReviewsSection({ compact = false }: { compact?: boolean }) {
  const { user, profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("reviews").select("id,rating,comment,created_at,user_id").eq("approved", true).order("created_at", { ascending: false }).limit(compact ? 3 : 20);
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username,display_name").in("id", ids) : { data: [] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setReviews(rows.map((r) => ({ ...r, profiles: map.get(r.user_id) })) as Review[]);
  }
  useEffect(() => { load(); }, [compact]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setMsg("سجّل الدخول لكتابة تقييم."); return; }
    const { error } = await supabase.from("reviews").insert({ user_id: user.id, rating, comment });
    if (error) setMsg(error.message);
    else { setComment(""); setMsg("شكراً على تقييمك!"); load(); }
  }

  return (
    <div className="section-block">
      <div className="section-head">
        <h3>{compact ? "آخر تقييمات العملاء" : "قيّم تجربتك معنا — فضلاً وليس أمراً"}</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fit,minmax(240px,1fr))" : "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
        {reviews.map((r) => (
          <div key={r.id} style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#fbbf24", marginBottom: 6 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            {r.comment && <div style={{ color: "var(--tx-1)", fontSize: 13, marginBottom: 8 }}>{r.comment}</div>}
            <div style={{ fontSize: 11, color: "var(--tx-2)" }}>{(r as any).profiles?.display_name || (r as any).profiles?.username}</div>
          </div>
        ))}
        {reviews.length === 0 && <div className="pc-empty">لا توجد تقييمات بعد.</div>}
      </div>
      {!compact && (
        <form onSubmit={submit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, background: "rgba(139,92,246,0.06)", padding: 16, borderRadius: 14, border: "1px solid rgba(139,92,246,0.2)" }}>
          <div style={{ display: "flex", gap: 6, fontSize: 26 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} style={{ cursor: "pointer", color: n <= rating ? "#fbbf24" : "#555" }} onClick={() => setRating(n)}>★</span>
            ))}
          </div>
          <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={user ? `اكتب تقييمك يا ${profile?.username ?? ""}...` : "سجّل الدخول أولاً"} disabled={!user} />
          {msg && <div style={{ fontSize: 12, color: "var(--v3)" }}>{msg}</div>}
          <button className="btn btn-primary" disabled={!user}>إرسال التقييم</button>
        </form>
      )}
    </div>
  );
}
