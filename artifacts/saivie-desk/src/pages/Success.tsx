import { Link, useLocation } from "wouter";
import { CheckCircle2, User, Calendar, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePatient } from "@/hooks/use-desk-api";

export default function Success() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const patientId = searchParams.get("patientId");

  const { data: patient, isLoading } = usePatient(patientId || undefined);

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Success!</h1>
          <p className="text-slate-500 mt-2">The patient workflow was completed successfully.</p>
        </div>

        {isLoading ? (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        ) : patient ? (
          <Card className="mb-8 border-primary/20 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
                    <p className="text-sm text-slate-500 font-medium">ID: #{patient.id}</p>
                  </div>
                  <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 pt-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">Phone</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patient.phone}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 font-medium">Mode</span>
                    <span className="font-semibold text-primary">{patient.mode || "Unspecified"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-col gap-3">
          <Link href="/search">
            <Button size="lg" className="w-full text-base h-14" data-testid="button-next-patient">
              Next Patient
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          {patientId && (
            <Link href={`/patient/${patientId}`}>
              <Button variant="outline" size="lg" className="w-full text-base h-14" data-testid="button-view-patient">
                View Patient Details
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
