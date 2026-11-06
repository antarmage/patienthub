import React, { useId } from "react";
import { IllustrationAction } from "./RecordScenarioIllustration";

export function PregnancyMedicationIllustration({ onAdd }: { onAdd?: () => void }) {
  const id = useId();
  return <IllustrationAction onAdd={onAdd} label="Add current medicine" className="max-w-[220px]" x={80} y={112 / 380 * 100}><svg viewBox="0 0 360 380" width="100%" role="img"
    aria-labelledby={`${id}-title ${id}-desc`} xmlns="http://www.w3.org/2000/svg"
    className="mx-auto block h-auto w-full max-w-[220px]">
    <title id={`${id}-title`}>Clinician holding a medicine bottle</title>
    <desc id={`${id}-desc`}>A calm clinician stands beside an unfilled medicine bottle and capsule, with a small medical cross.</desc>
    <circle cx="180" cy="195" r="150" fill="#E3EFEA" />
    <ellipse cx="180" cy="352" rx="84" ry="10" fill="#CFE0D8" />
    <path d="M62 262c-10-30 8-48 30-40-8 16-12 28-30 40Zm238 28c12-28-4-44-24-36 8 16 12 26 24 36Z" fill="#B9D6CB" />
    <path d="M161 296h13v50h-13zm27 0h13v50h-13Z" fill="#C98F6B" />
    <ellipse cx="164" cy="348" rx="14" ry="6" fill="#1F4A42" />
    <ellipse cx="200" cy="348" rx="14" ry="6" fill="#1F4A42" />
    <path d="m152 142 28-9 28 9 7 50c23 26 25 72 6 100l7 18h-96l7-18c-19-28-17-74 6-100Z" fill="#2D6A5F" />
    <ellipse cx="181" cy="244" rx="30" ry="36" fill="#3F7F72" />
    <path d="M174 118h13v26h-13Z" fill="#C98F6B" />
    <path d="m166 142 14 22 14-22Z" fill="#C98F6B" />
    <ellipse cx="180" cy="100" rx="22" ry="26" fill="#C98F6B" />
    <path d="M156 100c-6-34 54-34 48 0-6-16-42-16-48 0Zm10-9c2-24 28-35 42-16l-2 12c-12-13-26-13-40 4Z" fill="#2B2220" />
    <path d="M170 101q3-3 6 0m8 0q3-3 6 0m-18 12q8 6 16 0" fill="none" stroke="#2B2220" strokeWidth="2" strokeLinecap="round" />
    <path d="M150 150q-26 42 10 90m50-90q36 40 28 72" fill="none" stroke="#C98F6B" strokeWidth="14" strokeLinecap="round" />
    <rect x="226" y="196" width="28" height="38" rx="6" fill="#FFFFFC" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
    <rect x="228" y="188" width="24" height="11" rx="4" fill="#B9D6CB" stroke="#2D6A5F" />
    <path d="M233 214h14m-14 8h10" stroke="#9FB8AE" strokeWidth="2" strokeLinecap="round" />
    <circle cx="238" cy="226" r="8" fill="#C98F6B" />
    <g transform="rotate(-30 85 160)">
      <rect x="60" y="148" width="48" height="22" rx="11" fill="#FFFFFC" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
      <path d="M84 148v22" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="3 3" />
    </g>
    <circle cx="288" cy="112" r="24" fill="#FFFFFC" stroke="#2D6A5F" strokeWidth="2" strokeDasharray="5 4" />
    <path d="M288 100v24m-12-12h24" stroke="#2D6A5F" strokeWidth="3" strokeLinecap="round" />
    <circle cx="110" cy="96" r="3" fill="#9FB8AE" />
    <circle cx="252" cy="64" r="3" fill="#9FB8AE" />
    <circle cx="70" cy="226" r="3" fill="#9FB8AE" />
  </svg></IllustrationAction>;
}
