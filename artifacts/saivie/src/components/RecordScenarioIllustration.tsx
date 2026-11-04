import { useId } from "react";

const scenarios = {
  labs: "lab results",
  scans: "scan reports",
  visits: "visit history",
  vitals: "vital signs",
  diagnoses: "diagnoses",
  allergies: "allergy information",
  notes: "clinical notes",
  documents: "documents",
  deliveries: "delivery and baby records",
};

export type RecordScenario = keyof typeof scenarios;

export function EmptyCradleIllustration({ decorative = false }: { decorative?: boolean }) {
  const id = useId();
  return <svg viewBox="0 0 170 150" width="100%" className="block h-auto w-full max-w-[170px]" xmlns="http://www.w3.org/2000/svg"
    role={decorative ? undefined : "img"} aria-hidden={decorative ? true : undefined}
    aria-labelledby={decorative ? undefined : `${id}-cradle-title`} focusable="false" data-illustration-part="empty-cradle">
    {!decorative && <title id={`${id}-cradle-title`}>Empty cradle drawn with a dashed outline</title>}
    <path d="M20 66 C20 32 62 22 86 32 L86 66 Z" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" fill="#fff" />
    <path d="M20 66 H150 C150 106 118 126 85 126 C52 126 20 106 20 66 Z" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" fill="#fff" />
    <path d="M30 134 Q85 150 140 134" fill="none" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
    <path d="M40 84 H130 M46 98 H124" stroke="#BFD3CB" strokeWidth="2" strokeLinecap="round" />
    <circle cx="128" cy="30" r="16" fill="#fff" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="4 3" />
    <path d="M128 22 V38 M120 30 H136" stroke="#2D6A5F" strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}

export function RecordScenarioIllustration({ scenario, pregnancy = false, decorative = false, className = "" }: {
  scenario: RecordScenario;
  pregnancy?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="30 40 300 330"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={`mx-auto block h-auto w-full max-w-44 ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : `${id}-title ${id}-desc`}
      focusable="false"
      data-records-scenario={scenario}
      data-patient-context={pregnancy ? "pregnancy" : "general"}
    >
      {!decorative && <>
        <title id={`${id}-title`}>No {scenarios[scenario]} recorded</title>
        <desc id={`${id}-desc`}>A {pregnancy ? "pregnant woman" : "woman"} beside a dashed-outline symbol for {scenarios[scenario]}. Missing records do not indicate normal findings.</desc>
      </>}
      <circle cx="180" cy="195" r="145" fill="#E3EFEA" />
      <ellipse cx="180" cy="352" rx="92" ry="7" fill="#CFE0D8" />
      <circle cx="90" cy="112" r="3" fill="#9FB8AE" />
      <circle cx="264" cy="67" r="3" fill="#9FB8AE" />
      <circle cx="284" cy="110" r="20" fill="#fff" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
      <path d="M284 99 V121 M273 110 H295" fill="none" stroke="#2D6A5F" strokeWidth="2" strokeLinecap="round" />
      {pregnancy ? <g data-illustration-part="woman">
        <rect x="161" y="296" width="13" height="50" rx="6" fill="#C98F6B" />
        <rect x="188" y="296" width="13" height="50" rx="6" fill="#C98F6B" />
        <ellipse cx="164" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <ellipse cx="200" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <path d="M152 142 Q180 133 208 142 L215 192 C238 218 240 264 221 292 L228 310 L132 310 L139 292 C120 264 122 218 145 192 Z" fill="#2D6A5F" />
        <ellipse cx="181" cy="244" rx="30" ry="36" fill="#3F7F72" />
        <rect x="174" y="118" width="13" height="26" rx="6" fill="#C98F6B" />
        <path d="M166 142 L180 164 L194 142 Z" fill="#C98F6B" />
        <ellipse cx="180" cy="100" rx="22" ry="26" fill="#C98F6B" />
        <path d="M156 100 C150 66 210 66 204 100 C198 84 162 84 156 100 Z" fill="#2B2220" />
        <circle cx="180" cy="70" r="13" fill="#2B2220" />
        <path d="M170 101 Q173 98 176 101 M184 101 Q187 98 190 101" stroke="#2B2220" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M172 113 Q180 119 188 113" stroke="#8A4B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M150 150 Q124 192 160 240" stroke="#C98F6B" strokeWidth="14" fill="none" strokeLinecap="round" />
        <circle cx="164" cy="242" r="8" fill="#C98F6B" />
        <path d="M210 150 Q246 190 238 222" stroke="#C98F6B" strokeWidth="14" fill="none" strokeLinecap="round" />
      </g> : <g transform="translate(24 0)" data-illustration-part="woman">
        <rect x="139" y="298" width="12" height="48" rx="6" fill="#D9A27E" />
        <rect x="161" y="298" width="12" height="48" rx="6" fill="#D9A27E" />
        <ellipse cx="143" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <ellipse cx="169" cy="348" rx="14" ry="6" fill="#1F4A42" />
        <path d="M124 196 C122 232 112 282 106 306 L206 306 C200 282 190 232 188 196 Z" fill="#2D6A5F" />
        <path d="M128 146 Q156 138 184 146 L190 200 L122 200 Z" fill="#F2E6CF" />
        <rect x="122" y="196" width="68" height="7" rx="3" fill="#1F4A42" />
        <rect x="150" y="122" width="12" height="26" rx="6" fill="#D9A27E" />
        <path d="M146 144 L156 160 L166 144 Z" fill="#D9A27E" />
        <path d="M132 100 C126 56 186 56 180 100 L186 168 C176 158 174 136 174 112 L138 112 C138 136 136 158 126 168 Z" fill="#3A2A24" />
        <ellipse cx="156" cy="102" rx="21" ry="25" fill="#D9A27E" />
        <path d="M135 98 C140 74 172 74 177 98 C166 86 146 86 135 98 Z" fill="#3A2A24" />
        <path d="M146 104 Q149 101 152 104 M160 104 Q163 101 166 104" stroke="#2B2220" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M148 115 Q156 121 164 115" stroke="#8A4B3A" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M130 152 Q114 192 124 226" stroke="#D9A27E" strokeWidth="13" fill="none" strokeLinecap="round" />
        <circle cx="124" cy="228" r="7" fill="#D9A27E" />
        <path d="M182 152 Q206 180 196 208" stroke="#D9A27E" strokeWidth="13" fill="none" strokeLinecap="round" />
      </g>}
      <g transform={pregnancy ? "translate(238 218)" : "translate(220 210)"} stroke="#2D6A5F" strokeWidth="2" fill="#fff" data-illustration-part={scenario}>
        {scenario === "labs" && <>
          <rect x="-7" y="-46" width="14" height="44" rx="7" strokeDasharray="5 4" />
          <path d="M-7 -38 H7" />
          <rect x="9" y="-44" width="14" height="42" rx="7" strokeDasharray="5 4" transform="rotate(16 16 -2)" />
        </>}
        {scenario === "scans" && <>
          <rect x="-22" y="-54" width="44" height="52" rx="4" strokeDasharray="5 4" />
          <path d="M0 -46 L-15 -16 A28 28 0 0 0 15 -16 Z" fill="none" strokeDasharray="4 3" />
        </>}
        {scenario === "visits" && <>
          <rect x="-22" y="-52" width="44" height="50" rx="4" strokeDasharray="5 4" />
          <rect x="-9" y="-57" width="18" height="9" rx="3" fill="#B9D6CB" />
          <path d="M-12 -32 H12 M-12 -22 H12 M-12 -12 H4" stroke="#9FB8AE" strokeLinecap="round" />
        </>}
        {scenario === "vitals" && <>
          <circle cy="-28" r="22" strokeDasharray="5 4" />
          <path d="M0 -28 L11 -40" strokeWidth="3" strokeLinecap="round" />
          <path d="M-12 -14 H12" stroke="#9FB8AE" />
        </>}
        {scenario === "diagnoses" && <>
          <path d="M-16 -54 V-32 A16 16 0 0 0 16 -32 V-54" fill="none" strokeWidth="2.5" strokeDasharray="5 4" />
          <circle cy="-10" r="8" strokeDasharray="5 4" />
        </>}
        {scenario === "allergies" && <>
          <path d="M0 -54 L21 -46 V-28 Q20 -10 0 -2 Q-20 -10 -21 -28 V-46 Z" strokeDasharray="5 4" />
          <path d="M0 -41 V-17 M-12 -29 H12" stroke="#9FB8AE" strokeLinecap="round" />
        </>}
        {scenario === "notes" && <>
          <rect x="-18" y="-52" width="36" height="48" rx="4" strokeDasharray="5 4" />
          <path d="M-10 -38 H10 M-10 -28 H10 M-10 -18 H2" stroke="#9FB8AE" strokeLinecap="round" />
          <path d="M14 -20 L26 -44" stroke="#B45309" strokeWidth="4" strokeLinecap="round" />
        </>}
        {scenario === "documents" && <>
          <path d="M-24 -44 h18 l6 7 h30 v38 h-54 z" strokeDasharray="5 4" />
          <path d="M-12 -22 H12" stroke="#9FB8AE" strokeLinecap="round" />
        </>}
      </g>
      {pregnancy ? <circle cx="238" cy="226" r="8" fill="#C98F6B" /> : <circle cx="220" cy="214" r="7" fill="#D9A27E" />}
    </svg>
  );
}
