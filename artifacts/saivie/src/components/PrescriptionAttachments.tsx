import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PrescriptionAttachment } from "../../../../lib/db/src/prescription-attachments";

export type DisplayPrescriptionAttachment = Omit<PrescriptionAttachment, "fileData"> & { fileData: string | null };

export function PrescriptionAttachments({ files, disabled, onDelete }: {
  files: DisplayPrescriptionAttachment[];
  disabled: boolean;
  onDelete: (index: number) => void;
}) {
  const [viewing, setViewing] = useState<number | null>(null);
  const file = viewing === null ? null : files[viewing];
  return <div className="mt-3 space-y-2">
    {files.map((attachment, index) => <div key={`${index}-${attachment.name}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3" data-testid={`prescription-attachment-${index}`}>
      <div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{index + 1}. {attachment.name}</p>
        {!attachment.fileData && <p role="alert" className="text-xs text-destructive">Original file unavailable. Delete this attachment and upload the original again before saving.</p>}
      </div>
      <Button type="button" size="sm" variant="outline" disabled={!attachment.fileData} aria-label={`View ${attachment.name}`} onClick={() => setViewing(index)}>View</Button>
      {attachment.fileData && <a className="text-xs underline" href={`data:${attachment.mimeType};base64,${attachment.fileData}`} download={attachment.name} aria-label={`Download ${attachment.name}`}>Download</a>}
      <Button type="button" size="sm" variant="ghost" disabled={disabled} className="text-destructive" aria-label={`Delete ${attachment.name}`}
        onClick={() => { if (window.confirm(`Delete "${attachment.name}" from this prescription? The change takes effect when you save; earlier saved copies remain in the audit history.`)) onDelete(index); }}>Delete file</Button>
    </div>)}
    {!!files.length && <p className="text-xs text-muted-foreground">Files are saved together for this prescription and visit. Additions and deletions take effect on Save. At least one original must remain.</p>}
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) setViewing(null); }}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
      <DialogHeader><DialogTitle className="break-all">{file?.name}</DialogTitle><DialogDescription>Doctor's uploaded original prescription · file {viewing === null ? "" : viewing + 1} of {files.length}</DialogDescription></DialogHeader>
      {file?.fileData && (file.mimeType.startsWith("image/") ? <img className="max-h-[70vh] w-full object-contain" src={`data:${file.mimeType};base64,${file.fileData}`} alt={`Original prescription: ${file.name}`} /> :
        <iframe className="h-[65vh] w-full rounded border" title={`Original prescription: ${file.name}`} src={`data:application/pdf;base64,${file.fileData}`} />)}
      {file?.fileData && <a className="text-sm underline" href={`data:${file.mimeType};base64,${file.fileData}`} download={file.name}>Download file if preview is unavailable</a>}
    </DialogContent></Dialog>
  </div>;
}
