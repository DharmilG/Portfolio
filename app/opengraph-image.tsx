import { ImageResponse } from "next/og";

export const alt = "Dharmil Gajjar — Full-stack & Backend Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #121314 0%, #1e1e1e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: "#858585" }}>
          PORTFOLIO
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 92, fontWeight: 700 }}>
          Dharmil Gajjar
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 38, color: "#9cdcfe" }}>
          Full-stack &amp; Backend Engineer
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 28, color: "#cccccc" }}>
          Go · Next.js · PostgreSQL · AWS
        </div>
      </div>
    ),
    size,
  );
}
