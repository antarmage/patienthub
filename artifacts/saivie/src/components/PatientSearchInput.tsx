import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SearchablePatient {
  id: number | string;
  name?: string | null;
  phone?: string | null;
  age?: number | string | null;
  type?: string | null;
}

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

export function searchPatients<T extends SearchablePatient>(patients: T[], query: string, limit = Infinity): T[] {
  const q = query.trim().toLowerCase();
  const qDigits = digits(q);
  const named = patients.filter((p) => String(p.name || "").trim());
  if (!q) return [...named].sort((a, b) => String(a.name).localeCompare(String(b.name))).slice(0, limit);
  const scored = named
    .map((p) => {
      const name = String(p.name).toLowerCase();
      const words = name.split(/\s+/);
      const score = name.startsWith(q) ? 0
        : words.some((word) => word.startsWith(q)) ? 1
        : name.includes(q) ? 2
        : qDigits.length >= 3 && digits(p.phone).includes(qDigits) ? 3
        : qDigits && qDigits === q && String(p.id) === qDigits ? 3
        : -1;
      return { p, score };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => a.score - b.score || String(a.p.name).localeCompare(String(b.p.name)));
  return scored.slice(0, limit).map((item) => item.p);
}

export function PatientSearchInput({ patients, value, onChange, testId = "input-patient-search" }: {
  patients: SearchablePatient[];
  value: string;
  onChange: (patientId: string) => void;
  testId?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = patients.find((p) => String(p.id) === value);
  const results = useMemo(() => searchPatients(patients, query), [patients, query]);

  const choose = (patient: SearchablePatient) => {
    onChange(String(patient.id));
    setQuery("");
    setOpen(false);
  };

  if (selected) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-saivie-teal bg-saivie-sage/40 px-3 text-sm" data-testid={`${testId}-selected`}>
        <span className="min-w-0 truncate font-medium text-saivie-plum">
          {selected.name}
          <span className="ml-2 text-xs font-normal text-saivie-plum/70">{[selected.phone, selected.age ? `${selected.age}y` : ""].filter(Boolean).join(" · ")}</span>
        </span>
        <button type="button" aria-label="Change patient" className="text-saivie-plum hover:text-saivie-teal" onClick={() => { onChange(""); setOpen(true); }}>
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-saivie-plum/60" />
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={`${testId}-list`}
        aria-autocomplete="list"
        value={query}
        autoComplete="off"
        placeholder="Search name or phone"
        className="pl-8"
        data-testid={testId}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && open && results[active]) { e.preventDefault(); choose(results[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul id={`${testId}-list`} role="listbox" className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-saivie-border bg-saivie-ivory py-1 shadow-lg">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-saivie-plum">No patient found</li>
          ) : results.map((p, index) => (
            <li
              key={String(p.id)}
              role="option"
              aria-selected={index === active}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm ${index === active ? "bg-saivie-sage text-saivie-teal" : "text-saivie-plum"}`}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(index)}
              data-testid={`${testId}-option-${p.id}`}
            >
              <span className="truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-xs text-saivie-plum/70">{[p.phone, p.age ? `${p.age}y` : ""].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
