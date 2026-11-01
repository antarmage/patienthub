import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { receptionRequest } from "@/lib/authenticatedFetch";
import { useToast } from "@/hooks/use-toast";

export function GoogleMeetSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const status = useQuery({ queryKey: ["google-meet-status"], queryFn: () => receptionRequest<{ configured: boolean; connected: boolean; providerName: string }>("/api/online/google/status"), retry: false });
  const action = useMutation({
    mutationFn: async (disconnect: boolean) => {
      if (disconnect) { await receptionRequest("/api/online/google/connection", { method: "DELETE" }); return; }
      const { url } = await receptionRequest<{ url: string }>("/api/online/google/connect", { method: "POST" });
      if (!url.startsWith("https://accounts.google.com/")) throw new Error("Invalid Google authorization URL.");
      window.location.assign(url);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["google-meet-status"] }),
    onError: (error: Error) => toast({ title: "Google Meet connection failed", description: error.message, variant: "destructive" }),
  });
  return <section className="space-y-4 rounded-2xl border border-saivie-border bg-white p-6">
    <h2 className="font-serif text-xl">Google Meet · Online consultations</h2>
    <p className="text-sm text-muted-foreground">Connect your Google account to automatically create a private meeting for each online booking. Calls open in Google Meet; patient records stay in Saivie.</p>
    {status.isPending && <p role="status">Loading connection...</p>}
    {status.isError && <p role="alert" className="text-sm text-rose-700">{status.error.message} <Button variant="link" onClick={() => void status.refetch()}>Retry</Button></p>}
    {status.data && <><p className="text-sm">{status.data.providerName}: {status.data.connected ? "Connected" : "Not connected"}</p>{!status.data.configured && <p role="alert" className="text-sm text-amber-800">Your administrator must configure Google Meet OAuth before accounts can connect.</p>}<Button disabled={!status.data.configured || action.isPending} onClick={() => action.mutate(status.data!.connected)}>{action.isPending ? "Please wait..." : status.data.connected ? "Disconnect Google account" : "Connect my Google account"}</Button><p className="text-xs text-muted-foreground">Disconnecting stops new meeting creation. Existing Google meetings are not deleted.</p></>}
  </section>;
}
