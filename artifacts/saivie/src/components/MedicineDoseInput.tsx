import { Input } from "@/components/ui/input";
import { DOSAGE_UNITS, formatMedicineDose, splitMedicineDose } from "@/lib/medicineDose";

export function MedicineDoseInput({ value, onChange, label = "Medicine dose", testId, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  testId?: string;
  className?: string;
}) {
  const dose = splitMedicineDose(value);
  return (
    <div className={`flex gap-1 ${className}`}>
      <Input className="min-w-0 flex-1" aria-label={label} placeholder="Dose" value={dose.amount} onChange={(event) => onChange(formatMedicineDose(event.target.value, dose.unit))} data-testid={testId} />
      <select aria-label={`${label} unit`} className="h-9 w-24 rounded-md border border-input bg-background px-1 text-sm" disabled={!dose.amount.trim()} value={dose.unit} onChange={(event) => onChange(formatMedicineDose(dose.amount, event.target.value))} data-testid={testId ? `${testId}-unit` : undefined}>
        <option value="">Unit</option>
        {DOSAGE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>
    </div>
  );
}
