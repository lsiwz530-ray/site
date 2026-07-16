import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type P = { id: string; username: string; display_name: string | null; created_at: string };

export function DashUsers() {
  const [users, setUsers] = useState<P[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data as P[]) ?? []);
    const { data: r } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    setAdmins(new Set((r ?? []).map((x: any) => x.user_id)));
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2 style={{ color: "var(--tx-1)", marginBottom: 12 }}>المستخدمون ({users.length})</h2>
      <p style={{ color: "var(--tx-2)", fontSize: 12, marginBottom: 12 }}>لتعيين أدمن، استخدم SQL Editor:<br />
        <code style={{ background: "#0a0118", padding: 4, borderRadius: 4, fontSize: 11 }}>INSERT INTO user_roles(user_id,role) VALUES('...','admin');</code>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {users.map((u) => (
          <div key={u.id} className="pc-card" style={{ padding: 10, display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong style={{ color: "var(--tx-1)" }}>{u.username}</strong>
              {u.display_name && u.display_name !== u.username && <span style={{ color: "var(--tx-2)", marginRight: 6 }}>({u.display_name})</span>}
              {admins.has(u.id) && <span style={{ marginRight: 8, background: "#8b5cf6", color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 10 }}>ADMIN</span>}
            </div>
            <span style={{ color: "var(--tx-2)", fontSize: 11, fontFamily: "monospace" }}>{u.id.slice(0, 8)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
