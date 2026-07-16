import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/north-logo.png";

const LINKS = [
  { to: "/", label: "المتجر" },
  { to: "/orders", label: "طلباتي" },
  { to: "/contact", label: "تواصل معنا" },
];

export function PublicNav() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user, profile, isAdmin } = useAuth();

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <nav className="pub-nav">
      <Link to="/" className="pub-brand">
        <div className="mark"><img src={logo} alt="North" /></div>
        <div><h1>NORTH · STORE</h1><small>Official Loaders</small></div>
      </Link>
      <div className="nav-links">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className={`nav-link ${pathname === l.to ? "active" : ""}`}>{l.label}</Link>
        ))}
        {isAdmin && <Link to="/dashboard" className="nav-link">الداشبورد</Link>}
        {user ? (
          <>
            <span className="nav-link" style={{ color: "var(--v3)" }}>مرحباً {profile?.display_name || profile?.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>خروج</button>
          </>
        ) : (
          <Link to="/auth" className="btn btn-ghost btn-sm">دخول</Link>
        )}
      </div>
    </nav>
  );
}
