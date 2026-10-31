import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { useReceptionAccess } from "@/lib/receptionAccess";

export function ReceptionAccessSettings() {
  const access = useReceptionAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const save = useMutation({
    mutationFn: (clinicalDetailsVisible: boolean) => receptionRequest("/api/clinic/reception-access", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicalDetailsVisible }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/clinic/reception-access"] });
      toast({ title: "Receptionist access updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update access", description: error.message, variant: "destructive" }),
  });
  return <Card className="border-saivie-border shadow-sm">
    <CardHeader><CardTitle>Receptionist permissions</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Clinic-wide access controlled by doctors and the clinic owner. Disabled by default.</p>
      {access.isPending && <p role="status">Loading permissions...</p>}
      {access.isError && <p role="alert" className="text-sm text-rose-700">{access.error.message} <Button variant="link" onClick={() => void access.refetch()}>Retry</Button></p>}
      <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
        <div><label htmlFor="reception-clinical-access" className="font-medium">Allow receptionists to view patient clinical details</label>
          <p className="mt-1 text-sm text-muted-foreground">View clinical encounters, prescriptions, medicines, reports and pregnancy details. This does not permit prescribing or changing the doctor's encounter records.</p></div>
        <Switch id="reception-clinical-access" data-testid="switch-reception-clinical-access" checked={access.isSuccess && access.data.clinicalDetailsVisible} disabled={!access.isSuccess || save.isPending} onCheckedChange={(value) => save.mutate(value)} />
      </div>
      <p className="text-sm text-muted-foreground">Receptionists can edit patient registration, history and pregnancy details and record arrival vitals independently of this viewing permission. Patient edits are audited. Paper prescriptions still require the original scan and verification.</p>
    </CardContent>
  </Card>;
}
