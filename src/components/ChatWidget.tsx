import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/north-logo.png";

type Msg = { id: string; sender_name: string; is_admin: boolean; body: string; created_at: string };

export function ChatWidget() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // find or create thread
  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase.from("chat_threads").select("id,open").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { setThreadId(data.id); setThreadOpen(data.open); }
    })();
  }, [user, open]);

  // load messages + realtime
  useEffect(() => {
    if (!threadId) return;
    supabase.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    const ch = supabase.channel(`chat-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_threads", filter: `id=eq.${threadId}` },
        (payload) => setThreadOpen((payload.new as any).open))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs]);

  async function send() {
    if (!user || !text.trim()) return;
    let tid = threadId;
    if (!tid) {
      const { data } = await supabase.from("chat_threads").insert({ user_id: user.id, open: true }).select("id").single();
      tid = data!.id; setThreadId(tid); setThreadOpen(true);
    } else if (!threadOpen) {
      await supabase.from("chat_threads").update({ open: true }).eq("id", tid);
      setThreadOpen(true);
    }
    const name = profile?.display_name || profile?.username || "زائر";
    await supabase.from("chat_messages").insert({ thread_id: tid, sender_id: user.id, sender_name: name, is_admin: false, body: text });
    setText("");
    // auto-ack
    setTimeout(async () => {
      const already = msgs.some((m) => m.is_admin);
      if (!already) {
        await supabase.from("chat_messages").insert({ thread_id: tid, sender_id: user.id, sender_name: "النظام", is_admin: true, body: "✓ تم استلام رسالتك، سيتواصل معك أحد المدراء قريباً." });
      }
    }, 800);
  }

  if (!user) return null;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 20, right: 20, zIndex: 60, width: 62, height: 62, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.6)", background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", cursor: "pointer", boxShadow: "0 10px 30px rgba(139,92,246,0.5)", padding: 8 }}>
          <img src={logo} alt="chat" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          <span style={{ position: "absolute", top: -8, right: -8, background: "#fbbf24", color: "#000", fontSize: 10, padding: "3px 7px", borderRadius: 10, whiteSpace: "nowrap", fontWeight: 700 }}>عندك استفسار؟</span>
        </button>
      )}
      {open && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 60, width: 340, maxWidth: "calc(100vw - 30px)", height: 480, background: "#0f0520", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 16, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ padding: 12, borderBottom: "1px solid rgba(139,92,246,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <img src={logo} alt="" style={{ width: 32, height: 32 }} />
              <div>
                <div style={{ color: "var(--tx-1)", fontSize: 13, fontWeight: 700 }}>دعم North</div>
                <div style={{ color: threadOpen ? "#34d399" : "#f87171", fontSize: 10 }}>{threadOpen ? "● متصل" : "● مغلق"}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: 0, color: "var(--tx-2)", cursor: "pointer", fontSize: 20 }}>×</button>
          </div>
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.length === 0 && <div style={{ color: "var(--tx-2)", fontSize: 12, textAlign: "center", padding: 20 }}>ابدأ محادثتك — الفريق يرد بأسرع وقت.</div>}
            {msgs.map((m) => (
              <div key={m.id} style={{ alignSelf: m.is_admin ? "flex-start" : "flex-end", maxWidth: "80%", background: m.is_admin ? "rgba(139,92,246,0.2)" : "#8b5cf6", color: m.is_admin ? "var(--tx-1)" : "#fff", padding: "8px 12px", borderRadius: 12, fontSize: 13 }}>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>{m.sender_name}{m.is_admin && " (إدارة)"}</div>
                {m.body}
              </div>
            ))}
          </div>
          <div style={{ padding: 10, borderTop: "1px solid rgba(139,92,246,0.3)", display: "flex", gap: 6 }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب رسالتك..." />
            <button className="btn btn-primary btn-sm" onClick={send}>إرسال</button>
          </div>
        </div>
      )}
    </>
  );
}
