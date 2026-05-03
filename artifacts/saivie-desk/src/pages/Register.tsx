import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/DeskAuthContext";
import { useCreatePatient, useCreateAppointment, useProviders, type DeskProvider } from "@/hooks/use-desk-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CARE_MODES = ["Pregnancy", "Gynaecology", "Post-op"] as const;
const APPOINTMENT_TYPES = ["Consultation", "Blood Test", "Scan"] as const;

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(5, "Phone is required"),
  dob: z.string().min(1, "Date of birth is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  lmp: z.string().optional(),
  procedureDate: z.string().optional(),
  mode: z.enum(CARE_MODES, { message: "Care mode is required" }),
  referredBy: z.string().optional(),
  condition: z.string().optional(),
  bookAppointment: z.boolean().default(false),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  appointmentType: z.string().optional(),
  providerId: z.coerce.number().optional(),
});

function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [duplicatePhoneId, setDuplicatePhoneId] = useState<number | null>(null);

  const createPatient = useCreatePatient();
  const createAppointment = useCreateAppointment();
  const { data: providers } = useProviders();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      dob: "",
      email: "",
      address: "",
      lmp: "",
      procedureDate: "",
      mode: undefined,
      referredBy: "",
      condition: "",
      bookAppointment: false,
      appointmentDate: "",
      appointmentTime: "",
      appointmentType: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  const onSubmit = async (data: FormValues) => {
    setDuplicatePhoneId(null);
    try {
      const patientData = {
        name: data.name,
        phone: data.phone,
        age: ageFromDob(data.dob),
        dob: data.dob,
        email: data.email || null,
        address: data.address || null,
        lmp: data.mode !== "Post-op" ? (data.lmp || null) : null,
        procedureDate: data.mode === "Post-op" ? (data.procedureDate || null) : null,
        mode: data.mode || null,
        referredBy: data.referredBy || null,
        condition: data.condition || null,
      };

      const patient = await createPatient.mutateAsync(patientData);

      if (data.bookAppointment && data.appointmentDate && data.appointmentTime && data.appointmentType) {
        await createAppointment.mutateAsync({
          patientId: patient.id,
          providerId: data.providerId || null,
          date: data.appointmentDate,
          time: data.appointmentTime,
          type: data.appointmentType,
        });
      }

      setLocation(`/success?patientId=${patient.id}`);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; data?: { existingId?: number }; message?: string };
      if (apiErr.status === 409 && apiErr.data?.existingId) {
        setDuplicatePhoneId(apiErr.data.existingId);
      } else {
        toast({
          variant: "destructive",
          title: "Registration Failed",
          description: apiErr.message || "An unexpected error occurred.",
        });
      }
    }
  };

  const validateStep = async () => {
    const step1Fields = ["name", "phone", "dob", "email", "address"] as const;
    const step2Fields = ["lmp", "mode", "referredBy", "condition"] as const;
    const fieldsToValidate = step === 1 ? step1Fields : step === 2 ? step2Fields : [];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/search">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Register New Patient</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6">
        <div className="mb-8 flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-200 -z-10" />
          <div className={`absolute left-0 top-1/2 h-0.5 bg-primary transition-all duration-300 -z-10 ${step === 1 ? "w-0" : step === 2 ? "w-1/2" : "w-full"}`} />
          
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-8 w-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors
                ${step >= s ? "bg-primary text-white" : "bg-slate-100 text-slate-400 border border-slate-200"}`}
            >
              {s}
            </div>
          ))}
        </div>

        {duplicatePhoneId && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Duplicate Phone Number</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>This phone number is already registered.</span>
              <Link href={`/patient/${duplicatePhoneId}`}>
                <Button variant="outline" size="sm" className="bg-white hover:bg-slate-100">
                  View Existing Patient
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">
                  {step === 1 && "Personal Information"}
                  {step === 2 && "Clinical Details"}
                  {step === 3 && "First Appointment"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={step === 1 ? "block space-y-4" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient name" {...field} data-testid="input-register-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Mobile number" type="tel" {...field} data-testid="input-register-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-register-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Email address" type="email" {...field} data-testid="input-register-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="City or full address" {...field} data-testid="input-register-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={step === 2 ? "block space-y-4" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Care Mode *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-register-mode">
                              <SelectValue placeholder="Select patient mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CARE_MODES.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("mode") !== "Post-op" && (
                    <FormField
                      control={form.control}
                      name="lmp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LMP Date (Last Menstrual Period)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-register-lmp" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {form.watch("mode") === "Post-op" && (
                    <FormField
                      control={form.control}
                      name="procedureDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Procedure Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-register-procedure-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chief Complaint / Condition</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g. Routine scan, Pelvic pain" {...field} data-testid="input-register-condition" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referredBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referring Doctor</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Name" {...field} data-testid="input-register-referred" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className={step === 3 ? "block space-y-6" : "hidden"}>
                  <FormField
                    control={form.control}
                    name="bookAppointment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold text-slate-800">Book Initial Appointment</FormLabel>
                          <FormDescription className="text-sm text-slate-500">
                            Schedule their first visit now
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-register-book" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("bookAppointment") && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="appointmentDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} required={form.watch("bookAppointment")} data-testid="input-register-app-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="appointmentTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time *</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} required={form.watch("bookAppointment")} data-testid="input-register-app-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="appointmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} required={form.watch("bookAppointment")}>
                              <FormControl>
                                <SelectTrigger data-testid="select-register-app-type">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {APPOINTMENT_TYPES.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
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
                                <SelectTrigger data-testid="select-register-app-provider">
                                  <SelectValue placeholder="Select provider" />
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)} data-testid="button-register-prev">
                  Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <Button type="button" onClick={validateStep} data-testid="button-register-next">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={createPatient.isPending || createAppointment.isPending} data-testid="button-register-submit">
                  {createPatient.isPending ? "Registering..." : "Complete Registration"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}

