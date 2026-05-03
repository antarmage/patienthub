import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, User, Phone, Edit2, Save, X, Calendar, ClipboardList } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/context/DeskAuthContext";
import { usePatient, useUpdatePatient } from "@/hooks/use-desk-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function PatientDetail({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: patient, isLoading } = usePatient(params.id);
  const updatePatient = useUpdatePatient();

  const form = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      lmp: "",
      mode: "",
      referredBy: "",
      address: "",
      clinicianNote: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/login");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (patient) {
      form.reset({
        name: patient.name || "",
        phone: patient.phone || "",
        email: patient.email || "",
        lmp: patient.lmp || "",
        mode: patient.mode || "",
        referredBy: patient.referredBy || "",
        address: patient.address || "",
        clinicianNote: patient.clinicianNote || "",
      });
    }
  }, [patient, form]);

  const onSubmit = async (data: any) => {
    try {
      await updatePatient.mutateAsync({ id: params.id, data });
      toast({
        title: "Patient Updated",
        description: "The patient information has been saved successfully.",
      });
      setIsEditing(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: err.message || "An error occurred while saving.",
      });
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-6 space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Patient Not Found</h2>
          <p className="text-slate-500 mb-6">The patient ID #{params.id} could not be found.</p>
          <Link href="/search">
            <Button>Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/search">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
            <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full inline-block mt-1">
              ID: #{patient.id}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/book?patientId=${patient.id}`}>
            <Button size="sm" variant="secondary" className="shadow-sm" data-testid="button-book-app">
              <Calendar className="mr-2 h-4 w-4" />
              Book Appt
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 pb-20">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-primary-700">Patient Summary</h2>
              </div>
              {!isEditing ? (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setIsEditing(true)} data-testid="button-edit">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-slate-500" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="h-8 bg-primary text-white" disabled={updatePatient.isPending} data-testid="button-save-edit">
                    <Save className="h-4 w-4 mr-1" />
                    {updatePatient.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-500">Full Name</Label>
                  {isEditing ? (
                    <Input {...form.register("name")} data-testid="input-edit-name" />
                  ) : (
                    <div className="font-medium text-slate-800 text-lg">{patient.name}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">Phone</Label>
                  {isEditing ? (
                    <Input {...form.register("phone")} data-testid="input-edit-phone" />
                  ) : (
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {patient.phone ? (
                        <>
                          <Phone className="h-4 w-4 text-slate-400" />
                          {patient.phone}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">Not provided</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">Email</Label>
                  {isEditing ? (
                    <Input {...form.register("email")} type="email" data-testid="input-edit-email" />
                  ) : (
                    <div className="font-medium text-slate-800">{patient.email || <span className="text-slate-400 italic">Not provided</span>}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">Care Mode</Label>
                  {isEditing ? (
                    <Select onValueChange={(v) => form.setValue("mode", v)} defaultValue={form.getValues("mode")}>
                      <SelectTrigger data-testid="select-edit-mode">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pregnancy">Pregnancy</SelectItem>
                        <SelectItem value="Gynaecology">Gynaecology</SelectItem>
                        <SelectItem value="Post-op">Post-op</SelectItem>
                        <SelectItem value="Fertility">Fertility</SelectItem>
                        <SelectItem value="null">Unspecified</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="font-medium text-slate-800">
                      {patient.mode ? (
                        <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md font-semibold text-sm">
                          {patient.mode}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">LMP Date</Label>
                  {isEditing ? (
                    <Input {...form.register("lmp")} type="date" data-testid="input-edit-lmp" />
                  ) : (
                    <div className="font-medium text-slate-800">{patient.lmp || <span className="text-slate-400 italic">Not provided</span>}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-500">Referring Doctor</Label>
                  {isEditing ? (
                    <Input {...form.register("referredBy")} data-testid="input-edit-referred" />
                  ) : (
                    <div className="font-medium text-slate-800">{patient.referredBy || <span className="text-slate-400 italic">None</span>}</div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-500">Address</Label>
                  {isEditing ? (
                    <Input {...form.register("address")} data-testid="input-edit-address" />
                  ) : (
                    <div className="font-medium text-slate-800">{patient.address || <span className="text-slate-400 italic">Not provided</span>}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b px-6 py-4 flex flex-row items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-lg">Clinician Note</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isEditing ? (
                <Textarea 
                  {...form.register("clinicianNote")} 
                  className="min-h-[120px] resize-none" 
                  placeholder="Add front-desk observations or clinician notes here..."
                  data-testid="input-edit-note"
                />
              ) : (
                <div className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[100px]">
                  {patient.clinicianNote || <span className="text-slate-400 italic font-medium">No notes available.</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
}
