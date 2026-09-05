"use client";
// components/BatchQRCode.tsx
// Generates a QR code pointing to /verify/{batchId}
// Can be used anywhere: farmer dashboard, product page, admin, certificates

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { batchCodeLabel } from "@/lib/batchCodeGenerator";

type Props = {
  batchId: string;
  coffeeType?: string;
  farmerName?: string;
  size?: number;          // px, default 200
  showLabel?: boolean;    // show batch ID below QR
  showActions?: boolean;  // show download / print buttons
  className?: string;
};

export default function BatchQRCode({
  batchId,
  coffeeType,
  farmerName,
  size = 200,
  showLabel = true,
  showActions = true,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");

  useEffect(() => {
    // Use the actual origin so QR works on any device on the same network
    setBaseUrl(window.location.origin);
  }, []);

  const verifyUrl = `${baseUrl}/verify/${batchId}`;
  const label     = batchCodeLabel(batchId);

  // ── Download as PNG ────────────────────────────────────────────────────────
  function downloadPng() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    // Create a new canvas with padding + label
    const pad    = 24;
    const lh     = showLabel ? 48 : 0;
    const out    = document.createElement("canvas");
    out.width    = canvas.width  + pad * 2;
    out.height   = canvas.height + pad * 2 + lh;
    const ctx    = out.getContext("2d")!;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, out.width, out.height);

    // Draw QR
    ctx.drawImage(canvas, pad, pad);

    // Label
    if (showLabel) {
      ctx.fillStyle = "#1C1C1C";
      ctx.font      = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(batchId, out.width / 2, canvas.height + pad + 18);
      ctx.fillStyle = "#7A6E5F";
      ctx.font      = "11px sans-serif";
      ctx.fillText("Scan to verify authenticity", out.width / 2, canvas.height + pad + 36);
    }

    const link    = document.createElement("a");
    link.download = `${batchId}-qr.png`;
    link.href     = out.toDataURL("image/png");
    link.click();
  }

  // ── Print ──────────────────────────────────────────────────────────────────
  function printQr() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR — ${batchId}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        img  { width: ${size}px; height: ${size}px; display: block; margin: 0 auto 16px; }
        .id  { font-family: monospace; font-size: 15px; font-weight: bold; margin-bottom: 6px; }
        .sub { font-size: 12px; color: #888; margin-bottom: 8px; }
        .url { font-size: 10px; color: #aaa; word-break: break-all; }
        @media print { button { display: none; } }
      </style></head><body>
      <img src="${dataUrl}" />
      <p class="id">${batchId}</p>
      <p class="sub">Scan to verify coffee authenticity</p>
      <p class="sub">${coffeeType ? coffeeType + " Coffee" : ""} ${farmerName ? "· " + farmerName : ""}</p>
      <p class="url">${verifyUrl}</p>
      <br/><button onclick="window.print()">Print Print</button>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>

      {/* QR canvas */}
      <div
        ref={canvasRef}
        className="rounded-2xl border-4 border-white shadow-lg p-2 bg-white"
      >
        <QRCodeCanvas
          value={verifyUrl}
          size={size}
          level="H"                 // high error correction — survives printing
          includeMargin={false}
          imageSettings={{
            src: "/coffee-icon.png",  // optional: drop a small logo in public/
            height: Math.round(size * 0.18),
            width:  Math.round(size * 0.18),
            excavate: true,
          }}
        />
      </div>

      {/* Batch ID label */}
      {showLabel && (
        <div className="text-center">
          <p className="font-mono text-sm font-bold text-gray-800">{batchId}</p>
          {(coffeeType || farmerName) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[coffeeType && `${coffeeType} Coffee`, farmerName].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">Scan to verify authenticity</p>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2">
          <button
            onClick={downloadPng}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ⬇ Download PNG
          </button>
          <button
            onClick={printQr}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Print Print
          </button>
        </div>
      )}
    </div>
  );
}
