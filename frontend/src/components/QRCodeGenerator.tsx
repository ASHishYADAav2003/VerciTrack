"use client";

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
}

export default function QRCodeGenerator({ value, size = 128 }: QRCodeGeneratorProps) {
  return (
    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-block">
      <QRCodeSVG 
        value={value} 
        size={size} 
        level="H" // High error correction level for better scanning
        includeMargin={true}
        fgColor="#000000"
        bgColor="#FFFFFF"
      />
    </div>
  );
}
