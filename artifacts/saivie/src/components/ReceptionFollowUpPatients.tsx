import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receptionRequest } from "@/lib/authenticatedFetch";

export type ReceptionCallPatient = { patientId: number; name: string; phone: string | null; lastVisit: string | null; pregnant: boolean };
type PatientLists = { startDate: string; endDate: string; recent: ReceptionCallPatient[]; pregnant: ReceptionCallPatient[] };

export function ReceptionFollowUpPatients({ onLogCall }: { onLogCall(patient: ReceptionCallPatient): void }) {
  const [list, setList] = useState<"recent" | "pregnant">("recent");
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["/api/reception/follow-up-patients"],
    queryFn: () => receptionRequest<PatientLists>("/api/reception/follow-up-patients"),
    refetchInterval: 60_000,
  });
  const rows = (query.data?.[list] || []).filter((patient) => `${patient.name} ${patient.phone || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="space-y-4" data-testid="reception-follow-up-patients">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-serif text-2xl text-saivie-plum">Patient follow-up calls</h2><p className="mt-1 text-sm text-muted-foreground">Recent visitors and currently pregnant patients, including those without a scheduled call.</p></div>
      <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh patients</Button>
    </div>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Follow-up patient lists">
      <Button role="tab" aria-selected={list === "recent"} variant={list === "recent" ? "default" : "outline"} onClick={() => setList("recent")}>Visited in past 14 days{query.data ? ` (${query.data.recent.length})` : ""}</Button>
      <Button role="tab" aria-selected={list === "pregnant"} variant={list === "pregnant" ? "default" : "outline"} onClick={() => setList("pregnant")}>Pregnant patients{query.data ? ` (${query.data.pregnant.length})` : ""}</Button>
    </div>
    {list === "recent" && query.data && <p className="text-xs text-muted-foreground">{query.data.startDate} to {query.data.endDate} · India time · Latest recorded visit per patient</p>}
    <input aria-label="Search follow-up patients" placeholder="Search name or phone" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-saivie-border bg-white p-3 text-sm sm:max-w-sm" />
    {query.isPending && <p role="status">Loading patients...</p>}
    {query.isError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{query.error.message} Use Refresh patients to retry.</p>}
    {!query.isPending && !query.isError && <div className="divide-y rounded-xl border border-saivie-border bg-white" role="tabpanel">
      {rows.map((patient) => <div key={patient.patientId} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0"><p className="break-words font-medium text-saivie-plum">{patient.name}</p><p className="mt-1 text-xs text-muted-foreground">{patient.phone || "Phone not recorded"} · Last visit: {patient.lastVisit || "Not recorded"}</p>{patient.pregnant && <p className="mt-1 text-xs text-saivie-teal">Currently pregnant</p>}</div>
        <div className="flex shrink-0 gap-2">{patient.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`}><Phone className="mr-1 h-3 w-3" />Call</a></Button>}<Button variant="outline" size="sm" onClick={() => onLogCall(patient)}>Log call</Button></div>
      </div>)}
      {!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">{search ? "No patients match your search." : list === "recent" ? "No recorded visits in the past 14 days." : "No patients are currently recorded as pregnant."}</p>}
    </div>}
  </section>;
}
