import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/storage";

export function ProductImage({ path, bucket = "product-images", alt = "", className }: { path?: string | null; bucket?: string; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    if (path.startsWith("http")) { setUrl(path); return; }
    signedUrl(bucket, path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path, bucket]);

  if (!url) {
    return (
      <div className={className} style={{ background: "linear-gradient(135deg,#1a0b2e,#2d1155)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--v3)" }}>
        <i className="fa-solid fa-image" style={{ fontSize: 32 }} />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0118" }} />;
}
