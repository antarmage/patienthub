import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VaccinationSchedule {
  id: number;
  vaccineName: string;
  eligibility: "age" | "pregnancy";
  minAge: number | null;
  maxAge: number | null;
  doseOffsetsMonths: number[];
  doseGestationalWeeks: number[];
  reminderLeadDays: number;
  isActive: boolean;
}

interface ScheduleForm {
  vaccineName: string;
  eligibility: "age" | "pregnancy";
  minAge: string;
  maxAge: string;
  timings: string;
  reminderLeadDays: string;
  isActive: boolean;
}

const emptyForm: ScheduleForm = {
  vaccineName: "",
  eligibility: "age",
  minAge: "",
  maxAge: "",
  timings: "0, 2, 6",
  reminderLeadDays: "7",
  isActive: true,
};

function formFromSchedule(schedule: VaccinationSchedule): ScheduleForm {
  const timings = schedule.eligibility === "pregnancy" ? schedule.doseGestationalWeeks : schedule.doseOffsetsMonths;
  return {
    vaccineName: schedule.vaccineName,
    eligibility: schedule.eligibility,
    minAge: schedule.minAge == null ? "" : String(schedule.minAge),
    maxAge: schedule.maxAge == null ? "" : String(schedule.maxAge),
    timings: timings.join(", "),
    reminderLeadDays: String(schedule.reminderLeadDays),
    isActive: schedule.isActive,
  };
}

export function VaccinationScheduleSettings() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [error, setError] = useState("");
  const schedulesQuery = useQuery<VaccinationSchedule[]>({
    queryKey: ["/api/vaccination-schedules"],
    queryFn: async () => {
      const res = await fetch("/api/vaccination-schedules");
      if (!res.ok) throw new Error("Could not load vaccination schedules");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const timingParts = form.timings.split(",").map((part) => part.trim());
      if (!timingParts.length || timingParts.some((part) => !/^\d+$/.test(part))) {
        throw new Error("Enter comma-separated whole-number dose timings");
      }
      const timings = timingParts.map(Number);
      const payload = {
        vaccineName: form.vaccineName.trim(),
        eligibility: form.eligibility,
        minAge: form.eligibility === "age" && form.minAge !== "" ? Number(form.minAge) : null,
        maxAge: form.eligibility === "age" && form.maxAge !== "" ? Number(form.maxAge) : null,
        doseOffsetsMonths: form.eligibility === "age" ? timings : [],
        doseGestationalWeeks: form.eligibility === "pregnancy" ? timings : [],
        reminderLeadDays: Number(form.reminderLeadDays),
        isActive: form.isActive,
      };
      const res = await fetch(editing ? `/api/vaccination-schedules/${editing}` : "/api/vaccination-schedules", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save schedule");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/vaccination-schedules"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/vaccination-reminders"] });
      setEditing(null);
      setForm(emptyForm);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const startEdit = (schedule: VaccinationSchedule) => {
    setEditing(schedule.id);
    setForm(formFromSchedule(schedule));
    setError("");
  };

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const timingLabel = form.eligibility === "pregnancy" ? "Dose gestational weeks" : "Dose offsets (months from dose 1)";

  return (
    <div className="space-y-4" data-testid="vaccination-schedule-settings">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Vaccination schedules</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Set dose timing, eligibility, and how many days ahead staff should be reminded. Overdue doses remain visible.</p>
          </div>
          <Button size="sm" variant="outline" onClick={startAdd}><Plus className="mr-1 h-4 w-4" />Add rule</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedulesQuery.isLoading && <p className="text-sm text-slate-500">Loading schedules...</p>}
          {schedulesQuery.isError && <p role="alert" className="text-sm text-rose-600">{schedulesQuery.error.message}</p>}
          {(schedulesQuery.data || []).map((schedule) => {
            const doses = schedule.eligibility === "pregnancy" ? schedule.doseGestationalWeeks : schedule.doseOffsetsMonths;
            return (
              <div key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{schedule.vaccineName}</p>
                    <Badge variant="outline">{schedule.eligibility === "pregnancy" ? "Pregnancy" : "Age-based"}</Badge>
                    {!schedule.isActive && <Badge variant="secondary">Disabled</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {schedule.eligibility === "pregnancy"
                      ? `Dose weeks: ${doses.join(", ")}`
                      : `Ages ${schedule.minAge ?? "any"}–${schedule.maxAge ?? "any"} · Dose months: ${doses.join(", ")}`}
                    {" · "}Reminder {schedule.reminderLeadDays} days before
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => startEdit(schedule)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {(!editing || editing !== null) && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-sm font-bold text-slate-700">{editing ? "Edit vaccination rule" : "Add vaccination rule"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Vaccine / schedule name</Label>
                <Input value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} placeholder="e.g. HPV9" />
              </div>
              <div className="space-y-1">
                <Label>Eligibility</Label>
                <Select value={form.eligibility} onValueChange={(value: "age" | "pregnancy") => setForm({ ...form, eligibility: value, timings: value === "pregnancy" ? "12, 16, 27" : "0, 2, 6" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="age">Age-based</SelectItem>
                    <SelectItem value="pregnancy">Pregnancy-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.eligibility === "age" && (
                <>
                  <div className="space-y-1">
                    <Label>Minimum age (years, optional)</Label>
                    <Input type="number" min={0} max={120} value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Maximum age (years, optional)</Label>
                    <Input type="number" min={0} max={120} value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} />
                  </div>
                </>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label>{timingLabel}</Label>
                <Input value={form.timings} onChange={(e) => setForm({ ...form, timings: e.target.value })} placeholder={form.eligibility === "pregnancy" ? "e.g. 12, 16, 27" : "e.g. 0, 2, 6"} />
                <p className="text-xs text-slate-500">
                  {form.eligibility === "pregnancy"
                    ? "Comma-separated gestational weeks; dose reminders use the patient's LMP."
                    : "Comma-separated months after dose 1. The first value must be 0."}
                </p>
              </div>
              <div className="space-y-1">
                <Label>Reminder lead time (days)</Label>
                <Input type="number" min={0} max={60} value={form.reminderLeadDays} onChange={(e) => setForm({ ...form, reminderLeadDays: e.target.value })} />
              </div>
              {editing !== null && (
                <div className="flex items-end gap-2">
                  <Button type="button" variant={form.isActive ? "outline" : "secondary"} onClick={() => setForm({ ...form, isActive: !form.isActive })}>
                    {form.isActive ? "Disable rule" : "Enable rule"}
                  </Button>
                  <span className="pb-2 text-xs text-slate-500">{form.isActive ? "Active" : "Disabled"}</span>
                </div>
              )}
            </div>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              {editing !== null && <Button variant="outline" onClick={startAdd}><X className="mr-1 h-4 w-4" />Cancel</Button>}
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                <Save className="mr-1 h-4 w-4" />{saveMutation.isPending ? "Saving..." : editing ? "Save rule" : "Add rule"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
