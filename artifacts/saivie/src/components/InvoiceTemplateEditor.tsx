import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, LogOut, Save, Shield, Trash2 } from "lucide-react";
import { InvoiceDocument, type InvoiceTemplateData } from "@/components/InvoiceDocument";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AuthStep = "credentials" | "otp" | "authenticated";

const defaultTemplate: InvoiceTemplateData = {
  clinicName: "",
  clinicAddress: "",
  clinicPhone: "",
  clinicEmail: "",
  taxRegistration: "",
  logoUrl: null,
  footerText: "",
  sections: { patientContact: true, taxBreakdown: true, paymentMethod: true, notes: true },
};

const sectionOptions = [
  { id: "patientContact", label: "Patient contact details" },
  { id: "taxBreakdown", label: "Tax breakdown" },
  { id: "paymentMethod", label: "Payment method" },
  { id: "notes", label: "Invoice notes" },
] as const;

export function InvoiceTemplateEditor() {
  const queryClient = useQueryClient();
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem("desk_token"));
  const [authStep, setAuthStep] = useState<AuthStep>(() => sessionStorage.getItem("desk_token") ? "authenticated" : "credentials");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [draft, setDraft] = useState<InvoiceTemplateData>(defaultTemplate);
  const templateQueryKey = ["/api/owner/invoice-template", authToken];

  const signOut = () => {
    sessionStorage.removeItem("desk_token");
    setAuthToken(null);
    setAuthStep("credentials");
    setDraft(defaultTemplate);
  };

  const templateQuery = useQuery<InvoiceTemplateData>({
    queryKey: templateQueryKey,
    enabled: authStep === "authenticated" && !!authToken,
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/owner/invoice-template", { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401 || res.status === 403) {
        signOut();
        throw new Error("Owner session expired. Please sign in again.");
      }
      if (!res.ok) throw new Error("Failed to load invoice template");
      return res.json();
    },
  });

  useEffect(() => {
    if (templateQuery.data) setDraft(templateQuery.data);
  }, [templateQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { logoUrl: _logoUrl, ...payload } = draft;
      const res = await fetch("/api/owner/invoice-template", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save invoice template");
      return data as InvoiceTemplateData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(templateQueryKey, data);
      setDraft(data);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("logo", file);
      const res = await fetch("/api/owner/invoice-template/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to upload logo");
      return data as InvoiceTemplateData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(templateQueryKey, data);
      setDraft(data);
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/owner/invoice-template/logo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to remove logo");
      return data as InvoiceTemplateData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(templateQueryKey, data);
      setDraft(data);
    },
  });

  const sendOtp = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/staff/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setLoginError(data.error || "Failed to send verification code");
      else {
        setOtpPhone(data.phone || "your registered number");
        setAuthStep("otp");
      }
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoginError("");
    setLoginLoading(true);
    try {
      const verifyRes = await fetch("/api/staff/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim(), otp: loginOtp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setLoginError(verifyData.error || "Invalid verification code");
        return;
      }
      const authRes = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim(), ticket: verifyData.ticket }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setLoginError(authData.error || "Authentication failed");
        return;
      }
      sessionStorage.setItem("desk_token", authData.staffToken);
      setAuthToken(authData.staffToken);
      setLoginOtp("");
      setLoginPass("");
      setAuthStep("authenticated");
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  if (authStep !== "authenticated") {
    return (
      <Card className="mx-auto max-w-md border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-emerald-700" />Owner sign-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authStep === "credentials" ? (
            <>
              <Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Username" autoComplete="username" />
              <Input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} type="password" placeholder="Passcode" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && sendOtp()} />
              <Button className="w-full" onClick={sendOtp} disabled={loginLoading || !loginUser || !loginPass}>
                {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send verification code
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Enter the code sent to {otpPhone}.</p>
              <Input value={loginOtp} onChange={(e) => setLoginOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setAuthStep("credentials")}>Back</Button>
                <Button className="flex-1" onClick={verifyOtp} disabled={loginLoading || loginOtp.length < 6}>
                  {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & sign in
                </Button>
              </div>
            </>
          )}
          {loginError && <p role="alert" className="text-sm text-rose-600">{loginError}</p>}
        </CardContent>
      </Card>
    );
  }

  if (templateQuery.isLoading) return <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading invoice template...</div>;

  const updateField = (field: keyof InvoiceTemplateData, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const updateSection = (section: keyof NonNullable<InvoiceTemplateData["sections"]>, checked: boolean) => {
    setDraft((current) => ({ ...current, sections: { ...defaultTemplate.sections, ...current.sections, [section]: checked } }));
  };

  return (
    <div className="space-y-6" data-testid="view-invoice-template">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Invoice Template</h2>
          <p className="mt-1 text-sm text-slate-500">Set the clinic details and sections shown on receptionist invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">A4 · Shared clinic template</Badge>
          <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      {templateQuery.isError && <p role="alert" className="text-sm text-rose-600">{(templateQuery.error as Error).message}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4"><CardTitle className="text-base">Clinic details</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1.5">
              <label htmlFor="invoice-clinic-name" className="text-sm font-medium">Clinic name</label>
              <Input id="invoice-clinic-name" value={draft.clinicName || ""} onChange={(e) => updateField("clinicName", e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invoice-clinic-address" className="text-sm font-medium">Address</label>
              <Textarea id="invoice-clinic-address" value={draft.clinicAddress || ""} onChange={(e) => updateField("clinicAddress", e.target.value)} maxLength={500} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><label htmlFor="invoice-clinic-phone" className="text-sm font-medium">Phone</label><Input id="invoice-clinic-phone" value={draft.clinicPhone || ""} onChange={(e) => updateField("clinicPhone", e.target.value)} maxLength={40} /></div>
              <div className="space-y-1.5"><label htmlFor="invoice-clinic-email" className="text-sm font-medium">Email</label><Input id="invoice-clinic-email" type="email" value={draft.clinicEmail || ""} onChange={(e) => updateField("clinicEmail", e.target.value)} maxLength={254} /></div>
            </div>
            <div className="space-y-1.5"><label htmlFor="invoice-tax-registration" className="text-sm font-medium">Tax registration number</label><Input id="invoice-tax-registration" value={draft.taxRegistration || ""} onChange={(e) => updateField("taxRegistration", e.target.value)} maxLength={80} /></div>
            <div className="space-y-2">
              <label htmlFor="invoice-logo" className="text-sm font-medium">Clinic logo</label>
              <div className="flex flex-wrap items-center gap-3">
                {draft.logoUrl && (
                  <>
                    <img src={draft.logoUrl} alt="Current clinic logo" className="h-12 w-16 border border-slate-200 object-contain p-1" />
                    <Button type="button" variant="outline" size="icon" title="Remove clinic logo" aria-label="Remove clinic logo" onClick={() => removeLogoMutation.mutate()} disabled={removeLogoMutation.isPending}>
                      {removeLogoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </>
                )}
                <Input id="invoice-logo" type="file" accept="image/jpeg,image/png,image/webp" className="max-w-sm" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogoMutation.mutate(file); e.currentTarget.value = ""; }} />
              </div>
              <p className="text-xs text-slate-500">JPG, PNG, or WebP, up to 1 MB.</p>
              {uploadLogoMutation.isPending && <p className="text-xs text-slate-500">Uploading logo...</p>}
              {uploadLogoMutation.isError && <p role="alert" className="text-xs text-rose-600">{uploadLogoMutation.error.message}</p>}
              {removeLogoMutation.isError && <p role="alert" className="text-xs text-rose-600">{removeLogoMutation.error.message}</p>}
            </div>
            <div className="space-y-1.5"><label htmlFor="invoice-footer" className="text-sm font-medium">Footer message</label><Textarea id="invoice-footer" value={draft.footerText || ""} onChange={(e) => updateField("footerText", e.target.value)} maxLength={500} rows={2} placeholder="Thank you for choosing us." /></div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold">Visible invoice sections</p>
              {sectionOptions.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                  <Checkbox checked={draft.sections?.[option.id] ?? true} onCheckedChange={(checked) => updateSection(option.id, checked === true)} />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || uploadLogoMutation.isPending} data-testid="btn-save-invoice-template">
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save template
              </Button>
              {saveMutation.isSuccess && <span className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Saved</span>}
            </div>
            {saveMutation.isError && <p role="alert" className="text-sm text-rose-600">{saveMutation.error.message}</p>}
          </CardContent>
        </Card>

        <section className="min-w-0 space-y-3" aria-label="Invoice template preview">
          <div className="flex items-center gap-2"><ImagePlus className="h-4 w-4 text-emerald-700" /><h3 className="text-sm font-semibold text-slate-800">Live A4 preview</h3></div>
          <InvoiceDocument
            template={draft}
            patient={{ name: "Aarohi Sharma", phone: "+91 98765 43210", email: "aarohi@example.com", address: "Bengaluru, Karnataka", type: "Fertility", isPrimeMember: true }}
            items={[
              { name: "Initial Consultation", price: 1200, taxableSubtotal: 1200, quantity: 1, taxRate: 0, taxAmount: 0, lineTotal: 1200 },
              { name: "Complete Blood Count (CBC)", category: "Lab Test", price: 450, taxableSubtotal: 428.57, quantity: 1, taxRate: 5, taxAmount: 17.14, catalogPriceIncludesTax: true, discountAmount: 85.71, discountLabel: "Prime lab discount 20%", lineTotal: 360 },
            ]}
            subtotal={1628.57}
            tax={17.14}
            discountTotal={85.71}
            discountDetails={[{ catalogItemId: 2, name: "Complete Blood Count (CBC)", amount: 85.71, label: "Prime lab discount 20%" }]}
            total={1560}
            paymentMethod="UPI"
            notes="Sample invoice note"
            draft
          />
        </section>
      </div>
    </div>
  );
}