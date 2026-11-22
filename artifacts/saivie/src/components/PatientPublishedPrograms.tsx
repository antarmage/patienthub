import React from "react";
import type { Program } from "../../../../lib/db/src/patient-programs";

export interface PatientProgramsState {
  programs: Program[] | undefined;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

export default function PatientPublishedPrograms({ category, state }: {
  category: "nutrition" | "exercise";
  state?: PatientProgramsState;
}) {
  if (!state) return null;
  const programs = (state.programs || []).filter((program) => program.category === category && program.tier === "free" && program.status === "published");
  return (
    <section className="space-y-3 rounded-[28px] bg-white p-[22px]">
      <h2 className="font-serif text-[26px] font-bold leading-tight">Free programs</h2>
      {state.loading ? <p role="status" className="text-sm">Loading programs...</p>
        : state.error ? <p role="alert" className="text-sm">Unable to load programs. <button type="button" className="font-bold underline" onClick={state.retry}>Retry</button></p>
        : programs.length === 0 ? <p className="text-sm text-[#5A4552]">No published programs are available here yet.</p>
        : programs.map((program) => <article key={program.id} className="space-y-3 rounded-[20px] border border-[#F0DCC4] p-4">
          <h3 className="font-serif text-xl font-bold">{program.title}</h3>
          {program.description && <p className="whitespace-pre-wrap text-sm leading-relaxed">{program.description}</p>}
          <ol className="list-decimal space-y-3 pl-5">
            {program.sessions.map((session, index) => <li key={index}><h4 className="font-bold">{session.title}</h4><p className="whitespace-pre-wrap text-sm leading-relaxed">{session.content}</p></li>)}
          </ol>
        </article>)}
    </section>
  );
}
