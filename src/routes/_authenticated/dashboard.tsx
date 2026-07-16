import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicNav } from "@/components/PublicNav";
import { useAuth } from "@/hooks/useAuth";
import { DashProducts } from "@/components/dash/DashProducts";
import { DashCategories } from "@/components/dash/DashCategories";
import { DashBanners } from "@/components/dash/DashBanners";
import { DashOrders } from "@/components/dash/DashOrders";
import { DashChats } from "@/components/dash/DashChats";
import { DashContent } from "@/components/dash/DashContent";
import { DashReviews } from "@/components/dash/DashReviews";
import { DashUsers } from "@/components/dash/DashUsers";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TABS = [
  { id: "orders", label: "الطلبات", icon: "fa-cart-shopping" },
  { id: "products", label: "المنتجات", icon: "fa-box" },
  { id: "categories", label: "الأقسام", icon: "fa-folder-tree" },
  { id: "banners", label: "البنرات", icon: "fa-image" },
  { id: "chats", label: "الشات", icon: "fa-comments" },
  { id: "reviews", label: "التقييمات", icon: "fa-star" },
  { id: "content", label: "محرر المحتوى", icon: "fa-pen" },
  { id: "users", label: "المستخدمون", icon: "fa-users" },
];

function Dashboard() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    if (!loading && user && !isAdmin) nav({ to: "/" });
  }, [loading, isAdmin, user, nav]);

  if (loading || !user) return <div className="page-shell"><PublicNav /><div className="pc-empty">...</div></div>;
  if (!isAdmin) return (
    <div className="page-shell"><PublicNav />
      <div className="pc-empty">
        ليس لديك صلاحية أدمن.<br /><br />
        <span style={{ fontSize: 11, color: "var(--tx-2)" }}>User ID: {user.id}</span><br /><br />
        استخدم SQL Editor لإضافة نفسك كأدمن:<br />
        <code style={{ background: "#0a0118", padding: 6, borderRadius: 6, fontSize: 11 }}>INSERT INTO user_roles(user_id,role) VALUES('{user.id}','admin');</code>
      </div>
    </div>
  );

  return (
    <div className="page-shell">
      <PublicNav />
      <div className="dash-layout" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, marginTop: 20 }}>
        <aside className="dash-sidebar" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 14, padding: 10, height: "fit-content" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`nav-item ${tab === t.id ? "active" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: tab === t.id ? "linear-gradient(135deg,#8b5cf6,#6d28d9)" : "transparent", color: tab === t.id ? "#fff" : "var(--tx-1)", border: 0, borderRadius: 10, cursor: "pointer", marginBottom: 4, fontSize: 13, textAlign: "right" }}>
              <i className={`fa-solid ${t.icon}`} />{t.label}
            </button>
          ))}
        </aside>
        <main className="dash-content">
          {tab === "orders" && <DashOrders />}
          {tab === "products" && <DashProducts />}
          {tab === "categories" && <DashCategories />}
          {tab === "banners" && <DashBanners />}
          {tab === "chats" && <DashChats />}
          {tab === "reviews" && <DashReviews />}
          {tab === "content" && <DashContent />}
          {tab === "users" && <DashUsers />}
        </main>
      </div>
    </div>
  );
}
