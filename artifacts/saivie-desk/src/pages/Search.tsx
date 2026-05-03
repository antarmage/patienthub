import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search as SearchIcon, UserPlus, Phone, Calendar, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/DeskAuthContext";
import { usePatients } from "@/hooks/use-desk-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Search() {
  const { isAuthenticated, logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: patients, isLoading, error } = usePatients(debouncedSearch);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SD</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">SaivieDesk</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Staff: {user?.username}</span>
          <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout">
            Log out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients by name or phone number..."
              className="pl-12 h-14 text-lg shadow-sm bg-white"
              data-testid="input-search"
            />
          </div>
          <Link href="/register">
            <Button size="lg" className="h-14 px-8 text-base shadow-sm" data-testid="button-register-new">
              <UserPlus className="mr-2 h-5 w-5" />
              Register New
            </Button>
          </Link>
        </div>

        <div className="flex-1 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 px-1">
            {debouncedSearch ? "Search Results" : "Recent Patients"}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-red-100">
              <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
              <p className="text-slate-800 font-medium">Failed to load patients</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : patients && patients.length > 0 ? (
            <div className="space-y-3 pb-8">
              {patients.map((patient: any) => (
                <Link key={patient.id} href={`/patient/${patient.id}`}>
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer border-slate-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg text-slate-800">{patient.name}</span>
                          <span className="text-sm px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                            ID: #{patient.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {patient.phone || "No phone"}
                          </span>
                          <span className="flex items-center gap-1">
                            Age: {patient.age}
                          </span>
                          {patient.mode && (
                            <span className="text-primary font-medium">{patient.mode}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm">View</Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-xl border border-dashed">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <SearchIcon className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No patients found</h3>
              <p className="text-slate-500 mt-1 max-w-sm">
                Could not find any patients matching "{debouncedSearch}". Would you like to register them?
              </p>
              <Link href="/register" className="mt-6">
                <Button data-testid="button-register-empty">Register New Patient</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
