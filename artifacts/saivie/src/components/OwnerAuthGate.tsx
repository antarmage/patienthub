import { useState, type ReactNode } from "react";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthStep = "credentials" | "otp" | "authenticated";

interface OwnerAuthGateProps {
  children: (auth: { token: string; signOut: () => void }) => ReactNode;
}

// Owner sign-in (username + passcode + OTP); the token is shared with the other owner-only screens.
export function OwnerAuthGate({ children }: OwnerAuthGateProps) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("desk_token"));
  const [step, setStep] = useState<AuthStep>(() => (sessionStorage.getItem("desk_token") ? "authenticated" : "credentials"));
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signOut = () => {
    sessionStorage.removeItem("desk_token");
    setToken(null);
    setStep("credentials");
  };

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/staff/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.trim(), passcode: pass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to send verification code");
      else {
        setOtpPhone(data.phone || "your registered number");
        setStep("otp");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const verifyRes = await fetch("/api/staff/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.trim(), passcode: pass.trim(), otp: otp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid verification code");
        return;
      }
      const authRes = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.trim(), passcode: pass.trim(), ticket: verifyData.ticket }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || "Authentication failed");
        return;
      }
      sessionStorage.setItem("desk_token", authData.staffToken);
      setToken(authData.staffToken);
      setOtp("");
      setPass("");
      setStep("authenticated");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "authenticated" && token) return <>{children({ token, signOut })}</>;

  return (
    <Card className="mx-auto max-w-md border-slate-200 shadow-sm" data-testid="owner-auth-gate">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-emerald-700" />Owner sign-in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "credentials" ? (
          <>
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username" autoComplete="username" />
            <Input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Passcode" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && sendOtp()} />
            <Button className="w-full" onClick={sendOtp} disabled={loading || !user || !pass}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send verification code
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">Enter the code sent to {otpPhone}.</p>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("credentials")}>Back</Button>
              <Button className="flex-1" onClick={verifyOtp} disabled={loading || otp.length < 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & sign in
              </Button>
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
