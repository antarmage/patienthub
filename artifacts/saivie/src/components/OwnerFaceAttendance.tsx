import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { describeEnrollmentPhoto } from "@/lib/faceAttendance";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const ownerFaceSchema = z.object({
  enabled: z.boolean(),
  employees: z.array(z.object({ id: z.string(), name: z.string(), enrolled: z.boolean() })),
  reviews: z.array(z.object({ id: z.number(), employeeName: z.string(), date: z.string(), requestedAt: z.string(), reason: z.string(), decision: z.string() })),
});

export function OwnerFaceAttendance({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState("");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const request = async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return readApiResponse(await authenticatedFetch(url, { ...init, headers }));
  };
  const data = useQuery({
    queryKey: ["/api/owner/face-attendance", token],
    queryFn: async () => ownerFaceSchema.parse(await request("/api/owner/face-attendance")),
    refetchInterval: 30000,
  });
  const action = useMutation({
    mutationFn: async (input: { type: "enroll"; employeeId: string } | { type: "revoke"; employeeId: string } | { type: "review"; id: number; decision: "approved" | "rejected" }) => {
      setMessage("");
      if (input.type === "enroll") {
        if (!photo || !consent) throw new Error("Select a photo and confirm staff consent before enrolling.");
        const face = await describeEnrollmentPhoto(photo);
        await request(`/api/owner/face-attendance/enrollment/${encodeURIComponent(input.employeeId)}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...face, consentConfirmed: true }),
        });
        setPhoto(null); setConsent(false);
        if (fileInput.current) fileInput.current.value = "";
      } else if (input.type === "revoke") {
        await request(`/api/owner/face-attendance/enrollment/${encodeURIComponent(input.employeeId)}`, { method: "DELETE" });
      } else {
        await request(`/api/owner/face-attendance/reviews/${input.id}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: input.decision }),
        });
      }
    },
    onSuccess: async () => {
      setMessage("Saved successfully.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/owner/face-attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/owner/attendance"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/owner/dashboard"] }),
      ]);
    },
  });
  return <section className="space-y-5 rounded-2xl border border-saivie-border bg-white p-5" aria-label="Face enrollment and attendance approvals">
    <header><h3 className="font-semibold text-saivie-plum">Face enrollment & attendance approvals</h3><p className="mt-1 text-sm text-muted-foreground">Owner-enrolled photos are processed locally. Only an encrypted face template is stored, not the photo. Browser matching has no liveness protection and is not tamper-proof.</p></header>
    {data.isPending && <p role="status">Loading enrollment and approval requests...</p>}
    {data.isError && <p role="alert" className="text-sm text-rose-700">{data.error.message} <Button variant="link" onClick={() => void data.refetch()}>Retry</Button></p>}
    {action.isError && <p role="alert" className="text-sm text-rose-700">{action.error.message}</p>}
    {message && <p role="status" className="text-sm text-saivie-teal">{message}</p>}
    {data.isSuccess && <>
      {!data.data.enabled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Face check-in is disabled. Your administrator must configure STAFF_FACE_ENCRYPTION_KEY and enable STAFF_FACE_ATTENDANCE_ENABLED before rollout. Regular clock-in remains available until then.</p>}
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); action.mutate({ type: "enroll", employeeId }); }}>
        <fieldset disabled={action.isPending} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="face-enrollment-staff">Receptionist</Label><select id="face-enrollment-staff" required className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setConsent(false); setPhoto(null); if (fileInput.current) fileInput.current.value = ""; }}>
              <option value="">Select a staff account</option>{data.data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}{employee.enrolled ? " (enrolled)" : ""}</option>)}
            </select></div>
            <div><Label htmlFor="face-enrollment-photo">Clear staff photo (JPG / PNG, up to 5 MB)</Label><Input ref={fileInput} id="face-enrollment-photo" type="file" accept="image/jpeg,image/png" required onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></div>
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I verified this person's identity and obtained their consent for biometric attendance. I understand the photo is processed locally and its encrypted face template is retained until I remove enrollment.</span></label>
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!employeeId || !photo || !consent}>{action.isPending ? "Processing..." : "Approve & enroll photo"}</Button>
            {data.data.employees.some((employee) => employee.id === employeeId && employee.enrolled) && <Button type="button" variant="outline" onClick={() => { if (window.confirm("Remove this staff member's stored face template? They can request manual attendance approval instead.")) action.mutate({ type: "revoke", employeeId }); }}>Remove enrollment</Button>}</div>
        </fieldset>
      </form>
      <section className="space-y-3 border-t pt-4" aria-label="Pending attendance approvals">
        <h4 className="font-semibold">Pending attendance approvals</h4>
        {!data.data.reviews.length && <p className="text-sm text-muted-foreground">No pending attendance requests.</p>}
        {data.data.reviews.map((review) => <article key={review.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          <div><p className="font-medium">{review.employeeName} · {review.date}</p><p className="mt-1 whitespace-pre-wrap text-sm">{review.reason}</p><p className="mt-1 text-xs text-muted-foreground">Requested: {new Date(review.requestedAt).toLocaleString("en-IN")}. Approval records this as the clock-in time.</p></div>
          <div className="flex gap-2"><Button disabled={action.isPending} onClick={() => action.mutate({ type: "review", id: review.id, decision: "approved" })}>Approve attendance</Button><Button variant="outline" disabled={action.isPending} onClick={() => action.mutate({ type: "review", id: review.id, decision: "rejected" })}>Reject</Button></div>
        </article>)}
      </section>
    </>}
  </section>;
}
