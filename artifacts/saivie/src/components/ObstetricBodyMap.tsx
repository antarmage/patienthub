import React, { useId } from "react";
import { obstetricAreas, obstetricAreaState, type AreaId } from "@/lib/obstetricAreas";
import type { ObstetricExamination } from "@/lib/obstetricExamination";

export function ObstetricBodyMap({ value, active, onSelect }: {
  value: ObstetricExamination; active: AreaId; onSelect: (id: AreaId) => void;
}) {
  const gradient = useId();
  return <div className="rounded-2xl border border-saivie-border bg-saivie-sage/20 p-3">
    <div className="relative mx-auto w-full max-w-[230px]" style={{ aspectRatio: "300 / 450" }}>
      <svg viewBox="0 0 300 450" className="h-full w-full" aria-hidden="true" focusable="false">
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#E4EFEA" /><stop offset="1" stopColor="#CFE0D8" /></linearGradient></defs>
        <g fill={`url(#${gradient})`} stroke="#9FB8AE" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M99 98 C80 108 70 140 66 180 C64 215 68 245 72 266 L86 264 C84 235 84 210 90 178 C94 150 102 128 108 112 Z" />
          <path d="M201 98 C220 108 230 140 234 180 C236 215 232 245 228 266 L214 264 C216 235 216 210 210 178 C206 150 198 128 192 112 Z" />
          <ellipse cx="150" cy="40" rx="22" ry="27" /><path d="M141 64 V86 H159 V64 Z" />
          <path d="M100 96 Q150 82 200 96 C204 130 196 160 190 190 C186 215 214 255 210 305 C208 350 200 395 198 436 L150 442 L102 436 C100 395 92 350 90 305 C86 255 114 215 110 190 C104 160 96 130 100 96 Z" />
        </g>
        <g fill="#C9DDD3" opacity=".8"><ellipse cx="126" cy="134" rx="15" ry="10" /><ellipse cx="174" cy="134" rx="15" ry="10" /></g>
        <g fill="none" stroke="#B3CABF" strokeWidth="1.5">
          <path d="M150 100 V166 M114 152 Q150 170 186 152 M112 164 Q150 182 188 164 M114 176 Q150 192 186 176" />
          <path d="M100 252 C86 282 100 322 132 340 Q150 354 168 340 C200 322 214 282 200 252" stroke="#A3BCB1" strokeWidth="2" />
        </g>
        <circle cx="150" cy="226" r="2.5" fill="#9FB8AE" />
        <g stroke="#C97A8C" fill="#F0C6CF">
          <circle cx="100" cy="292" r="7" /><circle cx="200" cy="292" r="7" />
          <path d="M128 284 Q112 270 104 286 M172 284 Q188 270 196 286 M147 332 V374 M153 332 V374" fill="none" strokeWidth="2" />
          <path d="M150 266 C178 266 186 292 176 312 C170 324 160 332 150 334 C140 332 130 324 124 312 C114 292 122 266 150 266 Z" fill="#F7DDE2" strokeWidth="1.5" />
        </g>
        <ellipse cx="150" cy="298" rx="19" ry="21" fill="#FBEAEE" stroke="#E3A9B6" strokeDasharray="3 3" />
        <path d="M146 284 C138 292 140 308 150 312 C160 308 160 294 154 288" fill="#F6C6B4" stroke="#D69A86" />
        <circle cx="148" cy="280" r="7" fill="#F6C6B4" stroke="#D69A86" />
      </svg>
      {obstetricAreas.map((area, index) => {
        const state = obstetricAreaState(value, area);
        const symbol = state === "Normal" ? "✓" : state === "Abnormal" ? "!" : state === "Recorded" ? "•" : ["Not examined", "Deferred"].includes(state) ? "–" : String(index + 1);
        return <button key={area.id} type="button" aria-label={`${area.label}: ${state}`} aria-pressed={active === area.id}
          title={`${area.label}: ${state}`} onClick={() => onSelect(area.id)}
          style={{ left: `${area.x / 3}%`, top: `${area.y / 4.5}%` }}
          className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saivie-teal ${active === area.id ? "ring-4 ring-saivie-teal/25" : ""} ${state === "Abnormal" ? "border-amber-700 bg-amber-700 text-white" : state === "Normal" || state === "Recorded" ? "border-saivie-teal bg-saivie-teal text-white" : "border-saivie-plum/40 bg-saivie-ivory text-saivie-plum"} ${state === "Not recorded" ? "border-dashed" : ""}`}>
          <span aria-hidden="true">{symbol}</span>
        </button>;
      })}
    </div>
    <p className="mt-1 text-center text-xs text-saivie-plum">Tap a circle to jump to that area</p>
    <p className="mt-2 text-center text-[10px] text-saivie-plum">Illustration only; not a gestational-size guide.</p>
  </div>;
}
