import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, CheckCircle2, Clock3, Loader2, LogOut, ScanFace, ShieldCheck } from "lucide-react";
import { z } from "zod/v4";
import { FACE_MODEL, FACE_MATCH_THRESHOLD, faceDescriptorSchema, faceDistance } from "../../../../lib/db/src/face-attendance";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { describeAttendanceFace } from "@/lib/faceAttendance";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { StaffProfileAvatar, useStaffProfile } from "./StaffProfilePhoto";
import { attendanceTimingLabel } from "../../../../lib/db/src/attendance-timing";

const faceStateSchema = z.object({
  enabled: z.boolean(),
  profile: z.object({ descriptor: faceDescriptorSchema, model: z.literal(FACE_MODEL), approvedAt: z.string() }).nullable(),
});

export function useAttendanceFaceState() {
  const token = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token");
  return useQuery({
    queryKey: ["/api/staff/face-attendance", token],
    queryFn: async () => faceStateSchema.parse(await readApiResponse(await authenticatedFetch("/api/staff/face-attendance"))),
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 30000,
  });
}

export function AttendanceCamera({ status, ready, clockIn, clockOut, lateMinutes, onClockOut, updating = false, attendanceError }: {
  status?: string | null;
  ready: boolean;
  clockIn?: string | null;
  clockOut?: string | null;
  lateMinutes?: number | null;
  onClockOut?: () => void;
  updating?: boolean;
  attendanceError?: string;
}) {
  const staffProfile = useStaffProfile();
  const queryClient = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const face = useAttendanceFaceState();
  const canVerify = ready && !clockIn && !!face.data?.enabled && !!face.data.profile && !["present", "pending_approval", "leave", "regular_day_off", "clinic_closed"].includes(status || "");
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/staff/attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/staff/face-attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/owner/attendance"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/staff/attendance-insights"] }),
    ]);
  };
  const stopCamera = () => {
    generation.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null); setCameraOpen(false); setVideoReady(false); setBusy(false);
  };
  useEffect(() => () => {
    generation.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => { if (video.current) video.current.srcObject = stream; }, [stream]);
  useEffect(() => { if (!canVerify) stopCamera(); }, [canVerify]);

  const startCamera = async () => {
    const attempt = ++generation.current;
    setError(""); setCameraOpen(true); setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access requires HTTPS and a supported browser. You can request owner approval instead.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      if (attempt !== generation.current) { media.getTracks().forEach((track) => track.stop()); return; }
      media.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
        if (attempt === generation.current) { stopCamera(); setError("Camera disconnected. Reopen it or request owner approval."); }
      }, { once: true }));
      streamRef.current = media;
      setStream(media); setBusy(false);
    } catch (cause) {
      if (attempt !== generation.current) return;
      stopCamera();
      setError(cause instanceof Error ? cause.message : "Camera access failed. Please request owner approval.");
    }
  };
  const checkIn = async () => {
    const attempt = generation.current;
    if (!video.current || !face.data?.profile) {
      setError("Camera preview or approved enrollment is unavailable. Reopen the camera or request owner approval.");
      return;
    }
    setBusy(true); setError("");
    try {
      const captured = await describeAttendanceFace(video.current);
      if (attempt !== generation.current) return;
      if (faceDistance(face.data.profile.descriptor, captured.descriptor) > FACE_MATCH_THRESHOLD) {
        throw new Error("Your face did not match the owner-enrolled photo. Try better lighting or request owner approval.");
      }
      await readApiResponse(await authenticatedFetch("/api/staff/face-attendance/check-in", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(captured),
      }));
      if (attempt === generation.current) stopCamera();
      await refresh();
    } catch (cause) {
      if (attempt === generation.current) { setError(cause instanceof Error ? cause.message : "Face check-in failed."); setBusy(false); }
    }
  };
  const request = useMutation({
    mutationFn: async () => readApiResponse(await authenticatedFetch("/api/staff/face-attendance/request-review", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
    })),
    onSuccess: async () => { setReason(""); setRequestOpen(false); setError(""); stopCamera(); await refresh(); },
    onError: (cause) => setError(cause.message),
  });
  const present = !!clockIn || status === "present";
  const finished = !!clockOut;
  const pending = status === "pending_approval";
  const closed = status === "clinic_closed";
  const off = closed || ["leave", "regular_day_off"].includes(status || "");
  const enabled = face.data?.enabled;
  const profileError = staffProfile.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Profile photo could not load: {staffProfile.error.message} <Button variant="link" onClick={() => void staffProfile.refetch()}>Retry photo</Button></p>;
  const faceFeedback = <>
    {face.isPending && <p role="status" className="mt-4 text-sm">Loading face check-in settings...</p>}
    {face.isError && <p role="alert" className="mt-4 text-sm text-rose-700">{face.error.message} <Button variant="link" onClick={() => void face.refetch()}>Retry</Button></p>}
  </>;
  if (present || finished) return <section className="relative isolate overflow-hidden rounded-[28px] border border-saivie-border bg-gradient-to-br from-[#edf8f5] via-white to-[#f1faf8] px-5 py-7 shadow-sm sm:px-8 lg:py-9" aria-label="Camera attendance check-in">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-20 -top-28 h-60 w-96 -rotate-12 rounded-[50%] bg-[#cceee5]/45" />
      <div className="absolute -right-28 -top-40 h-64 w-64 rounded-full bg-[#cceee5]/50" />
      <div className="absolute -bottom-36 -left-20 h-52 w-96 rotate-12 rounded-[50%] bg-[#cceee5]/50" />
      <div className="absolute -bottom-36 -right-20 h-52 w-80 -rotate-12 rounded-[50%] bg-[#cceee5]/50" />
    </div>
    <div className="grid items-center justify-items-center gap-6 lg:grid-cols-[144px_minmax(0,1fr)_176px] lg:gap-7">
      <div className="relative">
        <StaffProfileAvatar name={staffProfile.data?.name || "Staff"} photo={staffProfile.data?.photo} className="h-36 w-36 border-4 border-white shadow-[0_0_0_2px_#dcece7]" />
        <span className="absolute bottom-1 right-0 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#50c5aa] text-white shadow-sm" aria-label={finished ? "Checked out" : "Checked in"}><Check className="h-6 w-6" strokeWidth={2.5} /></span>
      </div>
      <div className="flex min-w-0 flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-saivie-plum/70 text-saivie-teal"><Check className="h-8 w-8" strokeWidth={2} /></div>
        <h3 className="mt-4 font-sans text-2xl font-bold tracking-tight text-saivie-plum sm:text-3xl">{finished ? "You are checked out!" : "You are checked in!"}</h3>
        <p className="mt-2 text-sm text-saivie-plum/80 sm:text-base">{finished ? "Your clock-out has been recorded for today." : "Your attendance has been recorded for today."}</p>
        {clockIn && <p className={`mt-2 text-sm ${lateMinutes && lateMinutes > 0 ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>{attendanceTimingLabel(lateMinutes)}</p>}
        <div className="mt-4 flex max-w-full items-center gap-2 rounded-full bg-[#e2f4ee] px-4 py-2 text-xs text-saivie-plum">
          <ShieldCheck className="h-4 w-4 shrink-0 text-saivie-teal" />
          <span>{finished ? "Shift completed" : "Attendance saved"}{!finished && " · Clock out when your shift ends"}</span>
        </div>
        {clockIn && !clockOut && onClockOut && <Button className="mt-5 h-12 w-full max-w-60 rounded-full bg-saivie-teal px-7 text-base text-white shadow-sm hover:bg-saivie-teal/90" disabled={!ready || updating} onClick={onClockOut}>
          {updating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}{updating ? "Recording clock-out..." : "Clock Out"}
        </Button>}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 lg:max-w-none lg:border-l lg:border-saivie-border lg:pl-5">
        {[{ label: "Check-in Time", value: clockIn }, { label: "Check-out Time", value: clockOut }].map(({ label, value }) => value && <div key={label} className="rounded-[22px] bg-[#def4ee]/85 px-4 py-4 text-center lg:text-left">
          <p className="flex items-center justify-center gap-2 text-sm text-saivie-plum lg:justify-start"><Clock3 className="h-4 w-4 shrink-0 text-saivie-teal" />{label}</p>
          <p className="mt-2 whitespace-nowrap text-2xl font-bold text-saivie-plum">{new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>
          <p className="mt-1 text-sm text-saivie-plum/75">{new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" })}</p>
        </div>)}
      </div>
    </div>
    <div className="text-center">
      {profileError}
      {attendanceError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{attendanceError}</p>}
      {faceFeedback}
    </div>
  </section>;
  return <section className="rounded-[28px] border border-saivie-border bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-10" aria-label="Camera attendance check-in">
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      {cameraOpen ? <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-saivie-plum">
        <video ref={video} autoPlay playsInline muted onLoadedData={() => setVideoReady(true)} onError={() => { stopCamera(); setError("Camera preview failed. Reopen it or request owner approval."); }} className="aspect-[4/3] w-full -scale-x-100 object-cover" aria-label="Live camera preview" />
        <div className="pointer-events-none absolute inset-6 rounded-[40%] border-2 border-white/80" />
      </div> : staffProfile.data?.photo ? <StaffProfileAvatar name={staffProfile.data.name} photo={staffProfile.data.photo} className="h-36 w-36 border-4 border-saivie-sage sm:h-44 sm:w-44" /> : <div className="flex h-36 w-36 items-center justify-center rounded-full bg-saivie-sage/45 text-saivie-teal sm:h-44 sm:w-44">
        {present ? <CheckCircle2 className="h-20 w-20" strokeWidth={1.3} /> : <ScanFace className="h-24 w-24" strokeWidth={1.1} />}
      </div>}
      <h3 className="mt-6 font-serif text-3xl font-bold text-saivie-plum sm:text-4xl">{finished ? "You are checked out!" : present ? "You are checked in!" : closed ? "Clinic closed today" : pending ? "Awaiting owner approval" : staffProfile.data?.name ? `Welcome, ${staffProfile.data.name}!` : "Welcome!"}</h3>
      {profileError}
      <p className="mt-3 text-base text-muted-foreground sm:text-lg">{finished ? "Your clock-out has been recorded for today." : present ? "Your attendance has been recorded for today." : closed ? "No check-in is required. This is not counted as leave or absence." : pending ? "Your request is saved. You will be marked present only after the owner approves it." : off ? "Today is marked as leave or a regular day off." : "Look at the camera to check in for today."}</p>
      {attendanceError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{attendanceError}</p>}
      {faceFeedback}
      {!present && !pending && !off && face.isSuccess && !enabled && <p className="mt-4 text-sm text-amber-800">Face check-in is not enabled yet. Use regular clock-in in the weekly section below.</p>}
      {!present && !pending && !off && enabled && !face.data?.profile && <p className="mt-4 text-sm text-amber-800">Ask the owner to enroll your photo first. You can request attendance approval below.</p>}
      {!present && !pending && !off && enabled && face.data?.profile && !cameraOpen && <label className="mt-5 flex items-start gap-2 text-left text-sm text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
        <span>I agree to use my camera for face matching. Camera images stay on this device; a face template is sent securely to the clinic for the attendance comparison.</span>
      </label>}
      {!present && !pending && !off && enabled && face.data?.profile && <div className="mt-6 flex w-full flex-wrap justify-center gap-3">
        {cameraOpen ? <>
          <Button className="h-12 rounded-full px-8" disabled={busy || !videoReady} onClick={() => void checkIn()}>{busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}{busy ? "Comparing face..." : "Verify & check in"}</Button>
          <Button variant="outline" className="h-12 rounded-full" onClick={stopCamera}>Cancel camera</Button>
        </> : <Button className="h-14 w-full max-w-sm rounded-full text-lg" disabled={!consent || !ready} onClick={() => void startCamera()}><Camera className="mr-3 h-6 w-6" />Check In</Button>}
      </div>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!present && !pending && !off && <Button variant="link" className="mt-3" disabled={!ready || busy || request.isPending} onClick={() => { stopCamera(); setRequestOpen(!requestOpen); }}>Unable to verify? Request owner approval</Button>}
      {requestOpen && !present && !pending && !off && <form className="mt-3 w-full space-y-3 text-left" onSubmit={(event) => { event.preventDefault(); request.mutate(); }}>
        <Label htmlFor="attendance-exception">Reason for manual attendance approval</Label>
        <Textarea id="attendance-exception" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder="For example: camera permission is blocked on this device" />
        <p className="text-xs text-muted-foreground">The server records your request time. Approval uses that time as your clock-in time.</p>
        <Button type="submit" disabled={request.isPending}>{request.isPending ? "Submitting..." : "Submit for owner approval"}</Button>
      </form>}
    </div>
    <div className="mt-7 flex items-start justify-center gap-3 border-t border-saivie-border pt-5 text-sm text-muted-foreground">
      <ShieldCheck className="h-5 w-5 shrink-0 text-saivie-teal" />
      <p>Face matching runs on your device. It is not a liveness check and cannot prevent photo or modified-browser spoofing.</p>
    </div>
  </section>;
}
