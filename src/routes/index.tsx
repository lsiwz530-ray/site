import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav } from "@/components/PublicNav";
import { ProductImage } from "@/components/ProductImage";
import { ReviewsSection } from "@/components/ReviewsSection";
import { BannerSlot } from "@/components/BannerSlot";
import { useSiteContent } from "@/hooks/useSiteContent";

type Cat = { id: string; name: string; slug: string; sort_order: number; visible: boolean };
type Product = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; stock: number; visible: boolean };

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const hero = useSiteContent<{ title: string; subtitle: string; cta: string }>("hero", { title: "North Store", subtitle: "متجرك الاحترافي", cta: "تسوق الآن" });
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from("categories").select("*").eq("visible", true).order("sort_order").then(({ data }) => setCats((data as Cat[]) ?? []));
    supabase.from("products").select("*").eq("visible", true).order("sort_order").then(({ data }) => setProducts((data as Product[]) ?? []));
  }, []);

  return (
    <div className="page-shell">
      <PublicNav />

      <BannerSlot position="top" />

      <div className="pub-hero">
        <div className="kicker">// NORTH STORE</div>
        <h2>{hero.title}</h2>
        <p>{hero.subtitle}</p>
      </div>

      <ReviewsSection compact />

      {cats.map((c) => {
        const items = products.filter((p) => p.category_id === c.id);
        return (
          <div key={c.id}>
            <div className="section-block">
              <div className="section-head">
                <h3>{c.name}</h3>
                <span className="count">{items.length} منتج</span>
              </div>
              <div className="products-grid">
                {items.length === 0 ? (
                  <div className="pc-empty">
                    <i className="fa-solid fa-cubes-stacked" style={{ fontSize: 44, color: "var(--v3)", display: "block", marginBottom: 14 }} />
                    لا توجد منتجات في هذا القسم بعد.
                  </div>
                ) : items.map((p) => (
                  <Link key={p.id} to="/checkout/$productId" params={{ productId: p.id }} className="pc-card" style={{ display: "block", textDecoration: "none" }}>
                    <div className="pc-img" style={{ height: 180, overflow: "hidden" }}>
                      <ProductImage path={p.image_url} alt={p.name} />
                    </div>
                    <div className="pc-body">
                      <div className="pc-title">{p.name}</div>
                      <div className="pc-desc">{p.description}</div>
                      <div className="pc-meta">
                        <span className="pc-badge">{Number(p.price).toFixed(2)} ر.س</span>
                        <span style={{ fontSize: 11, color: p.stock > 0 ? "var(--g)" : "var(--r)" }}>
                          {p.stock > 0 ? `متوفر (${p.stock})` : "نفدت الكمية"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <BannerSlot position={`after_category:${c.slug}`} />
          </div>
        );
      })}

      <ReviewsSection />
    </div>
  );
}
