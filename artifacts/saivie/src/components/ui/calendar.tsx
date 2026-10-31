import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateMatchModifiers, type Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { calendarDateValue, calendarWeekStart, shiftCalendarDays } from "@/lib/calendarDates";
import { Button } from "@/components/ui/button";

interface CalendarProps {
  mode?: "single";
  selected?: Date;
  defaultMonth?: Date;
  onSelect?: (date: Date) => void;
  disabled?: Matcher | Matcher[];
  className?: string;
  "aria-label"?: string;
}

function Calendar({ selected, defaultMonth, onSelect, disabled, className, "aria-label": label = "Choose date" }: CalendarProps) {
  const [start, setStart] = React.useState(() => calendarWeekStart(selected || defaultMonth || new Date()));
  const selectedValue = selected ? calendarDateValue(selected) : "";
  const stripRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (selected) {
      setStart(calendarWeekStart(selected));
      stripRef.current?.scrollTo({ left: 0 });
    }
  }, [selectedValue]);
  const days = Array.from({ length: 14 }, (_, index) => shiftCalendarDays(start, index));
  const today = calendarDateValue(new Date());
  const isDisabled = (date: Date) => disabled ? dateMatchModifiers(date, disabled) : false;
  const navigate = (days: number) => {
    setStart((current) => shiftCalendarDays(current, days));
    stripRef.current?.scrollTo({ left: 0 });
  };
  const jump = (year: number, month: number) => {
    const next = new Date(start);
    next.setFullYear(year, month, 1);
    setStart(next);
    stripRef.current?.scrollTo({ left: 0 });
  };

  return (
    <section data-slot="calendar" aria-label={label} className={cn("w-full min-w-0 rounded-2xl bg-white p-3", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#705364]">{label}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-[#f2f3f5]" aria-label="Previous week" onClick={() => navigate(-7)}><ChevronLeft className="h-4 w-4" /></Button>
          <select aria-label="Calendar month" value={start.getMonth()} onChange={(event) => jump(start.getFullYear(), Number(event.target.value))} className="h-8 rounded-lg bg-transparent px-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {Array.from({ length: 12 }, (_, month) => <option key={month} value={month}>{new Date(2026, month, 1).toLocaleDateString("en-IN", { month: "short" })}</option>)}
          </select>
          <input aria-label="Calendar year" type="number" min="1" max="9999" value={start.getFullYear()} onChange={(event) => {
            const year = Number(event.target.value);
            if (Number.isInteger(year) && year >= 1 && year <= 9999) jump(year, start.getMonth());
          }} className="h-8 w-16 rounded-lg bg-[#f2f3f5] px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-[#f2f3f5]" aria-label="Next week" onClick={() => navigate(7)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1" aria-label="Dates">
        {days.map((date) => {
          const value = calendarDateValue(date);
          const active = value === selectedValue;
          return (
            <button key={value} type="button" aria-label={date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} aria-pressed={active} aria-current={value === today ? "date" : undefined} disabled={isDisabled(date)} onClick={() => onSelect?.(date)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const buttons = Array.from(stripRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
                const index = buttons.indexOf(event.currentTarget);
                buttons[index + (event.key === "ArrowRight" ? 1 : -1)]?.focus();
              }}
              className={cn("flex min-w-12 shrink-0 flex-col items-center gap-2 rounded-full bg-[#f2f3f5] px-1.5 py-2 text-xs text-[#42464c] transition-colors hover:bg-[#e7eaf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3478f6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35", active && "bg-[#3478f6] text-white hover:bg-[#2866d4]")}>
              <span>{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full font-semibold", active && "bg-white text-[#242821]")}>{String(date.getDate()).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { Calendar };
