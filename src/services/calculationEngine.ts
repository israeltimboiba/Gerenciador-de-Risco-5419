import { ProjectData, CalculationResult } from '../types';
import {
  PROBABILITY_FACTORS,
  LOSS_FACTORS,
  TOLERABLE_RISK,
  OccupationType,
  getFireFactor,
  SERVICE_FACTORS
} from '../constants';

/**
 * 🔧 Cálculo de áreas de linha (NBR 5419-2)
 */
function calculateLineAreas(line: any) {
  if (!line || line.length <= 0) {
    return { Al: 0, Ai: 0 };
  }

  const ci = line.installation === 'aerea' ? 1.0 : 0.5;
  const ce = line.ce ?? 1.0;
  const soil = line.soilResistivity ?? 100;

  const safeLength = Math.max(line.length, 0.001);
  const safeSoil = Math.max(soil, 1);

  const Al = safeLength * 40 * ci * ce;
  const Ai = safeLength * 25 * Math.sqrt(safeSoil) * ci * ce;

  return { Al, Ai };
}

/**
 * ⚡ ENGINE NBR 5419-2 FINAL
 */
export class CalculationEngine {

  static calculate(data: ProjectData): CalculationResult {

    const {
      length: L,
      width: W,
      height: H,
      ng,
      cd,
      soilResistivity,
      fireRisk,
      occupationType,
      numOccupants,
      totalOccupants,
      totalTimeAnnually,
      fireProtection,
      panicoFator,
      protection
    } = data;

    // =========================
    // 1. VALIDAÇÃO
    // =========================
    const rf = getFireFactor(fireRisk);

    if (!(occupationType in LOSS_FACTORS.L1)) {
      throw new Error(`occupationType inválido: ${occupationType}`);
    }

    // =========================
    // 2. ÁREAS
    // =========================
    const Ad = L * W + 6 * H * (L + W) + Math.PI * 9 * H ** 2;
    const Am = Math.max(0, (L + 500) * (W + 500) - Ad);

    // =========================
    // 3. LINHAS
    // =========================
    let totalAl = 0;
    let totalAi = 0;
    let Nl = 0;
    let Ni = 0;
    const customAl: number[] = [];
    const customAi: number[] = [];

    (data.lines || []).forEach(line => {

      const ct = line.ct ?? (line.transformerNearby ? 0.2 : 1.0);
      const cli = line.cli ?? 1.0;

      const { Al, Ai } = calculateLineAreas(line);

      totalAl += Al;
      totalAi += Ai;
      customAl.push(Al);
      customAi.push(Ai);

      Nl += ng * Al * ct * cli * cd * 1e-6;
      Ni += ng * Ai * ct * cli * cd * 1e-6;
    });

    // =========================
    // 4. FREQUÊNCIAS
    // =========================
    const Nd = ng * Ad * cd * 1e-6;
    const Nm = ng * Am * 1e-6;

    // =========================
    // 5. PROBABILIDADES (CORRIGIDO)
    // =========================
    const classes = ['nenhum', 'IV', 'III', 'II', 'I'] as const;

    const pb = PROBABILITY_FACTORS.PB[classes[protection.spdaClass]];
    const pc = PROBABILITY_FACTORS.PC[classes[protection.dpsClass]];

    // Blindagem
    const ks1 = protection.internalShielding ? 0.1 : 0.1;
    const ks2 = protection.internalShielding ? 0.01 : 0.01;

    // S1
    const pa = protection.equipotentialization ? 0.01 : 1.0;
    const pb_s1 = pb;
    const pc_s1 = pc;

    // S2 (indução na estrutura)
    const pm = pc * ks1 * ks2;

    // S3 (linha direta)
    const pu = protection.equipotentialization ? 0.01 : 1.0;
    const pv = pb;
    const pw = pc; // ✅ CORRETO

    // S4 (indução na linha)
    const pz = pc * ks1 * ks2;

    // =========================
    // 6. PERDAS
    // =========================
    let rp = 1.0;

    switch (fireProtection) {
      case 'extintores':
      case 'hidrantes':
        rp = 0.5;
        break;
      case 'spda_incendio':
        rp = 0.2;
        break;
      case 'automatico':
      case 'completo':
      case 'brigada':
        rp = 0.1;
        break;
    }

    let hz = 1.0;
    if (panicoFator === 'baixo') hz = 0.1;
    else if (panicoFator === 'medio') hz = 0.5;

    const baseLt = LOSS_FACTORS.L1[occupationType as OccupationType];

    const exposure = Math.min(
      1.0,
      (numOccupants / Math.max(totalOccupants, 1)) *
      (totalTimeAnnually / 8760)
    );

    const lt = baseLt * exposure;

    const lb = lt * rf * rp * hz;
    const lc = lt * rf * rp;
    const lw = lc;
    const lz = lc;

    const Lf = (SERVICE_FACTORS as any)[occupationType] ?? 0.01;

    // =========================
    // 7. RISCOS (NBR CORRETO)
    // =========================

    const Ra = Nd * pa * lb;
    const Rb = Nd * pb_s1 * lc;
    const Rc = Nd * pc_s1 * lw;
    const Rm = Nm * pm * lz;
    const Ru = Nl * pu * lb;
    const Rv = Nl * pv * lc;
    const Rw = Nl * pw * lw;
    const Rz = Ni * pz * lz;

    // R1 — Vida humana
    const r1 = Ra + Rb + Rc + Rm + Ru + Rv + Rw + Rz;

    // R2 — Serviço
    const r2 =
      Nd * pb_s1 * Lf +
      Nm * pm * Lf +
      Nl * pv * Lf +
      Ni * pz * Lf;

    // R3 — Patrimônio cultural
    const hasCulturalValue = occupationType === 'publico';
    const Lcultural = hasCulturalValue ? 0.001 : 0;

    const r3 =
      Nd * pb_s1 * Lcultural +
      Nm * pm * Lcultural +
      Nl * pv * Lcultural +
      Ni * pz * Lcultural;

    // =========================
    // 8. FREQUÊNCIA DE DANOS (CORRIGIDO)
    // =========================
    const fPhysical = (Nd * pb_s1) + (Nl * pv);

    const fElectrical =
      (Nd * pc_s1) +
      (Nm * pm) +
      (Nl * pw) +
      (Ni * pz);

    const fData = (Nm * pm) + (Ni * pz);

    const fTotal = fPhysical + fElectrical + fData;

    // =========================
    // 9. OUTPUT
    // =========================
    return {
      areas: { ad: Ad, am: Am, al: totalAl, ai: totalAi, customAl, customAi },
      frequencies: {
        nd: Nd,
        nm: Nm,
        nl: Nl,
        ni: Ni,
        total: Nd + Nm + Nl + Ni
      },
      factors: {
        pa, pb: pb_s1, pc: pc_s1,
        pm, pu, pv, pw, pz,
        rf, rp, hz, lt, lb, lc, lw, lz, lv: lb,
        ks1, ks2
      },
      components: {
        ra: Ra, rb: Rb, rc: Rc, rm: Rm,
        ru: Ru, rv: Rv, rw: Rw, rz: Rz
      },
      componentsR1: {
        ra: Ra, rb: Rb, rc: Rc, rm: Rm,
        ru: Ru, rv: Rv, rw: Rw, rz: Rz
      },
      componentsR2: {
        rb: Nd * pb_s1 * Lf,
        rm: Nm * pm * Lf,
        rv: Nl * pv * Lf,
        rz: Ni * pz * Lf
      },
      componentsR3: {
        rb: Nd * pb_s1 * Lcultural,
        rm: Nm * pm * Lcultural,
        rv: Nl * pv * Lcultural,
        rz: Ni * pz * Lcultural
      },
      risks: { r1, r2, r3 },
      tolerable: TOLERABLE_RISK,
      frequenciasDanos: {
        fPhysical,
        fElectrical,
        fData,
        fTotal
      }
    };
  }
}