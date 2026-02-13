import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
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
import PatientListByCategory from "@/pages/PatientListByCategory";
import OwnerPortal from "@/pages/OwnerPortal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/patient" component={PatientPortal} />
      <Route path="/clinician" component={ClinicianPortal} />
      <Route path="/clinician/patients/:category" component={PatientListByCategory} />
      <Route path="/staff" component={StaffPortal} />
      <Route path="/staff/check-in" component={CheckIn} />
      <Route path="/staff/booking" component={NewBooking} />
      <Route path="/staff/protocol/:id" component={StaffPatientProtocol} />
      <Route path="/staff/create-plan/:id?" component={StaffCarePlan} />
      <Route path="/owner" component={OwnerPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
