import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { exactLabNumber } from "@/lib/labReading";

interface ReadResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: string;
  flag: string;
}

interface ReadDocument {
  id: number;
  name: string;
  date: string;
  results: ReadResult[];
  rawText: string;
  warnings: string[];
  provider: string;
  sourceUrl?: string;
}

export function ReportReadingButton({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<ReadDocument[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const count = documents.reduce((sum, doc) => sum + doc.results.length, 0);

  const read = async () => {
    setOpen(true);
    setReading(true);
    setReviewed(false);
    setDocuments([]);
    setErrors([]);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/extract-lab-results`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not read reports.");
      if (data.documents && !Array.isArray(data.documents))
        throw new Error("Invalid report reading response.");
      setDocuments(data.documents || []);
      setErrors(
        data.errors ||
          (data.documents?.length
            ? []
            : [data.message || "No readable reports found."]),
      );
    } catch (error) {
      setErrors([
        error instanceof Error ? error.message : "Could not read reports.",
      ]);
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    if (
      !reviewed ||
      !count ||
      documents.some(
        (doc) =>
          doc.results.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(doc.date),
      )
    )
      return;
    setSaving(true);
    setErrors([]);
    try {
      const existingResponse = await fetch(
        `/api/patients/${patientId}/lab-results`,
      );
      if (!existingResponse.ok)
        throw new Error("Could not check existing results. Nothing was saved.");
      const existing: {
        testName: string;
        date: string;
        results?: { rawValue?: string };
        value?: number | null;
        unit?: string | null;
      }[] = await existingResponse.json();
      const key = (name: string, date: string, value: string, unit: string) =>
        JSON.stringify([
          name.trim().toLowerCase(),
          date,
          value.trim(),
          unit.trim(),
        ]);
      const seen = new Set(
        existing.map((item) =>
          key(
            item.testName,
            item.date,
            item.results?.rawValue ?? String(item.value ?? ""),
            item.unit || "",
          ),
        ),
      );
      for (const doc of documents) {
        for (const result of doc.results) {
          if (!result.testName.trim())
            throw new Error(
              "Every result needs a test name. Correct or remove the row.",
            );
          const resultKey = key(
            result.testName,
            doc.date,
            result.value,
            result.unit,
          );
          if (!seen.has(resultKey)) {
            const numeric = exactLabNumber(result.value);
            const response = await fetch(
              `/api/patients/${patientId}/lab-results`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  date: doc.date,
                  testName: result.testName,
                  value: numeric,
                  unit: result.unit || null,
                  status: result.status || null,
                  results: {
                    rawValue: result.value,
                    referenceRange: result.referenceRange,
                    flag: result.flag,
                    sourceDocumentId: doc.id,
                    provider: doc.provider,
                    reviewed: true,
                    rawText: doc.rawText,
                  },
                }),
              },
            );
            if (!response.ok)
              throw new Error(
                "Could not save a result. Already saved rows were removed; retry the remaining rows.",
              );
            seen.add(resultKey);
          }
          setDocuments((current) =>
            current.map((item) =>
              item.id === doc.id
                ? {
                    ...item,
                    results: item.results.filter((row) => row !== result),
                  }
                : item,
            ),
          );
        }
      }
      toast({ title: "Reviewed lab results saved" });
      setOpen(false);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Could not save reviewed results.",
      ]);
    } finally {
      queryClient.invalidateQueries({
        queryKey: [`/api/patients/${patientId}/lab-results`],
      });
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-[11px] text-saivie-teal"
        onClick={read}
        disabled={reading || saving}
        data-testid="button-read-reports-investigation"
      >
        <Sparkle className="h-3 w-3" /> Read Reports
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!reading && !saving) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review extracted lab results</DialogTitle>
            <DialogDescription>
              Nothing is saved by reading. Check the original reports, correct
              the fields and confirm before saving. Blank dates must be entered
              manually.
            </DialogDescription>
          </DialogHeader>
          {reading && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading reports...
            </p>
          )}
          {errors.map((error, index) => (
            <p role="alert" key={index} className="text-sm text-rose-700">
              {error}
            </p>
          ))}
          {documents.map((doc) => (
            <section key={doc.id} className="space-y-3 rounded-lg border p-3">
              <h3 className="text-sm font-semibold">{doc.name}</h3>
              <a
                href={
                  doc.sourceUrl?.startsWith("https://drive.google.com/")
                    ? doc.sourceUrl
                    : `/api/patients/${patientId}/documents/${doc.id}/file`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-saivie-teal underline"
              >
                Open original report
              </a>
              <label className="block text-xs">
                Report date
                <Input
                  type="date"
                  value={doc.date}
                  disabled={saving}
                  onChange={(event) => {
                    setReviewed(false);
                    setDocuments((current) =>
                      current.map((item) =>
                        item.id === doc.id
                          ? { ...item, date: event.target.value }
                          : item,
                      ),
                    );
                  }}
                />
              </label>
              {doc.warnings.map((warning, index) => (
                <p key={index} role="alert" className="text-xs text-amber-800">
                  {warning}
                </p>
              ))}
              <details>
                <summary className="cursor-pointer text-xs">
                  OCR transcription (unverified)
                </summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                  {doc.rawText}
                </pre>
              </details>
              {doc.results.map((result, index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-2 rounded border p-2 sm:grid-cols-3"
                >
                  {(
                    [
                      "testName",
                      "value",
                      "unit",
                      "referenceRange",
                      "status",
                      "flag",
                    ] as const
                  ).map((field) => (
                    <label className="text-xs" key={field}>
                      {
                        {
                          testName: "Test",
                          value: "Exact value",
                          unit: "Unit",
                          referenceRange: "Reference range",
                          status: "Reported status",
                          flag: "Reported flag",
                        }[field]
                      }
                      <Input
                        value={result[field]}
                        disabled={saving}
                        onChange={(event) => {
                          setReviewed(false);
                          setDocuments((current) =>
                            current.map((item) =>
                              item.id === doc.id
                                ? {
                                    ...item,
                                    results: item.results.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            [field]: event.target.value,
                                          }
                                        : row,
                                    ),
                                  }
                                : item,
                            ),
                          );
                        }}
                      />
                    </label>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove result"
                    disabled={saving}
                    onClick={() => {
                      setReviewed(false);
                      setDocuments((current) =>
                        current.map((item) =>
                          item.id === doc.id
                            ? {
                                ...item,
                                results: item.results.filter(
                                  (_, i) => i !== index,
                                ),
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </section>
          ))}
          {count > 0 && (
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={saving}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              I verified each value, unit, date and test name against the
              original reports.
            </label>
          )}
          <Button
            onClick={save}
            disabled={
              reading ||
              saving ||
              !reviewed ||
              count === 0 ||
              documents.some(
                (doc) =>
                  doc.results.length > 0 &&
                  !/^\d{4}-\d{2}-\d{2}$/.test(doc.date),
              )
            }
          >
            {saving ? "Saving..." : `Save ${count} reviewed result(s)`}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
