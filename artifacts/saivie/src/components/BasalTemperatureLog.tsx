import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { localDateKey } from "@/lib/patientHealthRecord";
import { basalTemperatureInputSchema, basalTemperatureRecordSchema, type BasalTemperatureInput } from "../../../../lib/db/src/basal-temperature";

function currentMeasurementTime() {
  const now = new Date();
  return `${localDateKey(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export default function BasalTemperatureLog({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false);
  const [temperature, setTemperature] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [measuredAt, setMeasuredAt] = useState(currentMeasurementTime);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const client = useQueryClient();
  const url = `/api/patients/${patientId}/basal-temperature-logs`;
  const key = [url];
  const enabled = Number.isSafeInteger(patientId) && patientId > 0;
  const history = useQuery({
    queryKey: key, enabled,
    queryFn: async () => basalTemperatureRecordSchema.array().parse(await receptionRequest(url)),
  });
  const save = useMutation({
    mutationFn: async (input: BasalTemperatureInput) => basalTemperatureRecordSchema.parse(await receptionRequest(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    })),
    onSuccess: (record) => {
      client.setQueryData(key, (previous: typeof history.data) =>
        [record, ...(previous || [])].sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt) || b.id - a.id).slice(0, 30));
      setOpen(false);
      setSaved(true);
      void client.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <div className="space-y-3">
      <Dialog open={open} onOpenChange={(value) => {
        if (save.isPending) return;
        setOpen(value);
        if (value) {
          setTemperature(""); setNotes(""); setMeasuredAt(currentMeasurementTime());
          setError(""); setSaved(false); save.reset();
        }
      }}>
        <DialogTrigger asChild>
          <button type="button" disabled={!enabled} className="min-h-11 rounded-full bg-[#FFB534] px-6 text-sm font-bold text-[#22122B] disabled:opacity-50">
            Log temperature
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto text-[#22122B]">
          <DialogTitle>Record basal temperature</DialogTitle>
          <DialogDescription>Record a resting morning reading, ideally before getting up. A single reading cannot confirm ovulation.</DialogDescription>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (save.isPending) return;
            const time = new Date(measuredAt);
            if (!temperature.trim() || !Number.isFinite(time.getTime())) {
              setError("Enter a temperature and valid measurement time."); return;
            }
            const input = basalTemperatureInputSchema.safeParse({ temperature: Number(temperature), unit, measuredAt: time.toISOString(), notes });
            if (!input.success) { setError(input.error.issues[0].message); return; }
            setError(""); save.mutate(input.data);
          }}>
            <label className="block text-sm font-bold">Temperature
              <input type="number" required step="0.01" min={unit === "C" ? 30 : 86} max={unit === "C" ? 45 : 113}
                value={temperature} onChange={(event) => setTemperature(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-[#D9C3AE] bg-white px-3" />
            </label>
            <label className="block text-sm font-bold">Unit
              <select value={unit} onChange={(event) => { setUnit(event.target.value === "F" ? "F" : "C"); setTemperature(""); }}
                className="mt-1 min-h-11 w-full rounded-xl border border-[#D9C3AE] bg-white px-3">
                <option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option>
              </select>
            </label>
            <label className="block text-sm font-bold">Measured at
              <input type="datetime-local" required max={currentMeasurementTime()} value={measuredAt}
                onChange={(event) => setMeasuredAt(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-[#D9C3AE] bg-white px-3" />
            </label>
            <label className="block text-sm font-bold">Notes (optional)
              <textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#D9C3AE] bg-white p-3" />
            </label>
            {(error || save.isError) && <p role="alert" className="text-sm text-red-800">{error || save.error?.message}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={save.isPending} className="min-h-11 rounded-full bg-[#FFB534] px-5 text-sm font-bold disabled:opacity-50">{save.isPending ? "Saving…" : "Save temperature"}</button>
              <button type="button" disabled={save.isPending} onClick={() => setOpen(false)} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Cancel</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {saved && <p role="status" className="text-sm">Temperature saved.</p>}
      {history.isError && <p role="alert" className="text-sm">Could not load temperature records. <button type="button" className="underline" onClick={() => void history.refetch()}>Retry</button></p>}
      {history.data?.[0] && <p className="text-sm">
        Latest: {history.data[0].temperature} °{history.data[0].unit}
        {" · "}<time dateTime={history.data[0].measuredAt}>{new Date(history.data[0].measuredAt).toLocaleString()}</time>
      </p>}
    </div>
  );
}
