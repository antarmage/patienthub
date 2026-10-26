import React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";

const frequencies = [
  { value: "OD", meaning: "Once daily", shade: "from-teal-50 to-teal-100" },
  { value: "BD", meaning: "Twice daily", shade: "from-teal-100/60 to-teal-200/60" },
  { value: "TDS", meaning: "Three times daily", shade: "from-teal-100 to-teal-200" },
  { value: "HS", meaning: "At bedtime", shade: "from-teal-200/60 to-teal-300/60" },
  { value: "SOS", meaning: "As needed", shade: "from-teal-200 to-teal-300" },
  { value: "AC/PC", meaning: "Before / after food - specify timing in instructions", shade: "from-teal-100 to-teal-300/70" },
  { value: "Weekly", meaning: "Once weekly", shade: "from-teal-200/80 to-teal-300/80" },
];

export function MedicineFrequencyInput({ value, onChange, label = "Medicine frequency", testId, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  testId?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <Input aria-label={label} placeholder="Frequency / custom" value={value} onChange={(event) => onChange(event.target.value)} className="h-8 text-xs" data-testid={testId} />
      <div role="group" aria-label={`${label} options`} className="grid min-w-[156px] grid-cols-4 gap-1">
        {frequencies.map((frequency) => {
          const selected = value.trim().toLowerCase() === frequency.value.toLowerCase();
          return (
            <button key={frequency.value} type="button" aria-label={`${frequency.value}: ${frequency.meaning}`} aria-pressed={selected} title={frequency.meaning} onClick={() => onChange(frequency.value)}
              className={`relative flex h-8 items-center justify-center rounded-md border bg-gradient-to-br px-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-1 ${selected ? "border-saivie-teal from-saivie-teal to-teal-800 text-white ring-1 ring-saivie-teal" : `${frequency.shade} border-teal-200 text-teal-950 hover:border-saivie-teal`}`}>
              {frequency.value}{selected && <Check aria-hidden="true" className="absolute right-0.5 top-0.5 h-2 w-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
