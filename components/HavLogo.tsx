"use client";
// components/HavLogo.tsx
// Use this in every nav bar so the brand is consistent

import Link from "next/link";

type Props = {
  href?: string;
  size?: "sm" | "md" | "lg";
  dark?: boolean; // dark background variant (admin sidebar)
};

export default function HavLogo({ href = "/", size = "md", dark = false }: Props) {
  const sizes = {
    sm: { icon: "text-sm",  text: "text-base", sub: "text-[10px]" },
    md: { icon: "text-base",text: "text-lg",   sub: "text-xs"     },
    lg: { icon: "text-xl",  text: "text-2xl",  sub: "text-sm"     },
  };
  const s = sizes[size];

  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline group">
      <div className={`w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center ${s.icon} flex-shrink-0`}>
              </div>
      <div>
        <p className={`font-bold leading-tight ${s.text} ${dark ? "text-white" : "text-gray-900"}`}>
          HAV
        </p>
        <p className={`${s.sub} ${dark ? "text-gray-400" : "text-gray-500"} leading-tight`}>
          Coffee Authenticity Verification
        </p>
      </div>
    </Link>
  );
}
