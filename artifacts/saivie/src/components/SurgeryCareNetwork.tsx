import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { Baby, Briefcase, Plus, Syringe, Users } from "lucide-react";
import {
  careNetworkDetailsSchema, careNetworkMemberSchema, surgeryCareRoles, surgeryCareRoleLabels,
  type CareNetworkDetails, type CareNetworkMember,
} from "../../../../lib/db/src/surgery-care-network";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { receptionRequest } from "@/lib/authenticatedFetch";

const queryKey = ["/api/surgery-care-network"] as const;
const emptyDetails: CareNetworkDetails = { role: "nursing_home", name: "", affiliation: "", phone: "", email: "" };

export function useSurgeryCareNetwork() {
  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => z.array(careNetworkMemberSchema).parse(await receptionRequest("/api/surgery-care-network", { signal })),
  });
}

export function SurgeryCareNetwork() {
  const fieldId = useId();
  const network = useSurgeryCareNetwork();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<CareNetworkMember | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<CareNetworkDetails>(emptyDetails);
  const mutation = useMutation({
    mutationFn: async ({ member, body }: { member?: CareNetworkMember; body: CareNetworkDetails & { active?: boolean } }) =>
      careNetworkMemberSchema.parse(await receptionRequest(`/api/surgery-care-network${member ? `/${member.id}` : ""}`, {
        method: member ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/patients" && query.queryKey[2] === "surgeries" });
      setEditing(null); setDetails(emptyDetails); setFormOpen(false);
      toast({ title: "Care network saved" });
    },
    onError: (error: Error) => toast({ title: "Could not save care network", description: error.message, variant: "destructive" }),
  });
  const set = (key: Exclude<keyof CareNetworkDetails, "role">, value: string) => setDetails((current) => ({ ...current, [key]: value }));
  return (
    <Card className="shadow-sm border-saivie-border" aria-label="Surgery care network" data-testid="surgery-care-network">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base font-bold text-saivie-plum">My Care Network</CardTitle>
          <p className="text-xs text-saivie-plum mt-1">Manage your team of specialists and referral network.</p>
        </div>
        <Dialog open={formOpen} onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) { setEditing(null); setDetails(emptyDetails); }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-saivie-teal hover:bg-saivie-teal h-8 text-xs gap-1.5" onClick={() => { setEditing(null); setDetails(emptyDetails); }}>
              <Plus className="w-3.5 h-3.5" /> Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              <DialogDescription>Add a specialist or facility to your care network.</DialogDescription>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
      {network.isPending && <p role="status">Loading care network...</p>}
      {network.isError && <p role="alert">{network.error.message} <Button variant="link" onClick={() => void network.refetch()}>Retry care network</Button></p>}
      {network.isSuccess && (
        <div className="space-y-2">
          {network.data.length === 0 && <p className="text-sm text-muted-foreground">No contacts saved yet. Add a facility or team member below.</p>}
          {network.data.map((member) => (
            <div key={member.id} className="bg-saivie-ivory border border-saivie-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 group hover:border-saivie-border transition-colors" data-testid={`care-network-${member.id}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${member.role === "pediatrician" ? "bg-blue-50 text-blue-600" : member.role === "nursing_home" ? "bg-emerald-50 text-emerald-600" : "bg-saivie-surface-muted text-saivie-teal"}`}>
                {member.role === "pediatrician" ? <Baby className="w-6 h-6" /> : member.role === "anesthetist" ? <Syringe className="w-6 h-6" /> : member.role === "nursing_home" ? <Briefcase className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div className="min-w-0 flex-1 break-words">
                <p className="font-medium">{member.name} {!member.active && <span className="text-xs text-muted-foreground">(Archived)</span>}</p>
                <p className="text-xs text-muted-foreground">{surgeryCareRoleLabels[member.role]}{member.affiliation ? ` · ${member.affiliation}` : ""}</p>
                {member.phone && <p className="mt-1 text-xs">{member.phone}</p>}
                {member.email && <p className="text-xs">{member.email}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" aria-label={`Edit ${member.name}`} disabled={mutation.isPending} onClick={() => {
                  setEditing(member);
                  setFormOpen(true);
                  setDetails({ role: member.role, name: member.name, affiliation: member.affiliation, phone: member.phone, email: member.email });
                }}>Edit</Button>
                <Button type="button" size="sm" variant="outline" aria-label={`${member.active ? "Archive" : "Restore"} ${member.name}`} disabled={mutation.isPending || editing !== null} onClick={() =>
                  mutation.mutate({ member, body: { role: member.role, name: member.name, affiliation: member.affiliation, phone: member.phone, email: member.email, active: !member.active } })
                }>{member.active ? "Archive" : "Restore"}</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Assignments do not confirm availability or book a theatre. Archived contacts remain on existing plans.</p>
      </CardContent>
    </Card>
  );

  function renderForm() {
    return <form className="space-y-3" aria-label={editing ? "Edit care-network entry" : "Add care-network entry"} onSubmit={(event) => {
        event.preventDefault();
        const parsed = careNetworkDetailsSchema.safeParse(details);
        if (!parsed.success) {
          toast({ title: "Check contact details", description: parsed.error.issues.map((issue) => issue.message).join("; "), variant: "destructive" });
          return;
        }
        mutation.mutate({ member: editing ?? undefined, body: editing ? { ...parsed.data, active: editing.active } : parsed.data });
      }}>
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={mutation.isPending}>
          <div className="space-y-1">
            <Label htmlFor={`${fieldId}-role`}>Role</Label>
            <select id={`${fieldId}-role`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" disabled={editing !== null} value={details.role} onChange={(event) => {
              const role = careNetworkDetailsSchema.shape.role.parse(event.target.value);
              setDetails((current) => ({ ...current, role }));
            }}>
              {surgeryCareRoles.map((role) => <option key={role} value={role}>{surgeryCareRoleLabels[role]}</option>)}
            </select>
            {editing && <p className="text-xs text-muted-foreground">To change role, archive this contact and add a new one.</p>}
          </div>
          <div className="space-y-1"><Label htmlFor={`${fieldId}-name`}>Name</Label><Input id={`${fieldId}-name`} required maxLength={200} value={details.name} onChange={(event) => set("name", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${fieldId}-affiliation`}>Clinic / facility (optional)</Label><Input id={`${fieldId}-affiliation`} maxLength={200} value={details.affiliation} onChange={(event) => set("affiliation", event.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor={`${fieldId}-phone`}>Phone (optional)</Label><Input id={`${fieldId}-phone`} type="tel" maxLength={40} value={details.phone} onChange={(event) => set("phone", event.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label htmlFor={`${fieldId}-email`}>Email (optional)</Label><Input id={`${fieldId}-email`} type="email" maxLength={254} value={details.email} onChange={(event) => set("email", event.target.value)} /></div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={mutation.isPending || !details.name.trim()}>{mutation.isPending ? "Saving..." : editing ? "Save contact" : "Add contact"}</Button>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { setFormOpen(false); setEditing(null); setDetails(emptyDetails); }}>Cancel</Button>
        </div>
        <p className="text-xs text-muted-foreground">Archiving stops new assignments but keeps existing surgery assignments. Contact changes also update their display on saved plans.</p>
      </form>;
  }
}
