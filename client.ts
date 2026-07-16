import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/north-logo.png";

type Msg = { id: string; sender_name: string; is_admin: boolean; body: string; created_at: string };

// tiny synthesized ping (no asset needed)
function playPing() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    o.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    o.start(now); o.stop(now + 0.4);
    o.onended = () => ctx.close();
  } catch {}
}

export function ChatWidget() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadOpen, setThreadOpen] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const lastAdminId = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const { data } = await supabase.from("chat_threads").select("id,open").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { setThreadId(data.id); setThreadOpen(data.open); }
    })();
  }, [user, open]);

  // find latest thread even when closed, for unread badge
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    async function tick() {
      const { data } = await supabase.from("chat_threads").select("id,open").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data || cancel) return;
      if (!threadId) setThreadId(data.id);
      const { data: last } = await supabase.from("chat_messages").select("id,is_admin").eq("thread_id", data.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!last || cancel) return;
      if (last.is_admin && last.id !== lastAdminId.current) {
        if (lastAdminId.current !== null && !open) { setUnread((u) => u + 1); playPing(); }
        lastAdminId.current = last.id;
      }
    }
    tick();
    const t = setInterval(tick, 2500);
    return () => { cancel = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]);

  useEffect(() => {
    if (!threadId) return;
    supabase.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    const ch = supabase.channel(`chat-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => [...prev, m]);
          if (m.is_admin && open) playPing();
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_threads", filter: `id=eq.${threadId}` },
        (payload) => setThreadOpen((payload.new as any).open))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId, open]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [msgs]);
  useEffect(() => { if (open) setUnread(0); }, [open]);

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
    const body = text; setText("");
    await supabase.from("chat_messages").insert({ thread_id: tid, sender_id: user.id, sender_name: name, is_admin: false, body });
    setTimeout(async () => {
      const already = msgs.some((m) => m.is_admin);
      if (!already) {
        await supabase.from("chat_messages").insert({ thread_id: tid, sender_id: user.id, sender_name: "النظام", is_admin: true, body: "✓ تم استلام رسالتك، سيتواصل معك أحد المدراء قريباً." });
      }
    }, 500);
  }

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes chat-pulse-ring { 0%{box-shadow:0 0 0 0 rgba(167,139,250,0.55),0 10px 30px rgba(139,92,246,0.55)} 70%{box-shadow:0 0 0 22px rgba(167,139,250,0),0 10px 30px rgba(139,92,246,0.55)} 100%{box-shadow:0 0 0 0 rgba(167,139,250,0),0 10px 30px rgba(139,92,246,0.55)} }
        @keyframes chat-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes chat-in { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes chat-msg-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes chat-badge-pop { 0%{transform:scale(.6)} 60%{transform:scale(1.15)} 100%{transform:scale(1)} }
        .cw-fab{position:fixed;bottom:20px;right:20px;z-index:60;width:66px;height:66px;border-radius:50%;border:2px solid rgba(167,139,250,.6);background:linear-gradient(135deg,#8b5cf6,#6d28d9);cursor:pointer;padding:10px;animation:chat-pulse-ring 2.2s ease-out infinite,chat-bob 4s ease-in-out infinite;transition:transform .25s ease}
        .cw-fab:hover{transform:scale(1.08) rotate(-4deg)}
        .cw-fab img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,.35))}
        .cw-badge{position:absolute;top:-6px;right:-6px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a0a00;font-size:10px;padding:3px 8px;border-radius:12px;white-space:nowrap;font-weight:800;box-shadow:0 4px 12px rgba(251,191,36,.5);animation:chat-badge-pop .35s ease}
        .cw-panel{position:fixed;bottom:20px;right:20px;z-index:60;width:360px;max-width:calc(100vw - 30px);height:520px;background:linear-gradient(180deg,#120724 0%,#08030f 100%);border:1px solid rgba(167,139,250,.35);border-radius:18px;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 1px rgba(167,139,250,.1) inset;animation:chat-in .28s cubic-bezier(.2,.9,.3,1.2)}
        .cw-head{padding:14px;border-bottom:1px solid rgba(167,139,250,.25);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,rgba(139,92,246,.18),transparent)}
        .cw-msg{align-self:flex-end;max-width:82%;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;padding:9px 13px;border-radius:14px 14px 4px 14px;font-size:13px;box-shadow:0 4px 14px rgba(139,92,246,.35);animation:chat-msg-in .22s ease}
        .cw-msg.admin{align-self:flex-start;background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(139,92,246,.08));color:var(--t1);border:1px solid rgba(167,139,250,.25);border-radius:14px 14px 14px 4px}
        .cw-input{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(167,139,250,.25);color:#fff;padding:10px 12px;border-radius:12px;font-size:13px;outline:none;transition:border .2s}
        .cw-input:focus{border-color:#a78bfa;box-shadow:0 0 0 3px rgba(167,139,250,.15)}
        .cw-send{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:0;padding:0 16px;border-radius:12px;cursor:pointer;font-weight:700;font-size:13px;transition:transform .15s}
        .cw-send:hover{transform:translateY(-1px)}
      `}</style>
      {!open && (
        <button className="cw-fab" onClick={() => setOpen(true)} aria-label="فتح الدعم">
          <img src={logo} alt="chat" />
          <span className="cw-badge">{unread > 0 ? `${unread} رسالة` : "عندك استفسار؟"}</span>
        </button>
      )}
      {open && (
        <div className="cw-panel">
          <div className="cw-head">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img src={logo} alt="" style={{ width: 34, height: 34 }} />
              <div>
                <div style={{ color: "var(--t1)", fontSize: 14, fontWeight: 800 }}>دعم North</div>
                <div style={{ color: threadOpen ? "#34d399" : "#f87171", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: threadOpen ? "#34d399" : "#f87171", boxShadow: threadOpen ? "0 0 8px #34d399" : "none" }} />
                  {threadOpen ? "متصل الآن" : "المحادثة مغلقة"}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,.05)", border: 0, color: "var(--t2)", cursor: "pointer", fontSize: 20, width: 30, height: 30, borderRadius: 8 }}>×</button>
          </div>
          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.length === 0 && <div style={{ color: "var(--t2)", fontSize: 12, textAlign: "center", padding: 30 }}>ابدأ محادثتك — الفريق يرد بأسرع وقت.</div>}
            {msgs.map((m) => (
              <div key={m.id} className={`cw-msg ${m.is_admin ? "admin" : ""}`}>
                <div style={{ fontSize: 10, opacity: .7, marginBottom: 2 }}>{m.sender_name}{m.is_admin && " · إدارة"}</div>
                {m.body}
              </div>
            ))}
          </div>
          <div style={{ padding: 12, borderTop: "1px solid rgba(167,139,250,.25)", display: "flex", gap: 8 }}>
            <input className="cw-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب رسالتك..." />
            <button className="cw-send" onClick={send}>إرسال</button>
          </div>
        </div>
      )}
    </>
  );
}
