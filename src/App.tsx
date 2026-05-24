/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight,
  Download,
  Trash2,
  Save,
  Calculator,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  User as UserIcon,
  Loader2,
  Camera,
  Shield,
  HelpCircle
} from 'lucide-react';
import { ProjectData, CalculationResult } from './types';
import { CalculationEngine } from './services/calculationEngine';
import { TOLERABLE_RISK, LOCALIZATION_FACTORS, FIRE_FACTORS, PROBABILITY_FACTORS, SERVICE_FACTORS } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, login, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Tutorial } from './components/Tutorial';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';

import { ReportService } from './services/reportService';
import { 
  DamageEventsChart, 
  GlobalProbabilitiesChart, 
  ConsequentLossesChart, 
  CalculatedRisksChart, 
  DamageFrequenciesChart 
} from './components/Charts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Default project template
const DEFAULT_PROJECT: ProjectData = {
  name: '',
  client: '',
  location: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  rt: '',
  professionalCouncil: 'CFT',
  professionalId: '',
  professionalTitle: 'Tec. em Eletrotécnica',
  artNumber: '',
  revision: '00',
  length: 20,
  width: 10,
  height: 8,
  ng: 5.0,
  cd: 1.0,
  soilResistivity: 500,
  structureType: 'concreto',
  roofType: 'concreto',
  fireRisk: 'medio',
  occupationType: 'residencial',
  lines: [
    { 
      id: 'L1', 
      type: 'energia', 
      installation: 'aerea', 
      shielding: false, 
      length: 100, 
      uw: 2.5, 
      transformerNearby: false, 
      resisitivity: 500, 
      soilResistivity: 500, 
      cli: 1.0,
      ci: 1.0,
      ce: 1.0,
      ct: 1.0
    }
  ],
  numOccupants: 1,
  totalOccupants: 10,
  totalTimeAnnually: 2000,
  protection: {
    spdaClass: 0,
    dpsClass: 0,
    equipotentialization: false,
    internalShielding: false,
    groundingResistance: 10,
    groundingType: 'anel'
  },
  fireProtection: 'nenhum',
  panicoFator: 'medio',
  rf: 0.1,
  rp: 1.0
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<'id' | 'structure' | 'location' | 'lines' | 'protection'>('id');
  const [results, setResults] = useState<CalculationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [showResultsMobile, setShowResultsMobile] = useState(false);
  const [resultsTab, setResultsTab] = useState<'tabela' | 'graficos'>('tabela');
  const [riskMatrixTab, setRiskMatrixTab] = useState<'r1' | 'r2' | 'r3'>('r1');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentProject) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProject({ 
          ...currentProject, 
          logoUrl: reader.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Test Connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore Sync
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectData));
      setProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return unsubscribe;
  }, [user]);

  // Set results whenever project changes
  useEffect(() => {
    if (currentProject) {
      setResults(CalculationEngine.calculate(currentProject));
    } else {
      setResults(null);
    }
  }, [currentProject]);

  const saveProject = async () => {
    if (!currentProject || !user) return;
    setSaving(true);
    try {
      const id = currentProject.id || doc(collection(db, 'projects')).id;
      const dataToSave = {
        ...currentProject,
        id,
        ownerId: user.uid,
        updatedAt: serverTimestamp(),
      };
      
      if (!currentProject.createdAt) {
        (dataToSave as any).createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'projects', id), dataToSave);
      setCurrentProject(dataToSave);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${currentProject.id}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este projeto?')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
      if (currentProject?.id === id) setCurrentProject(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-bg text-brand-text">
      {/* Header */}
      <header className="border-b border-brand-border p-3 md:p-4 flex justify-between items-center bg-brand-bg shrink-0">
        <div className="flex gap-3 md:gap-6 items-center">
          {/* Logo Uploader */}
          <div className="relative group w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-blue-600 text-white border border-brand-border overflow-hidden shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload} 
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              title="Carregar Logo da Empresa"
            />
            {currentProject?.logoUrl ? (
              <img src={currentProject.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Shield size={20} className="md:size-24" strokeWidth={2.5} />
            )}
            <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Camera size={16} md:size={20} />
            </div>
          </div>

          <button 
            onClick={() => setIsTutorialOpen(true)}
            className="flex items-center gap-2 px-2 md:px-3 py-1 bg-white border-2 border-brand-text text-brand-text hover:bg-brand-text hover:text-white transition-all font-bold text-[10px] md:text-sm uppercase tracking-tighter"
            title="Abrir Guia de Preenchimento"
          >
            <HelpCircle size={14} className="md:size-[18px]" />
            <span className="hidden sm:inline">Ajuda</span>
          </button>

          <div className="bg-brand-text text-brand-bg px-2 md:px-3 py-1 font-bold tracking-tighter text-sm md:text-xl uppercase">NBR 5419</div>
          <div className="hidden lg:block text-left">
            <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest leading-none mb-1">Engenharia de Risco</p>
            <p className="font-bold uppercase text-[11px] leading-none">Memorial Auditável Conforme Norma</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          {user ? (
            <div className="flex items-center gap-2 md:gap-4 text-right">
              <div className="hidden sm:block">
                <p className="text-[10px] font-mono opacity-60 uppercase tracking-widest">Responsável Técnico</p>
                <p className="font-bold text-xs uppercase text-right">{user.displayName}</p>
              </div>
              <div className="border-l border-brand-border pl-2 md:pl-4 flex items-center gap-2">
                <button onClick={logout} className="text-[9px] md:text-[10px] font-bold border border-brand-border px-1.5 md:px-2 py-1 hover:bg-brand-text hover:text-brand-bg transition-colors">SAIR</button>
                <img src={user.photoURL || ''} alt="avatar" className="w-6 h-6 md:w-8 md:h-8 border border-brand-border" referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : (
            <button 
              onClick={login}
              className="bg-brand-text text-brand-bg px-3 py-1.5 md:px-4 md:py-2 font-bold text-[10px] md:text-xs uppercase hover:opacity-90 transition-opacity"
            >
              <span className="hidden sm:inline">Autenticação Google</span>
              <span className="sm:hidden">Entrar</span>
            </button>
          )}

          {user && currentProject && (
            <div className="flex items-center gap-1 md:gap-2 ml-1 md:ml-4">
              <button 
                onClick={() => setShowResultsMobile(!showResultsMobile)}
                className="lg:hidden bg-blue-600 text-white px-2 py-1.5 font-bold text-[10px] uppercase border border-brand-border flex items-center gap-1"
              >
                {showResultsMobile ? <Calculator size={14} /> : <FileText size={14} />}
                <span>{showResultsMobile ? 'Formulário' : 'Resultado'}</span>
              </button>
              <button 
                onClick={saveProject}
                disabled={saving}
                className="bg-emerald-600 text-white px-2 md:px-4 py-1.5 md:py-2 font-bold text-[10px] md:text-xs uppercase border border-brand-border disabled:opacity-50"
              >
                {saving ? '...' : <Save size={14} className="sm:hidden" />}
                <span className="hidden sm:inline">{saving ? 'Gravando...' : 'Salvar'}</span>
              </button>
              <button 
                onClick={() => setCurrentProject(null)}
                className="bg-white text-brand-text px-2 md:px-4 py-1.5 md:py-2 font-bold text-[10px] md:text-xs uppercase border border-brand-border"
              >
                <LogOut size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 bg-brand-bg">
             <div className="border-2 md:border-4 border-brand-border p-6 md:p-12 bg-white flex flex-col items-center max-w-2xl text-center shadow-[6px_6px_0px_#141414] md:shadow-[12px_12px_0px_#141414]">
               <ShieldCheck size={48} strokeWidth={2.5} className="md:size-[64px] mb-4 md:mb-6" />
               <h2 className="text-xl md:text-3xl font-bold uppercase tracking-tighter mb-4">Módulo de Gerenciamento de Risco</h2>
               <p className="font-serif italic text-base md:text-lg opacity-80 mb-8">
                 Aplicação estritamente aderente à NBR 5419:2026. <br className="hidden md:block"/>
                 Acesse para desbloquear calculadoras de rastreabilidade e emissão de relatórios.
               </p>
               <button 
                 onClick={login}
                 className="bg-brand-text text-brand-bg px-8 md:px-12 py-3 md:py-5 font-bold text-lg md:text-xl uppercase hover:translate-x-1 hover:translate-y-1 transition-transform w-full md:w-auto"
               >
                 Iniciar Autenticação
               </button>
             </div>
          </div>
        ) : !currentProject ? (
          <>
            <aside className="hidden lg:flex w-64 border-r border-brand-border flex-col bg-brand-sidebar shrink-0">
              <div className="p-4 border-b border-brand-border bg-brand-text text-white text-[11px] font-mono uppercase tracking-widest flex justify-between items-center">
                <span>Projetos</span>
                <button 
                  onClick={() => setCurrentProject({ ...DEFAULT_PROJECT })} 
                  className="hover:text-amber-400"
                >
                  <Plus size={14}/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="p-4 text-[10px] opacity-60 font-mono italic">Nenhum registro encontrado.</div>
                ) : (
                  projects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setCurrentProject(p)}
                      className="p-4 border-b border-brand-border bg-brand-bg hover:bg-white cursor-pointer group transition-colors text-left"
                    >
                      <p className="text-[9px] font-mono opacity-50 uppercase">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                      <p className="font-bold text-xs uppercase truncate text-left">{p.name || 'Sem Nome'}</p>
                      <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-bold text-blue-600 uppercase">Abrir</span>
                         <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id!); }} className="text-red-600 hover:scale-110">
                           <Trash2 size={12}/>
                         </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-brand-border text-[10px] font-mono opacity-60 leading-tight text-left">
                ALGORITMO V.2026.1.4<br/>
                MODO: AUDITORIA TÉCNICA
              </div>
            </aside>

            <div className="flex-1 overflow-y-auto bg-white flex flex-col text-left">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-brand-border">
                  <h2 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-3">
                    <LayoutDashboard size={24} /> Registros Normativos
                  </h2>
                  <div className="bg-brand-text text-white px-3 py-1 font-mono text-xs uppercase">Total: {projects.length}</div>
                </div>

                {projects.length === 0 ? (
                  <div className="h-[400px] border border-brand-border border-dashed flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-brand-bg p-6 border border-brand-border mb-4 text-left">
                      <FileText size={40} />
                    </div>
                    <h3 className="font-bold text-lg uppercase mb-2">Base de Dados Vazia</h3>
                    <p className="text-sm opacity-60 mb-6 max-w-md text-center">Inicie uma nova avaliação para gerar o memorial de risco.</p>
                    <button 
                      onClick={() => setCurrentProject({ ...DEFAULT_PROJECT })}
                      className="border-2 border-brand-text px-8 py-3 font-bold uppercase hover:bg-brand-text hover:text-brand-bg transition-colors"
                    >
                      Criar Novo Registro
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    <div 
                      onClick={() => setCurrentProject({ ...DEFAULT_PROJECT })}
                      className="border-2 border-dashed border-brand-border p-6 md:p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-brand-bg transition-colors text-center"
                    >
                      <Plus size={32} />
                      <span className="font-bold uppercase text-xs md:text-sm font-mono tracking-widest text-center">Novo Memorial</span>
                    </div>
                    {projects.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setCurrentProject(p)}
                        className="border border-brand-border p-4 md:p-6 bg-white hover:bg-brand-bg cursor-pointer transition-colors flex flex-col justify-between h-[160px] md:h-[180px] shadow-[4px_4px_0px_rgba(0,0,0,0.05)] border-l-4 text-left"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[10px] font-mono border border-brand-border px-1.5 py-0.5 bg-brand-sidebar uppercase font-bold text-left">rev.26</span>
                             <span className="text-[9px] font-mono opacity-50 uppercase text-right">{new Date(p.date).toLocaleDateString()}</span>
                          </div>
                          <h3 className="font-bold text-base md:text-lg uppercase truncate tracking-tight text-left">{p.name || 'UNNAMED'}</h3>
                          <p className="text-[11px] md:text-xs opacity-60 font-serif italic truncate text-left">{p.client || 'NO CLIENT DATA'}</p>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-brand-border/10">
                           <ChevronRight size={18} md:size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
             {/* Left Controls */}
             <div className={`flex-1 flex flex-col overflow-hidden border-r border-brand-border ${showResultsMobile ? 'hidden lg:flex' : 'flex'}`}>
                <nav className="flex bg-brand-sidebar border-b border-brand-border shrink-0 overflow-x-auto no-scrollbar">
                  {(['id', 'structure', 'location', 'lines', 'protection'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-3 px-4 md:px-6 text-[10px] font-bold uppercase tracking-widest border-r border-brand-border transition-all whitespace-nowrap ${
                        activeTab === tab ? 'bg-white text-brand-text border-b-2 border-b-brand-text' : 'hover:bg-white/50 text-neutral-500'
                      }`}
                    >
                      {tab === 'id' && '1. Cadastro'}
                      {tab === 'structure' && '2. Estrutura'}
                      {tab === 'location' && '3. Ambiente'}
                      {tab === 'lines' && '4. Linhas'}
                      {tab === 'protection' && '5. Proteção'}
                    </button>
                  ))}
                </nav>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-bg/30 text-left">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      <div className="max-w-4xl space-y-6 md:space-y-8 text-left">
                        {activeTab === 'id' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <Field label="Nome do Projeto">
                              <input 
                                value={currentProject.name} 
                                onChange={e => setCurrentProject({...currentProject, name: e.target.value})}
                                className="input-field" placeholder="Ex: RT-LOG-01" 
                              />
                            </Field>
                            <Field label="Nome do Cliente">
                              <input 
                                value={currentProject.client} 
                                onChange={e => setCurrentProject({...currentProject, client: e.target.value})}
                                className="input-field" 
                              />
                            </Field>
                            <Field label="Localização / Endereço">
                              <input 
                                value={currentProject.location} 
                                onChange={e => setCurrentProject({...currentProject, location: e.target.value})}
                                className="input-field" placeholder="Ex: São Paulo, SP"
                              />
                            </Field>
                            <Field label="Descrição Técnica da Estrutura">
                              <input 
                                value={currentProject.description} 
                                onChange={e => setCurrentProject({...currentProject, description: e.target.value})}
                                className="input-field" placeholder="Ex: Galpão de armazenamento metálico"
                              />
                            </Field>
                            <Field label="Data da Inspeção">
                              <input 
                                type="date"
                                value={currentProject.date} 
                                onChange={e => setCurrentProject({...currentProject, date: e.target.value})}
                                className="input-field font-mono" 
                              />
                            </Field>
                            <Field label="Responsável Técnico">
                              <input 
                                value={currentProject.rt} 
                                onChange={e => setCurrentProject({...currentProject, rt: e.target.value})}
                                className="input-field" 
                              />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                               <Field label="Conselho Prof.">
                                <select 
                                  value={currentProject.professionalCouncil}
                                  onChange={e => setCurrentProject({...currentProject, professionalCouncil: e.target.value as any})}
                                  className="input-field"
                                >
                                  <option value="CFT">CFT</option>
                                  <option value="CRT">CRT</option>
                                  <option value="CREA">CREA</option>
                                  <option value="CAU">CAU</option>
                                </select>
                              </Field>
                              <Field label="Título Profissional">
                                <input 
                                  value={currentProject.professionalTitle} 
                                  onChange={e => setCurrentProject({...currentProject, professionalTitle: e.target.value})}
                                  className="input-field" 
                                />
                              </Field>
                            </div>
                            <Field label="Registro Profissional (Nº)">
                                <input 
                                  value={currentProject.professionalId} 
                                  onChange={e => setCurrentProject({...currentProject, professionalId: e.target.value})}
                                  className="input-field" 
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                              <Field label="Anotação (ART/TRT/RRT)">
                                <input 
                                  value={currentProject.artNumber} 
                                  onChange={e => setCurrentProject({...currentProject, artNumber: e.target.value})}
                                  className="input-field" 
                                />
                              </Field>
                              <Field label="Revisão Doc.">
                                <input 
                                  value={currentProject.revision} 
                                  onChange={e => setCurrentProject({...currentProject, revision: e.target.value})}
                                  className="input-field font-mono" 
                                />
                              </Field>
                            </div>
                            <Field label="Tipo de Ocupação">
                              <select 
                                value={currentProject.occupationType}
                                onChange={e => setCurrentProject({...currentProject, occupationType: e.target.value as any})}
                                className="input-field"
                              >
                                <option value="residencial">Residencial</option>
                                <option value="comercial">Comercial / Escritórios</option>
                                <option value="industrial">Industrial</option>
                                <option value="hospital">Hospitalar</option>
                                <option value="publico">Lugar de Público</option>
                                <option value="explosivo">Risco de Explosão</option>
                              </select>
                            </Field>


                            
                            <div className="border-t border-brand-border/20 pt-6 col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                              <Field label="Pessoas Expostas ao Risco">
                                <input 
                                  type="number"
                                  min="1"
                                  value={currentProject.numOccupants} 
                                  onChange={e => setCurrentProject({...currentProject, numOccupants: Number(e.target.value)})}
                                  className="input-field font-mono" 
                                />
                              </Field>
                              <Field label="População Total do Prédio">
                                <input 
                                  type="number"
                                  min="1"
                                  value={currentProject.totalOccupants || 1} 
                                  onChange={e => setCurrentProject({...currentProject, totalOccupants: Number(e.target.value)})}
                                  className="input-field font-mono" 
                                />
                              </Field>
                              <Field label="Tempo de Permanência (Horas/Ano)">
                                <input 
                                  type="number"
                                  min="1"
                                  max="8760"
                                  value={currentProject.totalTimeAnnually} 
                                  onChange={e => setCurrentProject({...currentProject, totalTimeAnnually: Number(e.target.value)})}
                                  className="input-field font-mono" 
                                />
                              </Field>
                            </div>
                          </div>
                        )}

                        {activeTab === 'structure' && (
                          <div className="space-y-10">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
                              <Field label="L (Comprimento)">
                                <div className="relative">
                                  <input type="number" 
                                    value={currentProject.length} 
                                    onChange={e => setCurrentProject({...currentProject, length: Number(e.target.value)})}
                                    className="input-field text-right pr-12 font-mono" 
                                  />
                                  <span className="absolute right-3 top-3.5 text-[9px] font-bold opacity-40">M</span>
                                </div>
                              </Field>
                              <Field label="W (Largura)">
                                <div className="relative">
                                  <input type="number" 
                                    value={currentProject.width} 
                                    onChange={e => setCurrentProject({...currentProject, width: Number(e.target.value)})}
                                    className="input-field text-right pr-12 font-mono" 
                                  />
                                  <span className="absolute right-3 top-3.5 text-[9px] font-bold opacity-40">M</span>
                                </div>
                              </Field>
                              <Field label="H (Altura)">
                                <div className="relative">
                                  <input type="number" 
                                    value={currentProject.height} 
                                    onChange={e => setCurrentProject({...currentProject, height: Number(e.target.value)})}
                                    className="input-field text-right pr-12 font-mono" 
                                  />
                                  <span className="absolute right-3 top-3.5 text-[9px] font-bold opacity-40">M</span>
                                </div>
                              </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                              <Field label="Sistema Construtivo">
                                <select 
                                  value={currentProject.structureType}
                                  onChange={e => setCurrentProject({...currentProject, structureType: e.target.value as any})}
                                  className="input-field"
                                >
                                  <option value="concreto">Concreto Armado</option>
                                  <option value="metalica">Estrutura Metálica</option>
                                  <option value="alvenaria">Alvenaria</option>
                                  <option value="madeira">Madeira</option>
                                </select>
                              </Field>
                              <Field label="Risco de Incêndio (Rf)">
                                <select 
                                  value={currentProject.fireRisk}
                                  onChange={e => setCurrentProject({...currentProject, fireRisk: e.target.value as any})}
                                  className="input-field"
                                >
                                  <option value="baixo">Baixo (Residencial) (rf = 0.001)</option>
                                  <option value="medio">Médio (Comercial / Escritórios) (rf = 0.01)</option>
                                  <option value="alto">Alto (Industrial / Hospitalar / Público) (rf = 0.1)</option>
                                  <option value="explosivo">Explosivo (Risco de Explosão) (rf = 1.0)</option>
                                </select>
                              </Field>
                              <Field label="Medidas de Combate a Incêndio (rp - Tabela C.5)">
                                <select 
                                  value={currentProject.fireProtection || 'nenhum'}
                                  onChange={e => setCurrentProject({...currentProject, fireProtection: e.target.value as any})}
                                  className="input-field"
                                >
                                  <option value="nenhum">Nenhuma Medida (rp = 1.0)</option>
                                  <option value="extintores">Extintores Manuais (rp = 0.5)</option>
                                  <option value="hidrantes">Hidrantes e Rede Armada (rp = 0.5)</option>
                                  <option value="spda_incendio">Sinalizadores / Detecção de Fumaça (rp = 0.2)</option>
                                  <option value="automatico">Chuveiro Automático / Sprinkler (rp = 0.1)</option>
                                  <option value="completo">Completo - Sprinklers & Brigada (rp = 0.1)</option>
                                  <option value="brigada">Brigada de Incêndio Dedicada (rp = 0.1)</option>
                                </select>
                              </Field>
                              <Field label="Fator de Perigo Adicional (hz - Tabela C.6)">
                                <select 
                                  value={currentProject.panicoFator || 'medio'}
                                  onChange={e => setCurrentProject({...currentProject, panicoFator: e.target.value as any})}
                                  className="input-field"
                                >
                                  <option value="baixo">Baixo Risco de Pânico (hz = 0.1)</option>
                                  <option value="medio">Risco Normal / Moderado (hz = 0.5)</option>
                                  <option value="alto">Alto Risco / Dificuldade de Escape (hz = 1.0)</option>
                                </select>
                              </Field>
                            </div>
                          </div>
                        )}

                        {activeTab === 'location' && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-left">
                             <div className="space-y-8">
                               <Field label="Ng (Densidade de Descargas)">
                                  <input type="number" step="0.1" 
                                    value={currentProject.ng} 
                                    onChange={e => setCurrentProject({...currentProject, ng: Number(e.target.value)})}
                                    className="input-field text-2xl font-mono" 
                                  />
                                  <p className="mt-2 text-[10px] opacity-60 font-mono italic text-left">Raios / Km² / Ano</p>
                               </Field>
                               <Field label="Resistividade do Solo (ρ)">
                                  <input type="number" 
                                    value={currentProject.soilResistivity} 
                                    onChange={e => setCurrentProject({...currentProject, soilResistivity: Number(e.target.value)})}
                                    className="input-field text-2xl font-mono" 
                                  />
                                  <p className="mt-2 text-[10px] opacity-60 font-mono italic text-left">Ω.m</p>
                               </Field>
                             </div>
                             <Field label="Fator Ambiental Cd">
                                <div className="space-y-2">
                                  {LOCALIZATION_FACTORS.map(f => (
                                    <button 
                                      key={f.value}
                                      onClick={() => setCurrentProject({...currentProject, cd: f.value as any})}
                                      className={`w-full text-left p-3 border font-bold text-[10px] uppercase transition-colors flex justify-between items-center ${
                                        currentProject.cd === f.value ? 'bg-brand-text text-white border-brand-text' : 'bg-white border-brand-border/20 hover:border-brand-border'
                                      }`}
                                    >
                                      <span>{f.label}</span>
                                      <span className="font-mono">CD={f.value}</span>
                                    </button>
                                  ))}
                                </div>
                             </Field>
                          </div>
                        )}

                        {activeTab === 'lines' && (
                          <div className="space-y-8">
                            <div className="flex justify-between items-center bg-brand-sidebar p-4 border border-brand-border">
                              <h3 className="font-bold uppercase text-xs tracking-widest">Linhas de Serviço Externas (Energia / Telecom)</h3>
                              <button 
                                onClick={() => setCurrentProject({
                                  ...currentProject, 
                                  lines: [...currentProject.lines, { 
                                    id: Math.random().toString(36).substring(7), 
                                    type: 'energia', 
                                    installation: 'aerea', 
                                    shielding: false, 
                                    length: 100, 
                                    uw: 2.5, 
                                    transformerNearby: false, 
                                    resisitivity: 500,
                                    soilResistivity: 500,
                                    cli: 1.0,
                                    ci: 1.0,
                                    ce: 1.0,
                                    ct: 1.0
                                  }]
                                })}
                                className="bg-brand-text text-white px-4 py-2 text-[10px] font-bold uppercase"
                              >
                                Adicionar Linha
                              </button>
                            </div>

                            <div className="space-y-4">
                              {currentProject.lines.map((line, idx) => {
                                // Extract calculated values for display if they exist
                                const calcAl = results?.areas?.customAl?.[idx] || 0;
                                const calcAi = results?.areas?.customAi?.[idx] || 0;
                                const ruleCi = line.ci !== undefined ? line.ci : (line.installation === 'aerea' ? 1.0 : 0.5);
                                const ruleCe = line.ce !== undefined ? line.ce : 1.0;
                                const ruleCt = line.ct !== undefined ? line.ct : (line.transformerNearby ? 0.2 : 1.0);
                                const lineNl = currentProject.ng * calcAl * ruleCt * (line.cli || 1.0) * currentProject.cd * 1e-6;
                                const lineNi = currentProject.ng * calcAi * ruleCt * (line.cli || 1.0) * currentProject.cd * 1e-6;

                                return (
                                  <div key={line.id} className="border border-brand-border p-6 bg-white space-y-6 relative group">
                                    <button 
                                      onClick={() => setCurrentProject({...currentProject, lines: currentProject.lines.filter(l => l.id !== line.id)})}
                                      className="absolute right-4 top-4 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                      <Field label="Tipo">
                                        <select 
                                          value={line.type}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].type = e.target.value as any;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field"
                                        >
                                          <option value="energia">Energia</option>
                                          <option value="telecom">Telecom</option>
                                        </select>
                                      </Field>
                                      <Field label="Instalação (Rápido)">
                                        <select 
                                          value={line.installation}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            const inst = e.target.value as any;
                                            newLines[idx].installation = inst;
                                            // auto-resolve ci factor
                                            newLines[idx].ci = inst === 'aerea' ? 1.0 : 0.5;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field"
                                        >
                                          <option value="aerea">Aérea</option>
                                          <option value="subterranea">Subterrânea</option>
                                        </select>
                                      </Field>
                                      <Field label="Comprimento (m)">
                                        <input 
                                          type="number"
                                          min="1"
                                          value={line.length}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].length = Number(e.target.value);
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono"
                                        />
                                      </Field>
                                      <Field label="CLI (Fator Ambiental Linha)">
                                        <input 
                                          type="number" step="0.1"
                                          value={line.cli || 1.0}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].cli = Number(e.target.value);
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono"
                                        />
                                      </Field>
                                    </div>

                                    {/* Advanced manual factor override */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-brand-border/10">
                                      <Field label="ci (Fator Instalação)">
                                        <select
                                          value={line.ci !== undefined ? line.ci : (line.installation === 'aerea' ? 1.0 : 0.5)}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].ci = Number(e.target.value);
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono"
                                        >
                                          <option value={1.0}>Aérea (ci = 1.0)</option>
                                          <option value={0.5}>Subterrânea (ci = 0.5)</option>
                                          <option value={0.1}>Duto metálico aterrado (ci = 0.1)</option>
                                        </select>
                                      </Field>
                                      <Field label="ce (Fator de Vizinhança)">
                                        <select
                                          value={line.ce !== undefined ? line.ce : 1.0}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].ce = Number(e.target.value);
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono"
                                        >
                                          <option value={1.0}>Rural / Descampado (ce = 1.0)</option>
                                          <option value={0.5}>Suburbano / Residencial (ce = 0.5)</option>
                                          <option value={0.1}>Urbano / Predispostos (ce = 0.1)</option>
                                          <option value={0.01}>Urbano de grande porte (ce = 0.01)</option>
                                        </select>
                                      </Field>
                                      <Field label="ct (Fator Transformador)">
                                        <select
                                          value={line.ct !== undefined ? line.ct : (line.transformerNearby ? 0.2 : 1.0)}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            const factor = Number(e.target.value);
                                            newLines[idx].ct = factor;
                                            newLines[idx].transformerNearby = factor === 0.2;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono"
                                        >
                                          <option value={1.0}>Sem Transformador (ct = 1.0)</option>
                                          <option value={0.2}>Com Transformador Próximo (ct = 0.2)</option>
                                        </select>
                                      </Field>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-brand-bg border border-brand-border/15 font-mono text-[9px]">
                                      <div>
                                        <p className="opacity-50 uppercase">Área Condução Al</p>
                                        <p className="font-bold text-xs mt-0.5 text-neutral-800">{calcAl.toFixed(1)} m²</p>
                                      </div>
                                      <div>
                                        <p className="opacity-50 uppercase">Área Indução Ai</p>
                                        <p className="font-bold text-xs mt-0.5 text-neutral-800">{calcAi.toFixed(1)} m²</p>
                                      </div>
                                      <div>
                                        <p className="opacity-50 uppercase">Freq Nl (Surtos)</p>
                                        <p className="font-bold text-xs mt-0.5 text-blue-700">{lineNl.toExponential(3)}</p>
                                      </div>
                                      <div>
                                        <p className="opacity-50 uppercase">Freq Ni (Induzida)</p>
                                        <p className="font-bold text-xs mt-0.5 text-blue-700">{lineNi.toExponential(3)}</p>
                                      </div>
                                    </div>

                                    <div className="flex gap-8 justify-between items-center text-[10px] opacity-75">
                                      <div className="flex flex-wrap gap-4">
                                        <Field label="Uw - Tensão Suportável (kV)">
                                        <input 
                                          type="number" step="0.1"
                                          value={line.uw}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].uw = Number(e.target.value);
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono max-w-[120px]"
                                        />
                                      </Field>
                                      <Field label="ρ Solo da Linha (Ω.m)">
                                        <input 
                                          type="number"
                                          value={line.soilResistivity !== undefined ? line.soilResistivity : (line.resisitivity !== undefined ? line.resisitivity : 500)}
                                          onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            const val = Number(e.target.value);
                                            newLines[idx].resisitivity = val;
                                            newLines[idx].soilResistivity = val;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }}
                                          className="input-field font-mono max-w-[120px]"
                                        />
                                      </Field>
                                      </div>
                                      <div className="flex gap-6 mt-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                          <input type="checkbox" checked={line.shielding} onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            newLines[idx].shielding = e.target.checked;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }} className="w-4 h-4 accent-brand-text" />
                                          <span className="text-[10px] font-bold uppercase">Blindagem de Linha</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                          <input type="checkbox" checked={line.transformerNearby} onChange={e => {
                                            const newLines = [...currentProject.lines];
                                            const val = e.target.checked;
                                            newLines[idx].transformerNearby = val;
                                            newLines[idx].ct = val ? 0.2 : 1.0;
                                            setCurrentProject({...currentProject, lines: newLines});
                                          }} className="w-4 h-4 accent-brand-text" />
                                          <span className="text-[10px] font-bold uppercase">Transformador Coordenado</span>
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {activeTab === 'protection' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
                             <Field label="Classe do SPDA">
                                <select 
                                  value={currentProject.protection.spdaClass}
                                  onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, spdaClass: Number(e.target.value) as any}})}
                                  className="input-field font-bold"
                                >
                                  <option value={0}>NENHUM SPDA</option>
                                  <option value={1}>CLASSE I (MAX)</option>
                                  <option value={2}>CLASSE II</option>
                                  <option value={3}>CLASSE III</option>
                                  <option value={4}>CLASSE IV</option>
                                </select>
                             </Field>
                             <div className="space-y-6">
                                <Field label="Medidas Internas">
                                   <div className="space-y-4">
                                      <label className="flex items-center gap-3 cursor-pointer group bg-white border border-brand-border/20 p-4 hover:border-brand-border transition-colors text-left">
                                         <input type="checkbox" checked={currentProject.protection.equipotentialization} onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, equipotentialization: e.target.checked}})} className="w-5 h-5 border-2 border-brand-border accent-brand-text" />
                                         <div className="text-left">
                                           <p className="text-[11px] font-bold uppercase tracking-wider text-left">Equipotencialização (BEL)</p>
                                           <p className="text-[9px] opacity-60 font-mono italic uppercase text-left">NBR 5410</p>
                                         </div>
                                      </label>
                                      <label className="flex items-center gap-3 cursor-pointer group bg-white border border-brand-border/20 p-4 hover:border-brand-border transition-colors text-left">
                                         <input type="checkbox" checked={currentProject.protection.internalShielding} onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, internalShielding: e.target.checked}})} className="w-5 h-5 border-2 border-brand-border accent-brand-text" />
                                         <div className="text-left">
                                           <p className="text-[11px] font-bold uppercase tracking-wider text-left">Blindagem Eletromagnética</p>
                                           <p className="text-[9px] opacity-60 font-mono italic uppercase text-left">Sistemas internos</p>
                                         </div>
                                      </label>
                                   </div>
                                </Field>
                                <Field label="Dispositivos de Proteção (DPS)">
                                   <select 
                                     value={currentProject.protection.dpsClass}
                                     onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, dpsClass: Number(e.target.value)}})}
                                     className="input-field"
                                   >
                                     <option value={0}>NÃO INSTALADO</option>
                                     <option value={1}>CLASSE III (TERMINAL)</option>
                                     <option value={2}>CLASSE II (DISTRIBUIÇÃO)</option>
                                     <option value={3}>CLASSE I (PRINCIPAL DE ENTRADA)</option>
                                   </select>
                                   <p className="mt-2 text-[9px] opacity-40 italic">Coordenação conforme NBR 5419-4</p>
                                </Field>
                                <div className="border-t border-brand-border pt-6 mt-6">
                                   <h4 className="text-[10px] font-bold uppercase mb-4 tracking-widest text-blue-600">Sistema de Aterramento</h4>
                                   <div className="grid grid-cols-2 gap-4">
                                      <Field label="Tipo da Malha">
                                         <select 
                                           value={currentProject.protection.groundingType}
                                           onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, groundingType: e.target.value as any}})}
                                           className="input-field"
                                         >
                                           <option value="anel">Anel Perimetral</option>
                                           <option value="natural">Fundações (Natural)</option>
                                           <option value="mista">Malha de Solo</option>
                                           <option value="eletrodo">Eletrodos Isolados</option>
                                         </select>
                                      </Field>
                                      <Field label="Resistência (Ohms)">
                                         <input 
                                           type="number"
                                           value={currentProject.protection.groundingResistance}
                                           onChange={e => setCurrentProject({...currentProject, protection: {...currentProject.protection, groundingResistance: Number(e.target.value)}})}
                                           className="input-field font-mono"
                                         />
                                      </Field>
                                   </div>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

               {/* Right Output / Results */}
               <aside className={`w-full lg:w-[460px] bg-white flex flex-col flex-1 lg:flex-none lg:shrink-0 min-h-0 overflow-hidden border-l border-brand-border ${!showResultsMobile ? 'hidden lg:flex' : 'flex'}`}>
                  <div className="bg-brand-text text-white p-2 text-[10px] font-mono uppercase tracking-widest flex justify-between items-center">
                    <span>Relatório em Tempo Real</span>
                    <span className="opacity-50 font-sans text-[8px] tracking-tight bg-blue-600 px-1.5 py-0.5 select-none text-white font-bold">ABNT NBR 5419-2:2026</span>
                  </div>

                  {/* Switch navigation between table data and telemetry graphics */}
                  <div className="grid grid-cols-2 border-b border-brand-border shrink-0 text-center font-mono">
                    <button 
                      onClick={() => setResultsTab('tabela')}
                      className={`py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${resultsTab === 'tabela' ? 'bg-brand-sidebar text-neutral-900 border-b-2 border-brand-text' : 'bg-white text-neutral-500 hover:text-neutral-900'}`}
                    >
                      Memorial (Tabela)
                    </button>
                    <button 
                      onClick={() => setResultsTab('graficos')}
                      className={`py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${resultsTab === 'graficos' ? 'bg-brand-sidebar text-neutral-900 border-b-2 border-brand-text' : 'bg-white text-neutral-500 hover:text-neutral-900'}`}
                    >
                      Gráficos (Telemetria)
                    </button>
                  </div>

                  <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 space-y-6 overflow-y-auto">
                    {results && (
                      <>
                        {resultsTab === 'tabela' ? (
                          <>
                            <div className="space-y-6 text-left">
                               <RiskGauge label="R1 — Risco à Vida Humana" value={results.risks.r1} limit={TOLERABLE_RISK.r1} />
                               <RiskGauge label="R2 — Risco ao Serviço Público" value={results.risks.r2} limit={TOLERABLE_RISK.r2} />
                               <RiskGauge label="R3 — Risco ao Patrimônio Cultural" value={results.risks.r3} limit={TOLERABLE_RISK.r3} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="border border-brand-border p-3 bg-brand-bg/50 text-left">
                                 <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Nd (Estrutura)</p>
                                 <p className="text-xs font-mono font-bold tracking-tighter">{results.frequencies.nd.toExponential(4)}</p>
                              </div>
                              <div className="border border-brand-border p-3 bg-brand-bg/50 text-left">
                                 <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Nm (Adjacências)</p>
                                 <p className="text-xs font-mono font-bold tracking-tighter">{results.frequencies.nm.toExponential(4)}</p>
                              </div>
                              <div className="border border-brand-border p-3 bg-brand-bg/50 text-left">
                                 <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Nl (Linhas)</p>
                                 <p className="text-xs font-mono font-bold tracking-tighter">{results.frequencies.nl.toExponential(4)}</p>
                              </div>
                              <div className="border border-brand-border p-3 bg-brand-bg/50 text-left">
                                 <p className="text-[10px] font-mono opacity-50 uppercase mb-1">Ni (Linhas Int.)</p>
                                 <p className="text-xs font-mono font-bold tracking-tighter">{results.frequencies.ni.toExponential(4)}</p>
                              </div>
                            </div>

                             <div className="space-y-4 text-left font-mono">
                                {(() => {
                                  const Lf = (SERVICE_FACTORS as any)[currentProject.occupationType] ?? 0.01;
                                  const hasCulturalValue = currentProject.occupationType === 'publico';
                                  const Lcultural = hasCulturalValue ? 0.001 : 0;
                                  
                                  const componentsR2 = results.componentsR2 ?? { rb: 0, rm: 0, rv: 0, rz: 0 };
                                  const componentsR3 = results.componentsR3 ?? { rb: 0, rm: 0, rv: 0, rz: 0 };

                                  const activeComponentsArray = riskMatrixTab === 'r1' 
                                    ? Object.entries(results.components) 
                                    : riskMatrixTab === 'r2'
                                      ? Object.entries(componentsR2)
                                      : Object.entries(componentsR3);

                                  const activeTotalRiskValue = riskMatrixTab === 'r1' 
                                    ? results.risks.r1 
                                    : riskMatrixTab === 'r2'
                                      ? (results.risks.r2 ?? 0)
                                      : (results.risks.r3 ?? 0);

                                  const matrixTitle = riskMatrixTab === 'r1' 
                                    ? 'Componentes de Risco (Matriz R1 - Vida)' 
                                    : riskMatrixTab === 'r2'
                                      ? 'Componentes de Risco (Matriz R2 - Serviço)' 
                                      : 'Componentes de Risco (Matriz R3 - Patrimônio)';

                                  const sumLabel = riskMatrixTab === 'r1' 
                                    ? 'Σ Total R1' 
                                    : riskMatrixTab === 'r2'
                                      ? 'Σ Total R2' 
                                      : 'Σ Total R3';

                                  return (
                                    <>
                                      <div className="flex justify-between items-center bg-brand-text text-white p-2">
                                        <span className="text-[10px] font-mono uppercase tracking-widest">Matriz {riskMatrixTab.toUpperCase()}</span>
                                        <div className="flex gap-1.5 text-[8px] font-mono font-bold">
                                          <button 
                                            onClick={() => setRiskMatrixTab('r1')} 
                                            className={`px-2 py-0.5 border transition-colors ${riskMatrixTab === 'r1' ? 'bg-white text-brand-text border-white' : 'text-white/60 hover:text-white border-white/20'}`}
                                          >
                                            R1
                                          </button>
                                          <button 
                                            onClick={() => setRiskMatrixTab('r2')} 
                                            className={`px-2 py-0.5 border transition-colors ${riskMatrixTab === 'r2' ? 'bg-white text-brand-text border-white' : 'text-white/60 hover:text-white border-white/20'}`}
                                          >
                                            R2
                                          </button>
                                          <button 
                                            onClick={() => setRiskMatrixTab('r3')} 
                                            className={`px-2 py-0.5 border transition-colors ${riskMatrixTab === 'r3' ? 'bg-white text-brand-text border-white' : 'text-white/60 hover:text-white border-white/20'}`}
                                          >
                                            R3
                                          </button>
                                        </div>
                                      </div>
                                      <div className="border border-brand-border text-[9px] font-mono overflow-hidden">
                                         <table className="w-full text-left font-mono">
                                           <thead className="bg-brand-sidebar border-b border-brand-border font-bold">
                                              <tr>
                                                 <th className="p-2 border-r border-brand-border">Comp.</th>
                                                 <th className="p-2">Valor Calculado</th>
                                                 <th className="p-2 text-right">Contrib.</th>
                                              </tr>
                                           </thead>
                                           <tbody className="bg-white">
                                              {activeComponentsArray.map(([key, val]) => {
                                                const numVal = Number(val);
                                                return (
                                                  <tr key={key} className="border-b border-brand-border/10">
                                                     <td className="p-2 border-r border-brand-border font-bold uppercase">{key}</td>
                                                     <td className="p-2 tabular-nums">{numVal.toExponential(4)}</td>
                                                     <td className="p-2 text-right opacity-50">{((numVal / (activeTotalRiskValue || 1)) * 100).toFixed(1)}%</td>
                                                  </tr>
                                                );
                                              })}
                                              <tr className="bg-brand-bg font-bold">
                                                 <td className="p-2 border-r border-brand-border uppercase">{sumLabel}</td>
                                                 <td className="p-2 tabular-nums text-blue-600 font-mono">{activeTotalRiskValue.toExponential(4)}</td>
                                                 <td className="p-2 text-right">100%</td>
                                              </tr>
                                           </tbody>
                                         </table>
                                      </div>
                                      <div className="p-3 bg-brand-bg border border-brand-border text-[9px] font-mono leading-tight space-y-3">
                                        <p className="font-bold border-b border-brand-border/20 mb-2 pb-1 uppercase italic tracking-widest text-blue-700 font-sans">Parâmetros Normativos (Audit)</p>
                                        
                                        <div className="grid grid-cols-2 gap-y-2 font-mono">
                                          <div>
                                            <p className="opacity-50 text-[8px] uppercase">Probabilidades (P)</p>
                                            <p>Pb: {results.factors.pb.toFixed(3)} | Pc: {results.factors.pc.toFixed(3)}</p>
                                            <p>Pm: {results.factors.pm.toExponential(2)} | Pu: {results.factors.pu.toFixed(3)}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="opacity-50 text-[8px] uppercase font-sans">Redutores & Perdas (L)</p>
                                            <p>rf: {results.factors.rf.toFixed(3)} | rp: {results.factors.rp.toFixed(2)} | hz: {results.factors.hz.toFixed(2)}</p>
                                            <p>Lt: {results.factors.lt.toExponential(1)} | Lmod: {Lf.toExponential(1)}</p>
                                          </div>
                                        </div>

                                        <div className="pt-2 border-t border-brand-border/10 space-y-1">
                                          <p className="font-bold uppercase text-[8px] opacity-60">Demonstrativo de Cálculo ({riskMatrixTab.toUpperCase()}):</p>
                                          {riskMatrixTab === 'r1' && (
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono">
                                              <p>Ra = Nd × Pa × Lb = {results.components.ra.toExponential(4)}</p>
                                              <p>Rb = Nd × Pb × Lc = {results.components.rb.toExponential(4)}</p>
                                              <p>Rc = Nd × Pc × Lw = {results.components.rc.toExponential(4)}</p>
                                              <p>Rm = Nm × Pm × Lz = {results.components.rm.toExponential(4)}</p>
                                              <p>Ru = Nl × Pu × Lb = {results.components.ru.toExponential(4)}</p>
                                              <p>Rv = Nl × Pv × Lc = {results.components.rv.toExponential(4)}</p>
                                              <p>Rw = Nl × Pw × Lw = {results.components.rw.toExponential(4)}</p>
                                              <p>Rz = Ni × Pz × Lz = {results.components.rz.toExponential(4)}</p>
                                            </div>
                                          )}
                                          {riskMatrixTab === 'r2' && (
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono">
                                              <p>Rb = Nd × Pb × Lf = {componentsR2.rb.toExponential(4)}</p>
                                              <p>Rm = Nm × Pm × Lf = {componentsR2.rm.toExponential(4)}</p>
                                              <p>Rv = Nl × Pv × Lf = {componentsR2.rv.toExponential(4)}</p>
                                              <p>Rz = Ni × Pz × Lf = {componentsR2.rz.toExponential(4)}</p>
                                            </div>
                                          )}
                                          {riskMatrixTab === 'r3' && (
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono">
                                              <p>Rb = Nd × Pb × Lc = {componentsR3.rb.toExponential(4)}</p>
                                              <p>Rm = Nm × Pm × Lc = {componentsR3.rm.toExponential(4)}</p>
                                              <p>Rv = Nl × Pv × Lc = {componentsR3.rv.toExponential(4)}</p>
                                              <p>Rz = Ni × Pz × Lc = {componentsR3.rz.toExponential(4)}</p>
                                            </div>
                                          )}
                                        </div>

                                        <div className="pt-2 border-t border-brand-border/20 font-mono">
                                          <p className="font-bold text-red-700 uppercase">{riskMatrixTab.toUpperCase()} TOTAL = Σ Ri = {activeTotalRiskValue.toExponential(4)}</p>
                                          <p className="mt-1 text-[8px] opacity-40 italic font-bold tracking-tight">ρ = {currentProject.soilResistivity} Ω⋅M | Ng = {currentProject.ng} R/KM²/ANO</p>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                             </div>
                          </>
                        ) : (
                          <div className="space-y-6 text-left">
                            <CalculatedRisksChart results={results} />
                            <DamageEventsChart results={results} />
                            <GlobalProbabilitiesChart results={results} />
                            <ConsequentLossesChart results={results} />
                            <DamageFrequenciesChart results={results} />
                          </div>
                        )}

                        <div className={`p-4 border-l-4 shadow-[4px_4px_10px_rgba(0,0,0,0.03)] border border-brand-border ${results.risks.r1 <= TOLERABLE_RISK.r1 ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'} text-left`}>
                           <p className="text-[10px] font-mono uppercase font-bold mb-1 opacity-60">Status de Conformidade</p>
                           <p className="font-bold text-sm tracking-tight leading-snug uppercase text-left">
                             {results.risks.r1 <= TOLERABLE_RISK.r1 
                               ? '✓ ESTRUTURA PROTEGIDA — REVISADO' 
                               : '✗ RISCO CRÍTICO — REQUER SPDA'}
                           </p>
                           {results.risks.r1 > TOLERABLE_RISK.r1 && (
                             <p className="mt-2 text-[10px] font-bold text-red-600 uppercase animate-pulse">Sugerida Proteção Classe {currentProject.protection.spdaClass === 0 ? 'I/II' : 'Superior'}</p>
                           )}
                        </div>

                        <div className="pt-4 border-t border-brand-border/10">
                          <button 
                            onClick={async () => currentProject && results && await ReportService.generate(currentProject, results)}
                            className="w-full bg-brand-text text-white py-4 font-bold uppercase text-xs flex items-center justify-center gap-3 hover:bg-neutral-800 transition-colors border border-brand-border"
                          >
                            <Download size={16} /> Exportar Memorial Auditável (PDF)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
               </aside>
            </div>
          )}
      </main>

      {/* Footer Info Bar */}
      <footer className="bg-brand-text text-white border-t border-white/10 p-2 flex justify-between items-center text-[10px] font-mono shrink-0">
        <div className="flex gap-6">
          <span className="bg-white text-brand-text px-1 font-bold tracking-tighter">ABNT 2026</span>
          <span className="opacity-50">COMPLIANCE ENGINE: V.1.04</span>
        </div>
        <div className="flex gap-4">
          <span>SECURE_ID: {user?.uid?.slice(0, 8)}</span>
          <span className={`${user ? 'text-green-400' : 'text-yellow-400'}`}>SESSÃO: {user ? 'ATIVA' : 'LOGOFF'}</span>
        </div>
      </footer>

      <style>{`
        .input-field {
          @apply w-full border border-brand-border p-3 md:p-4 text-xs font-bold focus:outline-none focus:bg-white bg-white/70 transition-all placeholder:opacity-30 uppercase;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <Tutorial isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-serif italic text-brand-text opacity-70 uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  );
}

function RiskGauge({ label, value, limit }: { label: string; value?: number; limit?: number }) {
  if (value === undefined || limit === undefined) return null;
  const isOk = value <= limit;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end border-b border-brand-border/20 pb-2">
        <div className="flex flex-col gap-1">
          <p className="font-serif italic text-[11px] uppercase opacity-60">{label}</p>
          <p className="text-3xl font-mono tracking-tighter tabular-nums">{value.toExponential(4)}</p>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 border ${isOk ? 'border-emerald-600 text-emerald-600' : 'border-red-600 text-red-600'}`}>
          {isOk ? 'OK' : 'FAIL'} (RT: {limit.toExponential(0)})
        </div>
      </div>
      
      <div className="h-2 bg-brand-border/10 border border-brand-border/20 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / limit) * 100, 100)}%` }}
          className={`h-full ${isOk ? 'bg-brand-text' : 'bg-red-600'}`}
        />
      </div>
    </div>
  );
}