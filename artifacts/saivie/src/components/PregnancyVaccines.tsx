import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { indiaToday } from "@/lib/pregnancyOverview";
import { calendarDate } from "@/lib/calendarDates";
import { recordsForPregnancyEpisode, unrecordedPregnancyDoses, type PregnancyVaccineRecord as VaccineRecord } from "@/lib/pregnancyVaccines";

type PregnancyVaccineSchedule = {
  id: number;
  vaccineName: string;
  isActive: boolean;
  doseGestationalWeeks: number[];
};
type PregnancyVaccineEpisode = {
  id: number;
  number: number;
  status: "current" | "past";
  lmp: string | null;
};
type PregnancyVaccinesData = {
  currentEpisode: PregnancyVaccineEpisode | null;
  episodes: PregnancyVaccineEpisode[];
  schedules: PregnancyVaccineSchedule[];
  records: VaccineRecord[];
};

function dateLabel(value: string) {
  const date = calendarDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : value;
}

export function PregnancyVaccinesPanel({ patientId, patientName }: { patientId: number; patientName: string }) {
  const queryClient = useQueryClient();
  const [scheduleValue, setScheduleValue] = useState("");
  const [doseValue, setDoseValue] = useState("");
  const [administeredDate, setAdministeredDate] = useState(indiaToday());
  const query = useQuery<PregnancyVaccinesData>({
    queryKey: ["pregnancy-vaccines", patientId],
    queryFn: ({ signal }) => receptionRequest(`/api/patients/${patientId}/pregnancy-vaccines`, { signal }),
    retry: false,
    gcTime: 0,
  });
  const schedules = query.data?.schedules ?? [];
  const activeSchedules = schedules.filter((schedule) => schedule.isActive);
  const chosenSchedule = activeSchedules.find((schedule) => String(schedule.id) === scheduleValue) ?? activeSchedules[0];
  const currentEpisode = query.data?.currentEpisode ?? null;
  const currentRecords = recordsForPregnancyEpisode(query.data?.records ?? [], currentEpisode?.id ?? null);
  const availableDoses = chosenSchedule
    ? unrecordedPregnancyDoses(chosenSchedule, query.data?.records ?? [], currentEpisode?.id ?? null)
    : [];
  const chosenDose = availableDoses.find((dose) => String(dose.number) === doseValue) ?? availableDoses[0];
  const recordDose = useMutation({
    mutationFn: (input: { scheduleId: number; doseNumber: number }) => receptionRequest(
      `/api/patients/${patientId}/pregnancy-vaccines`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, episodeId: currentEpisode?.id, administeredDate }),
      },
    ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pregnancy-vaccines", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/vaccination-reminders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/vaccination-records", patientId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/hpv-protection"] }),
      ]);
      setDoseValue("");
    },
  });
  const historicRecords = (query.data?.records ?? []).filter((record) => record.pregnancyEpisodeId !== currentEpisode?.id);
  const recordsByEpisode = new Map<number, VaccineRecord[]>();
  for (const record of historicRecords) {
    if (record.pregnancyEpisodeId == null) continue;
    recordsByEpisode.set(record.pregnancyEpisodeId, [...(recordsByEpisode.get(record.pregnancyEpisodeId) ?? []), record]);
  }
  const scheduleName = (scheduleId: number) => schedules.find((schedule) => schedule.id === scheduleId)?.vaccineName ?? "Vaccine";

  return <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-4 sm:p-6" aria-label={`Pregnancy vaccines for ${patientName}`} data-testid="pregnancy-vaccines-panel">
    <header>
      <h2 className="font-serif text-xl font-semibold text-saivie-teal">Pregnancy vaccines</h2>
      <p className="mt-1 text-xs text-saivie-plum">Dose records are kept separate for each saved pregnancy. Record a dose only after it has been administered.</p>
    </header>
    {query.isPending && <p role="status" className="text-sm text-saivie-plum">Loading pregnancy vaccine records...</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message} <Button type="button" variant="link" className="h-auto p-0" onClick={() => void query.refetch()}>Retry</Button></p>}
    {query.isSuccess && <>
      {currentEpisode ? (
        <p className="rounded-xl bg-saivie-teal/5 px-3 py-2 text-sm text-saivie-plum">
          Current pregnancy · Pregnancy {currentEpisode.number}{currentEpisode.lmp ? ` · LMP ${dateLabel(currentEpisode.lmp)}` : ""}
        </p>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No saved current pregnancy episode. Save a current pregnancy episode before adding pregnancy-specific doses.
        </p>
      )}
      {!activeSchedules.length && <p className="text-sm text-saivie-plum">No active pregnancy vaccine schedules are configured.</p>}
      {!!activeSchedules.length && currentEpisode && <form className="grid gap-3 rounded-xl border border-saivie-border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(140px,.7fr)_minmax(150px,.8fr)_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (chosenSchedule && chosenDose) recordDose.mutate({ scheduleId: chosenSchedule.id, doseNumber: chosenDose.number });
        }}>
        <div className="space-y-1.5">
          <Label htmlFor={`pregnancy-vaccine-schedule-${patientId}`}>Vaccine</Label>
          <Select value={String(chosenSchedule?.id ?? "")} onValueChange={(value) => { setScheduleValue(value); setDoseValue(""); }}>
            <SelectTrigger id={`pregnancy-vaccine-schedule-${patientId}`} aria-label="Pregnancy vaccine"><SelectValue placeholder="Choose vaccine" /></SelectTrigger>
            <SelectContent>{activeSchedules.map((schedule) => <SelectItem key={schedule.id} value={String(schedule.id)}>{schedule.vaccineName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pregnancy-vaccine-dose-${patientId}`}>Dose</Label>
          <Select value={String(chosenDose?.number ?? "")} onValueChange={setDoseValue} disabled={!availableDoses.length}>
            <SelectTrigger id={`pregnancy-vaccine-dose-${patientId}`} aria-label="Pregnancy vaccine dose"><SelectValue placeholder="All doses recorded" /></SelectTrigger>
            <SelectContent>{availableDoses.map((dose) => <SelectItem key={dose.number} value={String(dose.number)}>Dose {dose.number} · week {dose.week}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pregnancy-vaccine-date-${patientId}`}>Date given</Label>
          <DateInput id={`pregnancy-vaccine-date-${patientId}`} value={administeredDate} max={indiaToday()} onValueChange={setAdministeredDate} required />
        </div>
        <Button type="submit" disabled={!chosenSchedule || !chosenDose || !administeredDate || recordDose.isPending}>
          {recordDose.isPending ? "Saving..." : "Record dose"}
        </Button>
      </form>}
      {recordDose.isError && <p role="alert" className="text-sm text-destructive">{recordDose.error.message}</p>}
      {!!currentEpisode && <section aria-label={`Current pregnancy vaccine doses for Pregnancy ${currentEpisode.number}`} className="space-y-2">
        <h3 className="text-sm font-semibold text-saivie-plum">This pregnancy</h3>
        {schedules.filter((schedule) => schedule.isActive || currentRecords.some((record) => record.scheduleId === schedule.id)).map((schedule) => {
          const records = currentRecords.filter((record) => record.scheduleId === schedule.id).sort((a, b) => a.doseNumber - b.doseNumber);
          return <div key={schedule.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-saivie-border px-3 py-2.5">
            <div><p className="text-sm font-medium text-saivie-plum">{schedule.vaccineName}</p><p className="text-xs text-muted-foreground">{records.length} of {schedule.doseGestationalWeeks.length} doses recorded{schedule.isActive ? "" : " · schedule inactive"}</p></div>
            <div className="flex flex-wrap gap-1.5">{schedule.doseGestationalWeeks.map((week, index) => {
              const record = records.find((item) => item.doseNumber === index + 1);
              return <span key={index} className={`rounded-full px-2.5 py-1 text-[11px] ${record ? "bg-saivie-teal/10 text-saivie-teal" : "border border-dashed border-saivie-border text-muted-foreground"}`}>
                Dose {index + 1}{record ? ` · ${dateLabel(record.administeredDate)}` : ` · week ${week}`}
              </span>;
            })}</div>
          </div>;
        })}
        {!activeSchedules.some((schedule) => currentRecords.some((record) => record.scheduleId === schedule.id)) && !activeSchedules.length && <p className="text-sm text-muted-foreground">No doses recorded for this pregnancy.</p>}
      </section>}
      {!!recordsByEpisode.size && <section className="space-y-2" aria-label="Previous pregnancy vaccine records">
        <h3 className="text-sm font-semibold text-saivie-plum">Previous pregnancies</h3>
        {[...recordsByEpisode.entries()].map(([episodeId, records]) => {
          const episode = query.data.episodes.find((item) => item.id === episodeId);
          return <div key={episodeId} className="rounded-xl border border-saivie-border p-3">
            <p className="text-xs font-semibold text-saivie-plum">Pregnancy {episode?.number ?? episodeId}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{records.map((record) => <li key={record.id}>{scheduleName(record.scheduleId)} · Dose {record.doseNumber} · {dateLabel(record.administeredDate)}</li>)}</ul>
          </div>;
        })}
      </section>}
      {!!historicRecords.some((record) => record.pregnancyEpisodeId == null) && <section className="rounded-xl border border-dashed border-saivie-border p-3" aria-label="Vaccine records not linked to a pregnancy">
        <h3 className="text-xs font-semibold text-saivie-plum">Earlier records not linked to a pregnancy</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{historicRecords.filter((record) => record.pregnancyEpisodeId == null).map((record) => <li key={record.id}>{scheduleName(record.scheduleId)} · Dose {record.doseNumber} · {dateLabel(record.administeredDate)}</li>)}</ul>
      </section>}
    </>}
  </section>;
}

export function PregnancyVaccinesDialog({ patientId, patientName, onClose }: { patientId: number; patientName: string; onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92dvh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Pregnancy vaccines · {patientName}</DialogTitle>
        <DialogDescription>Review recorded doses or record a dose that has already been administered.</DialogDescription>
      </DialogHeader>
      <PregnancyVaccinesPanel patientId={patientId} patientName={patientName} />
    </DialogContent>
  </Dialog>;
}
