import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/Onboarding";
import Auth from "@/pages/Auth";
import Paywall from "@/pages/Paywall";
import Upload from "@/pages/Upload";
import Processing from "@/pages/Processing";
import Dashboard from "@/pages/Dashboard";
import Section from "@/pages/Section";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

function AppRoutes() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("saiviegene_token");
    const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
    const onboarded = localStorage.getItem("saiviegene_onboarded") === "true";

    if (location === "/" || location === "") {
      if (!onboarded) return;
      if (!token) { navigate("/auth"); return; }
      if (!subscribed) { navigate("/paywall"); return; }
      navigate("/dashboard");
    }
  }, []);

  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/auth" component={Auth} />
      <Route path="/paywall" component={Paywall} />
      <Route path="/upload" component={Upload} />
      <Route path="/processing/:jobId" component={Processing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/section/:key" component={Section} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <div className="mobile-container">
          <AppRoutes />
        </div>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
