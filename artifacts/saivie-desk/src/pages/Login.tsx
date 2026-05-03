import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/DeskAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, ArrowLeft } from "lucide-react";

type Step = "credentials" | "otp";

export default function Login() {
  const [step, setStep] = useState<Step>("credentials");
  const [identifier, setIdentifier] = useState("");
  const [passcode, setPasscode] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: data.error || "Invalid username or passcode.",
        });
        return;
      }
      setMaskedPhone(data.phone || "");
      setStep("otp");
    } catch {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to reach the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid Code", description: "Please enter the 6-digit code." });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, passcode, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.error || "Invalid or expired code.",
        });
        return;
      }
      login(data.staffToken, data.user);
      setLocation("/search");
    } catch {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to reach the server. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-sm">
            <Stethoscope className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">SaivieDesk</h1>
          <p className="text-slate-500 mt-1">Reception & Patient Intake</p>
        </div>

        <Card className="shadow-lg border-0 shadow-slate-200/50">
          <CardHeader>
            {step === "otp" && (
              <button
                onClick={() => { setStep("credentials"); setOtp(""); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-2 -mt-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <CardTitle>{step === "credentials" ? "Staff Login" : "Verify Your Identity"}</CardTitle>
            <CardDescription>
              {step === "credentials"
                ? "Enter your staff credentials to access the desk system."
                : `Enter the 6-digit code sent to ${maskedPhone || "your registered phone"} via WhatsApp.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Username or Phone</Label>
                  <Input
                    id="identifier"
                    placeholder="e.g. desk1 or +2348012345678"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isLoading}
                    autoComplete="off"
                    data-testid="input-login-identifier"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passcode">PIN Passcode</Label>
                  <Input
                    id="passcode"
                    type="password"
                    placeholder="Enter your PIN"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-login-passcode"
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-6" disabled={isLoading} data-testid="button-login-submit">
                  {isLoading ? "Sending code…" : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="number"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                    data-testid="input-login-otp"
                    required
                  />
                </div>
                <Button type="submit" className="w-full mt-6" disabled={isLoading || otp.length !== 6} data-testid="button-otp-submit">
                  {isLoading ? "Verifying…" : "Sign In"}
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  Code expires in 5 minutes. Check your WhatsApp.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
