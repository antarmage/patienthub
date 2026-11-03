import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordScenarioIllustration } from "@/components/RecordScenarioIllustration";
import type { DiagnosisEncounter, IcdCatalogEntry, IcdDiagnosis } from "../../../../lib/db/src/icd";

export async function clinicalRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem("billing_staff_token");
  if (!token) throw new Error("Please log in again to access doctor-confirmed diagnoses.");
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function usePatientDiagnoses(patientId: number | null) {
  return useQuery<DiagnosisEncounter[]>({
    queryKey: ["confirmed-diagnoses", patientId],
    enabled: patientId != null,
    queryFn: () => clinicalRequest(`/api/patients/${patientId}/diagnoses`),
  });
}

export function IcdDiagnosisEditor({ items, onChange, loading, error, retry }: {
  items: IcdDiagnosis[];
  onChange: (items: IcdDiagnosis[]) => void;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const results = useQuery<IcdCatalogEntry[]>({
    queryKey: ["icd10-search", query],
    enabled: query.length >= 2 && !error && !loading,
    queryFn: () => clinicalRequest(`/api/icd10/search?q=${encodeURIComponent(query)}`),
    staleTime: 60_000,
  });
  const disabled = loading || !!error;
  return <section className="space-y-3 rounded-xl border border-saivie-border bg-[#edf5ee] p-4">
    <h3 className="font-semibold text-saivie-teal">Diagnoses · WHO ICD-10</h3>
    <p className="text-xs text-saivie-plum">Search the local 2019 English catalog. Choose a primary diagnosis, then confirm with Save consultation. Free-text assessment is preserved.</p>
    {loading && <p role="status" className="text-sm">Loading saved diagnoses...</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{error} <Button size="sm" variant="outline" onClick={retry}>Retry</Button></p>}
    <Input aria-label="Search ICD-10 diagnoses" placeholder="Code or diagnosis (at least 2 characters)" value={search} maxLength={120} disabled={disabled} onChange={(event) => setSearch(event.target.value)} />
    {results.isFetching && <p role="status" className="text-xs">Searching local catalog...</p>}
    {results.isError && <p role="alert" className="text-sm text-rose-700">{results.error.message} <Button size="sm" variant="outline" onClick={() => void results.refetch()}>Retry</Button></p>}
    {query === search.trim() && query.length >= 2 && !results.isFetching && !results.isError && results.data?.length === 0 && <p className="text-sm">No matching codes. Try another term.</p>}
    {query === search.trim() && results.data && <ul className="max-h-56 overflow-y-auto rounded-lg border border-saivie-border bg-white">
      {results.data.map((item) => <li key={item.code}>
        <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 disabled:opacity-50" disabled={disabled || items.some((selected) => selected.code === item.code) || items.length >= 20} onClick={() => {
          onChange([...items, { code: item.code, title: item.title, release: item.release, system: "WHO ICD-10", primary: items.length === 0 }]);
          setSearch("");
          setQuery("");
        }}><strong>{item.code}</strong> - {item.title}{!item.leaf && <span className="ml-2 text-xs text-saivie-plum">(category; consider a more specific code)</span>}</button>
      </li>)}
    </ul>}
    <ul className="space-y-2">{items.map((item) => <li key={item.code} className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2 text-sm">
      <label className="flex items-center gap-1"><input type="radio" name="primary-icd-diagnosis" aria-label={`Primary diagnosis ${item.code}`} checked={item.primary} disabled={disabled} onChange={() => onChange(items.map((entry) => ({ ...entry, primary: entry.code === item.code })))} />Primary</label>
      <span className="min-w-0 flex-1"><strong>{item.code}</strong> - {item.title}</span>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={() => {
        const remaining = items.filter((entry) => entry.code !== item.code);
        onChange(remaining.map((entry, index) => ({ ...entry, primary: item.primary ? index === 0 : entry.primary })));
      }}>Remove</Button>
    </li>)}</ul>
    {!items.length && <p className="text-xs text-saivie-plum">No coded diagnoses selected.</p>}
  </section>;
}

export function DiagnosisHistory({ patientId, pregnancy = false }: { patientId: number; pregnancy?: boolean }) {
  const query = usePatientDiagnoses(patientId);
  return <section className="m-3 space-y-2 rounded-xl border border-saivie-border bg-white p-4">
    <h3 className="font-semibold text-saivie-teal">Doctor-confirmed diagnosis history</h3>
    {query.isLoading && <p role="status">Loading diagnoses...</p>}
    {query.isError && <p role="alert" className="text-sm text-rose-700">{query.error.message} <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Retry</Button></p>}
    {query.data?.filter((encounter) => encounter.diagnoses.length).map((encounter) => <div key={encounter.id} className="border-t border-saivie-border pt-2 text-sm">
      <p className="text-xs text-saivie-plum">{new Date(encounter.confirmedAt).toLocaleString()} · {encounter.appointmentId ? `Appointment ${encounter.appointmentId}` : `Visit ${encounter.visitId}`}</p>
      {encounter.diagnoses.map((item) => <p key={item.code}><strong>{item.code}</strong> - {item.title} <span className="text-xs text-saivie-plum">({item.primary ? "Primary" : "Secondary"} · {item.system} {item.release})</span></p>)}
    </div>)}
    {query.isSuccess && !query.data.some((encounter) => encounter.diagnoses.length) && <>
      <RecordScenarioIllustration scenario="diagnoses" pregnancy={pregnancy} decorative />
      <p className="text-sm text-saivie-plum">No coded diagnoses recorded. Existing free-text visit history is unchanged.</p>
    </>}
  </section>;
}
