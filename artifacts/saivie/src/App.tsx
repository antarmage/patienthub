import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { isStaffSessionExpired, STAFF_SESSION_EXPIRED_EVENT } from "./lib/authenticatedFetch";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import PatientPortal from "@/pages/PatientPortal";
import ClinicianPortal from "@/pages/ClinicianPortal";
import StaffPortal from "@/pages/StaffPortal";
import StaffPatientProtocol from "@/pages/StaffPatientProtocol";
import StaffCarePlan from "@/pages/StaffCarePlan";
import CheckIn from "@/pages/CheckIn";
import NewBooking from "@/pages/NewBooking";
import OnlineConsultation from "@/pages/OnlineConsultation";
import PatientListByCategory from "@/pages/PatientListByCategory";
import OwnerPortal from "@/pages/OwnerPortal";
import VisitSurvey from "@/pages/VisitSurvey";
import Kiosk from "@/pages/Kiosk";
import { useBrandFavicon } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

function BrandFavicon() {
  useBrandFavicon();
  return null;
}

function RecoveryPortalRedirect() {
  useEffect(() => {
    window.location.replace(`${import.meta.env.BASE_URL}recover/index.html`);
  }, []);
  return <p className="p-6 text-sm text-saivie-teal">Opening recovery portal...</p>;
}

function Router() {
  const [, setLocation] = useLocation();
  const [sessionExpired, setSessionExpired] = useState(isStaffSessionExpired);
  useEffect(() => {
    const expire = () => {
      setSessionExpired(true);
      void queryClient.cancelQueries();
      queryClient.clear();
    };
    window.addEventListener(STAFF_SESSION_EXPIRED_EVENT, expire);
    if (isStaffSessionExpired()) expire();
    return () => window.removeEventListener(STAFF_SESSION_EXPIRED_EVENT, expire);
  }, []);

  if (sessionExpired) return (
    <main className="flex min-h-screen items-center justify-center bg-saivie-ivory p-6">
      <section role="alert" className="w-full max-w-lg space-y-4 rounded-2xl border bg-white p-6">
        <h1 className="font-serif text-2xl text-saivie-plum">Please sign in again</h1>
        <p className="text-sm text-muted-foreground">Your staff session has expired or is no longer valid. Sessions last one hour, but an API restart also ends them.</p>
        <p className="text-sm text-muted-foreground">Unsaved changes have not been submitted. Sign in again to continue.</p>
        <Button onClick={() => {
          sessionStorage.removeItem("billing_staff_token");
          localStorage.removeItem("staffUsername");
          localStorage.removeItem("staffDisplayName");
          localStorage.removeItem("clinicianProvider");
          queryClient.clear();
          setLocation("/", { replace: true });
          setSessionExpired(false);
        }}>Sign in again</Button>
      </section>
    </main>
  );
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/patient" component={PatientPortal} />
      <Route path="/consultation" component={OnlineConsultation} />
      <Route path="/onboarding/:id" component={VisitSurvey} />
      <Route path="/clinician" component={ClinicianPortal} />
      <Route path="/clinician/patients/:category" component={PatientListByCategory} />
      <Route path="/staff" component={StaffPortal} />
      <Route path="/staff/check-in" component={CheckIn} />
      <Route path="/staff/booking" component={NewBooking} />
      <Route path="/staff/protocol/:id" component={StaffPatientProtocol} />
      <Route path="/staff/create-plan/:id?" component={StaffCarePlan} />
      <Route path="/owner" component={OwnerPortal} />
      <Route path={/^\/recover\/?$/} component={RecoveryPortalRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Toaster />
          <BrandFavicon />
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
