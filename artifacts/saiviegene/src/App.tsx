import { useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/Onboarding";
import Auth from "@/pages/Auth";
import Paywall from "@/pages/Paywall";
import Upload from "@/pages/Upload";
import Processing from "@/pages/Processing";
import Dashboard from "@/pages/Dashboard";
import Section from "@/pages/Section";
import { AuthContext, useAuth } from "@/lib/authStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [patientId, setPatientIdState] = useState<string | null>(null);
  return (
    <AuthContext.Provider
      value={{
        token,
        patientId,
        setToken: setTokenState,
        setPatientId: setPatientIdState,
        clearToken: () => { setTokenState(null); setPatientIdState(null); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const onboarded = localStorage.getItem("saiviegene_onboarded") === "true";
  if (!onboarded) return <Redirect to="/" />;
  if (!token) return <Redirect to="/auth" />;
  return <>{children}</>;
}

function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
  const onboarded = localStorage.getItem("saiviegene_onboarded") === "true";
  if (!onboarded) return <Redirect to="/" />;
  if (!token) return <Redirect to="/auth" />;
  if (!subscribed) return <Redirect to="/paywall" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { token } = useAuth();
  const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
  const onboarded = localStorage.getItem("saiviegene_onboarded") === "true";

  return (
    <Switch>
      <Route path="/">
        {onboarded && token && subscribed
          ? <Redirect to="/dashboard" />
          : onboarded && token
          ? <Redirect to="/paywall" />
          : onboarded
          ? <Redirect to="/auth" />
          : <Onboarding />}
      </Route>
      <Route path="/auth">
        {token ? <Redirect to={subscribed ? "/dashboard" : "/paywall"} /> : <Auth />}
      </Route>
      <Route path="/paywall">
        <RequireAuth><Paywall /></RequireAuth>
      </Route>
      <Route path="/upload">
        <RequireSubscription><Upload /></RequireSubscription>
      </Route>
      <Route path="/processing/:jobId">
        <RequireSubscription><Processing /></RequireSubscription>
      </Route>
      <Route path="/dashboard">
        <RequireSubscription><Dashboard /></RequireSubscription>
      </Route>
      <Route path="/section/:key">
        <RequireSubscription><Section /></RequireSubscription>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <div className="mobile-container">
            <AppRoutes />
          </div>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
