import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, User, Phone, Mail, Calendar, Heart, AlertTriangle, Clock, Baby, Dna, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  'fertility': { icon: Dna, color: 'text-purple-700', bgColor: 'bg-purple-50' },
  'pregnancy': { icon: Baby, color: 'text-pink-700', bgColor: 'bg-pink-50' },
  'postpartum': { icon: Heart, color: 'text-orange-700', bgColor: 'bg-orange-50' },
  'high-risk': { icon: AlertTriangle, color: 'text-rose-700', bgColor: 'bg-rose-50' },
  'today-appointments': { icon: Clock, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'referrals': { icon: Activity, color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  'high-bp': { icon: AlertTriangle, color: 'text-red-700', bgColor: 'bg-red-50' },
};

export default function PatientListByCategory() {
  const [, params] = useRoute("/clinician/patients/:category");
  const [, navigate] = useLocation();
  const category = params?.category || '';

  const { data, isLoading } = useQuery({
    queryKey: ['/api/patients/by-category', category],
    queryFn: () => fetch(`/api/patients/by-category/${category}`).then(r => r.json()),
    enabled: !!category,
  });

  const config = categoryConfig[category] || { icon: User, color: 'text-slate-700', bgColor: 'bg-slate-50' };
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/clinician')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className={`p-3 rounded-xl ${config.bgColor} ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-category-title">{data?.title || 'Patients'}</h1>
            <p className="text-sm text-slate-500">{data?.count ?? '...'} patients</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  {category === 'pregnancy' && (
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestational Age</th>
                  )}
                  {(category === 'pregnancy' || category === 'high-bp') && (
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">LMP</th>
                  )}
                  {(category === 'high-bp' || category === 'pregnancy') && (
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BP</th>
                  )}
                  {category === 'today-appointments' && (
                    <>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Appt Type</th>
                    </>
                  )}
                  {category === 'referrals' && (
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Referrals</th>
                  )}
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody>
                {(data?.patients || []).map((p: any, i: number) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/clinician`)}
                    data-testid={`row-patient-${p.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                          {(p.name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          {p.age && <p className="text-xs text-slate-400">{p.age} years</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="text-xs capitalize">{p.type || '—'}</Badge>
                    </td>
                    {category === 'pregnancy' && (
                      <td className="px-5 py-4">
                        {p.gestationalWeeks !== null ? (
                          <span className="text-sm font-medium text-pink-700">
                            {p.gestationalWeeks}w {Math.floor((p.gestationalWeeks % 1) * 7)}d
                            <span className="text-xs text-slate-400 ml-1">
                              ({p.gestationalWeeks <= 12 ? 'T1' : p.gestationalWeeks <= 27 ? 'T2' : 'T3'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No LMP</span>
                        )}
                      </td>
                    )}
                    {(category === 'pregnancy' || category === 'high-bp') && (
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-600">
                          {p.lmp ? new Date(p.lmp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                    )}
                    {(category === 'high-bp' || category === 'pregnancy') && (
                      <td className="px-5 py-4">
                        {p.bp ? (
                          <span className={`text-sm font-medium ${parseInt(p.bp?.split('/')[0]) >= 140 ? 'text-red-600' : 'text-slate-600'}`}>
                            {p.bp}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}
                    {category === 'today-appointments' && (
                      <>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-700 font-medium">{p.appointmentTime || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="text-xs">{p.appointmentType || '—'}</Badge>
                        </td>
                      </>
                    )}
                    {category === 'referrals' && (
                      <td className="px-5 py-4">
                        <Badge className="bg-indigo-100 text-indigo-700 border-none text-xs">{p.referralCount}</Badge>
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-0.5">
                        {p.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </span>
                        )}
                        {p.email && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {p.email}
                          </span>
                        )}
                        {!p.phone && !p.email && <span className="text-xs text-slate-400">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.patients || []).length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">No patients found in this category</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
