import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OwnerAuthGate } from "@/components/OwnerAuthGate";

interface ParsedRow { code?: string; name: string; mrp: number; b2b: number }
interface ImportResult { name: string; action: "update" | "create" | "skip"; reason?: string; oldMrp?: number; mrp?: number; b2b?: number }

const num = (s: string) => Number(String(s).replace(/[₹,\s]/g, ""));

// Accepts rows copied from a spreadsheet (tab separated) or plain text:
// "# | Code | Name | Classification | MRP | Net | Discount%"
export function parseRateCard(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || /service\s*code|service\s*name/i.test(line)) continue;
    const cells = line.split("\t").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 6) {
      const offset = /^\d+$/.test(cells[0]) && cells.length >= 7 ? 1 : 0;
      const [code, name, , mrp, b2b] = cells.slice(offset);
      if (name && Number.isFinite(num(mrp)) && Number.isFinite(num(b2b))) rows.push({ code, name, mrp: num(mrp), b2b: num(b2b) });
      continue;
    }
    const m = line.trim().match(/^(?:\d+\s+)?(\S+)\s+(.+?)\s+([A-Za-z][A-Za-z-]*)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+\d+(?:\.\d+)?)?$/);
    if (m) rows.push({ code: m[1], name: m[2], mrp: Number(m[4]), b2b: Number(m[5]) });
  }
  return rows;
}

function ImportBody({ token, onSignOut, onDone }: { token: string; onSignOut: () => void; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [updateMrp, setUpdateMrp] = useState(false);
  const [preview, setPreview] = useState<ImportResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const rows = useMemo(() => parseRateCard(text), [text]);

  const run = async (apply: boolean) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/owner/catalog-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows, apply, updateMrp }),
      });
      if (res.status === 401 || res.status === 403) {
        onSignOut();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setPreview(data.results);
      if (apply) {
        setDone(true);
        queryClient.invalidateQueries({ queryKey: ["/api/billing-catalog"] });
        queryClient.invalidateQueries({ queryKey: ["/api/owner/costs"] });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const count = (a: string) => preview?.filter((r) => r.action === a).length || 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import B2B prices</DialogTitle>
        <DialogDescription>Paste the rate card (Service Code, Name, Classification, MRP, Net). Net is saved as the B2B price.</DialogDescription>
      </DialogHeader>
      <Textarea rows={7} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); setDone(false); }} placeholder="Paste rows copied from your spreadsheet" data-testid="input-import-text" />
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={updateMrp} onChange={(e) => { setUpdateMrp(e.target.checked); setPreview(null); }} />
        Also overwrite MRP of existing tests with the pasted MRP
      </label>
      <p className="text-xs text-slate-500">{rows.length} row{rows.length === 1 ? "" : "s"} recognised. Tests are matched by name; new names are added as "Lab Test".</p>
      {preview && (
        <div className="max-h-56 overflow-auto rounded-md border border-slate-200 text-xs">
          <p className="border-b bg-slate-50 px-3 py-2 font-semibold">{done ? "Imported: " : "Preview: "}{count("update")} to update, {count("create")} new, {count("skip")} skipped</p>
          {preview.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-2 border-b px-3 py-1.5 last:border-0">
              <span className="truncate">{r.name}</span>
              <span className="shrink-0 text-slate-500">
                {r.action === "skip" ? r.reason : `MRP ${r.mrp}${r.action === "update" && r.oldMrp !== r.mrp ? ` (now ${r.oldMrp})` : ""} · B2B ${r.b2b}`}
              </span>
              <Badge className={`border-0 ${r.action === "create" ? "bg-emerald-100 text-emerald-700" : r.action === "update" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>{r.action}</Badge>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>{done ? "Close" : "Cancel"}</Button>
        {!done && <Button variant="secondary" disabled={!rows.length || busy} onClick={() => run(false)} data-testid="btn-import-preview">Preview</Button>}
        {!done && <Button disabled={!preview || busy || count("update") + count("create") === 0} onClick={() => run(true)} data-testid="btn-import-apply">Import</Button>}
      </DialogFooter>
    </>
  );
}

export function CatalogImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} data-testid="btn-import-b2b"><Upload className="mr-1.5 h-4 w-4" /> Import B2B prices</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <OwnerAuthGate>{({ token, signOut }) => <ImportBody token={token} onSignOut={signOut} onDone={() => setOpen(false)} />}</OwnerAuthGate>
        </DialogContent>
      </Dialog>
    </>
  );
}
