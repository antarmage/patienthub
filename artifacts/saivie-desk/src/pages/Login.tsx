import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/DeskAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/desk/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, passcode }),
      });
      
      if (!res.ok) throw new Error("Invalid credentials");
      
      const data = await res.json();
      login(data.staffToken, data.user);
      setLocation("/search");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid username or passcode. Please try again.",
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
            <CardTitle>Staff Login</CardTitle>
            <CardDescription>Enter your staff credentials to access the desk system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="e.g. desk1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="off"
                  data-testid="input-login-username"
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
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
