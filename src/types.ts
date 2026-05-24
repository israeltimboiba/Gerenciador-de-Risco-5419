/**
 * SPDA Risc - NBR 5419:2026 Types
 */

export enum RiskType {
  R1 = 'R1', // Vida Humana
  R2 = 'R2', // Serviço ao Público
  R3 = 'R3', // Patrimônio Cultural
  R4 = 'R4'  // Econômico
}

export type StructureType = 'concreto' | 'metalica' | 'madeira' | 'alvenaria' | 'mista';
export type RoofType = 'metalica_continua' | 'metalica_nao_continua' | 'concreto' | 'inflamavel' | 'outros';
export type LocalizationFactor = 0.25 | 0.5 | 1.0 | 2.0;

export type ProfessionalCouncil = 'CREA' | 'CAU' | 'CRT' | 'CFT';
export type OccupationType = 'residencial' | 'comercial' | 'industrial' | 'hospital' | 'publico' | 'explosivo';

export interface ServiceLine {
  id: string;
  type: 'energia' | 'telecom';
  installation: 'aerea' | 'subterranea';
  shielding: boolean;
  length: number; // m
  uw: number; // Tensão suportável kV (Ex: 1.5, 2.5, 4.0)
  transformerNearby: boolean;
  resisitivity: number; // Ohms.m
  soilResistivity?: number; // Ohms.m (Used by CalculationEngine)
  cli: number;
  ci?: number; // Fator de Instalação (0.1, 0.5, 1.0)
  ce?: number; // Fator de vizinhança/ambiente (0.01, 0.1, 0.5, 1.0)
  ct?: number; // Fator de Transformador (0.2, 1.0)
}

export interface ProtectionMeasures {
  spdaClass: 0 | 1 | 2 | 3 | 4; // 0 = Nenhum
  dpsClass: 0 | 1 | 2 | 3 | 4; // LPL target
  equipotentialization: boolean;
  internalShielding: boolean;
  groundingResistance: number;
  groundingType: 'anel' | 'mista' | 'natural' | 'eletrodo';
}

export interface ProjectData {
  id?: string;
  name: string;
  client: string;
  location: string; // Localização do Projeto
  description: string; // Descrição do Projeto
  date: string;
  rt: string; // Responsável Técnico
  professionalCouncil: ProfessionalCouncil;
  professionalId: string;
  professionalTitle: string;
  artNumber: string;
  revision: string;
  logoUrl?: string;
  
  // Geometria
  length: number;
  width: number;
  height: number;
  
  // Localização
  ng: number; // Descargas km2/ano
  cd: LocalizationFactor;
  soilResistivity: number;
  
  // Características
  structureType: StructureType;
  roofType: RoofType;
  fireRisk: 'baixo' | 'medio' | 'alto' | 'explosivo';
  occupationType: OccupationType;
  
  // Linhas
  lines: ServiceLine[];
  
  // Ocupação
  numOccupants: number;
  totalOccupants: number; // População total da estrutura para fator de perda
  totalTimeAnnually: number; // horas
  
  // Proteção
  protection: ProtectionMeasures;
  fireProtection: 'nenhum' | 'extintores' | 'hidrantes' | 'spda_incendio' | 'automatico' | 'completo' | 'brigada'; // Proteção contra incêndio
  panicoFator: 'baixo' | 'medio' | 'alto'; // Risco de Pânico
  
  // Fatores de Perda (Simplificados ou Editáveis)
  rf: number; // Redução fogo (calculado de fireProtection ou editável)
  rp: number; // Redução pânico (calculado de panicoFator ou editável)

  // Firebase Audit Fields
  ownerId?: string;
  createdAt?: any; // serverTimestamp
  updatedAt?: any; // serverTimestamp
}

export interface CalculationResult {
  areas: {
    ad: number;
    am: number;
    al: number;
    ai: number;
    customAl?: number[]; // Áreas individuais de condução
    customAi?: number[]; // Áreas individuais de indução
  };
  frequencies: {
    nd: number;
    nm: number;
    nl: number;
    ni: number;
    total: number;
  };
  factors: {
    pb: number;
    pc: number;
    pa: number;
    pu: number;
    pm: number;
    pv: number;
    pw: number;
    pz: number;
    rf: number;
    rp: number;
    hz: number;
    lt: number;
    lb: number;
    lv: number;
    lc: number;
    lz: number;
    lw: number;
    ks1: number;
    ks2: number;
    ks3?: number;
    ks4?: number;
    ce?: number;
    ct?: number;
    cli?: number;
  };
  components: {
    ra: number; rb: number; rc: number; rm: number;
    ru: number; rv: number; rw: number; rz: number;
  };
  componentsR1?: {
    ra: number; rb: number; rc: number; rm: number;
    ru: number; rv: number; rw: number; rz: number;
  };
  componentsR2?: {
    rb: number; rc?: number; rm: number;
    rv: number; rw?: number; rz: number;
  };
  componentsR3?: {
    rb: number; rm?: number; rv: number; rz?: number;
  };
  risks: {
    r1: number;
    r2?: number;
    r3?: number;
    r4?: number;
  };
  tolerable: {
    r1: number;
    r2?: number;
    r3?: number;
    r4?: number;
  };
  frequenciasDanos: {
    fPhysical: number; // Frequência de danos físicos (Nd + Nl)
    fElectrical: number; // Frequência de falha sistemas eletricos
    fData: number; // Frequência de falha sistemas de dados
    fTotal: number;
  }
}
