import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, User, Phone, Mail, Heart, AlertTriangle, Clock, Baby, Dna, Activity, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const categoryConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  'fertility': { icon: Dna, color: 'text-saivie-teal', bgColor: 'bg-saivie-surface-muted' },
  'pregnancy': { icon: Baby, color: 'text-saivie-rose', bgColor: 'bg-saivie-surface-blush' },
  'pregnancy-all': { icon: Baby, color: 'text-saivie-rose', bgColor: 'bg-saivie-surface-blush' },
  'postpartum': { icon: Heart, color: 'text-orange-700', bgColor: 'bg-orange-50' },
  'high-risk': { icon: AlertTriangle, color: 'text-rose-700', bgColor: 'bg-rose-50' },
  'today-appointments': { icon: Clock, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'referrals': { icon: Activity, color: 'text-saivie-teal', bgColor: 'bg-saivie-surface-muted' },
  'high-bp': { icon: AlertTriangle, color: 'text-red-700', bgColor: 'bg-red-50' },
};

const statusColors: Record<string, string> = {
  'active': 'bg-emerald-100 text-emerald-700',
  'completed': 'bg-blue-100 text-blue-700',
  'aborted': 'bg-red-100 text-red-700',
  'not_continuing': 'bg-amber-100 text-amber-700',
};

const statusLabels: Record<string, string> = {
  'active': 'Active',
  'completed': 'Completed',
  'aborted': 'Aborted',
  'not_continuing': 'Not Continuing',
};

function PregnancyStatusDropdown({ patientId, currentStatus }: { patientId: number; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newStatus: string) =>
      fetch(`/api/patients/${patientId}/pregnancy-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregnancyStatus: newStatus }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients/by-category'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setOpen(false);
    },
  });

  const colorClass = statusColors[currentStatus] || 'bg-saivie-sage text-saivie-plum';

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass} hover:opacity-80 transition-opacity`}
        data-testid={`button-status-${patientId}`}
      >
        {statusLabels[currentStatus] || currentStatus}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-saivie-ivory rounded-lg shadow-lg border border-saivie-border py-1 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
          {Object.entries(statusLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => mutation.mutate(value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-saivie-surface-muted transition-colors flex items-center gap-2 ${value === currentStatus ? 'font-bold' : ''}`}
              data-testid={`option-status-${value}-${patientId}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusColors[value]?.split(' ')[0] || 'bg-saivie-sage'}`} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientListByCategory() {
  const [, params] = useRoute("/clinician/patients/:category");
  const [, navigate] = useLocation();
  const category = params?.category || '';

  const { data, isLoading } = useQuery({
    queryKey: ['/api/patients/by-category', category],
    queryFn: () => fetch(`/api/patients/by-category/${category}`).then(r => r.json()),
    enabled: !!category,
  });

  const config = categoryConfig[category] || { icon: User, color: 'text-saivie-plum', bgColor: 'bg-saivie-surface-muted' };
  const Icon = config.icon;

  const showPregnancyCols = ['pregnancy', 'pregnancy-all', 'high-bp'].includes(category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/clinician')}
          className="flex items-center gap-2 text-sm text-saivie-plum hover:text-saivie-plum mb-6 transition-colors"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${config.bgColor} ${config.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-saivie-plum" data-testid="text-category-title">{data?.title || 'Patients'}</h1>
              <p className="text-sm text-saivie-plum">{data?.count ?? '...'} patients</p>
            </div>
          </div>
          {category === 'pregnancy' && (
            <button
              onClick={() => navigate('/clinician/patients/pregnancy-all')}
              className="text-xs text-saivie-rose hover:text-saivie-plum font-medium underline underline-offset-2"
              data-testid="link-view-all-pregnancy"
            >
              View All (incl. completed)
            </button>
          )}
          {category === 'pregnancy-all' && (
            <button
              onClick={() => navigate('/clinician/patients/pregnancy')}
              className="text-xs text-saivie-rose hover:text-saivie-plum font-medium underline underline-offset-2"
              data-testid="link-view-active-pregnancy"
            >
              View Active Only
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-saivie-border border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-saivie-ivory rounded-xl border border-saivie-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-saivie-border bg-saivie-surface-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Details</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Type</th>
                  {showPregnancyCols && (
                    <>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Week</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">LMP</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">BP</th>
                    </>
                  )}
                  {category === 'today-appointments' && (
                    <>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Appt Type</th>
                    </>
                  )}
                  {category === 'referrals' && (
                    <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Referrals</th>
                  )}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-saivie-plum uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody>
                {(data?.patients || []).map((p: any) => (
                  <tr
                    key={p.id}
                    className="border-b border-saivie-border hover:bg-saivie-surface-muted/50 transition-colors"
                    data-testid={`row-patient-${p.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-semibold text-saivie-plum">
                          {(p.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-saivie-plum">{p.name}</p>
                          {p.age && <p className="text-xs text-saivie-plum">{p.age} years</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/clinician?patientId=${encodeURIComponent(p.id)}${p.appointmentId ? `&appointmentId=${encodeURIComponent(p.appointmentId)}` : ''}`}
                        className="inline-flex whitespace-nowrap rounded-full border border-saivie-teal px-3 py-1.5 text-xs font-semibold text-saivie-teal hover:bg-saivie-sage/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal"
                        aria-label={`Open details for ${p.name}`}
                        data-testid={`open-patient-${p.id}`}
                      >
                        Open details
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-xs capitalize">{p.type || '—'}</Badge>
                    </td>
                    {showPregnancyCols && (
                      <>
                        <td className="px-5 py-4">
                          {p.gestationalWeeks !== null ? (
                            <span className="text-sm font-semibold text-saivie-rose" data-testid={`text-weeks-${p.id}`}>
                              {p.gestationalWeeks}w
                              <span className="text-xs text-saivie-plum ml-1 font-normal">
                                ({p.gestationalWeeks <= 12 ? 'T1' : p.gestationalWeeks <= 27 ? 'T2' : p.gestationalWeeks <= 42 ? 'T3' : 'Post-term'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-saivie-plum">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <PregnancyStatusDropdown
                            patientId={p.id}
                            currentStatus={p.pregnancyStatus || 'active'}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-saivie-plum">
                            {p.lmp ? new Date(p.lmp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {p.bp ? (
                            <span className={`text-sm font-medium ${parseInt(p.bp?.split('/')[0]) >= 140 ? 'text-red-600' : 'text-saivie-plum'}`}>
                              {p.bp}
                            </span>
                          ) : (
                            <span className="text-xs text-saivie-plum">—</span>
                          )}
                        </td>
                      </>
                    )}
                    {category === 'today-appointments' && (
                      <>
                        <td className="px-5 py-4">
                          <span className="text-sm text-saivie-plum font-medium">{p.appointmentTime || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs">{p.appointmentType || '—'}</Badge>
                        </td>
                      </>
                    )}
                    {category === 'referrals' && (
                      <td className="px-5 py-4">
                        <Badge className="bg-saivie-sage text-saivie-teal border-none text-xs">{p.referralCount}</Badge>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        {p.phone && (
                          <span className="text-xs text-saivie-plum flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </span>
                        )}
                        {p.email && (
                          <span className="text-xs text-saivie-plum flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {p.email}
                          </span>
                        )}
                        {!p.phone && !p.email && <span className="text-xs text-saivie-plum">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.patients || []).length === 0 && (
              <div className="py-16 text-center text-sm text-saivie-plum">No patients found in this category</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
