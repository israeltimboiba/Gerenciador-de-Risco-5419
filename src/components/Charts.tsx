import React from 'react';
import { CalculationResult } from '../types';

interface ChartProps {
  results: CalculationResult;
}

export function DamageEventsChart({ results }: ChartProps) {
  const { nd, nm, nl, ni } = results.frequencies;
  const data = [
    { label: 'Nd (Estrutura)', value: nd },
    { label: 'Nm (Próximo Estr.)', value: nm },
    { label: 'Nl (Linha Direta)', value: nl },
    { label: 'Ni (Próximo Linha)', value: ni }
  ];

  const maxVal = Math.max(...data.map(d => d.value), 1e-6);

  return (
    <div className="border border-brand-border p-4 bg-white space-y-4">
      <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">Eventos Danosos (Freqüência / Ano)</h4>
        <span className="text-[8px] font-mono opacity-50 uppercase">Escala Logarítmica</span>
      </div>

      <div className="space-y-3">
        {data.map((item, idx) => {
          // Calculate percentage height based on a log10 scale
          const logVal = Math.log10(Math.max(1e-8, item.value));
          const minLog = -8;
          const maxLog = 0;
          const percentage = Math.max(5, ((logVal - minLog) / (maxLog - minLog)) * 100);

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono font-bold">
                <span className="opacity-70">{item.label}</span>
                <span className="text-blue-700">{item.value.toExponential(4)}</span>
              </div>
              <div className="h-6 bg-brand-bg relative border border-brand-border/10 flex items-center">
                <div 
                  className="h-full bg-brand-text/80 hover:bg-brand-text transition-all duration-300" 
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute left-2 text-[8px] font-mono text-neutral-500 font-bold z-10 select-none">
                  {item.value < 1e-5 ? 'CRIAÇÃO INTERNA' : 'VETOR ATIVO'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GlobalProbabilitiesChart({ results }: ChartProps) {
  const { pa, pb, pc, pm, pu, pv, pw, pz } = results.factors;
  const probs = [
    { label: 'Pa (Choque S1)', val: pa },
    { label: 'Pb (Dano Estr.)', val: pb },
    { label: 'Pc (Sistemas)', val: pc },
    { label: 'Pm (S2 Indução)', val: pm },
    { label: 'Pu (Choque S3)', val: pu },
    { label: 'Pv (Físico S3)', val: pv },
    { label: 'Pw (Surg. S3)', val: pw },
    { label: 'Pz (S4 Indução)', val: pz }
  ];

  return (
    <div className="border border-brand-border p-4 bg-white space-y-4">
      <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">Probabilidades Globais de Dano</h4>
        <span className="text-[8px] font-mono opacity-50 uppercase">Fatores P (0 a 1)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        {probs.map((item, idx) => {
          const percentage = item.val * 100;
          return (
            <div key={idx} className="border border-brand-border/15 p-2 bg-brand-bg/25 flex flex-col justify-between h-[85px]">
              <div>
                <p className="text-[9px] font-bold text-neutral-600 truncate">{item.label}</p>
                <p className="text-sm font-mono font-bold tracking-tight text-brand-text mt-1">{item.val.toExponential(2)}</p>
              </div>
              <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full ${item.val > 0.1 ? 'bg-red-600' : 'bg-emerald-600'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConsequentLossesChart({ results }: ChartProps) {
  const { lt, lb, lv, lc, lz, lw } = results.factors;
  const losses = [
    { label: 'Lt (Redução base)', val: lt },
    { label: 'Lb (Choque S1)', val: lb },
    { label: 'Lv (Explosão S1)', val: lv },
    { label: 'Lc (Sistemas S1)', val: lc },
    { label: 'Lz (Falhas S2)', val: lz },
    { label: 'Lw (Surgimento S3)', val: lw }
  ];

  return (
    <div className="border border-brand-border p-4 bg-white space-y-4">
      <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">Fatores de Perdas Conseqüentes</h4>
        <span className="text-[8px] font-mono opacity-50 uppercase">Parâmetros L</span>
      </div>

      <div className="space-y-2">
        {losses.map((loss, idx) => {
          const logVal = Math.log10(Math.max(1e-10, loss.val));
          const percentage = Math.max(5, ((logVal - (-10)) / (0 - (-10))) * 100);

          return (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-24 text-[8px] font-mono font-bold opacity-70 uppercase truncate">{loss.label}</span>
              <div className="flex-1 bg-brand-bg h-4 relative flex items-center">
                <div 
                  className="h-full bg-blue-600/70"
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute right-2 text-[8px] font-mono font-bold text-neutral-700 z-10">
                  {loss.val.toExponential(3)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalculatedRisksChart({ results }: ChartProps) {
  const { r1, r2, r3 } = results.risks;
  const { tolerable } = results;

  const data = [
    { name: 'R1 (Vida)', val: r1, limit: tolerable.r1 },
    ...(r2 !== undefined && tolerable.r2 !== undefined ? [{ name: 'R2 (Público)', val: r2, limit: tolerable.r2 }] : []),
    ...(r3 !== undefined && tolerable.r3 !== undefined ? [{ name: 'R3 (Cultural)', val: r3, limit: tolerable.r3 }] : [])
  ];

  return (
    <div className="border border-brand-border p-4 bg-white space-y-4">
      <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">Calculadoras de Riscos Normativos (R1, R2, R3)</h4>
        <span className="text-[8px] font-mono opacity-50 uppercase">Tolerância Limite</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((r, idx) => {
          const isOk = r.val <= r.limit;
          const ratio = r.val / r.limit;
          const percentage = Math.min(100, ratio * 100);

          return (
            <div key={idx} className={`border p-4 flex flex-col justify-between h-[130px] ${isOk ? 'border-brand-border/20 bg-emerald-50/20' : 'border-red-600/35 bg-red-50/20'}`}>
              <div>
                <p className="text-[10px] font-mono font-bold opacity-60 uppercase">{r.name}</p>
                <p className="text-xl font-mono font-bold tracking-tight mt-1 text-brand-text">
                  {r.val.toExponential(4)}
                </p>
                <p className="text-[8px] font-mono opacity-50 mt-1 uppercase">
                  Limite: {r.limit.toExponential(0)}
                </p>
              </div>

              <div className="space-y-1 mt-3">
                <div className="flex justify-between text-[8px] font-mono font-bold">
                  <span>Proporção</span>
                  <span className={isOk ? 'text-emerald-700' : 'text-red-700'}>
                    {(ratio * 100).toFixed(1)}% {isOk ? '✓ OK' : '✗ FALHA'}
                  </span>
                </div>
                <div className="w-full bg-neutral-200 h-2 border border-neutral-300">
                  <div 
                    className={`h-full ${isOk ? 'bg-neutral-800' : 'bg-red-600'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DamageFrequenciesChart({ results }: ChartProps) {
  const { fPhysical, fElectrical, fData, fTotal } = results.frequenciasDanos;
  
  const data = [
    { label: 'Mecânicos/Físicos (Fv)', val: fPhysical, col: 'bg-indigo-600' },
    { label: 'Falha Elétrica (F_elétr)', val: fElectrical, col: 'bg-amber-600' },
    { label: 'Falha de Sinais (F_telec)', val: fData, col: 'bg-rose-600' }
  ];

  return (
    <div className="border border-brand-border p-4 bg-white space-y-4">
      <div className="flex justify-between items-center border-b border-brand-border/25 pb-2">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600">Incidentes por Ano (Frequência de Danos)</h4>
        <span className="text-[8px] font-mono opacity-50 uppercase">Taxa de Surtos F</span>
      </div>

      <div className="space-y-4">
        {data.map((item, idx) => {
          const logVal = Math.log10(Math.max(1e-6, item.val));
          const pct = Math.max(5, ((logVal - (-6)) / (0 - (-6))) * 100);

          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="font-bold">{item.label}</span>
                <span className="font-mono font-bold text-neutral-600">{item.val.toExponential(4)}</span>
              </div>
              <div className="h-5 bg-brand-bg relative border border-brand-border/10 flex items-center">
                <div 
                  className={`h-full opacity-80 ${item.col}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-2 border-t border-brand-border/10 flex justify-between items-center text-[10px] font-mono font-bold text-neutral-700">
          <span>TAXA TOTAL COMBINADA:</span>
          <span className="text-neutral-900 bg-brand-sidebar px-2 py-0.5">{fTotal.toExponential(3)} falhas/ano</span>
        </div>
      </div>
    </div>
  );
}
