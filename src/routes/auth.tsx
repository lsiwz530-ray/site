import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/north-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const u = username.trim();
      if (u.length < 3) throw new Error("الاسم يجب أن يكون 3 أحرف فأكثر.");
      if (password.length < 6) throw new Error("كلمة المرور 6 أحرف فأكثر.");

     const res = await fetch(
  mode === "signin" ? "/api/auth/login" : "/api/auth/signup",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      username: u,
      password,
    }),
  }
);

const data = await res.json();

if (!res.ok) {
  throw new Error(data.error || "حدث خطأ");
}
      nav({ to: "/" });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link to="/" className="nav-link" style={{ position: "absolute", top: 14, left: 14, fontSize: 11 }}>
          <i className="fa-solid fa-arrow-right" /> عودة
        </Link>
        <div className="auth-brand">
          <div className="mark"><img src={logo} alt="North" /></div>
          <div><h2>NORTH · STORE</h2><small>Customer Access</small></div>
        </div>
        <h1>{mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
        <p className="sub">ادخل باسمك فقط — سيحفظك الموقع في كل زيارة. الاسم فريد لكل مستخدم.</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--tx-2)" }}>اسم المستخدم</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: north_king" required />
          <label style={{ fontSize: 12, color: "var(--tx-2)" }}>كلمة المرور</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 أحرف فأكثر" required />
          {err && <div className="alert" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}><i className="fa-solid fa-triangle-exclamation" /> {err}</div>}
          <button className="btn btn-primary" disabled={busy}>{busy ? "..." : mode === "signin" ? "دخول" : "إنشاء الحساب"}</button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: "var(--tx-2)", textAlign: "center" }}>
          {mode === "signin" ? "ما عندك حساب؟" : "عندك حساب؟"}{" "}
          <button className="nav-link" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); }} style={{ background: "none", border: 0, cursor: "pointer" }}>
            {mode === "signin" ? "أنشئ واحد" : "سجّل الدخول"}
          </button>
        </p>
      </div>
    </div>
  );
}
