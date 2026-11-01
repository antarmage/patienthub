import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  pregnancyOutcomes,
  deliveryModes,
  type PregnancyEpisode,
  type PregnancyEpisodeDetails,
  type PregnancyRecordLink,
} from "../../../../lib/db/src/pregnancy-episodes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Textarea } from "@/components/ui/textarea";
import { receptionRequest } from "@/lib/authenticatedFetch";
import {
  readPregnancyEpisodes,
  suggestedEpisode,
  indiaToday,
} from "@/lib/pregnancyOverview";
import { historyText } from "@/lib/receptionPatientHistory";
import { conceptionMethods } from "@/lib/conceptionHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PregnancyEpisodeEditor({
  patient,
  episodes,
  episode,
  appointments,
  visits,
  labs,
  onClose,
  onSaved,
}: {
  patient: Record<string, unknown> & { id: number };
  episodes: PregnancyEpisode[];
  episode?: PregnancyEpisode;
  appointments: Record<string, unknown>[];
  visits: Record<string, unknown>[];
  labs: Record<string, unknown>[];
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [initialDetails] = useState(
    episode?.details || suggestedEpisode(patient, episodes),
  );
  const [details, setDetails] =
    useState<PregnancyEpisodeDetails>(initialDetails);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [records, setRecords] = useState<PregnancyRecordLink[]>(
    episode?.records || [],
  );
  const queryClient = useQueryClient();
  const update = <K extends keyof PregnancyEpisodeDetails>(
    key: K,
    value: PregnancyEpisodeDetails[K],
  ) => setDetails((current) => ({ ...current, [key]: value }));
  const choices = [
    ...appointments.map((item) => ({
      kind: "appointment" as const,
      id: Number(item.id),
      date: historyText(item.date),
      label: `${historyText(item.type) || "Appointment"} · ${historyText(item.status) || "Status not recorded"}`,
    })),
    ...visits.map((item) => ({
      kind: "visit" as const,
      id: Number(item.id),
      date: historyText(item.date),
      label: `Consultation note · ${historyText(item.visitType)}${item.appointmentId ? ` · Appointment ${String(item.appointmentId)}` : ""}`,
    })),
    ...labs.map((item) => ({
      kind: "lab" as const,
      id: Number(item.id),
      date: historyText(item.date),
      label: `Lab result · ${historyText(item.testName)}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const save = useMutation({
    mutationFn: async () => {
      const response = await receptionRequest<unknown>(
        `/api/patients/${patient.id}/pregnancy-episodes${episode ? `/${episode.id}` : ""}`,
        {
          method: episode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            details,
            records,
            ...(episode ? { version: episode.version } : {}),
          }),
        },
      );
      return readPregnancyEpisodes([response], patient.id)[0];
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({
        queryKey: ["/api/patients", patient.id, "pregnancy-episodes"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["pregnancy-follow-ups"],
      });
      onSaved(saved.id);
    },
  });
  const close = () => {
    if (save.isPending) return;
    if (
      JSON.stringify(details) !== JSON.stringify(initialDetails) ||
      JSON.stringify(records) !== JSON.stringify(episode?.records || [])
    )
      setDiscardOpen(true);
    else onClose();
  };
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="flex max-h-[90dvh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>
              {episode ? "Edit pregnancy episode" : "Add pregnancy episode"}
            </DialogTitle>
            <DialogDescription>
              Confirm details with the patient/clinical record. Select records
              explicitly; dates and pregnancy count do not assign them
              automatically. Patient profile LMP is not changed.
            </DialogDescription>
          </DialogHeader>
          <form
            className="min-h-0 space-y-4 overflow-y-auto p-1"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <fieldset
              disabled={save.isPending}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="text-xs">
                Pregnancy number
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={details.number}
                  onChange={(event) =>
                    update("number", Number(event.target.value))
                  }
                />
              </label>
              <label className="text-xs">
                Status
                <select
                  className="mt-1 h-10 w-full rounded-md border px-2"
                  value={details.status}
                  onChange={(event) =>
                    update(
                      "status",
                      event.target.value === "past" ? "past" : "current",
                    )
                  }
                >
                  <option value="current">Current</option>
                  <option value="past">Past</option>
                </select>
              </label>
              {(["startDate", "lmp", "dueDate", "endDate"] as const).map(
                (key) => (
                  <label key={key} className="text-xs">
                    {
                      {
                        startDate: "Pregnancy record start date (optional)",
                        lmp: "LMP",
                        dueDate: "Clinically established EDD (non-LMP dating)",
                        endDate: "Pregnancy end / delivery date",
                      }[key]
                    }
                    <DateInput
                      value={details[key] || ""}
                      max={key === "dueDate" ? undefined : indiaToday()}
                      onValueChange={(value) => update(key, value || null)}
                    />
                  </label>
                ),
              )}
              {(
                [
                  [
                    "maternalHeightCm",
                    "Confirmed maternal height (cm)",
                    50,
                    250,
                  ],
                  [
                    "prePregnancyWeightKg",
                    "Confirmed pre-pregnancy weight (kg)",
                    20,
                    500,
                  ],
                  ["fetusCount", "Number of babies in this pregnancy", 1, 10],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="text-xs">
                  {label}
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    step={key === "fetusCount" ? 1 : "any"}
                    value={details[key] ?? ""}
                    onChange={(event) =>
                      update(
                        key,
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      )
                    }
                  />
                </label>
              ))}
              <p className="text-xs sm:col-span-2">
                These episode-specific details support the weight reference
                band. Leave unknown values blank; a current or first-visit
                weight is not automatically a pre-pregnancy weight.
              </p>
              <label className="text-xs">
                Dating basis
                <select
                  className="mt-1 h-10 w-full rounded-md border px-2"
                  value={details.datingBasis}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "LMP" ||
                      value === "Ultrasound" ||
                      value === "Clinical assessment" ||
                      value === "Not recorded"
                    )
                      update("datingBasis", value);
                  }}
                >
                  {[
                    "Not recorded",
                    "LMP",
                    "Ultrasound",
                    "Clinical assessment",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                How conceived
                <select
                  className="mt-1 h-10 w-full rounded-md border px-2"
                  value={details.conceptionMethod}
                  onChange={(event) =>
                    update("conceptionMethod", event.target.value)
                  }
                >
                  <option value="">Not recorded</option>
                  {conceptionMethods.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Outcome
                <select
                  className="mt-1 h-10 w-full rounded-md border px-2"
                  value={details.outcome}
                  onChange={(event) => {
                    const value = pregnancyOutcomes.find(
                      (value) => value === event.target.value,
                    );
                    if (value) update("outcome", value);
                  }}
                >
                  {pregnancyOutcomes.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                Delivery mode
                <select
                  className="mt-1 h-10 w-full rounded-md border px-2"
                  value={details.deliveryMode}
                  onChange={(event) => {
                    const value = deliveryModes.find(
                      (value) => value === event.target.value,
                    );
                    if (value) update("deliveryMode", value);
                  }}
                >
                  {deliveryModes.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs sm:col-span-2">
                Clinical notes / complications
                <Textarea
                  value={details.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </fieldset>
            <fieldset disabled={save.isPending} className="space-y-2">
              <legend className="text-sm font-semibold">
                Records belonging to this pregnancy
              </legend>
              <p className="text-xs text-muted-foreground">
                Same-day records remain separate. Lab results are assigned
                individually. New notes linked to a selected appointment appear
                with that pregnancy.
              </p>
              {!choices.length && (
                <p className="text-xs">
                  No appointments, consultation notes or lab results available.
                </p>
              )}
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border p-2">
                {choices.map((choice) => {
                  const assigned = episodes.find(
                    (item) =>
                      item.id !== episode?.id &&
                      item.records.some(
                        (link) =>
                          (link.id === choice.id &&
                            link.kind === choice.kind) ||
                          (choice.kind === "visit" &&
                            link.kind === "appointment" &&
                            visits.some(
                              (visit) =>
                                Number(visit.id) === choice.id &&
                                Number(visit.appointmentId) === link.id,
                            )) ||
                          (choice.kind === "appointment" &&
                            link.kind === "visit" &&
                            visits.some(
                              (visit) =>
                                Number(visit.id) === link.id &&
                                Number(visit.appointmentId) === choice.id,
                            )),
                      ),
                  );
                  const checked = records.some(
                    (link) =>
                      link.kind === choice.kind && link.id === choice.id,
                  );
                  const inherited =
                    !checked &&
                    choice.kind === "visit" &&
                    records.some(
                      (link) =>
                        link.kind === "appointment" &&
                        visits.some(
                          (visit) =>
                            Number(visit.id) === choice.id &&
                            Number(visit.appointmentId) === link.id,
                        ),
                    );
                  return (
                    <label
                      key={`${choice.kind}:${choice.id}`}
                      className="flex items-start gap-2 rounded p-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked || inherited}
                        disabled={!!assigned || inherited}
                        onChange={() =>
                          setRecords((current) =>
                            checked
                              ? current.filter(
                                  (link) =>
                                    link.kind !== choice.kind ||
                                    link.id !== choice.id,
                                )
                              : [
                                  ...current,
                                  { kind: choice.kind, id: choice.id },
                                ],
                          )
                        }
                      />
                      <span>
                        {choice.date || "Date not recorded"} · {choice.label}
                        {assigned
                          ? ` · Assigned to Pregnancy ${assigned.details.number}`
                          : inherited
                            ? " · Included via the selected appointment; uncheck the appointment to remove"
                            : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {save.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={save.isPending}
                onClick={close}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save pregnancy episode"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Discard unsaved pregnancy changes?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The saved episode will not change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onClose}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
