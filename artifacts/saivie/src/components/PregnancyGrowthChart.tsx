import React from "react";
import { pregnancyGrowthData } from "@/lib/pregnancyGrowthData";

function GrowthPlot({ currentWeek }: { currentWeek: number | null }) {
  const maximum = 4000;
  const x = (week: number) => 38 + (week - 8) * (302 / 35);
  const y = (value: number) => 135 - value * (115 / maximum);
  const selected = pregnancyGrowthData.find((row) => row.week === currentWeek);
  const points = pregnancyGrowthData.map((row) => `${x(row.week)},${y(row.massG)}`).join(" ");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Weight as supplied (g)</h3>
        {selected && <p className="text-sm font-bold">Week {selected.week}: {selected.massG} g</p>}
      </div>
      <svg viewBox="0 0 350 165" role="img" aria-label={`Weight as supplied in grams from week 8 to week 43${selected ? `; week ${selected.week}: ${selected.massG} g` : ""}. Values are unvalidated, not the baby's measurements.`} className="mt-2 block h-auto w-full">
        {[0, maximum / 2, maximum].map((value) => (
          <g key={value}>
            <line x1="38" y1={y(value)} x2="340" y2={y(value)} stroke="#E6D3BD" strokeWidth="1" />
            <text x="33" y={y(value) + 3} textAnchor="end" fontSize="9" fill="#5A4552">{value}</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="#2A1220" strokeWidth="2.5" strokeLinejoin="round" />
        {selected && (
          <g>
            <line x1={x(selected.week)} y1="20" x2={x(selected.week)} y2="135" stroke="#2A1220" strokeWidth="1" strokeDasharray="3 4" />
            <circle cx={x(selected.week)} cy={y(selected.massG)} r="5" fill="#FFF4EE" stroke="#2A1220" strokeWidth="2" />
          </g>
        )}
        {[8, 15, 20, 25, 30, 35, 40, 43].map((week) => (
          <text key={week} x={x(week)} y="151" textAnchor="middle" fontSize="9" fill="#5A4552">{week}</text>
        ))}
        <text x="189" y="163" textAnchor="middle" fontSize="9" fill="#5A4552">Gestational age (weeks)</text>
      </svg>
    </div>
  );
}

export default function PregnancyGrowthChart({ currentWeek }: { currentWeek: number | null }) {
  const selected = pregnancyGrowthData.some((row) => row.week === currentWeek);
  return (
    <section className="min-w-0 flex-[1_1_640px] rounded-[32px] border border-[#F0DCC4] bg-white p-6 md:p-8">
      <h2 className="font-serif text-[30px] font-bold leading-[1.1]">Baby&apos;s growth</h2>
      <p className="mt-2 text-[15px] leading-[1.5] text-[#5A4552]">
        Unvalidated illustrative values, not your baby&apos;s measurements or a clinical reference.
      </p>
      {!selected && <p className="mt-3 text-sm text-[#5A4552]">{currentWeek === null ? "Pregnancy week is not available." : "This week is outside the supplied data."}</p>}
      <div className="mt-5">
        <GrowthPlot currentWeek={currentWeek} />
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-bold underline underline-offset-4">View all supplied values</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Unvalidated supplied weight by gestational week</caption>
            <thead><tr className="border-b border-[#F0DCC4]"><th scope="col" className="py-2">Week</th><th scope="col">Weight (g)</th></tr></thead>
            <tbody>{pregnancyGrowthData.map((row) => (
              <tr key={row.week} className="border-b border-[#F0DCC4]"><th scope="row" className="py-2 font-normal">{row.week}</th><td>{row.massG}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
