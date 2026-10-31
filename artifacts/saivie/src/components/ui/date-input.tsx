import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { calendarDate, calendarDateValue } from "@/lib/calendarDates";

type DateInputProps = Omit<React.ComponentProps<"input">, "type" | "onChange" | "value" | "defaultValue" | "min" | "max"> & {
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  onValueChange?: (value: string) => void;
};

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, defaultValue = "", onValueChange, min, max, className, disabled, readOnly, onBlur, ...props }, forwardedRef) => {
    const [currentValue, setCurrentValue] = React.useState(value ?? defaultValue);
    const [touched, setTouched] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const selected = calendarDate(currentValue);
    const minimum = min ? calendarDate(min) : undefined;
    const maximum = max ? calendarDate(max) : undefined;
    const error = currentValue && !selected ? "Enter a valid date as YYYY-MM-DD."
      : currentValue && min && currentValue < min ? `Choose a date on or after ${min}.`
      : currentValue && max && currentValue > max ? `Choose a date on or before ${max}.` : "";
    React.useEffect(() => {
      if (value !== undefined) setCurrentValue(value);
    }, [value]);
    React.useEffect(() => {
      inputRef.current?.setCustomValidity(error);
    }, [error]);
    const change = (next: string) => {
      setCurrentValue(next);
      if (!next || (calendarDate(next) && (!min || next >= min) && (!max || next <= max))) onValueChange?.(next);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative min-w-0">
          <Input {...props} ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }} type="text" value={currentValue} disabled={disabled} readOnly={readOnly} placeholder={props.placeholder || "YYYY-MM-DD"} pattern="\d{4}-\d{2}-\d{2}" maxLength={10} className={`pr-10 ${className || ""}`} aria-invalid={touched && Boolean(error)} onChange={(event) => change(event.target.value)} onBlur={(event) => { setTouched(true); onBlur?.(event); }} />
          <PopoverTrigger asChild>
            <button type="button" disabled={disabled || readOnly} aria-label={`Open calendar${props["aria-label"] ? `: ${props["aria-label"]}` : ""}`} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#705364] hover:bg-[#f2f3f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><CalendarDays className="h-4 w-4" /></button>
          </PopoverTrigger>
        </div>
        {touched && error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
        <PopoverContent align="start" className="w-[min(420px,calc(100vw-2rem))] p-0">
          <Calendar selected={selected} defaultMonth={minimum && minimum > new Date() ? minimum : maximum && maximum < new Date() ? maximum : undefined} disabled={(date) => Boolean((minimum && date < minimum) || (maximum && date > maximum))} onSelect={(date) => { change(calendarDateValue(date)); setOpen(false); }} />
          {!props.required && currentValue && <button type="button" className="mx-3 mb-3 text-xs text-[#705364] hover:underline" onClick={() => { change(""); setOpen(false); }}>Clear date</button>}
        </PopoverContent>
      </Popover>
    );
  },
);
DateInput.displayName = "DateInput";

export { DateInput };
