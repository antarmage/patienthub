import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v4";
import { authenticatedFetch, readApiResponse } from "@/lib/authenticatedFetch";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const profileSchema = z.object({
  name: z.string(),
  photo: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/).nullable(),
});

export function useStaffProfile() {
  const token = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem("billing_staff_token");
  return useQuery({
    queryKey: ["/api/staff/profile", token],
    queryFn: async () => profileSchema.parse(await readApiResponse(await authenticatedFetch("/api/staff/profile"))),
    enabled: !!token,
    gcTime: 0,
    refetchInterval: 30000,
  });
}

export function StaffProfileAvatar({ name, photo, className }: { name: string; photo?: string | null; className?: string }) {
  return <Avatar className={className}>
    {photo && <AvatarImage src={photo} alt={`${name}'s profile photo`} className="object-cover" />}
    <AvatarFallback className="bg-saivie-sage text-saivie-plum">{name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "ST"}</AvatarFallback>
  </Avatar>;
}

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG or PNG up to 5 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 384; canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare a profile photo.");
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, 384, 384);
    context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 384, 384);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally { URL.revokeObjectURL(url); }
}

export function OwnerStaffProfilePhoto({ employeeId, name, token }: { employeeId: string; name: string; token: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [saved, setSaved] = useState(false);
  const url = `/api/owner/staff-accounts/${encodeURIComponent(employeeId)}/photo`;
  const query = useQuery({
    queryKey: ["/api/owner/staff-profile-photo", token, employeeId],
    queryFn: async () => profileSchema.parse(await readApiResponse(await authenticatedFetch(url, { headers: { Authorization: `Bearer ${token}` } }))),
    gcTime: 0,
  });
  const update = useMutation({
    mutationFn: async (remove: boolean) => {
      if (!remove && (!photo || !consent)) throw new Error("Select a photo and confirm permission to display it.");
      await readApiResponse(await authenticatedFetch(url, {
        method: remove ? "DELETE" : "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(remove ? {} : { body: JSON.stringify({ photo, consentConfirmed: true }) }),
      }));
    },
    onSuccess: async () => {
      setPhoto(null); setConsent(false); setError(""); setSaved(true);
      if (fileInput.current) fileInput.current.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/owner/staff-profile-photo"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/staff/profile"] }),
      ]);
    },
    onError: (cause) => setError(cause.message),
  });
  return <div className="min-w-48 max-w-xs space-y-2">
    <StaffProfileAvatar name={name} photo={photo || query.data?.photo} className="h-14 w-14 border" />
    {query.isPending && <p role="status" className="text-xs">Loading profile photo...</p>}
    {query.isError && <p role="alert" className="text-xs text-rose-700">{query.error.message} <Button variant="link" size="sm" onClick={() => void query.refetch()}>Retry</Button></p>}
    <Input ref={fileInput} type="file" accept="image/jpeg,image/png" aria-label={`Profile photo for ${name}`} disabled={preparing || update.isPending || !query.isSuccess} onChange={async (event) => {
      const file = event.target.files?.[0];
      setPhoto(null); setConsent(false); setSaved(false); setError("");
      if (!file) return;
      setPreparing(true);
      try { setPhoto(await preparePhoto(file)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare the photo."); }
      finally { setPreparing(false); }
    }} />
    {photo && <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{name} agrees to this photo being stored and displayed in their staff profile and attendance welcome card.</span></label>}
    <div className="flex flex-wrap gap-2">
      {photo && <Button size="sm" disabled={!consent || update.isPending || preparing} onClick={() => update.mutate(false)}>Save profile photo</Button>}
      {query.data?.photo && <Button size="sm" variant="outline" disabled={preparing || update.isPending} onClick={() => { if (window.confirm(`Remove ${name}'s profile photo? Face enrollment will not be changed.`)) update.mutate(true); }}>Remove photo</Button>}
    </div>
    {preparing && <p role="status" className="text-xs">Preparing photo...</p>}
    {update.isPending && <p role="status" className="text-xs">Saving photo...</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {saved && <p role="status" className="text-xs text-saivie-teal">Profile photo updated.</p>}
  </div>;
}
