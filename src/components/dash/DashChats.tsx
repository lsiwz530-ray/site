import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Thread = { id: string; user_id: string; open: boolean; updated_at: string; profiles?: { username: string; display_name: string | null } };
type Msg = { id: string; sender_name: string; is_admin: boolean; body: string; created_at: string };

export function DashChats() {
  const { user, profile } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!selected) return;
    supabase.from("chat_messages").select("*").eq("thread_id", selected.id).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    const ch = supabase.channel(`dash-chat-${selected.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${selected.id}` }, (p) => setMsgs((m) => [...m, p.new as Msg])).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selected]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs]);

  async function send() {
    if (!user || !selected || !text.trim()) return;
    const name = profile?.display_name || profile?.username || "الإدارة";
    await supabase.from("chat_messages").insert({ thread_id: selected.id, sender_id: user.id, sender_name: name, is_admin: true, body: text });
    setText("");
  }

  async function toggleClose() {
    if (!selected) return;
    await supabase.from("chat_threads").update({ open: !selected.open }).eq("id", selected.id);
    setSelected({ ...selected, open: !selected.open });
  }

  return (
    <div>
      <h2 style={{ color: "var(--tx-1)", marginBottom: 12 }}>الشات المباشر</h2>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, height: 500 }}>
        <div style={{ overflowY: "auto", background: "rgba(139,92,246,0.06)", borderRadius: 12, padding: 8 }}>
          {threads.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} style={{ width: "100%", padding: 10, background: selected?.id === t.id ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "transparent", border: 0, color: selected?.id === t.id ? "#fff" : "var(--tx-1)", borderRadius: 8, cursor: "pointer", textAlign: "right", marginBottom: 4, fontSize: 12 }}>
              <div>{(t as any).profiles?.display_name || (t as any).profiles?.username || t.user_id.slice(0, 8)}</div>
              <div style={{ fontSize: 10, color: t.open ? "#34d399" : "#f87171" }}>{t.open ? "● مفتوح" : "● مغلق"}</div>
            </button>
          ))}
          {threads.length === 0 && <div style={{ color: "var(--tx-2)", fontSize: 12, padding: 12 }}>لا توجد محادثات.</div>}
        </div>
        <div style={{ background: "#0f0520", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 12, display: "flex", flexDirection: "column" }}>
          {selected ? (
            <>
              <div style={{ padding: 10, borderBottom: "1px solid rgba(139,92,246,0.3)", display: "flex", justifyContent: "space-between" }}>
                <strong style={{ color: "var(--tx-1)" }}>{(selected as any).profiles?.username}</strong>
                <button className="btn btn-ghost btn-sm" onClick={toggleClose}>{selected.open ? "إغلاق المحادثة" : "إعادة فتح"}</button>
              </div>
              <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {msgs.map((m) => (
                  <div key={m.id} style={{ alignSelf: m.is_admin ? "flex-end" : "flex-start", maxWidth: "80%", background: m.is_admin ? "#8b5cf6" : "rgba(139,92,246,0.2)", color: m.is_admin ? "#fff" : "var(--tx-1)", padding: "8px 12px", borderRadius: 12, fontSize: 13 }}>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{m.sender_name}</div>
                    {m.body}
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, borderTop: "1px solid rgba(139,92,246,0.3)", display: "flex", gap: 6 }}>
                <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="ردّك..." />
                <button className="btn btn-primary btn-sm" onClick={send}>إرسال</button>
              </div>
            </>
          ) : <div style={{ margin: "auto", color: "var(--tx-2)" }}>اختر محادثة</div>}
        </div>
      </div>
    </div>
  );
}
