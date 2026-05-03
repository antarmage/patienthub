import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function useAuthState() {
  const token = localStorage.getItem("saiviegene_token");
  const subscribed = localStorage.getItem("saiviegene_subscribed") === "true";
  const onboarded = localStorage.getItem("saiviegene_onboarded") === "true";
  return { token, subscribed, onboarded };
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, onboarded } = useAuthState();
  const [location] = useLocation();
  if (!onboarded) return <Redirect to="/" />;
  if (!token) return <Redirect to="/auth" />;
  return <>{children}</>;
}

function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { token, subscribed, onboarded } = useAuthState();
  if (!onboarded) return <Redirect to="/" />;
  if (!token) return <Redirect to="/auth" />;
  if (!subscribed) return <Redirect to="/paywall" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { token, subscribed, onboarded } = useAuthState();

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
        <div className="mobile-container">
          <AppRoutes />
        </div>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
