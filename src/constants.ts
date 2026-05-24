/**
 * NBR 5419 — CONSTANTES VALIDADAS (VERSÃO FINAL)
 * Compatível com motor de cálculo auditável
 */

//
// 🎯 1. RISCO TOLERÁVEL
//
export const TOLERABLE_RISK = {
  r1: 1e-5, // Perda de vida humana
  r2: 1e-3, // Perda de serviço ao público
  r3: 1e-4, // Perda de patrimônio cultural
  r4: 1e-3, // Perda econômica
} as const;


//
// 🔥 2. FATOR DE FOGO / PÂNICO (rf) — CORRIGIDO
// ⚠️ NÃO É percentual
//
export const FIRE_FACTORS = {
  baixo: 0.001,
  medio: 0.01,
  alto: 0.1,
  critico: 1.0,
} as const;

export type FireRiskType = keyof typeof FIRE_FACTORS;


//
// ⚡ 3. PROBABILIDADE DE DANOS (PB / PC)
// ✔ Modelo consistente e estável
//
export const PROBABILITY_FACTORS = {
PB: {
    nenhum: 1.0,
    IV: 0.1,
    III: 0.1,
    II: 0.05,
    I: 0.02,
  },

  PC: {
    nenhum: 1.0,
    DPS_III: 0.1,
    DPS_II: 0.05,
    DPS_I: 0.02,
  }
} as const;


//
// 🧱 4. FATOR DE PERDA (L1)
// ⚠️ AJUSTADO para NÃO duplicar severidade com rf
//
export const LOSS_FACTORS = {
  L1: {
    residencial: 1e-4,
    comercial: 5e-4,
    industrial: 1e-3,
    hospital: 5e-3,
    publico: 5e-3,
    explosivo: 1e-2,
  },
} as const;

export type OccupationType = keyof typeof LOSS_FACTORS.L1;


//
// 🏢 5. TIPOS DE OCUPAÇÃO (FRONT-END)
//
export const OCCUPATION_TYPES = [
  { value: 'residencial', label: 'Residencial' },
  { value: 'comercial', label: 'Comercial / Escritórios' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'hospital', label: 'Hospitalar / Saúde' },
  { value: 'publico', label: 'Local de Reunião de Público' },
  { value: 'explosivo', label: 'Risco de Explosão' },
];

// FATORES DE SERVIÇO
export const SERVICE_FACTORS = {
  residencial: 0.001,
  comercial: 0.01,
  industrial: 0.05,
  hospital: 0.1,
  telecom: 0.1
};

//
// 🌍 6. FATOR DE LOCALIZAÇÃO (Cd)
//
export const LOCALIZATION_FACTORS = [
  { value: 0.25, label: 'Estrutura cercada por objetos mais altos' },
  { value: 0.5, label: 'Estrutura próxima a objetos da mesma altura' },
  { value: 1.0, label: 'Estrutura isolada (urbana ou rural)' },
  { value: 2.0, label: 'Topo de colina/morro' },
];


//
// 🔁 7. MAPEAMENTO OBRIGATÓRIO (ANTI-BUG)
// ⚠️ ESSENCIAL para evitar rf = 0.01 novamente
//
export function getFireFactor(fireRisk: string): number {
  const map: Record<string, FireRiskType> = {
    baixo: 'baixo',
    medio: 'medio',
    alto: 'alto',
    explosivo: 'critico', // 🔥 CORREÇÃO CRÍTICA
    hospital: 'critico',
    publico: 'alto',
  };

  const key = map[fireRisk];

  if (!key) {
    throw new Error(`fireRisk inválido: ${fireRisk}`);
  }

  return FIRE_FACTORS[key];
}