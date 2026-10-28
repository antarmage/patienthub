import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Reading {
  medications: Record<string, string>[];
  results: Record<string, string>[];
  findings: Record<string, string>[];
  follicles: Record<string, string>[];
  investigations: Record<string, string>[];
  fetalParameters: Record<string, string>;
  doctorName: string;
  patientName: string;
  labName: string;
  date: string;
  reportType: string;
  diagnosis: string;
  chiefComplaint: string;
  examination: string;
  advice: string;
  followUp: string;
  notes: string;
  impression: string;
  gestationalAge: string;
  edd: string;
  endometrialThickness: string;
}

export function ClinicalReadingEditor({
  reading,
  onChange,
}: {
  reading: Reading;
  onChange: (reading: Reading) => void;
}) {
  const sections = {
    medications: [
      "name",
      "dosage",
      "frequency",
      "duration",
      "route",
      "instructions",
    ],
    results: ["testName", "value", "unit", "referenceRange", "status", "flag"],
    findings: ["organ", "measurement", "description", "status"],
    follicles: ["side", "size", "count"],
    investigations: ["name", "result", "date"],
  };
  return (
    <details className="rounded-lg border border-saivie-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Correct extracted details before saving
      </summary>
      <div className="mt-3 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              "doctorName",
              "patientName",
              "labName",
              "date",
              "reportType",
              "diagnosis",
              "chiefComplaint",
              "examination",
              "advice",
              "followUp",
              "notes",
              "impression",
              "gestationalAge",
              "edd",
              "endometrialThickness",
            ] as const
          ).map((field) => (
            <label key={field} className="text-xs">
              {field}
              <Input
                value={reading[field]}
                onChange={(event) =>
                  onChange({ ...reading, [field]: event.target.value })
                }
              />
            </label>
          ))}
        </div>
        {(Object.keys(sections) as (keyof typeof sections)[]).map((section) => (
          <section key={section} className="space-y-2">
            <h4 className="text-sm font-semibold capitalize">{section}</h4>
            {reading[section].map((row, index) => (
              <div
                key={index}
                className="grid gap-2 rounded border p-2 sm:grid-cols-2"
              >
                {sections[section].map((field) => (
                  <label key={field} className="text-xs">
                    {field}
                    <Input
                      value={row[field]}
                      onChange={(event) =>
                        onChange({
                          ...reading,
                          [section]: reading[section].map((item, i) =>
                            i === index
                              ? { ...item, [field]: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...reading,
                      [section]: reading[section].filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove row
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...reading,
                  [section]: [
                    ...reading[section],
                    Object.fromEntries(
                      sections[section].map((field) => [field, ""]),
                    ),
                  ],
                })
              }
            >
              Add {section} row
            </Button>
          </section>
        ))}
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(reading.fetalParameters).map(([field, value]) => (
            <label key={field} className="text-xs">
              {field}
              <Input
                value={value}
                onChange={(event) =>
                  onChange({
                    ...reading,
                    fetalParameters: {
                      ...reading.fetalParameters,
                      [field]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
