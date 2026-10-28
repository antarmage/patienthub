import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function NotFoundIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="mx-auto w-full max-w-[320px]"
      role="img"
      aria-labelledby="not-found-illustration-title not-found-illustration-description"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="not-found-illustration-title">A page being searched for</title>
      <desc id="not-found-illustration-description">
        A person looks around with a magnifying glass.
      </desc>
      <path
        d="M53 119C43 71 77 39 120 40c28-27 79-19 96 9 44-1 67 34 52 71-13 34-48 54-104 49-58 13-101-13-111-50Z"
        fill="var(--saivie-surface-muted)"
      />
      <path
        d="M70 64h12m-6-6v12m179 34h10m-5-5v10"
        stroke="var(--saivie-teal)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="92" cy="111" r="3" fill="var(--saivie-rose)" />
      <circle cx="249" cy="60" r="3" fill="var(--saivie-gold)" />
      <ellipse
        cx="157"
        cy="211"
        rx="88"
        ry="9"
        fill="var(--saivie-sage)"
        opacity=".65"
      />

      <path
        d="m127 153-12 42 17 4 20-37 16 37 17-4-10-47"
        fill="var(--saivie-sage)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M116 193c-9 2-16 7-14 12 2 4 19 4 31-4l-1-4-16-4Zm53 2 6 8c9 5 23 5 25 1 1-4-5-9-15-12l-16 3Z"
        fill="var(--saivie-blush)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M132 105c8-8 26-10 37-2l14 45c-18 10-47 10-64 0l8-35 5-8Z"
        fill="var(--saivie-teal)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m133 114-13 20 12 9m47-28 15 13"
        fill="none"
        stroke="var(--saivie-blush)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m133 114-13 20 12 9m47-28 15 13"
        fill="none"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M140 98v11c5 6 15 7 21 0V98"
        fill="var(--saivie-blush)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle
        cx="151"
        cy="77"
        r="24"
        fill="var(--saivie-blush)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
      />
      <path
        d="M128 76c-3-19 10-32 28-29 12 2 20 12 18 26l-7-8-7-9c-7 10-18 15-32 15v5Z"
        fill="var(--saivie-plum)"
        stroke="var(--saivie-plum)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M144 79h.5m14 0h.5m-11 9c3 3 7 3 10 0"
        fill="none"
        stroke="var(--saivie-plum)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <path
        d="m194 129 12-12"
        stroke="var(--saivie-plum)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="216"
        cy="96"
        r="19"
        fill="var(--saivie-ivory)"
        fillOpacity=".8"
        stroke="var(--saivie-teal)"
        strokeWidth="4"
      />
      <path
        d="m202 110-8 8"
        stroke="var(--saivie-teal)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="210" cy="90" r="3" fill="var(--saivie-sage)" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-lg text-center">
        <NotFoundIllustration />
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary">
          Error 404
        </p>
        <h1 className="mt-3 font-serif text-3xl font-medium sm:text-4xl">
          This page has wandered off.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          The page you&apos;re looking for may have moved or no longer exists.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
