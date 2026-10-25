import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export interface MedicineSuggestion {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  route: string;
  genericName: string;
}

export function MedicineAutocomplete({ value, onChange, onSelect, className, testId }: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (medicine: MedicineSuggestion) => void;
  className?: string;
  testId?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = useQuery<MedicineSuggestion[]>({
    queryKey: ["/api/medicine-suggestions"],
    enabled: open,
    queryFn: async () => {
      const response = await fetch("/api/medicine-suggestions");
      if (!response.ok) throw new Error("Could not load saved medicines");
      return response.json();
    },
  });
  const search = value.trim().toLowerCase();
  const matches = search && !query.isError ? (query.data || []).filter((medicine) =>
    medicine.name.toLowerCase().includes(search) || medicine.genericName.toLowerCase().includes(search),
  ).slice(0, 8) : [];
  const select = (medicine: MedicineSuggestion) => {
    onSelect(medicine);
    setOpen(false);
    setActive(-1);
  };
  return (
    <div className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <Input value={value} className={className} placeholder="Type a medicine name" aria-label="Medicine name" autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={open && matches.length > 0} aria-controls={`${id}-options`}
        aria-activedescendant={active >= 0 && matches[active] ? `${id}-${active}` : undefined}
        data-testid={testId} onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)} onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
          }
          if (event.key === "Enter" && open && active >= 0 && matches[active]) {
            event.preventDefault();
            select(matches[active]);
          }
        }} />
      {open && search && (
        <div className="absolute left-0 top-full z-[70] mt-1 max-h-64 w-full min-w-[250px] overflow-y-auto rounded-md border bg-background p-1 shadow-lg">
          {query.isError ? <p role="alert" className="p-2 text-xs text-destructive">Saved medicines could not load. You can still enter details manually. <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button></p>
            : query.isLoading ? <p className="p-2 text-xs text-muted-foreground">Loading saved medicines...</p>
            : <>
              <p className="p-2 text-xs text-muted-foreground">Select saved details, then review for this patient.</p>
              <div id={`${id}-options`} role="listbox" aria-label="Saved medicines">
                {matches.map((medicine, index) => (
                  <button type="button" role="option" aria-selected={active === index} id={`${id}-${index}`} key={index}
                    className={`block w-full rounded px-2 py-2 text-left text-sm hover:bg-muted ${active === index ? "bg-muted" : ""}`}
                    onClick={() => select(medicine)}>
                    <span className="block font-medium">{medicine.name}</span>
                    <span className="block text-xs text-muted-foreground">{[medicine.dose, medicine.frequency, medicine.duration, medicine.instructions, medicine.route].filter(Boolean).join(" · ") || "No saved dosing details"}</span>
                  </button>
                ))}
              </div>
              {!matches.length && <p className="p-2 text-xs text-muted-foreground">No saved match. Enter the medicine and its details manually; it will be available after saving.</p>}
            </>}
        </div>
      )}
    </div>
  );
}
