import React from 'react';
import { Pill, Check, Clock, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ActiveMedication {
  id?: number | string;
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
  status?: string;
}

interface ActiveMedicationCardsProps {
  medications?: ActiveMedication[];
  onAddPrescription?: () => void;
  className?: string;
}

export const ActiveMedicationCards: React.FC<ActiveMedicationCardsProps> = ({
  medications = [],
  onAddPrescription,
  className = '',
}) => {
  const activeMeds = medications.filter(
    (m) => String(m.status || '').toLowerCase() === 'active' || !m.status
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Pill className="w-3.5 h-3.5 text-saivie-teal" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-saivie-plum">Active Medications</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-semibold text-saivie-plum border-saivie-border">
            {activeMeds.length}
          </Badge>
        </div>
        {onAddPrescription && (
          <button
            type="button"
            onClick={onAddPrescription}
            className="text-[10px] font-semibold text-saivie-teal hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>

      {activeMeds.length === 0 ? (
        <div className="py-3 px-3 text-center border border-dashed border-saivie-border rounded-lg bg-saivie-surface-muted/50">
          <p className="text-xs text-slate-500">No active medications on file.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activeMeds.slice(0, 6).map((med, idx) => (
            <div
              key={med.id || `${med.name}-${idx}`}
              className="flex items-center gap-2.5 bg-saivie-ivory border border-saivie-border rounded-lg px-3 py-2 shadow-sm hover:border-saivie-teal/50 transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-saivie-surface-muted text-saivie-teal">
                <Pill className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-saivie-plum truncate">
                  {med.name} {med.dose ? <span className="font-normal text-slate-500">({med.dose})</span> : null}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                  {med.frequency && <span>{med.frequency}</span>}
                  {med.duration && <span>· {med.duration}</span>}
                  {med.instructions && <span className="truncate max-w-[120px]">· {med.instructions}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
