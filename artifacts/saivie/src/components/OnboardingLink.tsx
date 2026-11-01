import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { useToast } from "@/hooks/use-toast";

export function OnboardingLink({ appointmentId }: { appointmentId: number }) {
  const { toast } = useToast();
  const link = useMutation({
    mutationFn: () => receptionRequest<{ path: string; expiresAt: string }>(`/api/onboarding-links/${appointmentId}`, { method: "POST" }),
  });
  const url = link.data ? `${window.location.origin}${link.data.path}` : null;
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Create a private link for this patient. It expires after 30 days; creating another replaces the previous link.</p>
    <Button variant="outline" disabled={link.isPending} onClick={() => link.mutate()}>{link.isPending ? "Creating private link..." : url ? "Replace private onboarding link" : "Create private onboarding link"}</Button>
    {link.isError && <p role="alert" className="text-sm text-rose-700">{link.error.message}</p>}
    {url && <><p className="break-all rounded-lg border p-3 text-xs">{url}</p><div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); toast({ title: "Private onboarding link copied" }); } catch (error) { toast({ title: "Could not copy link", description: error instanceof Error ? error.message : "Copy the displayed link manually.", variant: "destructive" }); } }}>Copy link</Button>
      <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Preview onboarding</a></Button>
    </div></>}
  </div>;
}
