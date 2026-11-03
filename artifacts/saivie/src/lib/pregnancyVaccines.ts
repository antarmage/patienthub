export type PregnancyVaccineRecord = {
  id: number;
  scheduleId: number;
  doseNumber: number;
  administeredDate: string;
  pregnancyEpisodeId: number | null;
};

export type PregnancyVaccineSchedule = {
  id: number;
  doseGestationalWeeks: number[];
};

export function recordsForPregnancyEpisode(records: PregnancyVaccineRecord[], episodeId: number | null) {
  return episodeId === null ? [] : records.filter((record) => record.pregnancyEpisodeId === episodeId);
}

export function unrecordedPregnancyDoses(
  schedule: PregnancyVaccineSchedule,
  records: PregnancyVaccineRecord[],
  episodeId: number | null,
) {
  if (episodeId === null) return [];
  const recordedDoses = new Set(
    recordsForPregnancyEpisode(records, episodeId)
      .filter((record) => record.scheduleId === schedule.id)
      .map((record) => record.doseNumber),
  );
  return schedule.doseGestationalWeeks
    .map((week, index) => ({ number: index + 1, week }))
    .filter((dose) => !recordedDoses.has(dose.number));
}
