import { ShieldCheck, ShieldHalf } from "lucide-react";
import { HPV_BADGE_COPY, type HpvProtection } from "@/lib/hpvProtection";

type Props = { status: HpvProtection | null | undefined; variant?: "compact" | "full"; className?: string };

export function HpvBadge({ status, variant = "compact", className = "" }: Props) {
    if (!status) return null;
    const copy = HPV_BADGE_COPY[status];
    const isProtected = status === "protected";
    const Icon = isProtected ? ShieldCheck : ShieldHalf;

    if (variant === "full") {
        return (
            <div
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${isProtected ? "border-saivie-teal/30 bg-saivie-sage" : "border-saivie-blush bg-saivie-surface-blush"} ${className}`}
                data-testid={`hpv-badge-${status}`}
            >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${isProtected ? "bg-saivie-teal" : "bg-saivie-rose"}`}>
                    <Icon className="h-6 w-6" />
                </span>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isProtected ? "text-saivie-teal" : "text-saivie-rose"}`}>{copy.label}</p>
                    <p className="font-serif text-base font-semibold leading-snug text-saivie-plum">{copy.message} 💜</p>
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
            <Icon className="h-3 w-3" /> {copy.label}
        </span>
    );
}
