import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MedicineAutocomplete } from "@/components/MedicineAutocomplete";
import { MedicineDoseInput } from "@/components/MedicineDoseInput";
import { MedicineFrequencyInput } from "@/components/MedicineFrequencyInput";
import { prescriptionTestOptions } from "@/lib/prescriptionTests";

export interface ConsultationMedicine {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
  route: string;
  startDate: string;
  status: string;
  notes: string;
}

export function ConsultationOrderDialogs({
  editor, onClose, patientType, weeks, tests, onTestsChange, customTest, onCustomTestChange,
  medicine, onMedicineChange, onSaveMedicine, savingMedicine,
}: {
  editor: "tests" | "medicine" | null;
  onClose: () => void;
  patientType: string;
  weeks: number | null;
  tests: string[];
  onTestsChange: (tests: string[]) => void;
  customTest: string;
  onCustomTestChange: (value: string) => void;
  medicine: ConsultationMedicine;
  onMedicineChange: (medicine: ConsultationMedicine) => void;
  onSaveMedicine: () => void;
  savingMedicine: boolean;
}) {
  const options = prescriptionTestOptions(patientType, weeks);
  const testNames = [...new Set([...options.tests.map((test) => test.name), ...tests])];
  const addTest = () => {
    const name = customTest.trim();
    if (!name) return;
    if (!tests.some((test) => test.toLowerCase() === name.toLowerCase())) onTestsChange([...tests, name]);
    onCustomTestChange("");
  };

  return (
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !savingMedicine) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="consultation-order-dialog">
        <DialogHeader>
          <DialogTitle>{editor === "tests" ? "Order tests" : "Add medication"}</DialogTitle>
          <DialogDescription>
            {editor === "tests" ? "Selected tests are saved with Save note." : "Save medication to this patient's record."}
          </DialogDescription>
        </DialogHeader>
        {editor === "tests" ? (
          <div className="space-y-4">
            <p className="text-xs text-saivie-plum">{options.context}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {testNames.map((name) => (
                <label key={name} className="flex items-start gap-2 rounded-xl border border-saivie-border p-3 text-xs">
                  <input type="checkbox" className="mt-0.5 accent-saivie-teal" checked={tests.includes(name)}
                    onChange={() => onTestsChange(tests.includes(name) ? tests.filter((test) => test !== name) : [...tests, name])} />
                  {name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Input aria-label="Other test" placeholder="Other test" value={customTest}
                onChange={(event) => onCustomTestChange(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTest(); } }} />
              <Button type="button" variant="outline" disabled={!customTest.trim()} onClick={addTest}>Add test</Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-saivie-teal">{tests.length} selected</span>
              <Button type="button" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <MedicineAutocomplete value={medicine.name} onChange={(name) => onMedicineChange({ ...medicine, name })}
              onSelect={(item) => onMedicineChange({ ...medicine, name: item.name, dose: item.dose, frequency: item.frequency, duration: item.duration, instructions: item.instructions, route: item.route })}
              testId="consultation-medicine-name" />
            <MedicineDoseInput value={medicine.dose} onChange={(dose) => onMedicineChange({ ...medicine, dose })} testId="consultation-medicine-dose" />
            <MedicineFrequencyInput value={medicine.frequency} onChange={(frequency) => onMedicineChange({ ...medicine, frequency })} testId="consultation-medicine-frequency" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs">Duration
                <Input value={medicine.duration} onChange={(event) => onMedicineChange({ ...medicine, duration: event.target.value })} placeholder="e.g. 7 days" />
              </label>
              <label className="text-xs">Route
                <Input value={medicine.route} onChange={(event) => onMedicineChange({ ...medicine, route: event.target.value })} placeholder="e.g. Oral" />
              </label>
              <label className="text-xs">Start date
                <Input type="date" value={medicine.startDate} onChange={(event) => onMedicineChange({ ...medicine, startDate: event.target.value })} />
              </label>
              <label className="text-xs">Status
                <select className="mt-1 h-9 w-full rounded-xl border bg-card px-3" value={medicine.status}
                  onChange={(event) => onMedicineChange({ ...medicine, status: event.target.value })}>
                  <option>Active</option><option>Completed</option><option>Stopped</option>
                </select>
              </label>
            </div>
            <label className="block text-xs">Instructions
              <Input value={medicine.instructions} onChange={(event) => onMedicineChange({ ...medicine, instructions: event.target.value })} />
            </label>
            <label className="block text-xs">Patient-specific notes
              <Input value={medicine.notes} onChange={(event) => onMedicineChange({ ...medicine, notes: event.target.value })} />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={savingMedicine} onClick={onClose}>Cancel</Button>
              <Button type="button" disabled={!medicine.name.trim() || savingMedicine} onClick={onSaveMedicine} data-testid="consultation-save-medicine">
                {savingMedicine ? "Saving..." : "Save medication"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
