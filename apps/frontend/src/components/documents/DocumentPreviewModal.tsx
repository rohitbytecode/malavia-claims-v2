import { useState } from "react";
import { createPortal } from "react-dom";

interface DocumentPreviewModalProps {
  url: string;
  mimeType: string;
  title: string;
  onClose: () => void;
}

export function DocumentPreviewModal({
  url,
  mimeType,
  title,
  onClose,
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360);
  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const isPdf = mimeType === "application/pdf";

  // Hover states simulated via inline event handlers
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header Panel */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "rgba(30, 41, 59, 0.7)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            {title}
          </h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{mimeType}</span>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleZoomOut}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={btnStyle}
            title="Zoom Out"
            disabled={zoom <= 0.5}
          >
            ➖
          </button>
          <span
            style={{
              minWidth: "50px",
              textAlign: "center",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={btnStyle}
            title="Zoom In"
            disabled={zoom >= 3}
          >
            ➕
          </button>
          <div
            style={{
              width: "1px",
              height: "20px",
              background: "rgba(255,255,255,0.15)",
              margin: "0 8px",
            }}
          />
          <button
            onClick={handleRotateLeft}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={btnStyle}
            title="Rotate Left"
          >
            ⟲
          </button>
          <button
            onClick={handleRotateRight}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={btnStyle}
            title="Rotate Right"
          >
            ⟳
          </button>
          <button
            onClick={handleReset}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={btnStyle}
            title="Reset View"
          >
            Reset
          </button>
        </div>

        <button
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
          }}
          style={{
            ...btnStyle,
            background: "rgba(239, 68, 68, 0.2)",
            color: "#f87171",
            fontWeight: "600",
          }}
        >
          ✕ Close
        </button>
      </header>

      {/* Immersive Scrollable Viewport */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            borderRadius: "4px",
            background: "#1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isPdf ? "850px" : "auto",
            height: isPdf ? "80vh" : "auto",
            maxWidth: isPdf ? "95%" : "85vw",
            maxHeight: isPdf ? "90%" : "75vh",
            overflow: "hidden",
          }}
        >
          {isPdf ? (
            <object
              data={url}
              type="application/pdf"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            >
              <div style={{ padding: "20px", textAlign: "center" }}>
                <p>PDF preview is not supported by your browser.</p>
                <a
                  href={url}
                  download={title}
                  style={{ color: "#3b82f6", textDecoration: "underline" }}
                >
                  Download PDF instead
                </a>
              </div>
            </object>
          ) : (
            <img
              src={url}
              alt={title}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const btnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "none",
  color: "#f1f5f9",
  padding: "8px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.15s ease",
  outline: "none",
};
