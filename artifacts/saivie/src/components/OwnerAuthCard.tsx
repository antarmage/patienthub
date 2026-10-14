import { useState } from "react";
import { Loader2, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthStep = "credentials" | "otp";

export function OwnerAuthCard({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to send verification code");
      else {
        setOtpPhone(data.phone || "your registered number");
        setAuthStep("otp");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    setIsLoading(true);
    try {
      const verifyRes = await fetch("/api/staff/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim(), otp: loginOtp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Invalid verification code");
        return;
      }
      const authRes = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser.trim(), passcode: loginPass.trim(), ticket: verifyData.ticket }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || "Authentication failed");
        return;
      }
      if (authData.user?.role !== "owner") {
        setError("Owner access required.");
        return;
      }
      sessionStorage.setItem("desk_token", authData.staffToken);
      onAuthenticated(authData.staffToken);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {authStep === "credentials" ? <Shield className="h-4 w-4 text-emerald-700" /> : <Phone className="h-4 w-4 text-emerald-700" />}
          {authStep === "credentials" ? "Owner sign-in" : "Verify owner identity"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {authStep === "credentials" ? (
          <>
            <Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="Username" autoComplete="username" />
            <Input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} type="password" placeholder="Passcode" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && sendOtp()} />
            <Button className="w-full" onClick={sendOtp} disabled={isLoading || !loginUser || !loginPass}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send verification code
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">Enter the code sent to {otpPhone}.</p>
            <Input value={loginOtp} onChange={(e) => setLoginOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAuthStep("credentials")}>Back</Button>
              <Button className="flex-1" onClick={verifyOtp} disabled={isLoading || loginOtp.length < 6}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & sign in
              </Button>
            </div>
          </>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}