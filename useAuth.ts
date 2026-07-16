import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";

type Banner = { id: string; title: string | null; image_url: string; link_url: string | null; position: string };

export function BannerSlot({ position }: { position: string }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    supabase.from("banners").select("*").eq("visible", true).eq("position", position).order("sort_order")
      .then(({ data }) => setBanners((data as Banner[]) ?? []));
  }, [position]);

  if (banners.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
      {banners.map((b) => {
        const inner = (
          <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(139,92,246,0.3)", background: "#0a0118" }}>
            <ProductImage path={b.image_url} bucket="banners" alt={b.title ?? "banner"} />
            {b.title && <div style={{ padding: 12, color: "var(--tx-1)", fontWeight: 600 }}>{b.title}</div>}
          </div>
        );
        return b.link_url ? (
          <a key={b.id} href={b.link_url} target="_blank" rel="noreferrer">{inner}</a>
        ) : (
          <div key={b.id}>{inner}</div>
        );
      })}
    </div>
  );
}
