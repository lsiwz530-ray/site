import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Thread = { id: string; user_id: string; open: boolean; updated_at: string; profiles?: { username: string; display_name: string | null } };
type Msg = { id: string; sender_name: string; is_admin: boolean; body: string; created_at: string };

function playPing() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 660;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    o.frequency.exponentialRampToValueAtTime(990, now + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o.start(now); o.stop(now + 0.55);
    o.onended = () => ctx.close();
  } catch {}
}

export function DashChats() {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const lastSeen = useRef<Record<string, string>>({});

  async function loadThreads() {
    const { data } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,username,display_name").in("id", ids) : { data: [] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setThreads(rows.map((r) => ({ ...r, profiles: map.get(r.user_id) })) as Thread[]);
  }
  useEffect(() => {
    loadThreads();
    const ch = supabase.channel("dash-threads").on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => loadThreads()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // global new-user-message listener for sound + badge
  useEffect(() => {
    const ch = supabase.channel("dash-all-msgs").on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
      const m = payload.new as any as Msg & { thread_id: string };
      if (m.is_admin) return;
      playPing();
      if (!selected || selected.id !== m.thread_id) {
        setUnread((u) => ({ ...u, [m.thread_id]: (u[m.thread_id] ?? 0) + 1 }));
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setUnread((u) => ({ ...u, [selected.id]: 0 }));
    supabase.from("chat_messages").select("*").eq("thread_id", selected.id).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    const ch = supabase.channel(`dash-chat-${selected.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${selected.id}` }, (p) => {
      const m = p.new as Msg;
      setMsgs((prev) => [...prev, m]);
      lastSeen.current[selected.id] = m.id;
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!user || !selected || !text.trim()) return;
    const name = profile?.display_name || profile?.username || "الإدارة";
    const body = text; setText("");
    await supabase.from("chat_messages").insert({ thread_id: selected.id, sender_id: user.id, sender_name: name, is_admin: true, body });
  }

  async function toggleClose() {
    if (!selected) return;
    await supabase.from("chat_threads").update({ open: !selected.open }).eq("id", selected.id);
    setSelected({ ...selected, open: !selected.open });
  }

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div>
      <style>{`
        @keyframes dc-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes dc-in{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:none}}
        .dc-thread{width:100%;padding:12px;background:transparent;border:1px solid transparent;color:var(--t1);border-radius:12px;cursor:pointer;text-align:right;margin-bottom:6px;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;transition:all .2s}
        .dc-thread:hover{background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.2)}
        .dc-thread.active{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 6px 20px rgba(139,92,246,.4)}
        .dc-badge{background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;animation:dc-pop .3s}
        .dc-msg{max-width:80%;padding:9px 12px;border-radius:12px;font-size:13px;animation:dc-in .2s}
        .dc-msg.admin{align-self:flex-end;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff}
        .dc-msg.user{align-self:flex-start;background:rgba(167,139,250,.12);color:var(--t1);border:1px solid rgba(167,139,250,.2)}
      `}</style>
      <h2 style={{ color: "var(--t1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        الشات المباشر
        {totalUnread > 0 && <span className="dc-badge">{totalUnread}</span>}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, height: 560 }}>
        <div style={{ overflowY: "auto", background: "rgba(139,92,246,0.06)", borderRadius: 14, padding: 10, border: "1px solid rgba(167,139,250,.15)" }}>
          {threads.map((t) => {
            const u = unread[t.id] ?? 0;
            return (
              <button key={t.id} onClick={() => setSelected(t)} className={`dc-thread ${selected?.id === t.id ? "active" : ""}`}>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{(t as any).profiles?.display_name || (t as any).profiles?.username || t.user_id.slice(0, 8)}</div>
                  <div style={{ fontSize: 10, opacity: .75 }}>{t.open ? "● مفتوح" : "● مغلق"}</div>
                </div>
                {u > 0 && <span className="dc-badge">{u}</span>}
              </button>
            );
          })}
          {threads.length === 0 && <div style={{ color: "var(--t2)", fontSize: 12, padding: 12, textAlign: "center" }}>لا توجد محادثات.</div>}
        </div>
        <div style={{ background: "linear-gradient(180deg,#0f0520,#08030f)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 14, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <>
              <div style={{ padding: 12, borderBottom: "1px solid rgba(167,139,250,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "var(--t1)" }}>{(selected as any).profiles?.display_name || (selected as any).profiles?.username}</strong>
                <button className="btn btn-ghost btn-sm" onClick={toggleClose}>{selected.open ? "إغلاق المحادثة" : "إعادة فتح"}</button>
              </div>
              <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {msgs.map((m) => (
                  <div key={m.id} className={`dc-msg ${m.is_admin ? "admin" : "user"}`}>
                    <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>{m.sender_name}</div>
                    {m.body}
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, borderTop: "1px solid rgba(167,139,250,0.25)", display: "flex", gap: 8 }}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="ردّك..." />
                <button className="btn btn-primary btn-sm" onClick={send}>إرسال</button>
              </div>
            </>
          ) : <div style={{ margin: "auto", color: "var(--t2)" }}>اختر محادثة</div>}
        </div>
      </div>
    </div>
  );
}
