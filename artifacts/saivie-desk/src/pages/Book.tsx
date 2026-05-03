import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/DeskAuthContext";
import { usePatient, useProviders, useCreateAppointment, type DeskProvider } from "@/hooks/use-desk-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Type is required"),
  providerId: z.coerce.number().optional(),
});

export default function Book() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(window.location.search);
  const patientIdStr = searchParams.get("patientId");
  const patientId = patientIdStr ? parseInt(patientIdStr, 10) : undefined;

  const { data: patient, isLoading: patientLoading } = usePatient(patientId);
  const { data: providers, isLoading: providersLoading } = useProviders();
  const createAppointment = useCreateAppointment();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: "",
      time: "",
      type: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
    if (!patientIdStr && isAuthenticated) setLocation("/search");
  }, [isAuthenticated, patientIdStr, setLocation]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!patient) return;
    try {
      await createAppointment.mutateAsync({
        patientId: patient.id,
        providerId: data.providerId || null,
        date: data.date,
        time: data.time,
        type: data.type,
      });
      setLocation(`/success?patientId=${patient.id}`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: err.message || "An error occurred while booking.",
      });
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center sticky top-0 z-10">
        <Link href={patientId ? `/patient/${patientId}` : "/search"}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full mr-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Book Appointment</h1>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-6">
        {patientLoading ? (
          <Skeleton className="h-20 w-full mb-6" />
        ) : patient ? (
          <Card className="mb-6 border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Patient</p>
                <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
              </div>
              <div className="text-right">
                <span className="text-xs bg-white px-2 py-1 rounded shadow-sm font-medium text-slate-600 border border-slate-100">
                  ID: #{patient.id}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
            Patient not found
          </div>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>Select the date, time, and service required.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-book-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-book-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-book-type">
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Consultation">Consultation</SelectItem>
                          <SelectItem value="Scan">Scan</SelectItem>
                          <SelectItem value="Blood Test">Blood Test</SelectItem>
                          <SelectItem value="Procedure">Procedure</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger disabled={providersLoading} data-testid="select-book-provider">
                            <SelectValue placeholder={providersLoading ? "Loading providers..." : "Select provider"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers?.map((p: DeskProvider) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} {p.specialty ? `(${p.specialty})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-4 h-12 text-base" 
                  disabled={createAppointment.isPending || patientLoading}
                  data-testid="button-book-submit"
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
