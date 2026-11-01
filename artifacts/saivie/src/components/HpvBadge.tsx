import React from "react";
import { HPV_BADGE_COPY, type HpvProtection } from "@/lib/hpvProtection";

type Props = { status: HpvProtection | null | undefined; variant?: "compact" | "full"; className?: string };

function VaccinationSeal({ complete, className }: { complete: boolean; className: string }) {
    return <svg viewBox="0 0 100 100" className={className} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M34 76 29 96 44 89 50 96 54 75M53 76 58 96 67 87 80 90 70 72" fill="#E5C4DB" stroke="#55344F" strokeWidth="1.8" />
        <circle cx="50" cy="45" r="39" fill="#FFFFFC" stroke="#55344F" strokeWidth="2" />
        <circle cx="50" cy="45" r="32" fill={complete ? "#CFE2DC" : "#E5C4DB"} />
        <path d="M50 22 68 29C69 47 63 58 50 66 37 59 31 47 32 29Z" fill="#FFFFFC" stroke="#55344F" strokeWidth="2" />
        {complete ? <path d="m40 43 7 7 14-16" stroke="#305B50" strokeWidth="4" /> :
            <><path d="m41 43 5 5 9-10" stroke="#55344F" strokeWidth="3" /><path d="M56 52h7" stroke="#55344F" strokeWidth="2" /></>}
        <path d="M20 32 23 29M77 31l3 3M25 65l3 2M74 64l-3 3" stroke="#D2AE36" strokeWidth="3" />
        <circle cx="50" cy="13" r="2" fill="#FFD50A" stroke="none" />
    </svg>;
}

export function HpvBadge({ status, variant = "compact", className = "" }: Props) {
    if (!status) return null;
    const copy = HPV_BADGE_COPY[status];
    const isProtected = status === "protected";

    if (variant === "full") {
        return (
            <div
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${isProtected ? "border-saivie-teal/30 bg-saivie-sage" : "border-saivie-blush bg-saivie-surface-blush"} ${className}`}
                data-testid={`hpv-badge-${status}`}
            >
                <VaccinationSeal complete={isProtected} className="h-20 w-20 shrink-0" />
                <div className="min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isProtected ? "text-saivie-teal" : "text-saivie-rose"}`}>{copy.label}</p>
                    <p className="font-serif text-base font-semibold leading-snug text-saivie-plum">{isProtected ? "I am HPV vaccinated" : "My HPV vaccination has started"}</p>
                    <p className="mt-1 text-xs leading-relaxed text-saivie-plum">{copy.message}</p>
                </div>
            </div>
        );
    }

    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isProtected ? "bg-saivie-sage text-saivie-teal" : "bg-saivie-surface-blush text-saivie-rose"} ${className}`}
            title={copy.message}
            data-testid={`hpv-badge-${status}`}
        >
            <VaccinationSeal complete={isProtected} className="h-7 w-7 shrink-0" /> {copy.label}
        </span>
    );
}
