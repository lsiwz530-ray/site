import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/storage";

type Props = {
  path?: string | null;
  bucket?: string;
  alt?: string;
  className?: string;
  /** contain = show full image without cropping (default). cover = crop to fill. */
  fit?: "contain" | "cover" | "natural";
  /** background shown behind transparent/short images */
  bg?: string;
};

export function ProductImage({
  path,
  bucket = "product-images",
  alt = "",
  className,
  fit = "contain",
  bg = "transparent",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!path) { setUrl(null); return; }
    if (path.startsWith("http") || path.startsWith("/uploads/") || path.startsWith("/")) {
      setUrl(path);
      return;
    }
    signedUrl(bucket, path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [path, bucket]);

  if (!url || failed) {
    // Neutral placeholder — no broken-icon look
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 120,
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(168,85,247,0.04))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(200,180,255,0.35)",
          fontSize: 12,
          borderRadius: "inherit",
        }}
      >
        {failed ? "تعذّر تحميل الصورة" : "لا توجد صورة"}
      </div>
    );
  }

  if (fit === "natural") {
    return (
      <img
        src={url}
        alt={alt}
        onError={() => setFailed(true)}
        className={className}
        style={{ maxWidth: "100%", height: "auto", display: "block", background: bg }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        display: "block",
        background: bg,
      }}
    />
  );
}
