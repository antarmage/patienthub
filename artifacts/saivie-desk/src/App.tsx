import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeskAuthProvider } from "@/context/DeskAuthContext";

import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Search from "@/pages/Search";
import PatientDetail from "@/pages/PatientDetail";
import Register from "@/pages/Register";
import Book from "@/pages/Book";
import Success from "@/pages/Success";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/search" component={Search} />
      <Route path="/patient/:id" component={PatientDetail} />
      <Route path="/register" component={Register} />
      <Route path="/book" component={Book} />
      <Route path="/success" component={Success} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <DeskAuthProvider>
            <Router />
            <Toaster />
          </DeskAuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
