import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { attendanceShiftSchema } from "../../../../lib/db/src/attendance-timing";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const employeeShiftSchema = attendanceShiftSchema.extend({ id: z.string(), name: z.string() });
type EmployeeShift = z.infer<typeof employeeShiftSchema>;

export function OwnerAttendanceShifts({ token }: { token: string }) {
  const shifts = useQuery({
    queryKey: ["/api/owner/attendance-shifts", token],
    queryFn: async () => z.object({ employees: z.array(employeeShiftSchema) }).parse(await readApiResponse(await authenticatedFetch("/api/owner/attendance-shifts", { headers: { Authorization: `Bearer ${token}` } }))),
    gcTime: 0,
  });
  return <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Staff shift and grace settings">
    <div><h3 className="font-semibold text-saivie-plum">Shift times &amp; late arrivals</h3>
      <p className="mt-1 text-sm text-muted-foreground">Set each staff member's daily start time (IST) and grace period. A check-in after the grace period is late; minutes late are measured from shift start. Settings apply to new check-ins, not existing records.</p>
    </div>
    {shifts.isPending && <p role="status">Loading shift settings...</p>}
    {shifts.isError && <p role="alert" className="text-sm text-rose-700">{shifts.error.message} <Button variant="link" onClick={() => void shifts.refetch()}>Retry</Button></p>}
    {shifts.isSuccess && !shifts.data.employees.length && <p className="text-sm text-muted-foreground">No staff accounts available.</p>}
    {shifts.data?.employees.map((employee) => <StaffShiftEditor key={`${employee.id}:${employee.shiftStart}:${employee.graceMinutes}`} employee={employee} token={token} />)}
  </section>;
}

function StaffShiftEditor({ employee, token }: { employee: EmployeeShift; token: string }) {
  const queryClient = useQueryClient();
  const [start, setStart] = useState(employee.shiftStart || "");
  const [grace, setGrace] = useState(String(employee.graceMinutes));
  const mutation = useMutation({
    mutationFn: async (disable: boolean) => {
      const shift = attendanceShiftSchema.parse({ shiftStart: disable ? null : start, graceMinutes: disable ? employee.graceMinutes : Number(grace) });
      return readApiResponse(await authenticatedFetch(`/api/owner/attendance-shifts/${encodeURIComponent(employee.id)}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(shift),
      }));
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/owner/attendance-shifts"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/staff/attendance-shift"] }),
      ]);
    },
  });
  return <form className="space-y-2 rounded-xl border border-saivie-border p-4" aria-label={`Shift for ${employee.name}`} onSubmit={(event) => { event.preventDefault(); mutation.mutate(false); }}>
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-36 flex-1"><p className="font-medium text-saivie-plum">{employee.name}</p><p className="text-xs text-muted-foreground">{employee.shiftStart ? `Saved: ${employee.shiftStart} IST, ${employee.graceMinutes} min grace` : "Late tracking not configured"}</p></div>
      <div><Label htmlFor={`shift-${employee.id}`}>Shift start (IST)</Label><Input id={`shift-${employee.id}`} type="time" required value={start} onChange={(event) => setStart(event.target.value)} className="w-36" /></div>
      <div><Label htmlFor={`grace-${employee.id}`}>Grace (minutes)</Label><Input id={`grace-${employee.id}`} type="number" min="0" max="1440" step="1" required value={grace} onChange={(event) => setGrace(event.target.value)} className="w-32" /></div>
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save shift"}</Button>
      {employee.shiftStart && <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>Disable tracking</Button>}
    </div>
    {mutation.isError && <p role="alert" className="text-sm text-rose-700">{mutation.error.message}</p>}
    {mutation.isSuccess && <p role="status" className="text-sm text-saivie-teal">Shift settings saved.</p>}
  </form>;
}

export function StaffAttendanceShift() {
  const token = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token");
  const shift = useQuery({
    queryKey: ["/api/staff/attendance-shift", token],
    queryFn: async () => z.object({ shift: attendanceShiftSchema.nullable() }).parse(await readApiResponse(await authenticatedFetch("/api/staff/attendance-shift"))),
    refetchInterval: 30000,
    gcTime: 0,
  });
  return <div className="text-sm text-muted-foreground">
    {shift.isPending && <p role="status">Loading your shift...</p>}
    {shift.isError && <p role="alert" className="text-rose-700">{shift.error.message} <Button variant="link" onClick={() => void shift.refetch()}>Retry shift</Button></p>}
    {shift.isSuccess && <p>{shift.data.shift?.shiftStart ? `Your shift starts at ${shift.data.shift.shiftStart} IST with ${shift.data.shift.graceMinutes} minutes of grace.` : "Late tracking is not configured. The owner can set your shift start and grace period."}</p>}
  </div>;
}
