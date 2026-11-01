import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PregnancyEpisodeEditor } from "@/components/PregnancyEpisodeEditor";
import { MeasurementTrend } from "@/components/MeasurementTrend";
import { presentPatientRisk } from "@/lib/riskPresentation";
import { usePregnancyFollowUps } from "@/hooks/use-pregnancy-follow-ups";
import { pregnancyFollowUpLabel } from "@/lib/pregnancyFollowUps";
import {
  bpReference,
  pregnancyWeightReference,
  pregnancyHemoglobinReference,
} from "@/lib/pregnancyGraphReferences";
import { PatientVisitTimeline } from "@/components/PatientVisitTimeline";
import { receptionRequest } from "@/lib/authenticatedFetch";
import {
  episodeRecords,
  indiaToday,
  pregnancyBaseline,
  pregnancyGestation,
  readPregnancyEpisodes,
  readMeasurementLogs,
} from "@/lib/pregnancyOverview";
import { historyRecord, historyText } from "@/lib/receptionPatientHistory";
import { appointmentLabel, visitTrail } from "@/lib/visitTrail";
import { summaryTrends, type SummaryLab } from "@/lib/patientSummary";
import type {
  PregnancyEpisode,
  PregnancyEpisodeDetails,
} from "../../../../lib/db/src/pregnancy-episodes";

const dateLabel = (value: string | null) => value || "Not recorded";
const card =
  "min-w-0 rounded-2xl border border-saivie-border bg-white p-4 sm:p-5";
function MeasurementGraphs({
  trends,
  details,
}: {
  trends: ReturnType<typeof summaryTrends>;
  details?: PregnancyEpisodeDetails;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MeasurementTrend
        title="Blood pressure"
        unit="mmHg"
        points={trends.bp}
        paired
        reference={details ? bpReference : undefined}
      />
      <MeasurementTrend
        title="Weight"
        unit="kg"
        points={trends.weight}
        reference={details ? pregnancyWeightReference(details) : undefined}
      />
      <MeasurementTrend
        title="Hemoglobin"
        unit="g/dL"
        points={trends.hb}
        reference={details ? pregnancyHemoglobinReference(details) : undefined}
      />
      <MeasurementTrend
        title="Pulse"
        unit="bpm"
        points={trends.pulse}
        referenceNote={
          details
            ? "No universal pregnancy pulse target is plotted; symptoms, activity and clinical context affect interpretation."
            : undefined
        }
      />
      <MeasurementTrend
        title="Fetal heart rate"
        unit="bpm"
        points={trends.fetalHeart}
        referenceNote={
          details
            ? "No antenatal ideal line: labour CTG baseline ranges are not applied to isolated antenatal fetal heart readings."
            : undefined
        }
      />
      <MeasurementTrend
        title="Fundal height"
        unit="cm"
        points={trends.fundalHeight}
        referenceNote={
          details
            ? "No universal ideal line: fundal height needs an appropriate fetal growth chart. NICE NG201 recommends plotting singleton measurements after 24 weeks, not a guessed week = cm target."
            : undefined
        }
      />
      {trends.sugar.length ? (
        trends.sugar.map((series) => (
          <MeasurementTrend
            key={`${series.name}:${series.unit}`}
            title={series.name}
            unit={series.unit}
            points={series.points}
            referenceNote={
              details
                ? "No generic glucose target is applied. Fasting, random, post-meal and OGTT results require distinct test context; diagnostic cutoffs are not treatment targets."
                : undefined
            }
          />
        ))
      ) : (
        <MeasurementTrend
          title="Blood sugar"
          unit="Test-specific units"
          points={[]}
        />
      )}
    </div>
  );
}
export function PregnancyOverview({
  patient,
  appointments,
  visits,
  labs,
  documents = [],
  canEdit = false,
  recordsReady,
  onProfile,
  onConsultation,
  onVitals,
}: {
  patient: Record<string, unknown> & { id: number };
  appointments: Record<string, unknown>[];
  visits: Record<string, unknown>[];
  labs: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  canEdit?: boolean;
  recordsReady: boolean;
  onProfile?: () => void;
  onConsultation?: () => void;
  onVitals?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ episode?: PregnancyEpisode } | null>(
    null,
  );
  const [showAllTrail, setShowAllTrail] = useState(false);
  const [showOverallMeasurements, setShowOverallMeasurements] = useState(false);
  const queryClient = useQueryClient();
  const detectionAttempted = useRef(false);
  const detection = useMutation({
    mutationFn: async () => {
      const response = historyRecord(
        await receptionRequest(
          `/api/patients/${patient.id}/pregnancy-episodes/auto-detect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        ),
      );
      if (
        !Number.isInteger(response.created) ||
        !Number.isInteger(response.linked) ||
        typeof response.message !== "string"
      )
        throw new Error(
          "The pregnancy API did not confirm automatic detection.",
        );
      return {
        episodes: readPregnancyEpisodes(response.episodes, patient.id),
        message: response.message,
      };
    },
    onSuccess: (result) =>
      queryClient.setQueryData(
        ["/api/patients", patient.id, "pregnancy-episodes"],
        result.episodes,
      ),
  });
  const measurementLogs = useQuery({
    queryKey: ["pregnancy-overall-measurement-logs", patient.id],
    enabled: showOverallMeasurements,
    queryFn: async ({ signal }) => {
      const [bp, weight] = await Promise.all([
        receptionRequest(`/api/patients/${patient.id}/bp-logs`, { signal }),
        receptionRequest(`/api/patients/${patient.id}/weight-logs`, { signal }),
      ]);
      return readMeasurementLogs({ bp, weight }, patient.id);
    },
    retry: false,
    gcTime: 0,
    refetchInterval: 30_000,
  });
  const query = useQuery({
    queryKey: ["/api/patients", patient.id, "pregnancy-episodes"],
    queryFn: async ({ signal }) =>
      readPregnancyEpisodes(
        await receptionRequest(
          `/api/patients/${patient.id}/pregnancy-episodes`,
          { signal },
        ),
        patient.id,
      ),
    retry: false,
    gcTime: 0,
    refetchInterval: 30_000,
  });
  useEffect(() => {
    if (
      canEdit &&
      query.isSuccess &&
      query.data.length === 0 &&
      !detectionAttempted.current
    ) {
      detectionAttempted.current = true;
      detection.mutate();
    }
  }, [canEdit, query.isSuccess, query.data, detection.mutate]);
  const followUpQuery = usePregnancyFollowUps(
    [patient.id],
    canEdit,
    query.isSuccess &&
      query.data.some((episode) => episode.details.status === "current") &&
      recordsReady,
  );
  if (query.isPending)
    return (
      <p role="status" className={card}>
        Loading saved pregnancy episodes...
      </p>
    );
  if (query.isError)
    return (
      <div role="alert" className={card}>
        {query.error.message}{" "}
        <Button variant="link" onClick={() => void query.refetch()}>
          Retry pregnancy episodes
        </Button>
      </div>
    );
  const episodes = query.data;
  const selected =
    episodes.find((episode) => episode.id === selectedId) ||
    episodes.find((episode) => episode.details.status === "current") ||
    episodes[0];
  const today = indiaToday();
  const context = selected
    ? episodeRecords(selected, appointments, visits, labs)
    : { appointments: [], visits: [], labs: [] };
  const assignedContexts = episodes.map((episode) =>
    episodeRecords(episode, appointments, visits, labs),
  );
  const unassignedCount =
    appointments.filter(
      (appointment) =>
        !assignedContexts.some((context) =>
          context.appointments.includes(appointment),
        ),
    ).length +
    visits.filter(
      (visit) =>
        !visit.appointmentId &&
        !assignedContexts.some((context) => context.visits.includes(visit)),
    ).length +
    labs.filter(
      (lab) => !assignedContexts.some((context) => context.labs.includes(lab)),
    ).length;
  const gestation = selected
    ? pregnancyGestation(selected.details, today)
    : null;
  const baseline = pregnancyBaseline(patient, today, [
    ...visits,
    ...appointments,
  ]);
  const history = historyRecord(patient.history),
    pregnancy = historyRecord(historyRecord(history.onboarding).pregnancies);
  const risk = historyRecord(presentPatientRisk(patient.riskScore));
  const current = selected?.details.status === "current";
  const followUp = followUpQuery.data?.[String(patient.id)];
  const todayAppointments = context.appointments.filter(
    (appointment) =>
      appointment.date === today &&
      !["cancelled", "canceled"].includes(
        String(appointment.status).toLowerCase(),
      ),
  );
  const todayVisits = context.visits
    .filter((visit) => visit.date === today)
    .sort((a, b) => Number(b.id) - Number(a.id));
  const checkInVisit = todayVisits[0];
  const checkInAppointment = checkInVisit
    ? todayAppointments.find(
        (appointment) =>
          String(appointment.id) === String(checkInVisit.appointmentId),
      )
    : [...todayAppointments].sort(
        (a, b) =>
          String(b.time).localeCompare(String(a.time)) ||
          Number(b.id) - Number(a.id),
      )[0];
  const measured = {
    ...historyRecord(checkInAppointment?.vitals),
    ...historyRecord(checkInVisit?.vitals),
  };
  const todayLabs = context.labs.filter((lab) => lab.date === today);
  const hb = todayLabs.find(
    (lab) =>
      /^(hb|haemoglobin|hemoglobin)$/i.test(String(lab.testName).trim()) &&
      /^g\/dl$/i.test(String(lab.unit).trim()),
  );
  const sugar = todayLabs.filter((lab) =>
    /\b(glucose|sugar|fbs|rbs|ppbs|ogtt|gtt|hba1c)\b/i.test(
      String(lab.testName),
    ),
  );
  const upcoming = context.appointments
    .filter((appointment) =>
      appointmentLabel(appointment, today).startsWith("Upcoming booking"),
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = context.appointments
    .filter(
      (appointment) =>
        appointmentLabel(appointment, today) === "Completed appointment" &&
        String(appointment.date) <= today,
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const missing: { label: string; action?: () => void; button?: string }[] = [];
  if (baseline.age === null)
    missing.push({
      label: "Patient date of birth / age",
      action: onProfile,
      button: "Add details",
    });
  if (!baseline.bloodGroup || !baseline.allergies)
    missing.push({
      label: "Blood group / allergies",
      action: onProfile,
      button: "Add details",
    });
  if (!baseline.medicalRecorded)
    missing.push({
      label: "Medical history (including an explicit none, if assessed)",
      action: onProfile || onConsultation,
      button: "Review history",
    });
  if (!selected)
    missing.push({
      label: "Establish a saved pregnancy episode",
      action: canEdit && recordsReady ? () => setEditor({}) : undefined,
      button: "Add pregnancy",
    });
  if (selected && !gestation && current)
    missing.push({
      label: "Pregnancy dating: confirmed LMP or clinically established EDD",
      action:
        canEdit && recordsReady
          ? () => setEditor({ episode: selected })
          : undefined,
      button: "Review dating",
    });
  if (selected && !context.appointments.length && !context.visits.length)
    missing.push({
      label:
        "Associate this pregnancy with its appointments / consultation records",
      action:
        canEdit && recordsReady
          ? () => setEditor({ episode: selected })
          : undefined,
      button: "Assign records",
    });
  if (
    current &&
    ["bp", "pulse", "weight", "spo2"].some((key) => !historyText(measured[key]))
  )
    missing.push({
      label: "Today's vitals (BP, pulse, weight, SpO2)",
      action: onVitals || onConsultation,
      button: onVitals ? "Record vitals" : "Open consultation",
    });
  for (const episode of episodes.filter(
    (episode) =>
      episode.details.status === "past" &&
      (episode.details.outcome === "Not recorded" || !episode.details.endDate),
  )) {
    missing.push({
      label: `Pregnancy ${episode.details.number}: outcome / end date not recorded`,
      action:
        canEdit && recordsReady ? () => setEditor({ episode }) : undefined,
      button: "Record outcome",
    });
  }
  const reportedTotal = Number(pregnancy.total);
  if (Number.isInteger(reportedTotal) && reportedTotal > episodes.length)
    missing.push({
      label: `Patient reported ${reportedTotal} pregnancies; ${episodes.length} episode records saved. Confirm the earlier history.`,
      action: canEdit && recordsReady ? () => setEditor({}) : undefined,
      button: "Add pregnancy",
    });
  const points = visitTrail(context.visits, context.appointments).map(
    (record) => ({
      id: Number(record.id),
      date: record.date,
      vitals: record.vitals,
      source: record.appointmentOnly
        ? "Appointment"
        : record.appointment
          ? "Consultation / appointment"
          : "Saved consultation",
    }),
  );
  const summaryLabs = (results: Record<string, unknown>[]): SummaryLab[] =>
    results.map((lab) => ({
      testName: String(lab.testName),
      date: String(lab.date),
      value: typeof lab.value === "number" ? lab.value : null,
      unit: typeof lab.unit === "string" ? lab.unit : null,
    }));
  const trends = summaryTrends(points, [], [], summaryLabs(context.labs));
  const overallPoints = visitTrail(visits, appointments).map((record) => ({
    id: Number(record.id),
    date: record.date,
    vitals: record.vitals,
    source: record.appointmentOnly
      ? "Appointment"
      : record.appointment
        ? "Consultation / appointment"
        : "Saved consultation",
  }));
  const overallTrends = summaryTrends(
    overallPoints,
    measurementLogs.data?.bp || [],
    measurementLogs.data?.weight || [],
    summaryLabs(labs),
  );
  const trail = visitTrail(
    showAllTrail ? visits : context.visits,
    showAllTrail ? appointments : context.appointments,
    showAllTrail ? documents : [],
  );
  return (
    <div className="space-y-4" data-testid="pregnancy-overview">
      {detection.isPending && (
        <p role="status" className={card}>
          Establishing pregnancy episodes from saved history and matching
          clearly supported records...
        </p>
      )}
      {detection.isError && (
        <p role="alert" className={card}>
          {detection.error.message}
          <Button variant="link" onClick={() => detection.mutate()}>
            Retry automatic pregnancy detection
          </Button>
        </p>
      )}
      {detection.isSuccess && (
        <p role="status" className={card}>
          {detection.data.message}
        </p>
      )}
      {!!episodes.length && unassignedCount > 0 && (
        <div className={card}>
          <p className="text-sm font-semibold">
            {unassignedCount} {unassignedCount === 1 ? "record" : "records"}{" "}
            awaiting episode review
          </p>
          <p className="mt-1 text-xs">
            Unassigned or ambiguous appointments, standalone notes and lab
            results remain in All patient dates / Overall patient history. They
            are not attributed to a pregnancy automatically.
          </p>
          {canEdit && selected && (
            <Button
              className="mt-2"
              variant="outline"
              disabled={!recordsReady || detection.isPending}
              onClick={() => setEditor({ episode: selected })}
            >
              Review record assignments
            </Button>
          )}
        </div>
      )}
      <div
        className="flex flex-wrap items-stretch gap-2"
        role="group"
        aria-label="Pregnancy episodes"
      >
        {episodes.map((episode) => (
          <button
            key={episode.id}
            type="button"
            aria-pressed={episode.id === selected?.id}
            onClick={() => {
              setSelectedId(episode.id);
              setShowAllTrail(false);
            }}
            className={`${card} !p-3 text-left text-xs ${episode.id === selected?.id ? "border-2 border-saivie-teal font-semibold" : ""}`}
          >
            <span className="block">
              Pregnancy {episode.details.number} ·{" "}
              {episode.details.status === "current" ? "Current" : "Past"}
            </span>
            <span className="mt-1 block font-normal">
              {episode.details.status === "current"
                ? `LMP ${dateLabel(episode.details.lmp)}`
                : `${dateLabel(episode.details.startDate || episode.details.lmp)} to ${dateLabel(episode.details.endDate)} · ${episode.details.outcome}`}
            </span>
          </button>
        ))}
        {canEdit && (
          <Button
            variant="outline"
            disabled={!recordsReady}
            onClick={() => setEditor({})}
          >
            + Add pregnancy
          </Button>
        )}
      </div>
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          Pregnancy episodes are clinician-authored and read-only here. Ask the
          doctor to confirm missing episode details.
        </p>
      )}
      {!canEdit && !selected && (
        <p className="text-xs">
          Ask the doctor to open Summary once to automatically establish
          episodes from the recorded pregnancy history.
        </p>
      )}
      {!recordsReady && (
        <p role="status" className="text-xs">
          Record sources are loading or unavailable. Episode editing is disabled
          until the date trail can be reviewed.
        </p>
      )}
      {current && (
        <section className={card} aria-label="Saved pregnancy follow-up">
          <h3 className="text-sm font-semibold">Next pregnancy follow-up</h3>
          {!recordsReady && (
            <p role="status" className="text-xs">
              Record sources are unavailable; automatic follow-up
              synchronization is paused.
            </p>
          )}
          {followUpQuery.isPending && recordsReady && (
            <p role="status" className="text-xs">
              Loading saved follow-up...
            </p>
          )}
          {followUpQuery.isError && (
            <p role="alert" className="text-xs">
              {followUpQuery.error.message}{" "}
              <Button
                variant="link"
                onClick={() => void followUpQuery.refetch()}
              >
                Retry follow-up
              </Button>
            </p>
          )}
          {followUp?.episodeId === selected.id && (
            <>
              <p className="mt-2 font-semibold">
                {followUp.date || "Timing needs clinician review"}
                {followUp.date && followUp.date < today ? " · Overdue" : ""}
              </p>
              <p className="text-xs">
                {pregnancyFollowUpLabel(followUp.source)}
              </p>
              <p className="mt-1 text-xs">{followUp.reason}</p>
            </>
          )}
          {followUpQuery.isSuccess && !followUp && (
            <p className="text-xs">
              No saved plan. Ask the doctor to review follow-up timing.
            </p>
          )}
          <p className="mt-2 text-xs">
            Booked appointments remain separate below. A milestone plan is not
            an appointment or a test/vaccine order.
          </p>
        </section>
      )}
      {!selected ? (
        <section className={card}>
          <h3 className="font-serif text-lg font-semibold">
            No saved pregnancy episode
          </h3>
          <p className="mt-2 text-sm">
            Current patient record LMP:{" "}
            {dateLabel(typeof patient.lmp === "string" ? patient.lmp : null)}.
            This is not yet a confirmed episode. Earlier pregnancy dates and
            outcomes will not be guessed.
          </p>
        </section>
      ) : (
        <section className={card}>
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs">
                {current ? "Gestation" : "Gestation at pregnancy end"} ·{" "}
                {selected.details.datingBasis}
              </p>
              <p className="mt-1 font-serif text-3xl font-semibold">
                {gestation
                  ? `${gestation.weeks}w ${gestation.days}d`
                  : "Dating not available"}
              </p>
              <p className="mt-1 text-sm">
                {gestation
                  ? `Trimester ${gestation.trimester} · EDD ${gestation.dueDate}`
                  : "Confirm the dating basis; no gestational age is assumed."}
              </p>
              {gestation && (
                <p className="mt-1 text-xs">
                  As of {gestation.asOf}
                  {!current ? " (recorded pregnancy end)" : ""}
                </p>
              )}
              <p className="mt-1 text-xs">
                LMP {dateLabel(selected.details.lmp)} · How conceived:{" "}
                {selected.details.conceptionMethod || "Not recorded"}
              </p>
              {current && (
                <p className="mt-1 text-xs">
                  Cycle length:{" "}
                  {historyText(
                    patient.cycleLength ||
                      historyRecord(historyRecord(history.onboarding).cycle)
                        .cycleLength,
                  ) || "Not recorded"}{" "}
                  (current patient history)
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="outline"
                disabled={!recordsReady}
                onClick={() => setEditor({ episode: selected })}
              >
                Edit pregnancy {selected.details.number}
              </Button>
            )}
          </div>
          {gestation && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <span>Trimester 1</span>
                <span>Trimester 2</span>
                <span>Trimester 3</span>
              </div>
              <progress
                aria-label="Pregnancy gestation in weeks"
                max={40}
                value={Math.min(40, gestation.weeks + gestation.days / 7)}
                className="h-3 w-full"
              />
              <div className="flex justify-between text-xs">
                <span>Week 0</span>
                <span>14</span>
                <span>28</span>
                <span>40</span>
              </div>
            </div>
          )}
          {!current && (
            <p className="mt-3 text-sm">
              Outcome: {selected.details.outcome} · Delivery mode:{" "}
              {selected.details.deliveryMode} · End date:{" "}
              {dateLabel(selected.details.endDate)}
            </p>
          )}
          {selected.details.notes && (
            <p className="mt-3 whitespace-pre-wrap text-sm">
              {selected.details.notes}
            </p>
          )}
        </section>
      )}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className={card}>
          <h3 className="font-serif text-lg font-semibold">
            Needs attention · {missing.length} information{" "}
            {missing.length === 1 ? "gap" : "gaps"}
          </h3>
          <p className="mt-1 text-xs">
            Missing information is not a clinical diagnosis or a “Critical” risk
            finding. Patient baseline details apply across pregnancies.
          </p>
          <p className="mt-3 text-xs">
            Age: {baseline.age ?? "Not recorded"}
            {baseline.age !== null
              ? " (DOB or recorded age; retained until corrected)"
              : ""}{" "}
            · Blood group: {baseline.bloodGroup || "Not recorded"} · Allergies:{" "}
            {baseline.allergies || "Not recorded"}
          </p>
          <ul className="mt-3 divide-y">
            {missing.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <span>{item.label}</span>
                {item.action && (
                  <Button variant="outline" size="sm" onClick={item.action}>
                    {item.button}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {!missing.length && (
            <p className="mt-3 text-sm">
              These baseline fields are recorded. This is not a clinical
              clearance or a normal-risk assessment.
            </p>
          )}
        </section>
        <section className={card}>
          <h3 className="font-serif text-lg font-semibold">
            {current ? "Coming up" : "Episode record"}
          </h3>
          {current &&
            upcoming.map((appointment) => (
              <div
                key={String(appointment.id)}
                className="mt-3 border-b pb-3 text-sm"
              >
                <strong>{String(appointment.date)}</strong> ·{" "}
                {historyText(appointment.type) || "Appointment"}
                <p className="mt-1 text-xs">
                  {appointmentLabel(appointment, today)}
                </p>
              </div>
            ))}
          {current && !upcoming.length && (
            <p className="mt-3 text-sm">
              No upcoming bookings assigned to this pregnancy.
            </p>
          )}
          <p className="mt-3 text-xs">
            Last completed appointment:{" "}
            {last
              ? `${String(last.date)} · ${historyText(last.type)}`
              : "Not recorded for this episode"}
          </p>
          <p className="mt-3 text-xs">
            {context.appointments.length} linked appointments ·{" "}
            {context.visits.length} saved clinical notes · {context.labs.length}{" "}
            linked lab results
          </p>
          <p className="mt-2 text-xs">
            Unassigned records remain available in All patient dates; they are
            not included in this pregnancy's trends.
          </p>
        </section>
      </div>
      {current && (
        <section className={card}>
          <h3 className="font-serif text-lg font-semibold">
            Today's check-in · {today}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Blood pressure", measured.bp, "mmHg"],
              ["Pulse", measured.pulse, "bpm"],
              ["Weight", measured.weight, "kg"],
              ["SpO2", measured.spo2, "%"],
              ["Hemoglobin", hb?.value ?? measured.hb, "g/dL"],
            ].map(([label, value, unit]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-dashed p-3 text-xs"
              >
                <p>{String(label)}</p>
                <p className="mt-2 font-semibold">
                  {historyText(value) || "Not recorded"}{" "}
                  {historyText(value) ? String(unit) : ""}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-dashed p-3 text-xs">
              <p>Blood sugar</p>
              {sugar.length ? (
                sugar.map((lab) => (
                  <p key={String(lab.id)} className="mt-2">
                    {historyText(lab.testName)}:{" "}
                    {historyText(lab.value) || "See report"}{" "}
                    {historyText(lab.unit) || "(unit not recorded)"}
                  </p>
                ))
              ) : (
                <p className="mt-2">Not recorded</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs">
            Vitals:{" "}
            {checkInVisit
              ? `latest saved consultation ${String(checkInVisit.id)}`
              : checkInAppointment
                ? `appointment ${String(checkInAppointment.id)}`
                : "no linked encounter today"}
            . Labs: today's linked results. All same-day records remain in the
            date trail; previous readings are not today's check-in.
          </p>
        </section>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold">
            Measurement trends
          </h3>
          <div
            role="group"
            aria-label="Measurement scope"
            className="flex flex-wrap gap-2"
          >
            <Button
              variant={showOverallMeasurements ? "outline" : "default"}
              aria-pressed={!showOverallMeasurements}
              onClick={() => setShowOverallMeasurements(false)}
            >
              Selected pregnancy
            </Button>
            <Button
              variant={showOverallMeasurements ? "default" : "outline"}
              aria-pressed={showOverallMeasurements}
              onClick={() => setShowOverallMeasurements(true)}
            >
              Overall patient history
            </Button>
          </div>
        </div>
        {showOverallMeasurements ? (
          <div data-testid="overall-measurements">
            <p className="mt-3 text-sm font-semibold">
              All patient records · not pregnancy-specific
            </p>
            <p className="mt-1 text-xs">
              Includes earlier pregnancies, unassigned records and standalone
              BP/weight logs. These readings are not attributed to the selected
              pregnancy or today's check-in.
            </p>
            {!recordsReady && (
              <p role="status" className="mt-3 text-xs">
                Appointment, consultation or lab sources are incomplete; graphs
                may be incomplete.
              </p>
            )}
            {measurementLogs.isPending && (
              <p role="status" className="mt-3 text-xs">
                Loading standalone BP and weight logs...
              </p>
            )}
            {measurementLogs.isError && (
              <p role="alert" className="mt-3 text-xs">
                {measurementLogs.error.message} Standalone BP/weight logs are
                unavailable; graphs are incomplete.
                <Button
                  variant="link"
                  onClick={() => void measurementLogs.refetch()}
                >
                  Retry measurement logs
                </Button>
              </p>
            )}
            <MeasurementGraphs trends={overallTrends} />
          </div>
        ) : selected ? (
          <div data-testid="episode-measurements">
            <h3 className="font-serif text-lg font-semibold">
              Linked measurements · Pregnancy {selected.details.number}
            </h3>
            <p className="mt-1 text-xs">
              No linked readings means no measurement is assumed. Only
              explicitly assigned records appear here.
            </p>
            <MeasurementGraphs trends={trends} details={selected?.details} />
          </div>
        ) : (
          <p className="mt-3 text-sm">
            Save a pregnancy episode and link its records to see
            pregnancy-specific trends. Existing graphs are available in Overall
            patient history.
          </p>
        )}
      </section>
      {current && !!risk.level && (
        <section className={card}>
          <h3 className="font-semibold text-sm">
            Previously recorded risk assessment: {historyText(risk.level)}
          </h3>
          <p className="mt-1 text-xs">
            This patient-level assessment is not linked to a saved pregnancy
            episode. Review its evidence with the clinician; missing data alone
            does not establish clinical risk.
          </p>
          {Array.isArray(risk.factors) &&
            risk.factors.map((factor, index) => (
              <p key={index} className="mt-2 text-xs">
                {historyText(historyRecord(factor).factor)}:{" "}
                {historyText(historyRecord(factor).detail)}
              </p>
            ))}
        </section>
      )}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold">
            {showAllTrail
              ? "All patient dates (including unassigned records)"
              : selected
                ? `Pregnancy ${selected.details.number} date trail`
                : "Patient date trail"}
          </h3>
          <Button
            variant="outline"
            onClick={() => setShowAllTrail((value) => !value)}
          >
            {showAllTrail ? "Show selected pregnancy" : "All patient dates"}
          </Button>
        </div>
        {recordsReady ? (
          <PatientVisitTimeline
            key={`${patient.id}:${selected?.id}:${showAllTrail}`}
            visits={trail}
            patient={{
              ...patient,
              lmp: showAllTrail ? null : selected?.details.lmp || null,
            }}
          />
        ) : (
          <p className="mt-3 text-sm">
            Date trail is incomplete until record sources load successfully.
          </p>
        )}
      </section>
      {editor && (
        <PregnancyEpisodeEditor
          patient={patient}
          episodes={episodes}
          episode={editor.episode}
          appointments={appointments}
          visits={visits}
          labs={labs}
          onClose={() => setEditor(null)}
          onSaved={(id) => {
            setEditor(null);
            setSelectedId(id);
            setShowAllTrail(false);
          }}
        />
      )}
    </div>
  );
}
