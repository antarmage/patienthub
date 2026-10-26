import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Activity, Scale, Thermometer, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar } from 'recharts';

export interface VitalsData {
  bp?: string;
  pulse?: number | string;
  temp?: number | string;
  spo2?: number | string;
  weight?: number | string;
  height?: number | string;
  recordedAt?: string;
}

export interface BpLogItem {
  id?: number;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  date?: string;
}

export interface WeightLogItem {
  id?: number;
  weight: number;
  unit?: string;
  date?: string;
}

interface VitalsSparklineGridProps {
  vitals?: VitalsData | null;
  bpLogs?: BpLogItem[];
  weightLogs?: WeightLogItem[];
  onAdoptVitals?: (vitalsSummary: string) => void;
  className?: string;
}

export const VitalsSparklineGrid: React.FC<VitalsSparklineGridProps> = ({
  vitals,
  bpLogs = [],
  weightLogs = [],
  onAdoptVitals,
  className = '',
}) => {
  // Parse check-in BP
  const bpStr = String(vitals?.bp || '');
  const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
  const systolic = bpMatch ? parseInt(bpMatch[1], 10) : (bpLogs[0]?.systolic ?? null);
  const diastolic = bpMatch ? parseInt(bpMatch[2], 10) : (bpLogs[0]?.diastolic ?? null);

  const isBpHypertensive = systolic && diastolic && (systolic >= 140 || diastolic >= 90);
  const isBpElevated = systolic && diastolic && !isBpHypertensive && (systolic >= 130 || diastolic >= 85);

  // Pulse
  const pulseNum = vitals?.pulse ? Number(vitals.pulse) : (bpLogs[0]?.pulse ?? null);
  const isTachycardia = pulseNum && pulseNum > 100;
  const isBradycardia = pulseNum && pulseNum < 55;

  // Weight
  const weightVal = vitals?.weight ? Number(vitals.weight) : (weightLogs[0]?.weight ?? null);

  // Temp
  const tempVal = vitals?.temp ? Number(vitals.temp) : null;
  const isFever = tempVal && tempVal >= 100.4;

  // SpO2
  const spo2Val = vitals?.spo2 ? Number(vitals.spo2) : null;
  const isLowSpo2 = spo2Val && spo2Val < 95;

  // Prepare mini sparkline datasets (take up to 5 historical points)
  const bpSparkData = [...bpLogs]
    .slice(0, 5)
    .reverse()
    .map((log, i) => ({
      i,
      sys: log.systolic,
      dia: log.diastolic,
    }));

  if (bpSparkData.length === 0 && systolic && diastolic) {
    bpSparkData.push({ i: 0, sys: systolic, dia: diastolic });
  }

  const weightSparkData = [...weightLogs]
    .slice(0, 5)
    .reverse()
    .map((log, i) => ({
      i,
      val: log.weight,
    }));

  if (weightSparkData.length === 0 && weightVal) {
    weightSparkData.push({ i: 0, val: weightVal });
  }

  // Handle Adopt Vitals into SOAP note
  const handleAdopt = () => {
    if (!onAdoptVitals) return;
    const parts: string[] = [];
    if (systolic && diastolic) parts.push(`BP: ${systolic}/${diastolic} mmHg`);
    if (pulseNum) parts.push(`Pulse: ${pulseNum} bpm`);
    if (tempVal) parts.push(`Temp: ${tempVal}°F`);
    if (spo2Val) parts.push(`SpO₂: ${spo2Val}%`);
    if (weightVal) parts.push(`Weight: ${weightVal} kg`);
    if (vitals?.recordedAt) {
      const timeStr = new Date(vitals.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      parts.push(`(Recorded at check-in ${timeStr})`);
    }
    onAdoptVitals(parts.join(', '));
  };

  const recordedTime = vitals?.recordedAt
    ? new Date(vitals.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-saivie-teal" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-saivie-plum">Check-In Vitals</span>
        </div>
        {recordedTime && (
          <span className="text-[10px] text-slate-500 font-medium">Checked in at {recordedTime}</span>
        )}
      </div>

      {/* 2x2 Vitals Grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Card 1: Blood Pressure */}
        <Card className={`border shadow-none rounded-lg p-2.5 transition-colors ${
          isBpHypertensive ? 'bg-rose-50/60 border-rose-200' :
          isBpElevated ? 'bg-amber-50/60 border-amber-200' :
          'bg-saivie-ivory border-saivie-border'
        }`}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-medium text-slate-500">Blood Pressure</span>
            <div className={`p-1 rounded ${isBpHypertensive ? 'text-rose-600 bg-rose-100' : 'text-slate-400 bg-slate-100'}`}>
              <Heart className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-base font-bold font-mono ${
              isBpHypertensive ? 'text-rose-700' : isBpElevated ? 'text-amber-800' : 'text-saivie-plum'
            }`}>
              {systolic && diastolic ? `${systolic}/${diastolic}` : '—'}
            </span>
            <span className="text-[9px] text-slate-400">mmHg</span>
          </div>

          {/* Mini Sparkline Histogram */}
          <div className="mt-1.5 h-7 w-full">
            {bpSparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bpSparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Bar dataKey="sys" fill={isBpHypertensive ? '#e11d48' : '#2F6B60'} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-[9px] text-slate-400">
                  {!systolic || !diastolic ? 'Not recorded' : isBpHypertensive || isBpElevated ? 'Elevated' : '• Normal range'}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 2: Heart Rate / Pulse */}
        <Card className={`border shadow-none rounded-lg p-2.5 transition-colors ${
          isTachycardia || isBradycardia ? 'bg-amber-50/60 border-amber-200' : 'bg-saivie-ivory border-saivie-border'
        }`}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-medium text-slate-500">Heart Rate</span>
            <div className={`p-1 rounded ${isTachycardia ? 'text-amber-600 bg-amber-100' : 'text-slate-400 bg-slate-100'}`}>
              <Activity className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold font-mono text-saivie-plum">
              {pulseNum ? pulseNum : '—'}
            </span>
            <span className="text-[9px] text-slate-400">BPM</span>
          </div>

          {/* Mini Pulse Sparkline */}
          <div className="mt-1.5 h-7 w-full">
            <div className="h-full flex items-center justify-center">
              <span className={`text-[9px] font-medium ${isTachycardia ? 'text-amber-700' : 'text-slate-500'}`}>
                {!pulseNum ? 'Not recorded' : isTachycardia ? '⚠️ High pulse' : isBradycardia ? '⚠️ Low pulse' : '60-100 normal'}
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3: Weight */}
        <Card className="border border-saivie-border bg-saivie-ivory shadow-none rounded-lg p-2.5">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-medium text-slate-500">Weight</span>
            <div className="p-1 rounded text-slate-400 bg-slate-100">
              <Scale className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold font-mono text-saivie-plum">
              {weightVal ? weightVal : '—'}
            </span>
            <span className="text-[9px] text-slate-400">kg</span>
          </div>

          {/* Mini Trend Area */}
          <div className="mt-1.5 h-7 w-full">
            {weightSparkData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightSparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Area type="monotone" dataKey="val" stroke="#2F6B60" fill="#CFE2DC" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-[9px] text-slate-400">{weightVal ? 'Recorded intake' : 'Not recorded'}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Card 4: Temperature / SpO2 */}
        <Card className={`border shadow-none rounded-lg p-2.5 transition-colors ${
          isFever || isLowSpo2 ? 'bg-rose-50/60 border-rose-200' : 'bg-saivie-ivory border-saivie-border'
        }`}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-medium text-slate-500">Temp / SpO₂</span>
            <div className={`p-1 rounded ${isFever ? 'text-rose-600 bg-rose-100' : 'text-slate-400 bg-slate-100'}`}>
              <Thermometer className="w-3 h-3" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold font-mono text-saivie-plum">
              {tempVal ? `${tempVal}°F` : spo2Val ? `${spo2Val}%` : '—'}
            </span>
            {spo2Val && tempVal && <span className="text-[9px] text-slate-400">· {spo2Val}%</span>}
          </div>

          <div className="mt-1.5 h-7 w-full flex items-center justify-center">
            <span className={`text-[9px] font-medium ${isFever ? 'text-rose-700' : 'text-slate-400'}`}>
              {!tempVal && !spo2Val ? 'Not recorded' : isFever ? '🔥 Fever detected' : isLowSpo2 ? '⚠️ Low SpO₂' : tempVal ? 'Afebrile' : 'SpO₂ recorded'}
            </span>
          </div>
        </Card>
      </div>

      {/* 1-Click Adopt Button */}
      {onAdoptVitals && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdopt}
          disabled={!systolic && !diastolic && !pulseNum && !tempVal && !spo2Val && !weightVal}
          className="w-full h-7 text-[11px] gap-1 text-saivie-teal border-saivie-border bg-saivie-surface-muted hover:bg-saivie-ivory"
          data-testid="button-adopt-vitals"
        >
          <Plus className="w-3 h-3" /> Adopt Vitals into Today’s Note
        </Button>
      )}
    </div>
  );
};
