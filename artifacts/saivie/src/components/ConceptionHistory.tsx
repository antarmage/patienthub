import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conceptionHistory, conceptionMethods } from "@/lib/conceptionHistory";

export function ConceptionHistory({ patientId, history, lmp, appointmentId }: {
  patientId: number; history: unknown; lmp?: string; appointmentId?: number;
}) {
  const saved = conceptionHistory(history, lmp, appointmentId);
  const [draft, setDraft] = useState<typeof saved | null>(null);
  const value = draft ?? saved;
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/patients/${patientId}/conception`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptionMethod: value.method, conceptionDetails: value.details, lmp: lmp || null, appointmentId: appointmentId || null }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(typeof error.error === "string" ? error.error : "Could not save conception history. Please retry.");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setDraft(null);
    },
  });
  return <section className="rounded-xl border border-saivie-border bg-saivie-ivory p-4 space-y-2" data-testid="conception-history">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-saivie-teal">How conceived</h3>
      <span className="text-[10px] text-muted-foreground">{draft ? "Unsaved doctor entry" : saved.source || "Not recorded"}</span>
    </div>
    <label className="block text-xs">Conception method
      <select className="mt-1 h-10 w-full rounded-xl border bg-card px-3 text-sm" value={value.method}
        disabled={save.isPending} onChange={(event) => setDraft({ ...value, method: event.target.value })}>
        <option value="">Not recorded</option>
        {conceptionMethods.map((method) => <option key={method}>{method}</option>)}
      </select>
    </label>
    <Input aria-label="Conception details" placeholder="Details (optional)" value={value.details} disabled={save.isPending}
      onChange={(event) => setDraft({ ...value, details: event.target.value })} />
    {draft && <div className="flex gap-2">
      <Button type="button" size="sm" disabled={save.isPending || !lmp && !appointmentId} onClick={() => save.mutate()}>{save.isPending ? "Saving..." : "Save conception history"}</Button>
      <Button type="button" size="sm" variant="ghost" disabled={save.isPending} onClick={() => { setDraft(null); save.reset(); }}>Cancel</Button>
    </div>}
    {save.isError && <p role="alert" className="text-xs text-destructive">{save.error.message}</p>}
    {!lmp && !appointmentId && <p className="text-xs text-muted-foreground">Record LMP or open an appointment to associate this with the current pregnancy.</p>}
    {save.isSuccess && !draft && <p role="status" className="text-xs text-saivie-teal">Conception history saved.</p>}
  </section>;
}
