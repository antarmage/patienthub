import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  Activity, 
  Brain, 
  Dumbbell, 
  Sparkles, 
  FlaskConical, 
  CalendarCheck,
  ChevronRight,
  Search,
  Bell,
  Menu,
  Apple,
  Heart,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Pill,
  ClipboardList,
  ArrowRightCircle,
  FileText,
  Clock,
  TrendingUp,
  Scale,
  Dna,
  Zap,
  Leaf,
  Info,
  Plus,
  Minus,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  Upload,
  Camera,
  Eye,
  Loader2,
  X,
  Image as ImageIcon,
  RefreshCw,
  Star,
  Crown,
  IndianRupee,
  Receipt,
  Printer,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";



import { Link, useLocation } from "wouter";

function UploadRecordsDialog({ isOpen, onClose, patient }: { isOpen: boolean; onClose: () => void; patient: any }) {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; preview: string; type: string } | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [activeDocTab, setActiveDocTab] = useState("prescription");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocrMutation = useMutation({
    mutationFn: async (imageData: { image: string; mimeType: string }) => {
      const res = await fetch('/api/ocr/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageData),
      });
      if (!res.ok) throw new Error('OCR processing failed');
      return res.json();
    },
    onSuccess: (data) => {
      setOcrResult(data.data);
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload JPG, PNG, or PDF files.');
      return;
    }

    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKB} KB`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedFile({
        name: file.name,
        size: sizeStr,
        preview: base64,
        type: file.type,
      });
      setOcrResult(null);
      
      if (activeDocTab === 'prescription') {
        ocrMutation.mutate({ image: base64, mimeType: file.type });
      }
    };
    reader.readAsDataURL(file);
  }, [activeDocTab]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const resetDialog = () => {
    setUploadedFile(null);
    setOcrResult(null);
    setActiveDocTab("prescription");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Upload Patient Records
          </DialogTitle>
          <DialogDescription>
            Attach external medical documents for <span className="font-bold text-slate-900">{patient?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeDocTab} onValueChange={(v) => { setActiveDocTab(v); setUploadedFile(null); setOcrResult(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescription" data-testid="tab-prescription">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Prescriptions
            </TabsTrigger>
            <TabsTrigger value="blood" data-testid="tab-blood">Blood Reports</TabsTrigger>
            <TabsTrigger value="usg" data-testid="tab-usg">USG / Scans</TabsTrigger>
          </TabsList>

          {activeDocTab === 'prescription' && (
            <div className="mt-2 px-1">
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <p className="text-xs text-indigo-700 font-medium">AI-powered handwriting recognition will automatically read prescriptions</p>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            data-testid="input-file-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          {!uploadedFile ? (
            <div
              className="mt-4 p-8 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              data-testid="drop-zone-upload"
            >
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                <Upload className="w-7 h-7 text-indigo-500" />
              </div>
              <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, or PDF (max 10MB)</p>
              {activeDocTab === 'prescription' && (
                <p className="text-xs text-indigo-600 font-medium mt-2">Handwritten prescriptions will be automatically read</p>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{uploadedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{uploadedFile.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500" onClick={() => { setUploadedFile(null); setOcrResult(null); }} data-testid="btn-remove-file">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {uploadedFile.preview && uploadedFile.type.startsWith('image/') && (
                  <div className="p-3 bg-white flex justify-center">
                    <img src={uploadedFile.preview} alt="Preview" className="max-h-48 rounded border border-slate-100 object-contain" />
                  </div>
                )}
              </div>

              {activeDocTab === 'prescription' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Prescription Reading</Label>
                    {ocrMutation.isPending && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                  </div>

                  {ocrMutation.isPending && (
                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-lg flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-sm font-medium text-indigo-700">Reading handwritten prescription...</p>
                      <p className="text-xs text-indigo-500">AI is analyzing the document</p>
                    </div>
                  )}

                  {ocrMutation.isError && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                      <p className="text-sm font-medium text-rose-700">Could not read the prescription. Please try a clearer image.</p>
                      <Button size="sm" variant="outline" className="mt-2 text-xs border-rose-200 text-rose-600" onClick={() => ocrMutation.mutate({ image: uploadedFile.preview, mimeType: uploadedFile.type })} data-testid="btn-retry-ocr">
                        Try Again
                      </Button>
                    </div>
                  )}

                  {ocrResult && (
                    <div className="bg-white border border-indigo-100 rounded-lg overflow-hidden">
                      <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Extracted Information</span>
                        <Badge className={`text-[10px] ${ocrResult.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' : ocrResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {ocrResult.confidence === 'high' ? 'High Confidence' : ocrResult.confidence === 'medium' ? 'Medium Confidence' : 'Low Confidence'}
                        </Badge>
                      </div>

                      <div className="p-4 space-y-4">
                        {ocrResult.doctorName && (
                          <div className="flex gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase w-24 shrink-0 pt-0.5">Doctor</span>
                            <span className="text-sm text-slate-800">{ocrResult.doctorName}</span>
                          </div>
                        )}
                        {ocrResult.date && (
                          <div className="flex gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase w-24 shrink-0 pt-0.5">Date</span>
                            <span className="text-sm text-slate-800">{ocrResult.date}</span>
                          </div>
                        )}
                        {ocrResult.diagnosis && (
                          <div className="flex gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase w-24 shrink-0 pt-0.5">Diagnosis</span>
                            <span className="text-sm text-slate-800 font-medium">{ocrResult.diagnosis}</span>
                          </div>
                        )}

                        {ocrResult.medications?.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Medications</span>
                            <div className="space-y-2">
                              {ocrResult.medications.map((med: any, i: number) => (
                                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100" data-testid={`medication-item-${i}`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                      <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
                                      <span className="text-sm font-bold text-slate-900">{med.name}</span>
                                    </div>
                                    {med.dosage && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{med.dosage}</Badge>}
                                  </div>
                                  <div className="ml-6 mt-1.5 space-y-0.5">
                                    {med.frequency && <p className="text-xs text-slate-600"><span className="font-medium">Frequency:</span> {med.frequency}</p>}
                                    {med.duration && <p className="text-xs text-slate-600"><span className="font-medium">Duration:</span> {med.duration}</p>}
                                    {med.instructions && <p className="text-xs text-slate-500 italic">{med.instructions}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {ocrResult.notes && (
                          <div className="flex gap-3">
                            <span className="text-xs font-bold text-slate-500 uppercase w-24 shrink-0 pt-0.5">Notes</span>
                            <span className="text-sm text-slate-700">{ocrResult.notes}</span>
                          </div>
                        )}

                        {ocrResult.rawText && (
                          <details className="mt-2">
                            <summary className="text-xs font-bold text-slate-400 uppercase cursor-pointer hover:text-slate-600">Raw Text</summary>
                            <pre className="mt-2 p-3 bg-slate-50 rounded text-xs text-slate-600 whitespace-pre-wrap border border-slate-100 max-h-32 overflow-y-auto">{ocrResult.rawText}</pre>
                          </details>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Notes / Description</Label>
            <Textarea placeholder="Add any relevant details about these documents..." className="h-20" data-testid="input-upload-notes" />
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={resetDialog} data-testid="btn-cancel-upload">Cancel</Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={!uploadedFile || ocrMutation.isPending}
            onClick={resetDialog}
            data-testid="btn-confirm-upload"
          >
            {ocrMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Upload Documents'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrimeMembersView({ patients }: { patients: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState("");

  const primeMembers = useMemo(() => patients.filter((p: any) => p.isPrimeMember), [patients]);
  const nonPrimePatients = useMemo(() => {
    const term = addSearchTerm.toLowerCase();
    return patients.filter((p: any) => !p.isPrimeMember && (
      p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term))
    ));
  }, [patients, addSearchTerm]);

  const filteredPrime = useMemo(() => {
    if (!searchTerm) return primeMembers;
    const term = searchTerm.toLowerCase();
    return primeMembers.filter((p: any) => p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term)));
  }, [primeMembers, searchTerm]);

  const togglePrimeMutation = useMutation({
    mutationFn: async ({ patientId, isPrimeMember }: { patientId: number; isPrimeMember: boolean }) => {
      const res = await fetch(`/api/patients/${patientId}/prime-member`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimeMember }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">Prime Members</h2>
            <p className="text-sm text-slate-500">Manage premium membership for patients</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200" data-testid="badge-prime-count">
            <Star className="w-3 h-3 mr-1" /> {primeMembers.length} Prime Members
          </Badge>
          <Button 
            size="sm" 
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
            onClick={() => { setShowAddDialog(true); setAddSearchTerm(""); }}
            data-testid="btn-add-prime-member"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Prime Member
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-9">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-3 border-b border-slate-100 flex justify-between items-center">
              <CardTitle className="text-sm font-bold text-slate-700">Prime Members List</CardTitle>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-xs"
                  data-testid="input-prime-search"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500 w-10">#</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500">Patient</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500">Phone</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500">Type</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500">Since</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-slate-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrime.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-slate-400">
                        {searchTerm ? "No matching prime members found" : "No prime members yet. Add patients as prime members using the button above."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredPrime.map((p: any, idx: number) => (
                    <TableRow key={p.id} className="hover:bg-amber-50/30" data-testid={`row-prime-${p.id}`}>
                      <TableCell className="text-xs text-slate-400">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">
                            {p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-900 flex items-center gap-1">
                              {p.name} <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            </p>
                            <p className="text-[10px] text-slate-500">ID: {p.id} • Age: {p.age}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{p.type || p.condition || "General"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.primeMemberSince || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => togglePrimeMutation.mutate({ patientId: p.id, isPrimeMember: false })}
                          disabled={togglePrimeMutation.isPending}
                          data-testid={`btn-remove-prime-${p.id}`}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3 space-y-4">
          <Card className="shadow-sm border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-amber-900">Prime Stats</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-700">Total Members</span>
                  <span className="font-bold text-amber-900">{primeMembers.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-700">Total Patients</span>
                  <span className="font-bold text-amber-900">{patients.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-700">Prime Rate</span>
                  <span className="font-bold text-amber-900">{patients.length > 0 ? ((primeMembers.length / patients.length) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Add Prime Member
            </DialogTitle>
            <DialogDescription>Search for a patient and add them as a prime member</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search patient by name or phone..."
              value={addSearchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-add-prime-search"
            />
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-slate-100">
              {addSearchTerm.length < 2 && (
                <div className="py-6 text-center text-sm text-slate-400">Type at least 2 characters to search</div>
              )}
              {addSearchTerm.length >= 2 && nonPrimePatients.length === 0 && (
                <div className="py-6 text-center text-sm text-slate-400">No matching patients found</div>
              )}
              {addSearchTerm.length >= 2 && nonPrimePatients.slice(0, 20).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded" data-testid={`add-prime-row-${p.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 font-bold text-xs">
                      {p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-500">ID: {p.id} • {p.phone || 'No phone'} • {p.type || 'General'}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => {
                      togglePrimeMutation.mutate({ patientId: p.id, isPrimeMember: true });
                      setShowAddDialog(false);
                    }}
                    disabled={togglePrimeMutation.isPending}
                    data-testid={`btn-make-prime-${p.id}`}
                  >
                    <Star className="w-3 h-3 mr-1" /> Make Prime
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StaffPortal() {
  const [_, setLocation] = useLocation();

  const patientsQuery = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const patients = patientsQuery.data || [];
  const functionalMedicinePatients = patients.filter((p: any) => p.genomics);

  const nutritionPlansQuery = useQuery({
    queryKey: ['/api/nutrition-plans'],
    queryFn: async () => {
      const res = await fetch('/api/nutrition-plans');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const nutritionPlans = nutritionPlansQuery.data || [];

  const workoutsQuery = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const res = await fetch('/api/workouts');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const workouts = workoutsQuery.data || [];

  const labTasksQuery = useQuery({
    queryKey: ['/api/lab-tasks'],
    queryFn: async () => {
      const res = await fetch('/api/lab-tasks');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const labTasksRaw = labTasksQuery.data || [];
  const labTasks = useMemo(() => {
    return labTasksRaw.map((task: any) => {
      const patient = patients.find((p: any) => p.id === task.patientId);
      return {
        ...task,
        patient: patient ? patient.name : `Patient #${task.patientId}`,
      };
    });
  }, [labTasksRaw, patients]);

  const providersQuery = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const providers = providersQuery.data || [];

  const allVisitHistoryQuery = useQuery({
    queryKey: ['/api/visit-history'],
    queryFn: async () => {
      const res = await fetch('/api/visit-history');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const allVisits = allVisitHistoryQuery.data || [];

  const allClinicalNotesQuery = useQuery({
    queryKey: ['/api/clinical-notes'],
    queryFn: async () => {
      const res = await fetch('/api/clinical-notes');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const allClinicalNotes = allClinicalNotesQuery.data || [];

  const documentationItems = useMemo(() => {
    const items: any[] = [];
    allVisits.forEach((v: any) => {
      const patient = patients.find((p: any) => p.id === v.patientId);
      const provider = providers.find((p: any) => p.id === v.providerId);
      items.push({
        id: `visit-${v.id}`,
        source: 'visit',
        patientId: v.patientId,
        patientName: patient?.name || `Patient #${v.patientId}`,
        providerName: provider?.name || 'Unknown',
        title: v.chiefComplaint || v.visitType || 'Visit Note',
        type: v.visitType || 'Visit',
        date: v.date,
        diagnosis: v.diagnosis,
        subjective: v.subjective,
        objective: v.objective,
        assessment: v.assessment,
        plan: v.planNotes,
        prescriptions: v.prescriptions,
        procedures: v.procedures,
        labsOrdered: v.labsOrdered,
        followUpPlan: v.followUpPlan,
        outcome: v.outcome,
        vitals: v.vitals,
      });
    });
    allClinicalNotes.forEach((n: any) => {
      const patient = patients.find((p: any) => p.id === n.patientId);
      const provider = providers.find((p: any) => p.id === n.providerId);
      items.push({
        id: `note-${n.id}`,
        source: 'note',
        patientId: n.patientId,
        patientName: patient?.name || `Patient #${n.patientId}`,
        providerName: provider?.name || 'Unknown',
        title: n.title || 'Clinical Note',
        type: n.type || 'Note',
        date: n.date,
        content: n.content,
        tags: n.tags,
      });
    });
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [allVisits, allClinicalNotes, patients, providers]);

  const appointmentsQuery = useQuery({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const appointmentsRaw = appointmentsQuery.data || [];
  const appointments = useMemo(() => {
    return appointmentsRaw.map((apt: any) => {
      const patient = patients.find((p: any) => p.id === apt.patientId);
      const provider = providers.find((p: any) => p.id === apt.providerId);
      return {
        ...apt,
        patient: patient ? patient.name : `Patient #${apt.patientId}`,
        doctor: provider ? provider.name : `Provider #${apt.providerId}`,
      };
    });
  }, [appointmentsRaw, patients, providers]);

  const todayAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return appointments.filter((apt: any) => apt.date === todayStr);
  }, [appointments]);

  const patientQueue = useMemo(() => {
    return todayAppointments
      .filter((apt: any) => apt.status !== 'Completed')
      .map((apt: any) => {
        const statusMap: Record<string, string> = { 'On Time': 'Waiting', 'Late': 'Check-in', 'Completed': 'Completed' };
        const queueStatus = statusMap[apt.status] || 'Arriving';
        const actionMap: Record<string, string> = { 'Waiting': 'Take Vitals', 'Check-in': 'Upload Records', 'Arriving': 'Onboard', 'Completed': 'Checkout' };
        return {
          id: apt.id,
          name: apt.patient,
          patientId: apt.patientId,
          time: apt.time || '—',
          status: queueStatus,
          action: actionMap[queueStatus] || 'Take Vitals',
          type: apt.type || '',
        };
      });
  }, [todayAppointments]);

  const receptionistTasks = useMemo(() => {
    return labTasks
      .filter((t: any) => t.status === 'Pending' || t.status === 'Scheduled' || t.status === 'Delayed')
      .map((t: any) => ({
        id: t.id,
        type: t.test?.toLowerCase().includes('usg') || t.test?.toLowerCase().includes('scan') ? 'usg' : 'lab',
        patient: t.patient,
        title: t.status === 'Delayed' ? `Urgent: ${t.test}` : `Book ${t.test}`,
        urgency: t.status === 'Delayed' ? 'High' : t.due === 'Today' ? 'High' : 'Medium',
        status: t.status,
      }));
  }, [labTasks]);

  const crossSellOpportunities = useMemo(() => {
    const opportunities: any[] = [];
    patients.forEach((p: any) => {
      if (opportunities.length >= 5) return;
      const patientType = (p.type || '').toLowerCase();
      const patientStatus = (p.status || '').toLowerCase();

      if (patientType === 'pcos' || patientType === 'fertility') {
        if (p.genomics) {
          opportunities.push({ id: `${p.id}-nutri`, patient: p.name, service: "Nutrigenomics Consultation", reason: `Genomic data available — personalized nutrition plan recommended` });
        } else {
          opportunities.push({ id: `${p.id}-gut`, patient: p.name, service: "Gut Microbiome Test", reason: `${p.type || 'Hormonal'} care can benefit from gut health optimization` });
        }
      } else if (patientType === 'pregnancy') {
        if (patientStatus === 'high risk') {
          opportunities.push({ id: `${p.id}-highrisk`, patient: p.name, service: "High-Risk Prenatal Program", reason: "High-risk status — advanced monitoring recommended" });
        } else {
          opportunities.push({ id: `${p.id}-yoga`, patient: p.name, service: "Prenatal Yoga & Wellness", reason: "Prenatal wellness program supports healthy pregnancy" });
        }
      } else if (patientType === 'postpartum') {
        opportunities.push({ id: `${p.id}-postpartum`, patient: p.name, service: "Postpartum Recovery Program", reason: "Postpartum care — nutrition & mental health support" });
      } else if (p.mood === 'Depressed' || p.mood === 'Anxious' || p.mood === 'Stressed') {
        opportunities.push({ id: `${p.id}-psych`, patient: p.name, service: "Counseling Sessions", reason: `${p.mood} mood reported — psychological support recommended` });
      } else if (p.hb && p.hb < 11) {
        opportunities.push({ id: `${p.id}-anemia`, patient: p.name, service: "Iron Therapy & Diet Plan", reason: `Low Hb (${p.hb}) — anemia management program` });
      }
    });
    return opportunities.slice(0, 5);
  }, [patients]);

  const followUpList = useMemo(() => {
    const today = new Date();
    const patientsNeedingFollowUp = patients
      .filter((p: any) => p.status === 'High Risk' || p.mood === 'Depressed' || p.mood === 'Anxious' || p.mood === 'Stressed')
      .map((p: any) => {
        const patientAppts = appointments
          .filter((a: any) => a.patientId === p.id)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const patientVisits = allVisits
          .filter((v: any) => v.patientId === p.id)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const lastContactDate = patientAppts[0]?.date || patientVisits[0]?.date || null;
        let daysAgo = null;
        if (lastContactDate) {
          daysAgo = Math.floor((today.getTime() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: p.id,
          patient: p.name,
          type: p.status === 'High Risk' ? 'High Risk Follow-up' : `${p.mood || 'Mood'} Check-in`,
          daysAgo,
          lastVisitDate: lastContactDate,
          action: p.status === 'High Risk' ? 'Schedule Priority Visit' : 'Call to Check-in',
        };
      })
      .sort((a: any, b: any) => (b.daysAgo ?? 999) - (a.daysAgo ?? 999));
    return patientsNeedingFollowUp.slice(0, 5);
  }, [patients, appointments, allVisits]);

  const staffUsername = typeof window !== 'undefined' ? localStorage.getItem("staffUsername") || "" : "";
  const defaultRole = staffUsername.includes("reception") ? "receptionist" 
    : staffUsername.includes("nurse") ? "phlebotomist" 
    : staffUsername.includes("nutritionist") ? "nutritionist"
    : "nutritionist";
  const [activeRole, setActiveRole] = useState(defaultRole);
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard', 'patients', 'schedule', 'reports'
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdjustProtocolOpen, setIsAdjustProtocolOpen] = useState(false);
  const [selectedPatientForAdjust, setSelectedPatientForAdjust] = useState<any>(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<any>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPatientForUpload, setSelectedPatientForUpload] = useState<any>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [selectedPatientForOnboarding, setSelectedPatientForOnboarding] = useState<any>(null);
  const [isClinicalActionOpen, setIsClinicalActionOpen] = useState(false);
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPatientForCheckout, setSelectedPatientForCheckout] = useState<any>(null);
  const [selectedDocItem, setSelectedDocItem] = useState<any>(null);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
  const [vitalsData, setVitalsData] = useState({
      systolic: '',
      diastolic: '',
      height: '',
      weight: '',
      pulse: ''
  });

  const [selectedPatientForCreate, setSelectedPatientForCreate] = useState<any>(null);
  const [isViewLogOpen, setIsViewLogOpen] = useState(false);
  const [selectedPatientForLog, setSelectedPatientForLog] = useState<any>(null);
  const [logData, setLogData] = useState<{ visits: any[], medications: any[], notes: any[], appointments: any[], protocols: any[] }>({ visits: [], medications: [], notes: [], appointments: [], protocols: [] });
  const [logLoading, setLogLoading] = useState(false);
  const [logTab, setLogTab] = useState("all");

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [sheetStatus, setSheetStatus] = useState<any>(null);

  const [isImportingLabs, setIsImportingLabs] = useState(false);
  const [labImportResult, setLabImportResult] = useState<any>(null);
  const [driveStatus, setDriveStatus] = useState<any>(null);

  const [isFollowUpCallOpen, setIsFollowUpCallOpen] = useState(false);
  const [selectedCallPatient, setSelectedCallPatient] = useState<any>(null);
  const [followUpCallForm, setFollowUpCallForm] = useState({
    feeling: '', gotMedicines: '', concerns: '', crossSell: '', nextVisit: '', notes: '', nextMilestone: '', didntPickCallTime: '',
  });
  const [isImportingFollowUp, setIsImportingFollowUp] = useState(false);
  const [followUpImportResult, setFollowUpImportResult] = useState<any>(null);
  const [followUpSheetStatus, setFollowUpSheetStatus] = useState<any>(null);
  const [followUpCallFilter, setFollowUpCallFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const [billingPatientId, setBillingPatientId] = useState<number | null>(null);
  const [billingItems, setBillingItems] = useState<{catalogItemId: number; name: string; price: number; quantity: number; taxRate: number}[]>([]);
  const [billingPaymentMethod, setBillingPaymentMethod] = useState("cash");
  const [billingNotes, setBillingNotes] = useState("");
  const billingCatalogQuery = useQuery<any[]>({ queryKey: ["/api/billing-catalog"] });
  const billingCatalogItems = billingCatalogQuery.data || [];

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: { patientId: number; items: any[]; subtotal: number; tax: number; total: number; paymentMethod: string; notes: string }) => {
      const res = await fetch(`/api/patients/${data.patientId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: data.patientId,
          date: new Date().toISOString().split("T")[0],
          items: data.items,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          paymentMethod: data.paymentMethod,
          paymentStatus: "paid",
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to create invoice");
      return res.json();
    },
    onSuccess: () => {
      setBillingItems([]);
      setBillingPatientId(null);
      setBillingNotes("");
      setBillingPaymentMethod("cash");
    },
  });

  const followUpCallsQuery = useQuery({
    queryKey: ['/api/follow-up-calls'],
    queryFn: async () => {
      const res = await fetch('/api/follow-up-calls');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });
  const followUpCalls = followUpCallsQuery.data || [];

  const handleImportFollowUpSheet = async () => {
    setIsImportingFollowUp(true);
    setFollowUpImportResult(null);
    try {
      const res = await fetch('/api/follow-up-calls/import-sheet', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setFollowUpImportResult(data);
      followUpCallsQuery.refetch();
    } catch (err: any) {
      setFollowUpImportResult({ error: err.message });
    } finally {
      setIsImportingFollowUp(false);
    }
  };

  const saveFollowUpCallMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: any }) => {
      if (id) {
        const res = await fetch(`/api/follow-up-calls/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('Failed to update');
        return res.json();
      } else {
        const res = await fetch('/api/follow-up-calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('Failed to create');
        return res.json();
      }
    },
    onSuccess: () => {
      followUpCallsQuery.refetch();
      setIsFollowUpCallOpen(false);
      setSelectedCallPatient(null);
      setFollowUpCallForm({ feeling: '', gotMedicines: '', concerns: '', crossSell: '', nextVisit: '', notes: '', nextMilestone: '', didntPickCallTime: '' });
    },
  });

  useEffect(() => {
    fetch('/api/google-sheets/status')
      .then(r => r.json())
      .then(data => setSheetStatus(data))
      .catch(() => setSheetStatus({ connected: false, rowCount: 0 }));
    fetch('/api/google-drive/status')
      .then(r => r.json())
      .then(data => setDriveStatus(data))
      .catch(() => setDriveStatus({ connected: false, totalFiles: 0 }));
    fetch('/api/follow-up-calls/sheet-status')
      .then(r => r.json())
      .then(data => setFollowUpSheetStatus(data))
      .catch(() => setFollowUpSheetStatus({ connected: false, rowCount: 0 }));
  }, []);

  const handleSheetSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/google-sheets/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setSyncResult(data);
      patientsQuery.refetch();
    } catch (err: any) {
      setSyncResult({ error: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLabImport = async () => {
    setIsImportingLabs(true);
    setLabImportResult(null);
    try {
      const res = await fetch('/api/google-drive/import-lab-reports', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setLabImportResult(data);
      fetch('/api/google-drive/status')
        .then(r => r.json())
        .then(data => setDriveStatus(data))
        .catch(() => {});
    } catch (err: any) {
      setLabImportResult({ error: err.message });
    } finally {
      setIsImportingLabs(false);
    }
  };

  const openViewLog = async (patient: any) => {
    setSelectedPatientForLog(patient);
    setIsViewLogOpen(true);
    setLogLoading(true);
    setLogTab("all");
    try {
      const [visitsRes, medsRes, notesRes, apptsRes, protocolsRes] = await Promise.all([
        fetch(`/api/patients/${patient.id}/visit-history`),
        fetch(`/api/patients/${patient.id}/medications`),
        fetch(`/api/patients/${patient.id}/clinical-notes`),
        fetch(`/api/appointments?patientId=${patient.id}`),
        fetch(`/api/patient-protocols/${patient.id}`),
      ]);
      const [visits, medications, notes, appts, protocol] = await Promise.all([
        visitsRes.ok ? visitsRes.json() : [],
        medsRes.ok ? medsRes.json() : [],
        notesRes.ok ? notesRes.json() : [],
        apptsRes.ok ? apptsRes.json() : [],
        protocolsRes.ok ? protocolsRes.json() : null,
      ]);
      setLogData({
        visits: Array.isArray(visits) ? visits : [],
        medications: Array.isArray(medications) ? medications : [],
        notes: Array.isArray(notes) ? notes : [],
        appointments: Array.isArray(appts) ? appts : [],
        protocols: protocol ? [protocol] : [],
      });
    } catch {
      setLogData({ visits: [], medications: [], notes: [], appointments: [], protocols: [] });
    }
    setLogLoading(false);
  };

  const [mealPlanItems, setMealPlanItems] = useState([
    { id: 1, time: "08:00", name: "Breakfast", item: "", qty: "", macros: "" },
    { id: 2, time: "11:00", name: "Morning Snack", item: "", qty: "", macros: "" },
    { id: 3, time: "13:00", name: "Lunch", item: "", qty: "", macros: "" },
    { id: 4, time: "16:00", name: "Afternoon Snack", item: "", qty: "", macros: "" },
    { id: 5, time: "19:30", name: "Dinner", item: "", qty: "", macros: "" }
  ]);

  const addMealItem = () => {
    const newItem = { 
        id: Date.now(), 
        time: "00:00", 
        name: "Meal/Snack", 
        item: "", 
        qty: "", 
        macros: "" 
    };
    setMealPlanItems([...mealPlanItems, newItem]);
  };

  const removeMealItem = (id: number) => {
    setMealPlanItems(mealPlanItems.filter(item => item.id !== id));
  };

  const roles = [
    { id: "nutritionist", label: "Nutritionist", icon: Apple, color: "text-emerald-600", bg: "bg-emerald-50" },
    { id: "psychologist", label: "Psychologist", icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
    { id: "trainer", label: "Physical Trainer", icon: Dumbbell, color: "text-blue-600", bg: "bg-blue-50" },
    { id: "dermatologist", label: "Dermatologist", icon: Sparkles, color: "text-rose-600", bg: "bg-rose-50" },
    { id: "phlebotomist", label: "Phlebotomist", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50" },
    { id: "receptionist", label: "Receptionist", icon: CalendarCheck, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  const currentRole = roles.find(r => r.id === activeRole);

  const handleLogin = (roleId: string) => {
    setActiveRole(roleId);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <Card className="max-w-md w-full shadow-lg border-slate-200">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold text-2xl mb-4">H</div>
                    <CardTitle className="text-2xl font-serif text-slate-900">Saivie Staff Portal</CardTitle>
                    <p className="text-slate-500 text-sm">Select your role to access the care workspace.</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                        {roles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => handleLogin(role.id)}
                                className="flex flex-col items-center justify-center p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all bg-white group"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:bg-white transition-colors ${role.bg}`}>
                                    <role.icon className={`w-5 h-5 ${role.color}`} />
                                </div>
                                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{role.label}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar - Logged In State */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold">H</div>
                <span className="font-serif font-bold text-lg text-slate-800">Saivie</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-serif font-bold mx-auto">H</div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setSidebarOpen(!sidebarOpen)}>
             <Menu className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4">
            <div className="space-y-1">
                 <Button 
                    variant={activeView === 'dashboard' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('dashboard')}
                 >
                    <Activity className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Dashboard"}
                 </Button>
                 <Button 
                    variant={activeView === 'patients' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'patients' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('patients')}
                 >
                    <Users className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "My Patients"}
                 </Button>
                 <Button 
                    variant={activeView === 'schedule' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'schedule' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('schedule')}
                 >
                    <CalendarCheck className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Schedule"}
                 </Button>
                 <Button 
                    variant={activeView === 'reports' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'reports' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('reports')}
                 >
                    <FileText className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Notes & Reports"}
                 </Button>
                 {activeRole === 'receptionist' && (
                 <Button 
                    variant={activeView === 'followup' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'followup' ? 'bg-orange-50 text-orange-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('followup')}
                 >
                    <Phone className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Follow-Up Calls"}
                 </Button>
                 )}
                 {activeRole === 'receptionist' && (
                 <Button 
                    variant={activeView === 'prime' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'prime' ? 'bg-amber-50 text-amber-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('prime')}
                    data-testid="btn-prime-members"
                 >
                    <Star className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Prime Members"}
                 </Button>
                 )}
                 {activeRole === 'receptionist' && (
                 <Button 
                    variant={activeView === 'billing' ? 'secondary' : 'ghost'} 
                    className={`w-full justify-start ${!sidebarOpen ? 'px-2' : ''} ${activeView === 'billing' ? 'bg-emerald-50 text-emerald-900' : 'text-slate-500 hover:text-slate-900'}`}
                    onClick={() => setActiveView('billing')}
                    data-testid="btn-billing"
                 >
                    <IndianRupee className={`w-4 h-4 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {sidebarOpen && "Billing"}
                 </Button>
                 )}
            </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100">
             <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-slate-200">
                    <AvatarFallback className="bg-slate-100 text-slate-600">ST</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-slate-900 truncate">{currentRole?.label || 'Staff'}</p>
                        <button onClick={() => { localStorage.removeItem("staffUsername"); setLocation("/"); }} className="text-xs text-rose-500 hover:text-rose-700 truncate text-left block w-full">Sign Out</button>
                    </div>
                )}
             </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${currentRole?.bg}`}>
                    {currentRole && <currentRole.icon className={`w-5 h-5 ${currentRole.color}`} />}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{currentRole?.label} Dashboard</h1>
                    <p className="text-xs text-slate-500">Welcome back, here's your daily overview.</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input placeholder="Search patient..." className="pl-9 w-64 h-9 bg-slate-50 border-slate-200" />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-slate-200 relative">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                </Button>
            </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* 6. SCHEDULE VIEW */}
            {activeView === 'schedule' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-900 font-serif">Staff Schedule</h2>
                        <div className="flex gap-2">
                             <Link href="/staff/check-in">
                                <Button variant="outline" className="bg-white border-slate-200">
                                   <CheckCircle2 className="w-4 h-4 mr-2" /> Check In
                                </Button>
                             </Link>
                             <Link href="/staff/booking">
                                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                                   <Plus className="w-4 h-4 mr-2" /> New Appointment
                                </Button>
                             </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
                        {/* Calendar Sidebar */}
                        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col">
                            <CardHeader className="py-4 border-b border-slate-100">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800">February 2026</h3>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="w-4 h-4 rotate-180" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                                    <span className="text-slate-400">Su</span>
                                    <span className="text-slate-400">Mo</span>
                                    <span className="text-slate-400">Tu</span>
                                    <span className="text-slate-400">We</span>
                                    <span className="text-slate-400">Th</span>
                                    <span className="text-slate-400">Fr</span>
                                    <span className="text-slate-400">Sa</span>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                                    {/* Mock Calendar Grid */}
                                    {[...Array(3)].map((_, i) => <span key={`empty-${i}`} className="p-2"></span>)}
                                    {[...Array(28)].map((_, i) => (
                                        <button 
                                            key={i} 
                                            className={`p-2 rounded-full hover:bg-slate-100 ${i === 7 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-700'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Filters</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-consult" defaultChecked />
                                                <label htmlFor="filter-consult" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Consultations</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-scan" defaultChecked />
                                                <label htmlFor="filter-scan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Scans & Tests</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="filter-team" />
                                                <label htmlFor="filter-team" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Team Meetings</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Daily Schedule */}
                        <Card className="col-span-9 border-slate-200 shadow-sm flex flex-col overflow-hidden">
                             <CardHeader className="py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                                 <div className="flex gap-4">
                                    <span className="text-sm font-bold text-slate-900 border-b-2 border-indigo-600 pb-3 -mb-3.5">Day View</span>
                                    <span className="text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-900">Week View</span>
                                 </div>
                                 <span className="text-xs font-medium text-slate-500">Sunday, Feb 8th</span>
                             </CardHeader>
                             <ScrollArea className="flex-1 bg-white">
                                <div className="divide-y divide-slate-50">
                                    {(() => {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        const todayAppts = appointments.filter((a: any) => a.date === todayStr);
                                        const colorSchemes = [
                                            { bg: 'bg-indigo-50', border: 'border-indigo-500', title: 'text-indigo-900', sub: 'text-indigo-700', avatarBg: 'bg-indigo-200', avatarText: 'text-indigo-800', badgeBg: 'bg-white', badgeText: 'text-indigo-700', accent: 'text-indigo-600' },
                                            { bg: 'bg-emerald-50', border: 'border-emerald-500', title: 'text-emerald-900', sub: 'text-emerald-700', avatarBg: 'bg-emerald-200', avatarText: 'text-emerald-800', badgeBg: 'bg-white', badgeText: 'text-emerald-700', accent: 'text-emerald-600' },
                                        ];
                                        return todayAppts.slice(0, 2).map((appt: any, idx: number) => {
                                            const patient = patients.find((p: any) => p.id === appt.patientId);
                                            const patientName = patient?.name || `Patient #${appt.patientId}`;
                                            const initials = patientName?.split(' ').map((n: string) => n[0]).join('') || '?';
                                            const colors = colorSchemes[idx % colorSchemes.length];
                                            return (
                                                <div key={appt.id} className="flex h-32 group">
                                                    <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                                        {appt.time || '—'}
                                                    </div>
                                                    <div className="flex-1 p-2 relative">
                                                        <div className={`absolute top-2 left-2 right-2 bottom-2 ${colors.bg} border-l-4 ${colors.border} rounded p-3 cursor-pointer hover:shadow-sm transition-shadow`}>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className={`font-bold ${colors.title} text-sm`}>{appt.reason || appt.type || 'Consultation'}</p>
                                                                    <p className={`text-xs ${colors.sub} mt-0.5`}>{patientName}{patient?.type ? ` (${patient.type})` : ''} • {appt.visitType || 'In-Person'}</p>
                                                                </div>
                                                                <Badge variant="secondary" className={`${colors.badgeBg} ${colors.badgeText} text-[10px] hover:${colors.badgeBg}`}>{appt.status || 'Confirmed'}</Badge>
                                                            </div>
                                                            <div className="mt-3 flex gap-2">
                                                                <Avatar className="h-6 w-6 text-[10px]">
                                                                    <AvatarFallback className={`${colors.avatarBg} ${colors.avatarText}`}>{initials}</AvatarFallback>
                                                                </Avatar>
                                                                {appt.doctor && <span className={`text-xs ${colors.accent} self-center`}>+ {appt.doctor}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}

                                    {/* 11:00 Slot (Empty) */}
                                    <div className="flex h-20 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            11:00 AM
                                        </div>
                                        <div className="flex-1 p-2 group-hover:bg-slate-50/30 cursor-pointer border-b border-transparent group-hover:border-slate-100 flex items-center justify-center">
                                            <Button variant="ghost" size="sm" className="hidden group-hover:flex text-slate-400 text-xs h-8">
                                                <Plus className="w-3 h-3 mr-1" /> Add Slot
                                            </Button>
                                        </div>
                                    </div>

                                     {/* 12:00 Slot */}
                                    <div className="flex h-32 group">
                                        <div className="w-20 py-4 px-2 text-right text-xs text-slate-400 font-medium border-r border-slate-100 group-hover:bg-slate-50/50">
                                            12:00 PM
                                        </div>
                                        <div className="flex-1 p-2 relative">
                                            <div className="absolute top-2 left-2 right-2 bottom-2 bg-amber-50 border-l-4 border-amber-500 rounded p-3 cursor-pointer hover:shadow-sm transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-amber-900 text-sm">Staff Case Review</p>
                                                        <p className="text-xs text-amber-700 mt-0.5">Multidisciplinary Team • Conf Room B</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-white text-amber-700 text-[10px] hover:bg-white">Internal</Badge>
                                                </div>
                                                <div className="mt-3 flex -space-x-2">
                                                    <Avatar className="h-6 w-6 text-[10px] border-2 border-white">
                                                        <AvatarFallback className="bg-slate-200 text-slate-700">DR</AvatarFallback>
                                                    </Avatar>
                                                    <Avatar className="h-6 w-6 text-[10px] border-2 border-white">
                                                        <AvatarFallback className="bg-slate-200 text-slate-700">ST</AvatarFallback>
                                                    </Avatar>
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">+3</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                             </ScrollArea>
                        </Card>
                    </div>
                </div>
            )}

            {/* 7. REPORTS & NOTES VIEW */}
            {activeView === 'reports' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-clinical-doc-heading">Clinical Documentation</h2>
                            <p className="text-slate-500 text-sm mt-1">Manage progress notes, lab reports, and care summaries.</p>
                        </div>
                        <div className="flex gap-2">
                             <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs">{documentationItems.length} Records</Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* Reports Sidebar */}
                        <Card className="col-span-4 border-slate-200 shadow-sm h-[calc(100vh-12rem)] flex flex-col">
                            <CardHeader className="py-4 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input placeholder="Filter by patient or type..." className="pl-9 bg-slate-50 border-slate-200" data-testid="input-filter-docs" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-y-auto">
                                <div className="divide-y divide-slate-100">
                                    {documentationItems.length === 0 && (
                                        <div className="p-6 text-center text-slate-400 text-sm">No clinical documentation found.</div>
                                    )}
                                    {documentationItems.map((item: any) => {
                                        const initials = item.patientName?.split(' ').map((n: string) => n[0]).join('') || '?';
                                        const isSelected = selectedDocItem?.id === item.id;
                                        const badgeConfig = item.source === 'visit' 
                                            ? { label: item.type || 'Visit', bg: 'bg-indigo-100', text: 'text-indigo-700' }
                                            : { label: item.type || 'Note', bg: 'bg-purple-100', text: 'text-purple-700' };
                                        const description = item.source === 'visit' 
                                            ? (item.diagnosis || item.subjective || item.assessment || 'No details')
                                            : (item.content || 'No content');
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`p-4 hover:bg-slate-50 cursor-pointer border-l-4 transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent'}`}
                                                onClick={() => setSelectedDocItem(item)}
                                                data-testid={`doc-item-${item.id}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</span>
                                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{item.date}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{description}</p>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5 text-[8px]">
                                                        <AvatarFallback className="bg-slate-200">{initials}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-slate-600 font-medium">{item.patientName}</span>
                                                    <Badge variant="secondary" className={`ml-auto text-[10px] ${badgeConfig.bg} ${badgeConfig.text}`}>{badgeConfig.label}</Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detail/Editor Area */}
                        <Card className="col-span-8 border-slate-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
                            {!selectedDocItem ? (
                                <div className="flex-1 flex items-center justify-center text-slate-400">
                                    <div className="text-center">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm font-medium">Select a record to view details</p>
                                        <p className="text-xs mt-1">Choose from the list on the left</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-slate-900" data-testid="text-doc-detail-title">{selectedDocItem.title}</h3>
                                                <Badge variant="outline" className="text-xs text-slate-500 font-normal">{selectedDocItem.source === 'visit' ? selectedDocItem.type : selectedDocItem.type}</Badge>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                By <span className="font-medium text-slate-700">{selectedDocItem.providerName}</span> • {selectedDocItem.date}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500" onClick={() => setSelectedDocItem(null)}>
                                            <X className="w-4 h-4 mr-1" /> Close
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-6 flex-1 overflow-y-auto">
                                        <div className="space-y-6 max-w-2xl">
                                            <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                                <Avatar className="h-10 w-10 border-2 border-white">
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                                                        {selectedDocItem.patientName?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900" data-testid="text-doc-patient-name">{selectedDocItem.patientName}</p>
                                                    <p className="text-xs text-slate-500">MRN: #{selectedDocItem.patientId}</p>
                                                </div>
                                            </div>

                                            {selectedDocItem.source === 'visit' && (
                                                <div className="space-y-4">
                                                    {selectedDocItem.diagnosis && (
                                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                                            <Label className="text-xs font-bold text-amber-700 uppercase tracking-wider">Diagnosis</Label>
                                                            <p className="text-sm text-slate-800 mt-1">{selectedDocItem.diagnosis}</p>
                                                        </div>
                                                    )}

                                                    {selectedDocItem.subjective && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">S (Subjective)</Label>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">{selectedDocItem.subjective}</div>
                                                        </div>
                                                    )}
                                                    {selectedDocItem.objective && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">O (Objective)</Label>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">{selectedDocItem.objective}</div>
                                                        </div>
                                                    )}
                                                    {selectedDocItem.assessment && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">A (Assessment)</Label>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">{selectedDocItem.assessment}</div>
                                                        </div>
                                                    )}
                                                    {selectedDocItem.plan && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">P (Plan)</Label>
                                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700">{selectedDocItem.plan}</div>
                                                        </div>
                                                    )}

                                                    {selectedDocItem.vitals && (
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vitals</Label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {Object.entries(selectedDocItem.vitals as Record<string, any>).map(([key, val]) => (
                                                                    <div key={key} className="p-2 bg-slate-50 rounded border border-slate-100 text-center">
                                                                        <p className="text-[10px] text-slate-400 uppercase">{key}</p>
                                                                        <p className="text-sm font-bold text-slate-800">{String(val)}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedDocItem.prescriptions?.length > 0 && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prescriptions</Label>
                                                            {selectedDocItem.prescriptions.map((rx: any, i: number) => (
                                                                <div key={i} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Pill className="w-4 h-4 text-blue-600" />
                                                                        <span className="text-sm font-bold text-slate-800">{rx.name}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        {rx.dose && <Badge variant="outline" className="text-[10px] bg-white">{rx.dose}</Badge>}
                                                                        {rx.frequency && <Badge variant="outline" className="text-[10px] bg-white">{rx.frequency}</Badge>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {selectedDocItem.procedures?.length > 0 && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Procedures</Label>
                                                            {selectedDocItem.procedures.map((proc: any, i: number) => (
                                                                <div key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                                                                    <p className="text-sm font-bold text-slate-800">{proc.name}</p>
                                                                    {proc.finding && <p className="text-xs text-slate-600 mt-1">{proc.finding}</p>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {selectedDocItem.labsOrdered?.length > 0 && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Labs Ordered</Label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {selectedDocItem.labsOrdered.map((lab: any, i: number) => (
                                                                    <div key={i} className="p-2 bg-purple-50/50 border border-purple-100 rounded-lg">
                                                                        <p className="text-xs font-bold text-slate-700">{lab.test}</p>
                                                                        {lab.result !== undefined && <p className="text-sm font-bold text-purple-700">{lab.result} {lab.unit || ''}</p>}
                                                                        {lab.scheduled && <p className="text-[10px] text-slate-500">Scheduled: {lab.scheduled}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedDocItem.followUpPlan && (
                                                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                                            <Label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Follow-up Plan</Label>
                                                            <p className="text-sm text-slate-800 mt-1">{selectedDocItem.followUpPlan}</p>
                                                        </div>
                                                    )}

                                                    {selectedDocItem.outcome && (
                                                        <div className="flex gap-2 items-center">
                                                            <Label className="text-xs font-bold text-slate-500 uppercase">Outcome:</Label>
                                                            <Badge variant="outline" className={`text-xs ${selectedDocItem.outcome === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                {selectedDocItem.outcome}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {selectedDocItem.source === 'note' && (
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedDocItem.content}</p>
                                                    </div>
                                                    {selectedDocItem.tags?.length > 0 && (
                                                        <div className="flex gap-2 flex-wrap">
                                                            {selectedDocItem.tags.map((tag: string, i: number) => (
                                                                <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-600">{tag}</Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* 1. NUTRITIONIST VIEW */}
            {activeRole === 'nutritionist' && activeView === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Alerts Banner */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-red-50 border-red-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-red-900 text-sm">Low Hb Alerts</p>
                                    <p className="text-xs text-red-700 mt-1">{patients.filter((p: any) => p.hb && p.hb < 11).length} patients flagged with Hb &lt; 11</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-amber-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <Scale className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-900 text-sm">Weight Monitoring</p>
                                    <p className="text-xs text-amber-700 mt-1">{patients.filter((p: any) => p.type === 'PCOS' && p.weight > 70).length} PCOS patients above 70kg</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="font-bold text-emerald-900 text-sm">Active Patients</p>
                                    <p className="text-xs text-emerald-700 mt-1">{patients.length} patients in the system</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            {/* Patient List */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-800">Assigned Patients</CardTitle>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">All</Badge>
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">Fertility</Badge>
                                        <Badge variant="outline" className="cursor-pointer bg-slate-50 hover:bg-slate-100">PCOS</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Patient</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Weight Trend</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {patients.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8 text-xs">
                                                                <AvatarFallback>{p.avatar}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-semibold text-slate-900">{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3"><Badge variant="secondary" className="text-[10px]">{p.type}</Badge></td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-700 font-medium">{p.weight}kg</span>
                                                            <TrendingUp className="w-3 h-3 text-red-500" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {p.hb < 11 ? (
                                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Low Hb: {p.hb}</Badge>
                                                        ) : (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">On Track</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`btn-view-log-${p.id}`} onClick={() => openViewLog(p)}>View Log</Button>
                                                            {functionalMedicinePatients.find((fp: any) => fp.name === p.name) && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-7 text-xs bg-slate-900 text-white hover:bg-slate-800"
                                                                    onClick={() => {
                                                                        const fp = functionalMedicinePatients.find((f: any) => f.name === p.name);
                                                                        if (fp) {
                                                                            setLocation(`/staff/protocol/${fp.id}`);
                                                                        }
                                                                    }}
                                                                >
                                                                    Adjust
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <div className="col-span-1 space-y-6">
                            {/* Meal Plan Templates */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800">Diet Plan Templates</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 divide-y divide-slate-100">
                                    {nutritionPlans.map((plan: any) => (
                                        <div key={plan.id} className="p-3 hover:bg-slate-50 cursor-pointer">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium text-sm text-slate-800">{plan.name}</span>
                                                <span className="text-xs text-slate-400">{plan.assignedTo} users</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {plan.tags?.map((tag: any) => (
                                                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3">
                                        <Button className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                                            + Create New Plan
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. NUTRITIONIST - MY PATIENTS VIEW (Functional & Genomics) */}
            {activeRole === 'nutritionist' && activeView === 'patients' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 font-serif">Functional Nutrition Panel</h2>
                            <p className="text-slate-500 mt-1">Integrative care combining genomics, gut health, and nutrient biomarkers.</p>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" className="bg-white border-slate-200">
                                <FlaskConical className="w-4 h-4 mr-2" /> Request Lab Panel
                             </Button>
                             
                             <Link href="/staff/create-plan">
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" /> New Care Plan
                                </Button>
                             </Link>

                             {/* ADJUST PROTOCOL DIALOG */}
                             <Dialog open={isAdjustProtocolOpen} onOpenChange={setIsAdjustProtocolOpen}>
                                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Adjust Active Protocol</DialogTitle>
                                        <DialogDescription>
                                            Modify the current intervention plan for {selectedPatientForAdjust?.name}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    {selectedPatientForAdjust && (
                                        <div className="grid gap-6 py-4">
                                            
                                            {/* 1. Patient Context (Read Only) */}
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Avatar className="h-8 w-8 text-xs">
                                                            <AvatarFallback>{selectedPatientForAdjust.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-sm">{selectedPatientForAdjust.name}</p>
                                                            <p className="text-xs text-slate-500">{selectedPatientForAdjust.condition}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                     <p className="text-[10px] font-bold text-slate-500 uppercase">Current Goal</p>
                                                     <p className="font-bold text-emerald-700 text-sm">{selectedPatientForAdjust.functional.hormone.focus}</p>
                                                </div>
                                            </div>

                                            {/* Clinician Instructions (Dynamic) */}
                                            {selectedPatientForAdjust.clinicianNote && (
                                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 items-start">
                                                    <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase mb-0.5">Clinician Instruction</p>
                                                        <p className="text-sm text-blue-700 leading-snug">{selectedPatientForAdjust.clinicianNote}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2. Clinical Context & Goal Adjustment */}
                                            <div className="space-y-6">
                                                {/* Context Banner */}
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Clinical Context</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">Genomics</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                <Badge variant="outline" className={`text-[10px] bg-white ${selectedPatientForAdjust.genomics.mthfr.risk === 'Medium' ? 'text-amber-700 border-amber-200' : 'text-slate-600 border-slate-200'}`}>MTHFR: {selectedPatientForAdjust.genomics.mthfr.status}</Badge>
                                                                <Badge variant="outline" className={`text-[10px] bg-white ${selectedPatientForAdjust.genomics.caffeine.risk === 'High' ? 'text-rose-700 border-rose-200' : 'text-slate-600 border-slate-200'}`}>{selectedPatientForAdjust.genomics.caffeine.status === "Slow Metabolizer" ? "Slow Caffeine" : "Fast Caffeine"}</Badge>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">Biomarkers</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                 <Badge variant="outline" className={`text-[10px] bg-white ${selectedPatientForAdjust.functional.gut.score < 50 ? 'text-rose-700 border-rose-200' : 'text-slate-600 border-slate-200'}`}>Gut: {selectedPatientForAdjust.functional.gut.status}</Badge>
                                                                 <Badge variant="outline" className={`text-[10px] bg-white ${selectedPatientForAdjust.functional.inflammation.status === 'Elevated' ? 'text-amber-700 border-amber-200' : 'text-slate-600 border-slate-200'}`}>Inflam: {selectedPatientForAdjust.functional.inflammation.status}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Adjust Primary Goal</Label>
                                                        <Select defaultValue="inflammation">
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select goal..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="inflammation">Reduce Inflammation (hs-CRP)</SelectItem>
                                                                <SelectItem value="fertility">Boost Egg Quality</SelectItem>
                                                                <SelectItem value="gut">Gut Repair (4R Protocol)</SelectItem>
                                                                <SelectItem value="bloodsugar">Insulin Sensitivity</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Dietary Phase</Label>
                                                        <Select defaultValue="elimination">
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select phase..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="elimination">{selectedPatientForAdjust.intervention?.dietPhase || "Elimination Phase (Strict)"}</SelectItem>
                                                                <SelectItem value="reintroduction">Reintroduction Phase</SelectItem>
                                                                <SelectItem value="maintenance">Maintenance & Diversity</SelectItem>
                                                                <SelectItem value="keto">Therapeutic Ketogenic</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3. Genomic Modifiers (Preserved) */}
                                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Dna className="w-4 h-4 text-purple-600" />
                                                    <h4 className="text-sm font-bold text-purple-900">Genomic Adjustments (Active)</h4>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-mthfr" defaultChecked={selectedPatientForAdjust.genomics.mthfr.risk === 'Medium' || selectedPatientForAdjust.genomics.mthfr.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-mthfr" className="text-xs font-medium text-slate-700 cursor-pointer">Methylation Support</label>
                                                            <p className="text-[10px] text-slate-500">MTHFR Status: {selectedPatientForAdjust.genomics.mthfr.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-caffeine" defaultChecked={selectedPatientForAdjust.genomics.caffeine.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-caffeine" className="text-xs font-medium text-slate-700 cursor-pointer">Caffeine Protocol</label>
                                                            <p className="text-[10px] text-slate-500">{selectedPatientForAdjust.genomics.caffeine.status}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start space-x-2">
                                                        <Checkbox id="adj-gluten" defaultChecked={selectedPatientForAdjust.genomics.gluten?.risk === 'High'} />
                                                        <div className="grid gap-0.5 leading-none">
                                                            <label htmlFor="adj-gluten" className="text-xs font-medium text-slate-700 cursor-pointer">Gluten Elimination</label>
                                                            <p className="text-[10px] text-slate-500">Risk: {selectedPatientForAdjust.genomics.gluten?.risk || 'Low'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 4. Daily Schedule (Wake/Sleep) */}
                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Wake Up Time</Label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                        <Input type="time" className="pl-9 bg-white" defaultValue="07:00" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase">Bedtime</Label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                        <Input type="time" className="pl-9 bg-white" defaultValue="22:30" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 5. Structured Meal Plan (Time-Based) */}
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Label>Daily Meal Structure</Label>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 cursor-pointer">Training Day</Badge>
                                                        <Badge variant="outline" className="text-slate-500 cursor-pointer hover:bg-slate-50">Rest Day</Badge>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                                                    {mealPlanItems.map((meal, index) => (
                                                        <div key={meal.id} className={`space-y-2 ${index !== 0 ? 'pt-2 border-t border-slate-200' : ''}`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${index % 3 === 0 ? 'bg-amber-400' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                                                <Input 
                                                                    defaultValue={meal.name} 
                                                                    className="h-6 w-32 text-xs font-bold text-slate-800 border-none bg-transparent p-0 focus-visible:ring-0" 
                                                                />
                                                                <div className="relative ml-auto">
                                                                    <Clock className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
                                                                    <Input 
                                                                        type="time" 
                                                                        defaultValue={meal.time} 
                                                                        className="h-6 w-24 text-xs bg-white pl-6 border-slate-200" 
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-5">
                                                                    <Input placeholder="E.g., Oatmeal with Berries" className="h-8 text-xs bg-white" defaultValue={meal.item} />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <Input placeholder="Qty" className="h-8 text-xs bg-white" defaultValue={meal.qty} />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <Input placeholder="Macros" className="h-8 text-xs bg-white" defaultValue={meal.macros} />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                                                                        onClick={() => removeMealItem(meal.id)}
                                                                    >
                                                                        <Minus className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="w-full text-xs border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                        onClick={addMealItem}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Add Meal Time
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* 6. Supplement Stack */}
                                            <div className="space-y-3">
                                                <Label>Active Supplements</Label>
                                                <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox id="supp1" defaultChecked />
                                                            <div>
                                                                <p className="text-sm font-medium">Magnesium Glycinate</p>
                                                                <p className="text-xs text-slate-500">400mg • Bedtime</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">Edit</Button>
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-500">Stop</Button>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox id="supp2" defaultChecked />
                                                            <div>
                                                                <p className="text-sm font-medium">Omega-3 (EPA/DHA)</p>
                                                                <p className="text-xs text-slate-500">2g • With Lunch</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">Edit</Button>
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-500">Stop</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full text-xs bg-slate-50 hover:bg-slate-100 border-dashed border-slate-300 text-slate-500">
                                                    + Add New Supplement
                                                </Button>
                                            </div>

                                            {/* Notes */}
                                            <div className="space-y-2">
                                                <Label>Clinical Adjustment Note</Label>
                                                <Textarea placeholder="Reason for adjustment (e.g. reported bloating, improved symptoms)..." />
                                            </div>

                                        </div>
                                    )}

                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAdjustProtocolOpen(false)}>Cancel</Button>
                                        <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setIsAdjustProtocolOpen(false)}>Save Changes</Button>
                                    </DialogFooter>
                                </DialogContent>
                             </Dialog>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 pb-2">
                        <Badge variant="secondary" className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 cursor-pointer">All Patients</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">PCOS</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">Endometriosis</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">Fertility Prep</Badge>
                        <Badge variant="outline" className="px-3 py-1 bg-white hover:bg-slate-50 cursor-pointer">GDM Risk</Badge>
                    </div>

                    <div className="grid gap-6">
                        {functionalMedicinePatients.map((patient: any) => (
                            <Card key={patient.id} className="shadow-sm border-slate-200 overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="grid grid-cols-12 divide-x divide-slate-100">
                                    
                                    {/* Patient Info */}
                                    <div className="col-span-3 p-5 bg-slate-50/50">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{patient.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                                <p className="text-xs text-slate-500">{patient.age}y • {patient.condition}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Dietary Plan</span>
                                                <span className="font-medium text-slate-700">{patient.plan}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Next Review</span>
                                                <span className="font-medium text-blue-600">{patient.nextReview}</span>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="w-full mt-4 text-xs bg-white"
                                            onClick={() => setLocation(`/staff/protocol/${patient.id}`)}
                                        >
                                            Full Profile
                                        </Button>
                                    </div>

                                    {/* Genomics Column */}
                                    <div className="col-span-3 p-5">
                                        <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Dna className="w-4 h-4" /> Genomic Insight
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-purple-900">MTHFR</p>
                                                    <p className="text-[10px] text-purple-700">{patient.genomics.mthfr.status}</p>
                                                </div>
                                                <Badge className={`${patient.genomics.mthfr.risk === 'High' ? 'bg-rose-500' : patient.genomics.mthfr.risk === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-700">Caffeine Metabolism</p>
                                                    <p className="text-[10px] text-slate-500">{patient.genomics.caffeine.status}</p>
                                                </div>
                                                <Badge className={`${patient.genomics.caffeine.risk === 'High' ? 'bg-rose-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                            </div>
                                            {(patient.genomics.gluten || patient.genomics.carbs) && (
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-700">{patient.genomics.gluten ? 'Gluten Sensitivity' : 'Carb Sensitivity'}</p>
                                                        <p className="text-[10px] text-slate-500">{patient.genomics.gluten ? patient.genomics.gluten.status : patient.genomics.carbs?.status}</p>
                                                    </div>
                                                    <Badge className={`${(patient.genomics.gluten?.risk === 'High' || patient.genomics.carbs?.risk === 'High') ? 'bg-rose-500' : 'bg-emerald-500'} h-1.5 w-1.5 p-0 rounded-full`}></Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Functional Markers Column */}
                                    <div className="col-span-3 p-5">
                                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <FlaskConical className="w-4 h-4" /> Functional Markers
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600">Gut Microbiome</span>
                                                    <span className={`font-bold ${patient.functional.gut.score < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{patient.functional.gut.status}</span>
                                                </div>
                                                <Progress value={patient.functional.gut.score} className="h-1.5 bg-slate-100" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600">Inflammation ({patient.functional.inflammation.marker})</span>
                                                    <span className="font-bold text-amber-600">{patient.functional.inflammation.value}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500 w-3/4 rounded-full"></div>
                                                    </div>
                                                    <span className="text-[10px] text-amber-600 font-medium">{patient.functional.inflammation.status}</span>
                                                </div>
                                            </div>
                                            <div className="bg-rose-50 p-2 rounded border border-rose-100 flex items-start gap-2">
                                                <AlertCircle className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-bold text-rose-800">Deficiencies</p>
                                                    <p className="text-[10px] text-rose-600">{patient.functional.nutrient.deficiency}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Plan Column */}
                                    <div className="col-span-3 p-5 bg-slate-50/30">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" /> Intervention
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                                                <p className="text-xs text-slate-600">{patient.intervention?.protocol || "Standard Protocol"} <span className="text-slate-400 text-[10px]">(Active)</span></p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                                                <p className="text-xs text-slate-600">{patient.intervention?.dietPhase || "Maintenance"} <span className="text-slate-400 text-[10px]">(Current)</span></p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Primary Focus</p>
                                                <p className="text-sm font-medium text-slate-800">{patient.functional.hormone.focus}</p>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="w-full bg-slate-900 text-white hover:bg-slate-800 h-8 text-xs mt-2"
                                                onClick={() => setLocation(`/staff/protocol/${patient.id}`)}
                                            >
                                                Adjust Protocol
                                            </Button>
                                        </div>
                                    </div>

                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. PSYCHOLOGIST VIEW */}
            {activeRole === 'psychologist' && activeView === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">High Stress Alerts</p>
                                <p className="text-2xl font-bold text-slate-900">4</p>
                                <p className="text-xs text-rose-600 mt-1">Requires immediate contact</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Avg EPDS Score</p>
                                <p className="text-2xl font-bold text-slate-900">8.2</p>
                                <p className="text-xs text-emerald-600 mt-1">Improved by 1.2 pts</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200 col-span-1">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Sessions Today</p>
                                <p className="text-2xl font-bold text-slate-900">6</p>
                                <p className="text-xs text-slate-500 mt-1">2 Couples / 4 Individual</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100">
                             <CardTitle className="text-base font-bold text-slate-800">Patient Monitoring</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Patient</th>
                                        <th className="px-4 py-3 font-medium">Stage</th>
                                        <th className="px-4 py-3 font-medium">Current Mood</th>
                                        <th className="px-4 py-3 font-medium">Clinical Flags</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {patients.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{p.status}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className={`
                                                    ${p.mood === 'Anxious' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                    ${p.mood === 'Depressed' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                    ${p.mood === 'Stable' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                                                    ${p.mood === 'Stressed' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                                `}>
                                                    {p.mood}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {p.type === 'Fertility' && p.mood !== 'Stable' && "Failed Cycle x2"}
                                                {p.type === 'Postpartum' && "Sleep Deprived"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-600">Log Note</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 3. PHYSICAL TRAINER VIEW */}
            {activeRole === 'trainer' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-800">Workout Plans</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {workouts.map((w: any) => (
                                    <div key={w.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors cursor-pointer bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{w.name}</p>
                                                <p className="text-xs text-slate-500">{w.phase} Phase • {w.intensity} Intensity</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                ))}
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    Create New Plan
                                </Button>
                            </CardContent>
                         </Card>

                         <Card className="shadow-sm border-slate-200">
                            <CardHeader className="py-3 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-800">Activity Alerts</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {(() => {
                                        const alertTemplates = [
                                            { color: 'bg-rose-500', title: 'Sudden Activity Drop', suffix: 'has 0 activity mins for 3 days.' },
                                            { color: 'bg-amber-500', title: 'Weight Plateau', suffix: 'weight stable for 4 weeks despite plan.' },
                                        ];
                                        const alertPatients = patients.filter((p: any) => p.type === 'Pregnancy' || p.type === 'PCOS').slice(0, 2);
                                        return alertTemplates.map((tmpl, idx) => {
                                            const p = alertPatients[idx];
                                            const patientLabel = p ? `${p.name} (${p.type})` : `Patient ${idx + 1}`;
                                            return (
                                                <div key={idx} className="p-4 flex gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${tmpl.color} mt-1.5 shrink-0`}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{tmpl.title}</p>
                                                        <p className="text-xs text-slate-500">{patientLabel} {tmpl.suffix}</p>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </CardContent>
                         </Card>
                    </div>
                </div>
            )}

            {/* 4. DERMATOLOGIST VIEW */}
            {activeRole === 'dermatologist' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                         {patients.filter((p: any) => p.type === 'PCOS' || p.type === 'Pregnancy').map((p: any) => (
                             <Card key={p.id} className="shadow-sm border-slate-200">
                                 <CardHeader className="pb-2">
                                     <div className="flex justify-between items-start">
                                         <div className="flex items-center gap-3">
                                             <Avatar>
                                                 <AvatarFallback>{p.avatar}</AvatarFallback>
                                             </Avatar>
                                             <div>
                                                 <CardTitle className="text-sm font-bold text-slate-900">{p.name}</CardTitle>
                                                 <p className="text-xs text-slate-500">{p.type} • {p.status}</p>
                                             </div>
                                         </div>
                                     </div>
                                 </CardHeader>
                                 <CardContent className="space-y-3 pt-2">
                                     <div className="grid grid-cols-2 gap-2 text-center">
                                         <div className="bg-slate-50 p-2 rounded">
                                             <p className="text-[10px] text-slate-500 uppercase">Acne Score</p>
                                             <p className="font-bold text-slate-800">3/5</p>
                                         </div>
                                         <div className="bg-slate-50 p-2 rounded">
                                             <p className="text-[10px] text-slate-500 uppercase">Hair Fall</p>
                                             <p className="font-bold text-slate-800">Mild</p>
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <Button size="sm" variant="outline" className="w-full text-xs">Update Score</Button>
                                         <Button size="sm" className="w-full text-xs bg-rose-600 hover:bg-rose-700">Prescribe</Button>
                                     </div>
                                 </CardContent>
                             </Card>
                         ))}
                    </div>
                </div>
            )}

            {/* 5. PHLEBOTOMIST VIEW */}
            {activeRole === 'phlebotomist' && activeView === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-800">Investigation Queue</CardTitle>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs">
                                <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Log New Collection
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Patient</th>
                                        <th className="px-6 py-3 font-medium">Test Name</th>
                                        <th className="px-6 py-3 font-medium">Due</th>
                                        <th className="px-6 py-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {labTasks.map((task: any) => (
                                        <tr key={task.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={`
                                                    ${task.status === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                                    ${task.status === 'Scheduled' ? 'bg-slate-100 text-slate-700 border-slate-200' : ''}
                                                    ${task.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                                                `}>
                                                    {task.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">{task.patient}</td>
                                            <td className="px-6 py-4 text-slate-600">{task.test}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {task.due}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {task.status === 'Pending' && (
                                                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Collect Sample</Button>
                                                )}
                                                {task.status === 'Delayed' && (
                                                    <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 bg-rose-50">Send Reminder</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 6. RECEPTIONIST VIEW */}
            {activeRole === 'receptionist' && activeView === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <Card className="shadow-sm border-slate-200" data-testid="stat-today-visits">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Today's Visits</p>
                                <p className="text-2xl font-bold text-slate-900">{todayAppointments.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200" data-testid="stat-checked-in">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Checked In</p>
                                <p className="text-2xl font-bold text-emerald-600">{todayAppointments.filter((a: any) => a.status === 'On Time' || a.status === 'Completed').length}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200" data-testid="stat-late">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Late</p>
                                <p className="text-2xl font-bold text-rose-600">{todayAppointments.filter((a: any) => a.status === 'Late').length}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-slate-200" data-testid="stat-pending-tasks">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pending Tasks</p>
                                <p className="text-2xl font-bold text-amber-600">{labTasks.filter((t: any) => t.status === 'Pending' || t.status === 'Delayed').length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Action Items */}
                        <div className="col-span-8 space-y-6">
                            
                            {/* Patient Queue */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                        <CardTitle className="text-base font-bold text-slate-800">Patient Queue (Onboarding/Vitals)</CardTitle>
                                    </div>
                                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">{patientQueue.length} Waiting</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {patientQueue.length === 0 && (
                                            <div className="p-6 text-center text-sm text-slate-400">No patients currently waiting</div>
                                        )}
                                        {patientQueue.map((p: any) => (
                                            <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                        {p.name.split(' ').map((n: string) => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {p.time} — {p.type || 'Appointment'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={`
                                                        ${p.status === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                                          p.status === 'Check-in' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                                          'bg-slate-100 text-slate-600 border-slate-200'}
                                                    `}>
                                                        {p.status}
                                                    </Badge>
                                                    
                                                    {p.action === "Checkout" && (
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                                                            onClick={() => {
                                                                setSelectedPatientForCheckout(p);
                                                                setIsCheckoutOpen(true);
                                                            }}
                                                        >
                                                            Process Checkout
                                                        </Button>
                                                    )}
                                                    {p.action === "Onboard" && (
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                                                            onClick={() => {
                                                                setSelectedPatientForOnboarding(p);
                                                                setIsOnboardingOpen(true);
                                                            }}
                                                        >
                                                            Start Onboarding
                                                        </Button>
                                                    )}
                                                    {p.action === "Take Vitals" && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="border-indigo-200 text-indigo-700 bg-indigo-50 h-8 text-xs hover:bg-indigo-100"
                                                            onClick={() => {
                                                                setSelectedPatientForVitals(p);
                                                                setIsVitalsOpen(true);
                                                            }}
                                                        >
                                                            <Activity className="w-3 h-3 mr-1" /> Take Vitals
                                                        </Button>
                                                    )}
                                                    {p.action === "Upload Records" && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="border-slate-200 text-slate-700 h-8 text-xs hover:bg-slate-50"
                                                            onClick={() => {
                                                                setSelectedPatientForUpload(p);
                                                                setIsUploadOpen(true);
                                                            }}
                                                        >
                                                            <FileText className="w-3 h-3 mr-1" /> Upload Records
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Clinical Action Items */}
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-4 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                        <CardTitle className="text-base font-bold text-slate-800">Pending Clinical Actions</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {receptionistTasks.map((task: any) => (
                                            <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className={`text-[10px] uppercase ${
                                                            task.type === 'lab' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            task.type === 'usg' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            {task.type === 'lab' ? 'Blood Test' : task.type === 'usg' ? 'USG Appointment' : 'Registration'}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-slate-500">for {task.patient}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800">{task.title}</p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="text-xs h-8"
                                                    onClick={() => {
                                                        setSelectedTaskForAction(task);
                                                        setIsClinicalActionOpen(true);
                                                    }}
                                                >
                                                    Action
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Appointment Flow (Existing) */}
                             <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-4 border-b border-slate-100 flex justify-between items-center">
                                    <CardTitle className="text-base font-bold text-slate-800">Appointment Schedule</CardTitle>
                                    <Link href="/staff/booking">
                                        <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
                                            + New Booking
                                        </Button>
                                    </Link>
                                </CardHeader>
                                <CardContent className="p-0">
                                     <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Time</th>
                                                <th className="px-4 py-3 font-medium">Patient</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Doctor/Staff</th>
                                                <th className="px-4 py-3 font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {todayAppointments.map((apt: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50/50">
                                                    <td className="px-4 py-3 font-medium text-slate-500">{apt.time}</td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{apt.patient}</td>
                                                    <td className="px-4 py-3 text-slate-600">{apt.type}</td>
                                                    <td className="px-4 py-3 text-slate-500">{apt.doctor}</td>
                                                    <td className="px-4 py-3 flex gap-2">
                                                        {apt.status === 'Completed' ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Done</Badge>
                                                        ) : (
                                                            <Link href="/staff/check-in">
                                                                <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Check In</Button>
                                                            </Link>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {todayAppointments.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No appointments scheduled for today</td>
                                                </tr>
                                            )}
                                        </tbody>
                                     </table>
                                </CardContent>
                            </Card>


                        </div>

                        {/* RIGHT COLUMN: Growth & Follow-up */}
                        <div className="col-span-4 space-y-6">
                            
                            {/* Follow-up Indicators */}
                            <Card className="shadow-sm border-slate-200 bg-rose-50/30">
                                <CardHeader className="py-3 border-b border-rose-100 bg-rose-50/50">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="w-4 h-4 text-rose-600" />
                                        <CardTitle className="text-sm font-bold text-rose-900 uppercase tracking-wide">Follow-up Needed</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-rose-100">
                                        {followUpList.map((item: any) => (
                                            <div key={item.id} className="p-3 hover:bg-rose-50/50">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-sm font-bold text-slate-800">{item.patient}</span>
                                                    <Badge variant="outline" className="text-[10px] bg-white border-rose-200 text-rose-600">{item.type}</Badge>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">{item.daysAgo !== null ? (item.daysAgo === 0 ? 'Today' : `${item.daysAgo} day${item.daysAgo !== 1 ? 's' : ''} since last visit`) : 'No visit on record'}</p>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="w-full h-7 text-xs bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5"
                                                    onClick={() => {
                                                        setSelectedFollowUp(item);
                                                        setIsFollowUpOpen(true);
                                                    }}
                                                >
                                                    {item.action.includes("Call") ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                                                    {item.action}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cross-sell Opportunities */}
                            <Card className="shadow-sm border-slate-200 bg-emerald-50/30">
                                <CardHeader className="py-3 border-b border-emerald-100 bg-emerald-50/50">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-600" />
                                        <CardTitle className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Growth Opportunities</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-emerald-100">
                                        {crossSellOpportunities.map((opp: any) => (
                                            <div key={opp.id} className="p-3 hover:bg-emerald-50/50">
                                                <div className="mb-2">
                                                    <span className="text-xs font-medium text-slate-500 block mb-0.5">Recommend for {opp.patient}</span>
                                                    <span className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                                                        {opp.service}
                                                    </span>
                                                </div>
                                                <div className="bg-white/60 p-2 rounded text-[10px] text-slate-600 italic mb-2">
                                                    "{opp.reason}"
                                                </div>
                                                <Button size="sm" className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm">
                                                    Suggest Service
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Google Sheets Sync */}
                             <Card className="shadow-sm border-slate-200 bg-blue-50/30">
                                <CardHeader className="py-3 border-b border-blue-100 bg-blue-50/50">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <CardTitle className="text-sm font-bold text-blue-900 uppercase tracking-wide">Google Sheets Import</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-xs text-slate-600">
                                        <p>Import patient data from the clinic's Google Sheet registration form.</p>
                                        {sheetStatus && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${sheetStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                <span>{sheetStatus.connected ? `${sheetStatus.rowCount} records available` : 'Not connected'}</span>
                                            </div>
                                        )}
                                    </div>
                                    {syncResult && (
                                        <div className={`p-2 rounded text-xs ${syncResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`} data-testid="sync-result">
                                            {syncResult.error ? syncResult.error : syncResult.message}
                                            {syncResult.errors && syncResult.errors.length > 0 && (
                                                <div className="mt-1 text-[10px] text-amber-700">
                                                    {syncResult.errors.slice(0, 3).map((e: string, i: number) => <div key={i}>{e}</div>)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                                        onClick={handleSheetSync}
                                        disabled={isSyncing}
                                        data-testid="button-sync-sheets"
                                    >
                                        {isSyncing ? (
                                            <><RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Syncing...</>
                                        ) : (
                                            <><RefreshCw className="w-3 h-3 mr-2" /> Sync Patient Data</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                             {/* Google Drive Lab Reports Import */}
                             <Card className="shadow-sm border-slate-200 bg-purple-50/30">
                                <CardHeader className="py-3 border-b border-purple-100 bg-purple-50/50">
                                    <div className="flex items-center gap-2">
                                        <FlaskConical className="w-4 h-4 text-purple-600" />
                                        <CardTitle className="text-sm font-bold text-purple-900 uppercase tracking-wide">Lab Reports Import</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-xs text-slate-600">
                                        <p>Import lab reports from Google Drive and map them to patients.</p>
                                        {driveStatus && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${driveStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                    <span>{driveStatus.connected ? `${driveStatus.testReports} lab reports found` : 'Not connected'}</span>
                                                </div>
                                                {driveStatus.connected && driveStatus.alreadyImported > 0 && (
                                                    <div className="flex items-center gap-2 text-emerald-600">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>{driveStatus.alreadyImported} already imported</span>
                                                    </div>
                                                )}
                                                {driveStatus.connected && driveStatus.pendingImport > 0 && (
                                                    <div className="flex items-center gap-2 text-amber-600">
                                                        <AlertCircle className="w-3 h-3" />
                                                        <span>{driveStatus.pendingImport} pending import</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {labImportResult && (
                                        <div className={`p-2 rounded text-xs ${labImportResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`} data-testid="lab-import-result">
                                            {labImportResult.error ? labImportResult.error : (
                                                <div className="space-y-1">
                                                    <div className="font-medium">{labImportResult.imported} reports imported, {labImportResult.skipped} skipped</div>
                                                    {labImportResult.unmatched?.length > 0 && (
                                                        <div className="text-amber-700 text-[10px]">
                                                            <div className="font-medium">Unmatched patients:</div>
                                                            {labImportResult.unmatched.map((name: string, i: number) => <div key={i}>{name}</div>)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <Button 
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
                                        onClick={handleLabImport}
                                        disabled={isImportingLabs}
                                        data-testid="button-import-labs"
                                    >
                                        {isImportingLabs ? (
                                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Importing...</>
                                        ) : (
                                            <><Upload className="w-3 h-3 mr-2" /> Import Lab Reports</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                             {/* Quick Actions */}
                             <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">Quick Tools</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 hover:border-indigo-300 hover:bg-indigo-50 border-slate-200">
                                        <Users className="w-5 h-5 text-indigo-500" />
                                        <span className="text-xs font-medium text-slate-600">New Patient</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 hover:border-blue-300 hover:bg-blue-50 border-slate-200">
                                        <CalendarCheck className="w-5 h-5 text-blue-500" />
                                        <span className="text-xs font-medium text-slate-600">Schedule</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 hover:border-emerald-300 hover:bg-emerald-50 border-slate-200">
                                        <Activity className="w-5 h-5 text-emerald-500" />
                                        <span className="text-xs font-medium text-slate-600">Log Vitals</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-1 hover:border-purple-300 hover:bg-purple-50 border-slate-200">
                                        <FileText className="w-5 h-5 text-purple-500" />
                                        <span className="text-xs font-medium text-slate-600">Uploads</span>
                                    </Button>
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </div>
            )}

            {/* FOLLOW-UP CALLS TAB (Receptionist only) */}
            {activeRole === 'receptionist' && activeView === 'followup' && (
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Phone className="w-6 h-6 text-orange-600" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Follow-Up Cold Calls</h2>
                                <p className="text-sm text-slate-500">Track and manage patient follow-up calls</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200">{followUpCalls.filter((c: any) => c.status === 'pending').length} Pending</Badge>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{followUpCalls.filter((c: any) => c.status === 'completed').length} Completed</Badge>
                                <Badge variant="outline" className="text-slate-500">{followUpCalls.length} Total</Badge>
                            </div>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8" onClick={() => { setSelectedCallPatient(null); setFollowUpCallForm({ feeling: '', gotMedicines: '', concerns: '', crossSell: '', nextVisit: '', notes: '', nextMilestone: '', didntPickCallTime: '' }); setIsFollowUpCallOpen(true); }}>
                                <Plus className="w-3 h-3 mr-1" /> Log Call
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-9">
                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-3 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex border border-slate-200 rounded-md overflow-hidden text-xs">
                                        {(['pending', 'completed', 'all'] as const).map(f => (
                                            <button key={f} onClick={() => setFollowUpCallFilter(f)} className={`px-4 py-2 capitalize ${followUpCallFilter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{f}</button>
                                        ))}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Showing {followUpCalls.filter((c: any) => followUpCallFilter === 'all' ? true : c.status === followUpCallFilter).length} records
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-100 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2.5 font-medium">Date</th>
                                                    <th className="px-3 py-2.5 font-medium">Patient</th>
                                                    <th className="px-3 py-2.5 font-medium">Type</th>
                                                    <th className="px-3 py-2.5 font-medium">Feeling</th>
                                                    <th className="px-3 py-2.5 font-medium">Medicines</th>
                                                    <th className="px-3 py-2.5 font-medium">Concerns</th>
                                                    <th className="px-3 py-2.5 font-medium">Notes</th>
                                                    <th className="px-3 py-2.5 font-medium">Cross-sell</th>
                                                    <th className="px-3 py-2.5 font-medium">Next Visit</th>
                                                    <th className="px-3 py-2.5 font-medium">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {followUpCalls
                                                    .filter((c: any) => followUpCallFilter === 'all' ? true : c.status === followUpCallFilter)
                                                    .sort((a: any, b: any) => {
                                                        const dateA = a.actualDate || a.plannedDate || '';
                                                        const dateB = b.actualDate || b.plannedDate || '';
                                                        return dateB.localeCompare(dateA);
                                                    })
                                                    .map((call: any) => (
                                                    <tr key={call.id} className="hover:bg-slate-50/50">
                                                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{call.actualDate || call.plannedDate || '—'}</td>
                                                        <td className="px-3 py-2.5">
                                                            <div>
                                                                <span className="font-semibold text-slate-900 text-xs">{call.patientName}</span>
                                                                {call.phone && <div className="text-[10px] text-slate-400">{call.phone}</div>}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <Badge variant="outline" className="text-[10px]">{call.patientType || '—'}</Badge>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-xs">
                                                            {call.feeling ? (
                                                                <span className={`font-medium ${call.feeling.toLowerCase() === 'good' ? 'text-emerald-600' : call.feeling.toLowerCase() === 'not well' ? 'text-rose-600' : 'text-amber-600'}`}>{call.feeling}</span>
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-xs">
                                                            {call.gotMedicines ? (
                                                                <span className={`font-medium ${call.gotMedicines.toLowerCase() === 'yes' ? 'text-emerald-600' : 'text-rose-600'}`}>{call.gotMedicines}</span>
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={call.concerns || ''}>{call.concerns || '—'}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[180px] truncate" title={call.notes || ''}>{call.notes || '—'}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-500">{call.crossSell || '—'}</td>
                                                        <td className="px-3 py-2.5 text-xs text-slate-500">{call.nextVisit || '—'}</td>
                                                        <td className="px-3 py-2.5">
                                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-2" onClick={() => {
                                                                setSelectedCallPatient(call);
                                                                setFollowUpCallForm({
                                                                    feeling: call.feeling || '',
                                                                    gotMedicines: call.gotMedicines || '',
                                                                    concerns: call.concerns || '',
                                                                    crossSell: call.crossSell || '',
                                                                    nextVisit: call.nextVisit || '',
                                                                    notes: call.notes || '',
                                                                    nextMilestone: call.nextMilestone || '',
                                                                    didntPickCallTime: call.didntPickCallTime || '',
                                                                });
                                                                setIsFollowUpCallOpen(true);
                                                            }}>
                                                                {call.status === 'pending' ? 'Call Now' : 'View'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {followUpCalls.filter((c: any) => followUpCallFilter === 'all' ? true : c.status === followUpCallFilter).length === 0 && (
                                                    <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                                                        {followUpCallFilter === 'pending' ? 'No pending follow-up calls' : followUpCallFilter === 'completed' ? 'No completed calls yet' : 'No follow-up calls recorded'}
                                                    </td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="col-span-3 space-y-4">
                            <Card className="shadow-sm border-slate-200 bg-orange-50/30">
                                <CardHeader className="py-3 border-b border-orange-100 bg-orange-50/50">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 text-orange-600" />
                                        <CardTitle className="text-sm font-bold text-orange-900">Sheet Import</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="text-xs text-slate-600">
                                        <p>Import follow-up records from the Google Sheet.</p>
                                        {followUpSheetStatus && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${followUpSheetStatus.connected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                <span>{followUpSheetStatus.connected ? `${followUpSheetStatus.rowCount} records available` : 'Not connected'}</span>
                                            </div>
                                        )}
                                    </div>
                                    {followUpImportResult && (
                                        <div className={`p-2 rounded text-xs ${followUpImportResult.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                            {followUpImportResult.error ? followUpImportResult.error : followUpImportResult.message}
                                        </div>
                                    )}
                                    <Button 
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs h-9"
                                        onClick={handleImportFollowUpSheet}
                                        disabled={isImportingFollowUp}
                                    >
                                        {isImportingFollowUp ? (
                                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Importing...</>
                                        ) : (
                                            <><Upload className="w-3 h-3 mr-2" /> Import Call Records</>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-slate-200">
                                <CardHeader className="py-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800">Quick Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Feeling Good</span>
                                        <span className="font-bold text-emerald-600">{followUpCalls.filter((c: any) => c.feeling?.toLowerCase() === 'good').length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Not Well</span>
                                        <span className="font-bold text-rose-600">{followUpCalls.filter((c: any) => c.feeling?.toLowerCase() === 'not well').length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Got Medicines</span>
                                        <span className="font-bold text-emerald-600">{followUpCalls.filter((c: any) => c.gotMedicines?.toLowerCase() === 'yes').length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Didn't Get Medicines</span>
                                        <span className="font-bold text-rose-600">{followUpCalls.filter((c: any) => c.gotMedicines?.toLowerCase() === 'no').length}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">With Cross-sell</span>
                                        <span className="font-bold text-slate-700">{followUpCalls.filter((c: any) => c.crossSell && c.crossSell !== 'NA' && c.crossSell !== 'na').length}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Didn't Pick Up</span>
                                        <span className="font-bold text-amber-600">{followUpCalls.filter((c: any) => c.didntPickCallTime).length}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {activeRole === 'receptionist' && activeView === 'prime' && (
                <PrimeMembersView patients={patients} />
            )}

            {activeRole === 'receptionist' && activeView === 'billing' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 font-serif" data-testid="text-billing-title">Patient Billing</h2>
                    <p className="text-sm text-slate-500 mt-1">Create invoices from the service catalog</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                          Step 1: Select Patient
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={billingPatientId?.toString() || ""} onValueChange={(v) => setBillingPatientId(parseInt(v))}>
                          <SelectTrigger data-testid="select-billing-patient">
                            <SelectValue placeholder="Choose a patient..." />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name} {p.isPrimeMember ? '⭐' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                          Step 2: Add Services from Catalog
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(
                          billingCatalogItems
                            .filter((c: any) => c.isActive !== false)
                            .reduce((acc: any, item: any) => {
                              const cat = item.category || "Other";
                              if (!acc[cat]) acc[cat] = [];
                              acc[cat].push(item);
                              return acc;
                            }, {})
                        ).map(([category, items]: [string, any]) => (
                          <div key={category}>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{category}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {items.map((item: any) => {
                                const alreadyAdded = billingItems.some((b: any) => b.catalogItemId === item.id);
                                return (
                                  <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${alreadyAdded ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50'} transition-colors`} data-testid={`catalog-item-${item.id}`}>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                                      <p className="text-xs text-slate-500">₹{item.price?.toLocaleString('en-IN')} {item.taxRate > 0 ? `+ ${item.taxRate}% GST` : '(No GST)'}</p>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant={alreadyAdded ? "outline" : "default"}
                                      className={`h-7 text-xs ml-2 shrink-0 ${alreadyAdded ? 'border-emerald-300 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                      onClick={() => {
                                        if (alreadyAdded) {
                                          setBillingItems(billingItems.filter((b: any) => b.catalogItemId !== item.id));
                                        } else {
                                          setBillingItems([...billingItems, { catalogItemId: item.id, name: item.name, price: item.price, quantity: 1, taxRate: item.taxRate || 0 }]);
                                        }
                                      }}
                                      data-testid={`btn-add-item-${item.id}`}
                                    >
                                      {alreadyAdded ? '✓ Added' : '+ Add'}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <Card className="border-slate-200 shadow-sm sticky top-6">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-emerald-600" />
                          Invoice Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {billingPatientId && (
                          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <p className="text-xs text-indigo-600 font-medium">Patient</p>
                            <p className="text-sm font-bold text-indigo-900">{patients.find((p: any) => p.id === billingPatientId)?.name || 'Unknown'}</p>
                          </div>
                        )}

                        {billingItems.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-6">No items added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {billingItems.map((item: any, idx: number) => {
                              const itemSubtotal = item.price * item.quantity;
                              const itemTax = itemSubtotal * (item.taxRate / 100);
                              return (
                                <div key={idx} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0" data-testid={`billing-line-${idx}`}>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => { if (item.quantity > 1) { const updated = [...billingItems]; updated[idx] = { ...item, quantity: item.quantity - 1 }; setBillingItems(updated); } }}>−</button>
                                      <span className="text-xs font-medium text-slate-600">Qty: {item.quantity}</span>
                                      <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => { const updated = [...billingItems]; updated[idx] = { ...item, quantity: item.quantity + 1 }; setBillingItems(updated); }}>+</button>
                                    </div>
                                    {item.taxRate > 0 && <p className="text-xs text-slate-400 mt-0.5">GST {item.taxRate}%: ₹{itemTax.toLocaleString('en-IN')}</p>}
                                  </div>
                                  <div className="text-right flex items-start gap-2">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">₹{itemSubtotal.toLocaleString('en-IN')}</p>
                                    </div>
                                    <button className="text-slate-400 hover:text-red-500 mt-0.5" onClick={() => setBillingItems(billingItems.filter((_: any, i: number) => i !== idx))} data-testid={`btn-remove-item-${idx}`}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {billingItems.length > 0 && (() => {
                          const subtotal = billingItems.reduce((s: number, item: any) => s + item.price * item.quantity, 0);
                          const tax = billingItems.reduce((s: number, item: any) => s + (item.price * item.quantity * (item.taxRate / 100)), 0);
                          const total = subtotal + tax;

                          return (
                            <div className="space-y-3 pt-2">
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between text-slate-600"><span>GST</span><span>₹{Math.round(tax).toLocaleString('en-IN')}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg text-slate-900"><span>Total</span><span>₹{Math.round(total).toLocaleString('en-IN')}</span></div>
                              </div>

                              <div>
                                <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
                                <Select value={billingPaymentMethod} onValueChange={setBillingPaymentMethod}>
                                  <SelectTrigger className="mt-1" data-testid="select-payment-method">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="insurance">Insurance</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-xs font-medium text-slate-600">Notes (optional)</Label>
                                <Textarea value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} placeholder="Add notes..." className="mt-1 min-h-[60px]" data-testid="input-billing-notes" />
                              </div>

                              <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                disabled={!billingPatientId || createInvoiceMutation.isPending}
                                onClick={() => {
                                  if (!billingPatientId) return;
                                  createInvoiceMutation.mutate({
                                    patientId: billingPatientId,
                                    items: billingItems,
                                    subtotal,
                                    tax: Math.round(tax),
                                    total: Math.round(total),
                                    paymentMethod: billingPaymentMethod,
                                    notes: billingNotes,
                                  });
                                }}
                                data-testid="btn-generate-invoice"
                              >
                                {createInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
                                Generate Invoice
                              </Button>

                              {createInvoiceMutation.isSuccess && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                                  <p className="text-sm font-bold text-emerald-800">Invoice Created!</p>
                                  <p className="text-xs text-emerald-600 mt-1">Total: ₹{Math.round(total).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout / Post-Consultation Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-serif">
                             <ClipboardList className="w-6 h-6 text-indigo-600" />
                             Post-Consultation Action Plan
                        </DialogTitle>
                        <DialogDescription>
                            Complete next steps for <span className="font-bold text-slate-900">{selectedPatientForCheckout?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-2 space-y-8">
                        
                        {/* 1. Clinical Referrals & Lifestyle */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-600" /> Clinical Referrals & Lifestyle
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                    <Checkbox id="ref-lifestyle" />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor="ref-lifestyle" className="text-sm font-medium leading-none cursor-pointer">Lifestyle Modification</label>
                                        <p className="text-xs text-slate-500">Sleep hygiene & stress mgmt handout</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                    <Checkbox id="ref-nutrition" defaultChecked />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor="ref-nutrition" className="text-sm font-medium leading-none cursor-pointer">Nutrition Consultation</label>
                                        <p className="text-xs text-slate-500">Book w/ Ms. Gupta (PCOS Protocol)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* 2. Pharmacy & Education */}
                        <div className="space-y-3">
                             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <Pill className="w-4 h-4 text-blue-600" /> Pharmacy & Education
                            </h3>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                <div className="flex items-start space-x-3 mb-4">
                                    <Checkbox id="task-explain" defaultChecked />
                                    <label htmlFor="task-explain" className="text-sm font-bold text-blue-900 cursor-pointer">Explain Prescribed Medicine</label>
                                </div>
                                <div className="space-y-2 pl-7">
                                    <div className="flex justify-between text-xs bg-white p-2 rounded border border-blue-100">
                                        <span className="font-medium">Metformin 500mg</span>
                                        <span className="text-slate-500">1-0-1 (After meals)</span>
                                    </div>
                                    <div className="flex justify-between text-xs bg-white p-2 rounded border border-blue-100">
                                        <span className="font-medium">Folic Acid 5mg</span>
                                        <span className="text-slate-500">0-1-0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* 3. Scheduling & Next Steps */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-purple-600" /> Scheduling
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="outline" className="h-auto py-3 flex flex-col items-start gap-1 border-slate-200 hover:border-purple-300 hover:bg-purple-50">
                                    <span className="font-bold text-slate-900 flex items-center gap-2"><Plus className="w-3 h-3" /> Book USG Appointment</span>
                                    <span className="text-xs text-slate-500 font-normal">Pelvic Scan / Follicular Study</span>
                                </Button>
                                <Button variant="outline" className="h-auto py-3 flex flex-col items-start gap-1 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50">
                                    <span className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-3 h-3" /> Schedule Follow-up</span>
                                    <span className="text-xs text-slate-500 font-normal">Review in 2 weeks</span>
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* 4. Product Sales (Cross-Sell) */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-rose-600" /> Recommended Products
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-rose-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400">IMG</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-slate-900">Prenatal Multi-Vitamin Pack</p>
                                            <p className="text-xs text-slate-500">$45.00 • In Stock</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200 text-slate-600">Add to Bill</Button>
                                </div>
                                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-rose-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center">
                                            <span className="text-xs font-bold text-slate-400">IMG</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-slate-900">Magnesium Glycinate</p>
                                            <p className="text-xs text-slate-500">$28.00 • In Stock</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 text-xs border-slate-200 text-slate-600">Add to Bill</Button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="py-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Save as Draft</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[150px]" onClick={() => setIsCheckoutOpen(false)}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete & Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Follow Up Action Dialog */}
            <Dialog open={isFollowUpOpen} onOpenChange={setIsFollowUpOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedFollowUp?.action.includes("Call") ? <Phone className="w-5 h-5 text-rose-600" /> : <Mail className="w-5 h-5 text-rose-600" />}
                            {selectedFollowUp?.action}
                        </DialogTitle>
                        <DialogDescription>
                            Initiate follow-up with <span className="font-bold text-slate-900">{selectedFollowUp?.patient}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-rose-900">{selectedFollowUp?.type}</p>
                                <p className="text-xs text-rose-700 mt-1">
                                    {selectedFollowUp?.type?.includes("High Risk") 
                                        ? "Patient flagged as high risk. Priority follow-up visit required." 
                                        : "Patient requires a mood check-in based on recent assessments."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Notes for Record</Label>
                            <Textarea placeholder="Enter outcome of call or details of message sent..." className="min-h-[100px]" />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-between sm:justify-between">
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsFollowUpOpen(false)}>Snooze</Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setIsFollowUpOpen(false)}>Dismiss</Button>
                         </div>
                        <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setIsFollowUpOpen(false)}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Follow-Up Call Log Dialog */}
            <Dialog open={isFollowUpCallOpen} onOpenChange={setIsFollowUpCallOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5 text-orange-600" />
                            {selectedCallPatient?.id ? 'Update Call Log' : 'Log New Follow-Up Call'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedCallPatient?.patientName ? (
                                <span>Recording call with <span className="font-bold text-slate-900">{selectedCallPatient.patientName}</span> {selectedCallPatient.phone ? `(${selectedCallPatient.phone})` : ''}</span>
                            ) : 'Select a patient and record the follow-up call details'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {!selectedCallPatient?.id && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-medium">Patient Name</Label>
                                    <Select onValueChange={(val) => {
                                        const p = patients.find((pt: any) => pt.id === parseInt(val));
                                        if (p) setSelectedCallPatient({ patientId: p.id, patientName: p.name, phone: p.phone || '', patientType: p.type || '' });
                                    }}>
                                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select patient" /></SelectTrigger>
                                        <SelectContent>
                                            {patients.map((p: any) => (
                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs font-medium">Phone</Label>
                                    <Input className="h-9 text-xs" placeholder="Phone number" value={selectedCallPatient?.phone || ''} onChange={(e) => setSelectedCallPatient((prev: any) => ({ ...prev, phone: e.target.value }))} />
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-medium">How are you feeling?</Label>
                                <Select value={followUpCallForm.feeling} onValueChange={(val) => setFollowUpCallForm(f => ({ ...f, feeling: val }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Good">Good</SelectItem>
                                        <SelectItem value="Okay">Okay</SelectItem>
                                        <SelectItem value="Not Well">Not Well</SelectItem>
                                        <SelectItem value="No Response">No Response</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Got all medicines?</Label>
                                <Select value={followUpCallForm.gotMedicines} onValueChange={(val) => setFollowUpCallForm(f => ({ ...f, gotMedicines: val }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Yes">Yes</SelectItem>
                                        <SelectItem value="No">No</SelectItem>
                                        <SelectItem value="Partial">Partial</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-medium">Any concerns?</Label>
                            <Input className="h-9 text-xs" placeholder="Patient concerns or issues..." value={followUpCallForm.concerns} onChange={(e) => setFollowUpCallForm(f => ({ ...f, concerns: e.target.value }))} />
                        </div>

                        <div>
                            <Label className="text-xs font-medium">Call Notes</Label>
                            <Textarea className="text-xs min-h-[80px]" placeholder="Detailed notes from the call..." value={followUpCallForm.notes} onChange={(e) => setFollowUpCallForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-medium">Cross-sell / Recommend</Label>
                                <Input className="h-9 text-xs" placeholder="e.g., Prenatal Yoga" value={followUpCallForm.crossSell} onChange={(e) => setFollowUpCallForm(f => ({ ...f, crossSell: e.target.value }))} />
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Next Visit</Label>
                                <Input className="h-9 text-xs" placeholder="e.g., 15-Nov" value={followUpCallForm.nextVisit} onChange={(e) => setFollowUpCallForm(f => ({ ...f, nextVisit: e.target.value }))} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-medium">Next Milestone</Label>
                                <Input className="h-9 text-xs" placeholder="e.g., Postpartum yoga done" value={followUpCallForm.nextMilestone} onChange={(e) => setFollowUpCallForm(f => ({ ...f, nextMilestone: e.target.value }))} />
                            </div>
                            <div>
                                <Label className="text-xs font-medium">Didn't pick - follow up in</Label>
                                <Input className="h-9 text-xs" placeholder="e.g., 14 days" value={followUpCallForm.didntPickCallTime} onChange={(e) => setFollowUpCallForm(f => ({ ...f, didntPickCallTime: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsFollowUpCallOpen(false)}>Cancel</Button>
                        <Button 
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={saveFollowUpCallMutation.isPending}
                            onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                const payload: any = {
                                    ...followUpCallForm,
                                    actualDate: today,
                                    status: followUpCallForm.notes || followUpCallForm.feeling ? 'completed' : 'pending',
                                };
                                if (selectedCallPatient?.id) {
                                    saveFollowUpCallMutation.mutate({ id: selectedCallPatient.id, data: payload });
                                } else {
                                    payload.patientName = selectedCallPatient?.patientName || 'Unknown';
                                    payload.phone = selectedCallPatient?.phone || '';
                                    payload.patientType = selectedCallPatient?.patientType || '';
                                    payload.patientId = selectedCallPatient?.patientId || null;
                                    payload.plannedDate = today;
                                    saveFollowUpCallMutation.mutate({ data: payload });
                                }
                            }}
                        >
                            {saveFollowUpCallMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                            {selectedCallPatient?.id ? 'Update Call' : 'Save Call Log'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Vitals Collection Dialog */}
            <Dialog open={isVitalsOpen} onOpenChange={setIsVitalsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-600" /> 
                            Record Vitals
                        </DialogTitle>
                        <DialogDescription>
                            Enter current vital signs for <span className="font-bold text-slate-900">{selectedPatientForVitals?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        {/* Blood Pressure */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Blood Pressure (mmHg)</Label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input 
                                        placeholder="120" 
                                        className="text-center font-mono text-lg" 
                                        value={vitalsData.systolic}
                                        onChange={(e) => setVitalsData({...vitalsData, systolic: e.target.value})}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">SYS</span>
                                </div>
                                <span className="text-slate-300 text-xl font-light">/</span>
                                <div className="relative flex-1">
                                    <Input 
                                        placeholder="80" 
                                        className="text-center font-mono text-lg" 
                                        value={vitalsData.diastolic}
                                        onChange={(e) => setVitalsData({...vitalsData, diastolic: e.target.value})}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">DIA</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Height (cm)</Label>
                                <Input 
                                    placeholder="165" 
                                    className="font-mono" 
                                    value={vitalsData.height}
                                    onChange={(e) => setVitalsData({...vitalsData, height: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Weight (kg)</Label>
                                <Input 
                                    placeholder="65.0" 
                                    className="font-mono" 
                                    value={vitalsData.weight}
                                    onChange={(e) => setVitalsData({...vitalsData, weight: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Pulse (bpm)</Label>
                                <Input 
                                    placeholder="72" 
                                    className="font-mono" 
                                    value={vitalsData.pulse}
                                    onChange={(e) => setVitalsData({...vitalsData, pulse: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">BMI Calculation:</span>
                                <span className="font-bold text-slate-900">
                                    {vitalsData.height && vitalsData.weight 
                                        ? (Number(vitalsData.weight) / Math.pow(Number(vitalsData.height)/100, 2)).toFixed(1)
                                        : '--'}
                                </span>
                             </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsVitalsOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setIsVitalsOpen(false)}>Save Vitals</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Records Dialog */}
            <UploadRecordsDialog
                isOpen={isUploadOpen}
                onClose={() => { setIsUploadOpen(false); }}
                patient={selectedPatientForUpload}
            />

            {/* Onboarding Dialog */}
            <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" /> 
                            New Patient Onboarding
                        </DialogTitle>
                        <DialogDescription>
                            Complete registration for <span className="font-bold text-slate-900">{selectedPatientForOnboarding?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="demographics" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="demographics">Personal Details</TabsTrigger>
                            <TabsTrigger value="medical">Medical History</TabsTrigger>
                            <TabsTrigger value="insurance">Insurance & Payment</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="demographics" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">First Name</Label>
                                    <Input placeholder="Jane" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Last Name</Label>
                                    <Input placeholder="Doe" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</Label>
                                    <Input type="date" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Gender</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Contact Number</Label>
                                <Input placeholder="+1 (555) 000-0000" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Email Address</Label>
                                <Input placeholder="patient@example.com" type="email" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Referred By <span className="text-slate-400 font-normal lowercase">(optional)</span></Label>
                                <Input placeholder="Dr. Name or Clinic" />
                            </div>
                        </TabsContent>

                        <TabsContent value="medical" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Chief Complaint</Label>
                                <Textarea placeholder="Reason for visit..." className="h-20" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Known Allergies</Label>
                                <Input placeholder="e.g. Penicillin, Peanuts" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Current Medications</Label>
                                <Textarea placeholder="List current medications..." className="h-20" />
                            </div>
                        </TabsContent>

                        <TabsContent value="insurance" className="space-y-4 mt-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Insurance Provider</Label>
                                    <Input placeholder="Provider Name" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Policy Number</Label>
                                    <Input placeholder="Policy #" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Payment Method</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credit">Credit Card</SelectItem>
                                        <SelectItem value="debit">Debit Card</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="insurance">Insurance Direct</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-start gap-2 mt-4 p-4 bg-slate-50 rounded border border-slate-100">
                                <Checkbox id="terms" />
                                <Label htmlFor="terms" className="text-sm text-slate-600 leading-snug">
                                    I confirm that the insurance details provided are accurate and authorize billing.
                                </Label>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOnboardingOpen(false)}>Cancel</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setIsOnboardingOpen(false)}>Complete Registration</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clinical Action Dialog */}
            <Dialog open={isClinicalActionOpen} onOpenChange={setIsClinicalActionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedTaskForAction?.type === 'lab' && <FlaskConical className="w-5 h-5 text-indigo-600" />}
                            {selectedTaskForAction?.type === 'usg' && <Activity className="w-5 h-5 text-purple-600" />}
                            {selectedTaskForAction?.type === 'onboard' && <Users className="w-5 h-5 text-emerald-600" />}
                            
                            {selectedTaskForAction?.type === 'lab' && "Schedule Lab Test"}
                            {selectedTaskForAction?.type === 'usg' && "Book Ultrasound Scan"}
                            {selectedTaskForAction?.type === 'onboard' && "Complete Registration"}
                        </DialogTitle>
                        <DialogDescription>
                            Action for <span className="font-bold text-slate-900">{selectedTaskForAction?.patient}</span>: {selectedTaskForAction?.title}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        {selectedTaskForAction?.type === 'lab' && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Test Type</Label>
                                    <Input value="Oral Glucose Tolerance Test (OGTT)" readOnly className="bg-slate-50" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Date</Label>
                                        <Input type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Time Slot</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Time" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="08:00">08:00 AM</SelectItem>
                                                <SelectItem value="09:00">09:00 AM</SelectItem>
                                                <SelectItem value="10:00">10:00 AM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Phlebotomist</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Assign Staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sarah">Sarah J. (Available)</SelectItem>
                                            <SelectItem value="mike">Mike T. (Busy)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {selectedTaskForAction?.type === 'usg' && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase">Scan Type</Label>
                                    <Input value="T2 Anomaly Scan (20 Weeks)" readOnly className="bg-slate-50" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Preferred Date</Label>
                                        <Input type="date" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-500 uppercase">Radiologist</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Doctor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="dr_lee">Dr. Lee (Radiology)</SelectItem>
                                                <SelectItem value="dr_patel">Dr. Patel (OBGYN)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded border border-amber-100">
                                    <Info className="w-4 h-4 shrink-0" />
                                    Patient requires a full bladder for this scan. Instructions will be sent via SMS.
                                </div>
                            </>
                        )}

                        {selectedTaskForAction?.type === 'onboard' && (
                            <div className="text-center p-4">
                                <p className="text-sm text-slate-600 mb-4">This patient is waiting in the queue. Please proceed to the full onboarding form.</p>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                                    setIsClinicalActionOpen(false);
                                    setSelectedPatientForOnboarding({ name: selectedTaskForAction.patient });
                                    setIsOnboardingOpen(true);
                                }}>
                                    Open Onboarding Form
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClinicalActionOpen(false)}>Cancel</Button>
                        {selectedTaskForAction?.type !== 'onboard' && (
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setIsClinicalActionOpen(false)}>
                                Confirm Booking
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewLogOpen} onOpenChange={setIsViewLogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-bold">
                                    {selectedPatientForLog?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <span className="text-lg">{selectedPatientForLog?.name || 'Patient'} — Log</span>
                                <p className="text-xs text-slate-500 font-normal mt-0.5">
                                    {selectedPatientForLog?.carePathway && <Badge variant="secondary" className="text-[10px] mr-2">{selectedPatientForLog.carePathway}</Badge>}
                                    ID: {selectedPatientForLog?.id}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex gap-1 border-b border-slate-100 pb-2">
                        {[
                            { key: "all", label: "All" },
                            { key: "visits", label: "Visits" },
                            { key: "medications", label: "Medications" },
                            { key: "notes", label: "Notes" },
                            { key: "appointments", label: "Appointments" },
                            { key: "protocols", label: "Protocols" },
                        ].map(tab => (
                            <Button
                                key={tab.key}
                                size="sm"
                                variant={logTab === tab.key ? "default" : "ghost"}
                                className={`h-7 text-xs ${logTab === tab.key ? 'bg-slate-900 text-white' : ''}`}
                                onClick={() => setLogTab(tab.key)}
                                data-testid={`log-tab-${tab.key}`}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: '60vh' }}>
                        {logLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full" />
                                <span className="ml-3 text-sm text-slate-500">Loading patient log...</span>
                            </div>
                        ) : (
                            <div className="space-y-3 py-2">
                                {(logTab === "all" || logTab === "visits") && logData.visits.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <ClipboardList className="w-3.5 h-3.5" /> Visit History
                                        </h4>
                                        <div className="space-y-2">
                                            {logData.visits.map((v: any, i: number) => (
                                                <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100" data-testid={`log-visit-${i}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm text-slate-800">{v.visitType || 'Visit'}</span>
                                                        <span className="text-[10px] text-slate-400">{v.visitDate || v.createdAt || ''}</span>
                                                    </div>
                                                    {v.subjective && <p className="text-xs text-slate-600"><span className="font-medium">S:</span> {v.subjective}</p>}
                                                    {v.objective && <p className="text-xs text-slate-600"><span className="font-medium">O:</span> {v.objective}</p>}
                                                    {v.assessment && <p className="text-xs text-slate-600"><span className="font-medium">A:</span> {v.assessment}</p>}
                                                    {v.plan && <p className="text-xs text-slate-600"><span className="font-medium">P:</span> {v.plan}</p>}
                                                    {v.provider && <p className="text-[10px] text-slate-400 mt-1">Provider: {v.provider}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(logTab === "all" || logTab === "medications") && logData.medications.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <Pill className="w-3.5 h-3.5" /> Medications
                                        </h4>
                                        <div className="space-y-2">
                                            {logData.medications.map((m: any, i: number) => (
                                                <div key={i} className="bg-blue-50/50 rounded-lg p-3 border border-blue-100" data-testid={`log-med-${i}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-sm text-slate-800">{m.name}</span>
                                                        <Badge className={`text-[10px] ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} border-none`}>
                                                            {m.status || 'active'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mt-1">{m.dosage} — {m.frequency}</p>
                                                    {m.prescribedBy && <p className="text-[10px] text-slate-400 mt-1">Prescribed by: {m.prescribedBy}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(logTab === "all" || logTab === "notes") && logData.notes.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" /> Clinical Notes
                                        </h4>
                                        <div className="space-y-2">
                                            {logData.notes.map((n: any, i: number) => (
                                                <div key={i} className="bg-amber-50/50 rounded-lg p-3 border border-amber-100" data-testid={`log-note-${i}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm text-slate-800">{n.noteType || 'Note'}</span>
                                                        <span className="text-[10px] text-slate-400">{n.createdAt || ''}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600">{n.content}</p>
                                                    {n.author && <p className="text-[10px] text-slate-400 mt-1">By: {n.author}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(logTab === "all" || logTab === "appointments") && logData.appointments.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <CalendarCheck className="w-3.5 h-3.5" /> Appointments
                                        </h4>
                                        <div className="space-y-2">
                                            {logData.appointments.map((a: any, i: number) => (
                                                <div key={i} className="bg-violet-50/50 rounded-lg p-3 border border-violet-100" data-testid={`log-appt-${i}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm text-slate-800">{a.type || a.service || 'Appointment'}</span>
                                                        <Badge className={`text-[10px] border-none ${
                                                            a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            a.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {a.status || 'scheduled'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-600">{a.date} at {a.time}</p>
                                                    {a.provider && <p className="text-[10px] text-slate-400 mt-1">With: {a.provider}</p>}
                                                    {a.notes && <p className="text-xs text-slate-500 mt-1 italic">{a.notes}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(logTab === "all" || logTab === "protocols") && logData.protocols.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <Apple className="w-3.5 h-3.5" /> Nutrition Protocols
                                        </h4>
                                        <div className="space-y-2">
                                            {logData.protocols.map((pr: any, i: number) => (
                                                <div key={i} className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100" data-testid={`log-protocol-${i}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm text-slate-800">Saved Protocol</span>
                                                        <span className="text-[10px] text-slate-400">{pr.savedAt || ''}</span>
                                                    </div>
                                                    {pr.primaryGoal && <p className="text-xs text-slate-600"><span className="font-medium">Goal:</span> {pr.primaryGoal}</p>}
                                                    {pr.dietaryStrategy && <p className="text-xs text-slate-600"><span className="font-medium">Strategy:</span> {pr.dietaryStrategy}</p>}
                                                    {pr.savedBy && <p className="text-[10px] text-slate-400 mt-1">Saved by: {pr.savedBy}</p>}
                                                    {pr.weeklyPlan && (
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {Object.keys(pr.weeklyPlan).length} day(s) planned
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!logLoading && (
                                    (() => {
                                        const hasData = (logTab === "all" && (logData.visits.length + logData.medications.length + logData.notes.length + logData.appointments.length + logData.protocols.length) > 0) ||
                                            (logTab === "visits" && logData.visits.length > 0) ||
                                            (logTab === "medications" && logData.medications.length > 0) ||
                                            (logTab === "notes" && logData.notes.length > 0) ||
                                            (logTab === "appointments" && logData.appointments.length > 0) ||
                                            (logTab === "protocols" && logData.protocols.length > 0);
                                        if (!hasData) {
                                            return (
                                                <div className="text-center py-12">
                                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                    <p className="text-sm text-slate-500">No {logTab === 'all' ? 'records' : logTab} found for this patient.</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter className="pt-2 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsViewLogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
      </main>
    </div>
  );
}
