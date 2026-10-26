import React, { useId } from "react";

export function NoRecordsIllustration({ decorative = false, className = "" }: {
  decorative?: boolean;
  className?: string;
}) {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 180"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={`mx-auto block h-auto w-full max-w-56 ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-labelledby={decorative ? undefined : `${id}-title ${id}-desc`}
      focusable="false"
      fill="none"
      stroke="#252525"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {!decorative && (
        <>
          <title id={`${id}-title`}>A woman beside a folder waiting for its first record</title>
          <desc id={`${id}-desc`}>A woman in a blush blouse and sage trousers holds an ivory sheet beside a sage folder, beneath a small yellow sun.</desc>
        </>
      )}
      <path d="M59 145c43 2 125-1 197 0" />
      <g transform="translate(7 37) scale(.74)">
        <path d="m80 128-1-65q0-7 8-7l35 1 12 13 62-1q8 0 9 8l2 53Z" fill="#E5C4DB" />
        <path d="m106 108-3-67q0-5 6-5l52 1 21 21 2 52Z" fill="#FFFFFC" />
        <path d="m161 37-1 19q0 4 5 4l17-2M116 62l29 1m-28 13 43-1" />
        <path d="m80 137-7-45q-1-6 6-6l119-2q8 0 7 7l-5 46q-1 6-8 6l-103 1q-8 0-9-7Z" fill="#CFE2DC" />
        <path d="m115 103 24-1" />
      </g>
      <g data-illustration-part="woman">
        <path d="M203 65c-9-12-10-29 2-34 13-6 24 3 23 17l5 20q-15 7-30-3Z" fill="#252525" />
        <path d="m207 57 1 14 11 1-2-18" fill="#FFFFFC" />
        <path d="M204 39q-5 9-1 17c3 6 10 7 15 1q5-6 2-16-8 1-12-6l-4 4Z" fill="#FFFFFC" />
        <path d="m207 47 1 1m4 7q2 1 4-1" />
        <path d="m201 97-5 38 9 1 10-27 5 27 9-1-3-39Z" fill="#CFE2DC" />
        <path d="m196 135-5 7q-1 3 5 3l11-1-2-8m15 0 1 8 16 1q3-3-8-10" fill="#FFFFFC" />
        <path d="M207 67q-10-2-14 7l-8 18 8 4 9-14-3 18q15 5 29-1l-4-23q-1-7-7-8-5 7-10-1Z" fill="#E5C4DB" />
        <path d="m195 92-10 8-14-5-3 5 18 8q4 1 8-3l9-8" fill="#FFFFFC" />
        <path d="m154 82 25-4 6 21-26 4Z" fill="#FFFFFC" />
        <path d="m160 87 12-2m-10 8 9-2" />
        <path d="m222 77 9 17q2 5-3 8l-16 8-3-5 13-9-7-12" fill="#E5C4DB" />
        <path d="m212 104-6 1q-5 1-5 4l8 2 4-2" fill="#FFFFFC" />
      </g>
      <path d="M251 48c0-6 4-10 10-9 5 0 9 4 9 9s-4 10-9 10-10-4-10-10Z" fill="#FFD50A" stroke="none" />
      <path d="m261 29 1-4m16 12 4-2m-5 25 3 3" />
    </svg>
  );
}
