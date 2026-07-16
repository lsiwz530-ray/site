import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { useSiteContent } from "@/hooks/useSiteContent";
import discordIcon from "@/assets/discord.svg";
import whatsappIcon from "@/assets/whatsapp.svg";

export const Route = createFileRoute("/contact")({
  component: Contact,
});

function Contact() {
  const c = useSiteContent<{ discord: string; whatsapp: string }>("contact", { discord: "https://discord.gg/8T4cHFHJ2S", whatsapp: "966555412042" });
  return (
    <div className="page-shell">
      <PublicNav />
      <div className="pub-hero">
        <div className="kicker">// CONTACT</div>
        <h2>تواصل معنا</h2>
        <p>اختر القناة الأنسب — نرد عليك بسرعة.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
        <a href={c.discord} target="_blank" rel="noreferrer" className="pc-card" style={{ padding: 24, textAlign: "center", textDecoration: "none", background: "linear-gradient(135deg,#5865F2,#4752C4)" }}>
          <img src={discordIcon} alt="Discord" style={{ width: 64, height: 64, margin: "0 auto 12px", filter: "brightness(0) invert(1)" }} />
          <h3 style={{ color: "#fff", margin: "6px 0" }}>Discord</h3>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>انضم لسيرفرنا للدردشة المباشرة مع الفريق والمجتمع</p>
        </a>
        <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer" className="pc-card" style={{ padding: 24, textAlign: "center", textDecoration: "none", background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
          <img src={whatsappIcon} alt="WhatsApp" style={{ width: 64, height: 64, margin: "0 auto 12px", filter: "brightness(0) invert(1)" }} />
          <h3 style={{ color: "#fff", margin: "6px 0" }}>WhatsApp</h3>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>راسلنا مباشرة على +{c.whatsapp}</p>
        </a>
      </div>
    </div>
  );
}
