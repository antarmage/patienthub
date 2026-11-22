import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { receptionRequest } from "@/lib/authenticatedFetch";
import type { MovementObservation, MovementObservationInput } from "../../../../lib/db/src/pregnancy-movement";

const choices: Array<{ value: MovementObservationInput["observation"]; label: string }> = [
  { value: "usual", label: "Movements feel usual" },
  { value: "changed", label: "Movements feel different or reduced" },
  { value: "not-felt", label: "I can't feel movements now" },
  { value: "not-yet-felt", label: "I haven't felt movements yet" },
  { value: "unsure", label: "I'm not sure" },
];

export default function PregnancyMovementTracker({ patientId, episodeId, initiallyOpen = false }: {
  patientId: number;
  episodeId: number | null;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [observation, setObservation] = useState<MovementObservationInput["observation"] | "">("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();
  const url = `/api/patients/${patientId}/pregnancy-movement-observations`;
  const key = [url, episodeId];
  const history = useQuery({
    queryKey: key,
    enabled: episodeId !== null,
    queryFn: () => receptionRequest<MovementObservation[]>(`${url}?episodeId=${episodeId}`),
  });
  const save = useMutation({
    mutationFn: (input: MovementObservationInput) => receptionRequest<MovementObservation>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    onSuccess: async () => {
      setObservation("");
      setNotes("");
      setOpen(false);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return (
    <section className="space-y-4 rounded-[28px] border border-[#F0DCC4] bg-white p-5 text-[#2A1220]" aria-labelledby="movement-tracker-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="movement-tracker-heading" className="font-serif text-2xl font-bold">Baby movements</h2>
          <p className="mt-1 text-sm text-[#5A4552]">Record an observation for yourself, without a count or target.</p>
        </div>
        {episodeId !== null && !open && (
          <button type="button" onClick={() => { setOpen(true); setSaved(false); save.reset(); }} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white">Add observation</button>
        )}
      </div>
      <div className="rounded-2xl border border-[#F2C2AE] bg-[#FFF4EE] p-4 text-sm leading-relaxed">
        <p className="font-bold">Contact your maternity team immediately if movements are less than usual, stop, or change. Don&apos;t wait until tomorrow.</p>
        <p className="mt-2">If you have not felt movements by 24 weeks, tell your maternity team. Only you can view this log in the app; it is not monitored and does not notify your care team. If you cannot reach them or need emergency help, seek urgent medical care.</p>
      </div>
      {episodeId === null ? (
        <p className="text-sm">A current pregnancy record is needed to save observations. Ask your care team to update your record.</p>
      ) : (
        <>
          {open && (
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              if (observation) save.mutate({ episodeId, observation, notes });
            }}>
              <label htmlFor="movement-observation" className="block text-sm font-bold">What did you notice?</label>
              <select id="movement-observation" required value={observation} onChange={(event) => setObservation(choices.find((choice) => choice.value === event.target.value)?.value ?? "")} className="min-h-11 w-full rounded-xl border border-[#D9C3AE] bg-white px-3 text-sm">
                <option value="">Choose an observation</option>
                {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
              <label htmlFor="movement-notes" className="block text-sm font-bold">Notes (optional)</label>
              <textarea id="movement-notes" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full rounded-xl border border-[#D9C3AE] bg-white p-3 text-sm" />
              {save.isError && <p role="alert" className="text-sm text-[#A8341A]">{save.error.message}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={!observation || save.isPending} className="min-h-11 rounded-full bg-[#2A1220] px-5 text-sm font-bold text-white disabled:opacity-50">{save.isPending ? "Saving…" : "Save observation"}</button>
                <button type="button" disabled={save.isPending} onClick={() => { setOpen(false); save.reset(); }} className="min-h-11 rounded-full border border-[#D9C3AE] px-5 text-sm font-bold">Cancel</button>
              </div>
            </form>
          )}
          {saved && <p role="status" className="text-sm">Observation saved. Your care team has not been notified.</p>}
          <div>
            <h3 className="text-sm font-bold">Recent observations</h3>
            {history.isPending && <p role="status" className="mt-2 text-sm">Loading observations…</p>}
            {history.isError && <p role="alert" className="mt-2 text-sm text-[#A8341A]">Could not load observations. <button type="button" onClick={() => { void history.refetch(); }} className="underline">Retry</button></p>}
            {history.data?.length === 0 && <p className="mt-2 text-sm text-[#5A4552]">No observations recorded yet.</p>}
            {history.data && history.data.length > 0 && (
              <ul className="mt-2 space-y-3">
                {history.data.map((entry) => (
                  <li key={entry.id} className="border-t border-[#F0DCC4] pt-3 text-sm">
                    <p className="font-semibold">{choices.find((choice) => choice.value === entry.observation)?.label ?? entry.observation}</p>
                    <time className="text-xs text-[#6A5560]" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                    {entry.notes && <p className="mt-1 whitespace-pre-wrap">{entry.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
            {history.data?.length === 100 && <p className="mt-2 text-xs text-[#6A5560]">Showing the most recent 100 observations.</p>}
          </div>
        </>
      )}
    </section>
  );
}
