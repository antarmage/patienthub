import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, FileText, LockKeyhole, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadPatientConsultation } from "@/lib/onlineConsultation";
import { useToast } from "@/hooks/use-toast";

export default function OnlineConsultation() {
  const [access, setAccess] = useState(() => ({ token: window.location.hash.slice(1), version: 0 }));
  useEffect(() => {
    const changed = () => setAccess((current) => ({ token: window.location.hash.slice(1), version: current.version + 1 }));
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const token = access.token;
  const [downloading, setDownloading] = useState<number | null>(null);
  const { toast } = useToast();
  const page = useQuery({
    queryKey: ["private-online-consultation", access.version],
    queryFn: ({ signal }) => loadPatientConsultation(token, signal),
    gcTime: 0, staleTime: 0, retry: false, refetchInterval: 30000,
  });
  async function download(id: number) {
    setDownloading(id);
    try {
      const response = await fetch(`/api/online/patient/reports/${id}/file`, { headers: { "X-Consultation-Token": token }, credentials: "omit", cache: "no-store" });
      const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
      if (!response.ok || !["application/pdf", "image/jpeg", "image/png", "image/webp", "application/octet-stream"].includes(mime)) throw new Error("Could not download the shared report. The link may have expired or sharing may have been withdrawn.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = `report-${id}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast({ title: "Report unavailable", description: error instanceof Error ? error.message : "Download failed.", variant: "destructive" });
    } finally { setDownloading(null); }
  }
  const data = !page.isError ? page.data : undefined;
  return <main className="min-h-screen bg-[#f2f6f5] p-4 text-saivie-plum sm:p-8" data-testid="patient-online-consultation">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#305b50] p-5 text-white"><h1 className="font-serif text-2xl">Saivie · Your online consultation</h1><p className="flex items-center gap-2 text-xs"><LockKeyhole className="h-4 w-4" />Private patient page</p></header>
      {page.isPending && <p role="status" className="rounded-2xl bg-white p-6">Loading your appointment...</p>}
      {page.isError && <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6"><h2 className="font-medium">Consultation page unavailable</h2><p className="my-3 text-sm">{page.error.message}</p><Button variant="outline" onClick={() => void page.refetch()}>Retry</Button></div>}
      {data && <>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl bg-[#243c36] p-8 text-center text-white">
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/10"><Video className="h-9 w-9" /></span>
            <h2 className="font-serif text-2xl">Meet your doctor online</h2><p className="my-4 max-w-md text-sm text-white/80">Your call opens securely in Google Meet in a new tab. Keep this page open for your clinic's shared prescriptions and reports.</p>
            <Button asChild className="rounded-full bg-white text-saivie-teal hover:bg-white/90"><a href={data.appointment.meetingUrl!} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><Video className="mr-2 h-4 w-4" />Join Google Meet<ExternalLink className="ml-2 h-3 w-3" /></a></Button>
            <p className="mt-4 text-xs text-white/60">{data.appointment.status === "completed" ? "This appointment is marked completed. Contact your clinic before rejoining." : "Join at your appointment time. Your doctor may need to admit you."}</p>
          </section>
          <aside className="space-y-4">
            <section className="break-words rounded-2xl border border-saivie-border bg-white p-5"><p className="text-xs text-muted-foreground">Your doctor</p><h2 className="mt-2 font-serif text-xl">{data.doctor.name}</h2><p className="mt-1 text-sm text-saivie-teal">{data.doctor.specialty}</p><p className="mt-4 text-sm">{data.doctor.clinicName}</p></section>
            <section className="space-y-3 rounded-2xl border border-saivie-border bg-white p-5"><h2 className="font-medium">Appointment details</h2><p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-saivie-teal" />{data.appointment.date}</p><p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-saivie-teal" />{data.appointment.time} · India time{data.appointment.duration ? ` · ${data.appointment.duration} min` : ""}</p><p className="text-sm">Status: {data.appointment.status || "Scheduled"}</p></section>
            <p className="px-1 text-xs text-muted-foreground">Anyone with this private link can view the shared records. Do not forward it. Page access ends {new Date(data.expiresAt).toLocaleDateString("en-IN")}.</p>
          </aside>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-saivie-border bg-white p-5"><h2 className="mb-4 font-serif text-xl">Shared prescriptions</h2>
            {!data.prescriptions.length && <p className="text-sm text-muted-foreground">Your doctor has not shared a prescription for this appointment yet.</p>}
            {data.prescriptions.map((prescription) => <article key={prescription.id} className="space-y-3 border-t py-4 text-sm"><h3 className="font-medium">{prescription.date}</h3>{prescription.medicines.map((medicine, i) => <dl key={i} className="grid grid-cols-2 gap-2 rounded-lg bg-saivie-teal/5 p-3">{Object.entries(medicine).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs capitalize text-muted-foreground">{key}</dt><dd className="break-words">{value}</dd></div>)}</dl>)}{prescription.advice && <p className="whitespace-pre-wrap break-words">Advice: {prescription.advice}</p>}{prescription.followUp && <p className="whitespace-pre-wrap break-words">Follow-up: {prescription.followUp}</p>}</article>)}
          </section>
          <section className="min-w-0 rounded-2xl border border-saivie-border bg-white p-5"><h2 className="mb-4 font-serif text-xl">Shared reports</h2>
            {!data.reports.length && <p className="text-sm text-muted-foreground">No reports have been shared for this appointment.</p>}
            {data.reports.map((report) => <article key={report.id} className="space-y-2 border-t py-4 text-sm"><h3 className="flex items-center gap-2 font-medium"><FileText className="h-4 w-4 shrink-0 text-saivie-teal" /><span className="min-w-0 break-words">{report.name}</span></h3><p className="text-xs text-muted-foreground">{report.date}</p>{report.description && <p className="whitespace-pre-wrap break-words">{report.description}</p>}{report.hasFile && <Button variant="outline" size="sm" disabled={downloading !== null} onClick={() => void download(report.id)}>{downloading === report.id ? "Downloading..." : "Download report"}</Button>}</article>)}
          </section>
        </div>
      </>}
    </div>
  </main>;
}
