import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectData, CalculationResult } from '../types';
import { TOLERABLE_RISK, SERVICE_FACTORS } from '../constants';

/**
 * Professional technical report generator for NBR 5419-2:2026 compliancy audits
 */
export class ReportService {
  static async generate(project: ProjectData, results: CalculationResult) {
    const doc = new jsPDF();
    const navy = [16, 44, 87]; // Deep luxury blue for professional report styling
    const lightGrey = [245, 245, 245];

    // Translation maps for clean, professional PDF labels
    const structureTypeMap: Record<string, string> = {
      concreto: 'Concreto Armado',
      metalica: 'Estrutura Metálica',
      madeira: 'Madeira',
      alvenaria: 'Alvenaria',
      mista: 'Mista / Outros'
    };

    const occupationTypeMap: Record<string, string> = {
      residencial: 'Residencial',
      comercial: 'Comercial / Escritórios',
      industrial: 'Industrial',
      hospital: 'Hospitalar',
      publico: 'Lugar de Público',
      explosivo: 'Risco de Explosão'
    };

    const fireRiskMap: Record<string, string> = {
      baixo: 'Baixo (rf = 0.001)',
      medio: 'Médio (rf = 0.01)',
      alto: 'Alto (rf = 0.1)',
      explosivo: 'Explosivo (rf = 1.0)'
    };

    const panicoFatorMap: Record<string, string> = {
      baixo: 'Baixo / Nenhum (hz = 0.1)',
      medio: 'Médio / Moderado (hz = 0.5)',
      alto: 'Alto (hz = 1.0)'
    };

    const fireProtectionMap: Record<string, string> = {
      nenhum: 'Nenhuma Medida (rp = 1.0)',
      extintores: 'Extintores Manuais (rp = 0.5)',
      hidrantes: 'Hidrantes/Rede Armada (rp = 0.5)',
      spda_incendio: 'Sinalizadores/Deteção Fumaça (rp = 0.2)',
      automatico: 'Chuveiro Automático/Sprinkler (rp = 0.1)',
      completo: 'Completo - Sprinklers & Brigada (rp = 0.1)',
      brigada: 'Brigada de Incêndio Dedicada (rp = 0.1)'
    };

    const groundingTypeMap: Record<string, string> = {
      anel: 'Anel Perimetral',
      natural: 'Fundações (Natural)',
      mista: 'Malha de Solo',
      eletrodo: 'Eletrodos Isolados'
    };

    // Helpers for Titles and Headers
    const drawSectionTitle = (title: string, y: number) => {
      if (isNaN(y)) return;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(String(title || ''), 14, y);
      
      doc.setDrawColor(navy[0], navy[1], navy[2]);
      doc.setLineWidth(0.5);
      doc.line(14, y + 1.5, 196, y + 1.5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    };

    const drawSubsectionTitle = (title: string, y: number) => {
      if (isNaN(y)) return;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(String(title || ''), 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    };

    // PAGE 1: COVER / COVER PAGE (No background rectangle, text in black, resized to fit logo)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('MEMORIAL DE GERENCIAMENTO DE RISCO SPDA', 14, 22);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('LAUDO DE DIAGNÓSTICO QUANTITATIVO CONFORME NORMA ABNT NBR 5419-2:2026', 14, 29);

    if (project.logoUrl) {
      try {
        doc.addImage(project.logoUrl, 'PNG', 180, 14, 16, 16, undefined, 'FAST');
      } catch (e) {
        console.warn('Unable to append logoUrl inside page 1:', e);
      }
    }

    doc.setTextColor(0, 0, 0);
    drawSectionTitle('1. IDENTIFICAÇÃO DO PROJETO', 60);
    
    autoTable(doc, {
      startY: 65,
      margin: { left: 14, right: 14 },
      head: [['Variável Cadastral', 'Dados Identificados']],
      body: [
        ['Nome do Projeto', project.name || 'N/A'],
        ['Cliente', project.client || 'N/A'],
        ['Localização / Cidade', project.location || 'Não informada'],
        ['Descrição do Projeto', project.description || 'Não informada'],
        ['Data do Parecer', new Date(project.date).toLocaleDateString('pt-BR')],
        ['Revisão Documental', project.revision || '00'],
        ['Responsável Técnico (RT)', project.rt || 'N/A'],
        ['Título do RT', project.professionalTitle || 'N/A'],
        ['Conselho & Registro', `${project.professionalCouncil} | ${project.professionalId || 'N/A'}`],
        ['ART / TRT / RRT Vinculada', project.artNumber || 'N/A'],
        ['Status Global R1 (Vida Humana)', results.risks.r1 <= TOLERABLE_RISK.r1 ? 'CONFORME (ABAIXO DO LIMITE)' : 'NÃO CONFORME (SURTOS CRÍTICOS)']
      ],
      theme: 'grid',
      headStyles: { fillColor: navy as any, fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    // 2. Características da Estrutura
    drawSectionTitle('2. PARÂMETROS GEOMÉTRICOS E MATRIZ DE EXPOSIÇÃO', (doc as any).lastAutoTable.finalY + 12);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      margin: { left: 14, right: 14 },
      body: [
        ['Comprimento (L)', `${project.length} m`, 'Fator CD (Ambiente)', `${project.cd}`],
        ['Largura (W)', `${project.width} m`, 'Resistividade do Solo (rho)', `${project.soilResistivity} Ohm.m`],
        ['Altura (H)', `${project.height} m`, 'Densidade de Descargas (Ng)', `${project.ng} raios/km2/ano`],
        ['Risco de Incêndio (Rf)', fireRiskMap[project.fireRisk] || project.fireRisk.toUpperCase(), 'Fator de Pânico (hz)', panicoFatorMap[project.panicoFator] || project.panicoFator.toUpperCase()],
        ['Tipo de Estrutura', structureTypeMap[project.structureType] || project.structureType.toUpperCase(), 'Tipo de Ocupação', occupationTypeMap[project.occupationType] || project.occupationType.toUpperCase()],
        ['Frequência de Impacto (Nd)', `${results.frequencies.nd.toExponential(4)} /ano`, 'Frequência Proximidades (Nm)', `${results.frequencies.nm.toExponential(4)} /ano`],
        ['População Exposta', `${project.numOccupants} de ${project.totalOccupants || project.numOccupants} pessoas`, 'Perda Populacional Equivalente', `${results.factors.lt.toExponential(3)}`]
      ],
      theme: 'striped',
      styles: { fontSize: 8.5 }
    });

    // 2.1 - DETALHAMENTO DE ÁREAS DE INFLUÊNCIA (S1 & S2) (on Page 1)
    drawSectionTitle('2.1 - DETALHAMENTO DE ÁREAS DE INFLUÊNCIA (S1 & S2)', (doc as any).lastAutoTable.finalY + 12);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      head: [['Sigla', 'Descrição Teórica Normativa', 'Equação Matemática', 'Resultado (m²)']],
      body: [
        ['Ad', 'Área de exposição da estrutura isolada (S1)', 'L*W + 6H*(L+W) + 9*PI*H^2', results.areas.ad.toFixed(2)],
        ['Am', 'Área de exposição para descargas próximas (S2)', '(L+500)*(W+500) - Ad', results.areas.am.toFixed(2)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [80, 80, 80], fontSize: 9 },
      styles: { fontSize: 8.5 }
    });

    // PAGE 2: LINHAS, MEDIDAS DE PROTEÇÃO E EVENTOS DANOSOS
    doc.addPage();
    drawSectionTitle('2.2 - CARACTERÍSTICAS DAS LINHAS CONECTADAS (S3 & S4)', 30);

    const linesBody = project.lines.map((line, idx) => {
      const ci = line.ci !== undefined ? line.ci : (line.installation === 'aerea' ? 1.0 : 0.5);
      const ce = line.ce !== undefined ? line.ce : 1.0;
      const ct = line.ct !== undefined ? line.ct : (line.transformerNearby ? 0.2 : 1.0);
      const al = results.areas.customAl?.[idx] || 0;
      const ai = results.areas.customAi?.[idx] || 0;
      return [
        `Linha ${idx+1} (${line.type === 'energia' ? 'Energia' : 'Telecom/Sinais'})`,
        `${line.length} m`,
        `ci=${ci} | ce=${ce}`,
        `ct=${ct} | cli=${line.cli || 1.0}`,
        `${al.toFixed(1)} m²`,
        `${ai.toFixed(1)} m²`
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Identificação', 'Comprimento', 'Instalação & Amb.', 'Fatores (ct/cli)', 'Área Condução (Al)', 'Área Indução (Ai)']],
      body: linesBody.length ? linesBody : [['Nenhuma linha cadastrada', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [120, 120, 120], fontSize: 9 },
      styles: { fontSize: 8.5 }
    });

    // Medidas de Proteção
    drawSectionTitle('2.3 - SÍNTESE DE MEDIDAS DE ENGENHARIA DE MITIGAÇÃO', (doc as any).lastAutoTable.finalY + 12);
    const spdaLabel = project.protection.spdaClass === 0 ? 'NÃO INSTALADO' : `SPDA EXTERNO CLASSE ${['','I','II','III','IV'][project.protection.spdaClass]}`;
    const dpsLabel = project.protection.dpsClass === 0 ? 'SEM COORDENAÇÃO DE DPS' : `DPS COORDENADO NÍVEL ${['','I','II','III','I+II'][project.protection.dpsClass]}`;
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      body: [
        ['Proteção de SPDA Externo', spdaLabel, 'Equipotencialização', project.protection.equipotentialization ? 'EFETUADA (BEL/BEP)' : 'NÃO EFETUADA'],
        ['Blindagem Eletromagnética', project.protection.internalShielding ? 'APLICADA EM EQUIPAMENTOS' : 'NÃO EXECUTADA', 'Coordenação de Protetores DPS', dpsLabel],
        ['Tipo de Malha da Terra', groundingTypeMap[project.protection.groundingType] || project.protection.groundingType.toUpperCase(), 'Resistência Declarada', `${project.protection.groundingResistance} Ohms`],
        ['Combate a Incêndio (rp)', `${fireProtectionMap[project.fireProtection] || project.fireProtection.toUpperCase()}`, 'Fator Risco Fogo (rf)', `${results.factors.rf.toFixed(3)}`]
      ],
      theme: 'striped',
      styles: { fontSize: 8.5 }
    });

    // 3. EVENTOS DANOSOS DA MATRIZ (Continues on Page 2)
    drawSectionTitle('3. EVENTOS DANOSOS DA MATRIZ DE DESCARGAS (Nd, Nm, Nl, Ni)', (doc as any).lastAutoTable.finalY + 12);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      head: [['Símbolo', 'Evento Danoso Relacionado', 'Equação de Risco', 'Frequência (/ano)']],
      body: [
        ['Nd', 'Descargas diretas na estrutura (S1)', 'Ng * Ad * Cd * 10^-6', results.frequencies.nd.toExponential(4)],
        ['Nm', 'Descargas próximas à estrutura (S2)', 'Ng * Am * 10^-6', results.frequencies.nm.toExponential(4)],
        ['Nl', 'Descargas diretas na linha de serviço (S3)', 'Ng * Al * Ce * Ct * CLI * Cd * 10^-6', results.frequencies.nl.toExponential(4)],
        ['Ni', 'Descargas próximas à linha de serviço (S4)', 'Ng * Ai * Ce * Ct * CLI * Cd * 10^-6', results.frequencies.ni.toExponential(4)],
        ['Total Nt', 'Frequência cumulativa', 'Soma total de frequências', results.frequencies.total.toExponential(4)]
      ],
      theme: 'grid',
      headStyles: { fillColor: navy as any, fontSize: 8.5 },
      styles: { fontSize: 8 }
    });

    // Draw manual Comparative Chart for Events (Nd, Nm, Nl, Ni)
    const chartY = (doc as any).lastAutoTable.finalY + 15;
    drawSubsectionTitle('RELAÇÃO COMPARATIVA DA MATRIZ DE PROTEÇÃO DE EXPOSIÇÃO (ESCALA LOGARÍTMICA)', chartY);
    
    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(14, chartY + 6, 180, 50, 'F');
    doc.setDrawColor(200);
    doc.rect(14, chartY + 6, 180, 50, 'S');

    // Horizontal gridlines
    doc.setLineDashPattern([2, 1], 0);
    doc.line(14, chartY + 18.5, 194, chartY + 18.5);
    doc.line(14, chartY + 31, 194, chartY + 31);
    doc.line(14, chartY + 43.5, 194, chartY + 43.5);
    doc.setLineDashPattern([], 0);

    const freqs = [results.frequencies.nd, results.frequencies.nm, results.frequencies.nl, results.frequencies.ni];
    const labels = ['Nd', 'Nm', 'Nl', 'Ni'];
    const barWidth = 25;
    const spacing = 18;

    freqs.forEach((freq, idx) => {
      const px = 25 + idx * (barWidth + spacing);
      // convert value to log scale height for nice rendering
      const expVal = Math.max(1e-6, freq);
      const barHeight = Math.min(42, Math.max(2, (Math.log10(expVal) + 6) * 7.5));
      const py = chartY + 50 - barHeight;

      doc.setFillColor(navy[0], navy[1], navy[2]);
      doc.rect(px, py, barWidth, barHeight, 'F');

      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(labels[idx], px + barWidth / 2, chartY + 54, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(freq.toExponential(2), px + barWidth / 2, py - 2.5, { align: 'center' });
    });

    // PAGE 3: PROBABILIDADES E PERDAS (ITEM 4)
    doc.addPage();
    drawSectionTitle('4. PROBABILIDADE DE DANOS (FATORES P)', 30);
    
    autoTable(doc, {
      startY: 35,
      head: [['Fator', 'Área de Influência da Probabilidade', 'Descrição de Medidas de Engenharia', 'Resultado']],
      body: [
        ['Pa', 'Choque por descargas diretas (S1)', 'Equipotencialização de barramentos', results.factors.pa.toFixed(3)],
        ['Pb', 'Danos físicos por descargas diretas (S1)', 'Eficácia do SPDA Externo instalado', results.factors.pb.toFixed(3)],
        ['Pc', 'Sistemas elétricos por descargas diretas (S1)', 'Eficácia dos limitadores DPS na energia', results.factors.pc.toFixed(3)],
        ['Pm', 'Sistemas elétricos por indução (S2)', 'Blindagem eletromagnética espacial Ks1/Ks2', results.factors.pm.toExponential(3)],
        ['Pu', 'Choque por descargas na linha (S3)', 'Equipotencialização física da entrada', results.factors.pu.toFixed(3)],
        ['Pv', 'Danos físicos por descargas na linha (S3)', 'Eficácia de DPS classe I contra fogo', results.factors.pv.toFixed(3)],
        ['Pw', 'Sistemas elétricos por descargas na linha (S3)', 'Nível coordenado de proteção DPS em linhas', results.factors.pw.toFixed(3)],
        ['Pz', 'Sistemas elétricos por proximidade à linha (S4)', 'Surtos de indução em duto metálico secundário', results.factors.pz.toExponential(3)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], fontSize: 8.5 },
      styles: { fontSize: 8 }
    });

    drawSectionTitle('4.1 - ANÁLISE QUANTITATIVA DE PERDAS CONSEQUENTES (FATORES L)', (doc as any).lastAutoTable.finalY + 12);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      head: [['Vetor de Perda', 'Equação Normativa', 'Representatividade Física', 'Fator de Ponderação']],
      body: [
        ['Lt (Padrão de Perda)', 'La', 'Nível de vulnerabilidade de pânico ocupacional', results.factors.lt.toExponential(3)],
        ['hz (Fator de Incremento/Pânico)', 'Tabela C.4 (Ajustado)', 'Dificuldade de evacuação / risco de pânico', results.factors.hz.toFixed(2)],
        ['Lb (Perda em Choque)', 'Lt * rf * rp * hz', 'Danos mecânicos e pânico resultante (h_z)', results.factors.lb.toExponential(3)],
        ['Lc (Perda por Sistemas)', 'Lt * rf * rp', 'Danos às instalações auxiliares', results.factors.lc.toExponential(3)],
        ['Lw (Perda por Descargas)', 'Lt * rf * rp', 'Falha de sistemas sob oscilação', results.factors.lw.toExponential(3)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [80, 80, 80], fontSize: 8.5 },
      styles: { fontSize: 8 }
    });

    // SÍNTESE DE COMPONENTES DE RISCO (ITEM 5) (on Page 3 below Item 4)
    drawSectionTitle('5. SÍNTESE DOS COMPONENTES DE RISCO CALCULADOS (R1, R2, R3)', (doc as any).lastAutoTable.finalY + 12);

    const compR1 = results.components || { ra: 0, rb: 0, rc: 0, rm: 0, ru: 0, rv: 0, rw: 0, rz: 0 };
    const compR2 = results.componentsR2 || { rb: 0, rm: 0, rv: 0, rz: 0 };
    const compR3 = results.componentsR3 || { rb: 0, rm: 0, rv: 0, rz: 0 };

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 17,
      head: [['Tipo de Risco normativo', 'S1 (Direta)', 'S2 (Próxima)', 'S3 (Linha Direta)', 'S4 (Linha Próx.)', 'Total', 'Limite Tolerado', 'Definição']],
      body: [
        [
          'R1 (Vida Humana)', 
          `${(compR1.ra + compR1.rb + compR1.rc).toExponential(4)}`, 
          `${compR1.rm.toExponential(4)}`, 
          `${(compR1.ru + compR1.rv + compR1.rw).toExponential(4)}`, 
          `${compR1.rz.toExponential(4)}`, 
          `${results.risks.r1.toExponential(4)}`, 
          `${TOLERABLE_RISK.r1.toExponential(4)}`, 
          results.risks.r1 <= TOLERABLE_RISK.r1 ? 'CONFORME' : 'NÃO CONFORME'
        ],
        [
          'R2 (Serviço Público)', 
          `${(compR2.rb + (compR2.rc || 0)).toExponential(4)}`, 
          `${compR2.rm.toExponential(4)}`, 
          `${(compR2.rv + (compR2.rw || 0)).toExponential(4)}`, 
          `${compR2.rz.toExponential(4)}`, 
          results.risks.r2 !== undefined ? `${results.risks.r2.toExponential(4)}` : 'N/C', 
          `${TOLERABLE_RISK.r2.toExponential(4)}`, 
          results.risks.r2 !== undefined ? (results.risks.r2 <= TOLERABLE_RISK.r2 ? 'CONFORME' : 'NÃO CONFORME') : 'NÃO CALCULADO'
        ],
        [
          'R3 (Patrimônio Cultural)', 
          `${(compR3.rb).toExponential(4)}`, 
          `${(compR3.rm || 0).toExponential(4)}`, 
          `${(compR3.rv).toExponential(4)}`, 
          `${(compR3.rz || 0).toExponential(4)}`, 
          results.risks.r3 !== undefined ? `${results.risks.r3.toExponential(4)}` : 'N/C', 
          `${TOLERABLE_RISK.r3.toExponential(4)}`, 
          results.risks.r3 !== undefined ? (results.risks.r3 <= TOLERABLE_RISK.r3 ? 'CONFORME' : 'NÃO CONFORME') : 'NÃO CALCULADO'
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: navy as any, fontSize: 8.5 },
      styles: { fontSize: 7.5 }
    });

    // Comparative diagram for global risks R1, R2, R3
    const riskChartY = (doc as any).lastAutoTable.finalY + 15;
    drawSubsectionTitle('AVALIAÇÃO COMPARATIVA COM LIMITES TOLERÁVEIS', riskChartY);

    doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
    doc.rect(14, riskChartY + 6, 180, 50, 'F');
    doc.setDrawColor(200);
    doc.rect(14, riskChartY + 6, 180, 50, 'S');

    const totalRisks: number[] = [];
    const riskLimits: number[] = [];
    const riskLabels: string[] = [];

    // R1 is always present
    totalRisks.push(results.risks.r1);
    riskLimits.push(TOLERABLE_RISK.r1);
    riskLabels.push('R1 (Vida)');

    if (results.risks.r2 !== undefined) {
      totalRisks.push(results.risks.r2);
      riskLimits.push(TOLERABLE_RISK.r2);
      riskLabels.push('R2 (Público)');
    }

    if (results.risks.r3 !== undefined) {
      totalRisks.push(results.risks.r3);
      riskLimits.push(TOLERABLE_RISK.r3);
      riskLabels.push('R3 (Patrimônio)');
    }

    const bottomY = riskChartY + 50;
    totalRisks.forEach((risk, idx) => {
      const rx = 30 + idx * 50;
      
      // Normalização de escala baseada na razão logarítmica com o limite
      // Se risco = limite, logRatio = 0, hNorm = 25px (exatamente na linha vermelha do limite)
      const logRatio = Math.log10(Math.max(1e-12, risk) / riskLimits[idx]);
      const hNorm = Math.min(46, Math.max(4, 25 + logRatio * 5.5));
      const ry = bottomY - hNorm;

      if (risk <= riskLimits[idx]) {
        doc.setFillColor(34, 197, 94); // Verde (Conforme)
      } else {
        doc.setFillColor(239, 68, 68); // Vermelho (Não Conforme)
      }
      doc.rect(rx, ry, 22, hNorm, 'F');

      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'bold');
      doc.text(riskLabels[idx], rx + 11, riskChartY + 54, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(risk.toExponential(4), rx + 11, ry - 2.5, { align: 'center' });
    });

    // Linha limite unificada e normalizada horizontalmente para todos os riscos:
    const unifiedLimitY = bottomY - 25; // 25px
    doc.setDrawColor(220, 50, 50); // Alerta Vermelha
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(14, unifiedLimitY, 194, unifiedLimitY);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(6.5);
    doc.setTextColor(220, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('LIMITE MÁXIMO TOLERÁVEL (CONFORME)', 15, unifiedLimitY - 1.5);
    doc.setFont('helvetica', 'normal');

    // PAGE 6: FREQUÊNCIA DE DANOS E CONCLUSÃO TÉCNICA
    doc.addPage();
    drawSectionTitle('6. ANÁLISE DE FREQUÊNCIA DE SUCESSÃO DE DANOS (F)', 30);
    
    const calculatedFTotal = results.frequenciasDanos.fTotal || (results.frequenciasDanos.fPhysical + results.frequenciasDanos.fElectrical + results.frequenciasDanos.fData);

    autoTable(doc, {
      startY: 35,
      head: [['Categoria do Evento de Surtos', 'Modo Físico de Acoplamento', 'Frequência Esperada (/ano)']],
      body: [
        ['Danos Físicos Diretos/Indiretos (F_físico)', 'Impacto direto no invólucro (S1 + S3)', results.frequenciasDanos.fPhysical.toExponential(4)],
        ['Falha Elétrica de Energia (F_elétrica)', 'Perturbação na rede elétrica principal (S1, S2, S3, S4)', results.frequenciasDanos.fElectrical.toExponential(4)],
        ['Falha Sistemas de Sinais (F_dados)', 'Surtos eletromagnéticos induzidos em dados', results.frequenciasDanos.fData.toExponential(4)],
        ['Frequência Total Estimada (F_total)', 'Frequência coletiva de sinistros', calculatedFTotal.toExponential(4)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100], fontSize: 8.5 },
      styles: { fontSize: 8 }
    });

    // Parecer Técnico e Assinatura
    const conclY = (doc as any).lastAutoTable.finalY + 15;
    drawSectionTitle('7. PARECER CONCLUSIVO E RECOMENDAÇÕES', conclY);

    const isR1Compliant = results.risks.r1 <= TOLERABLE_RISK.r1;
    let conclusionText = '';

    if (isR1Compliant) {
      if (project.protection.spdaClass > 0) {
        conclusionText = `Diante dos parâmetros quantificados, e em estrita consonância com a ABNT NBR 5419-2:2026, certifica-se que a estrutura encontra-se tecnicamente CONFORME, uma vez que o Risco de Perda de Vida Humana calculado (R1 = ${results.risks.r1.toExponential(3)}) situa-se abaixo do limiar de segurança regulatório estabelecido (1.00e-5). A eficácia é assegurada pelas medidas protetivas coordenadas aplicadas, as quais incluem o SPDA Externo de Classe ${project.protection.spdaClass} e os DPS instalados na entrada de serviço. Recomenda-se revisões rotineiras obrigatórias de aterramento de três em três anos ou em eventos específicos.`;
      } else {
        conclusionText = `Após realização completa do diagnóstico normativo, certifica-se que a estrutura possui ISENÇÃO TÉCNICA temporária de SPDA externo. O Risco Calculado de Vida Humana (R1 = ${results.risks.r1.toExponential(3)}) está abaixo do tolerável de 1.00e-5, prescindindo de cabeamento de descida e captação aérea em malha externa sob as premissas atuais. Contudo, essa conformidade exige que a eficácia operacional de todas as proteções coordenadas de DPS internos e BEL sejam rigorosamente mantidas.`;
      }
    } else {
      // Find the dominant component
      const componentsList = Object.entries(results.components || results.componentsR1 || {}) as [string, number][];
      const dominant = (componentsList.length > 0
        ? componentsList.reduce((p, c) => (p[1] > c[1]) ? p : c)
        : ['N/A', 0]) as [string, number];
      const domKey = dominant[0].toUpperCase();

      conclusionText = `O Risco Calculado de Vida Humana (R1 = ${results.risks.r1.toExponential(3)}) EXCEDE o limite de segurança normatizado de 1.00e-5 pela NBR 5419-2:2026. A estrutura encontra-se NÃO CONFORME e altamente vulnerável. O vetor de vulnerabilidade dominante que impulsionou o risco é o componente ${domKey} (${dominant[1].toExponential(3)}). É urgente realizar a imediata readequação instalando ${
        domKey === 'RB' ? 'um SPDA Externo coordenado para conter frentes de fogo corporais' :
        domKey === 'RC' || domKey === 'RM' ? 'protetores DPS Classe I/II de grande capacidade de descarrego nas frentes elétricas' :
        'uma malha de aterramento coordenada de equipotencialização'
      }.`;
    }

    doc.setFontSize(8.5);
    doc.setTextColor(30);
    doc.text(doc.splitTextToSize(conclusionText, 180), 14, conclY + 12);

    // Signature Block
    const sBlockY = 232;
    doc.setDrawColor(120);
    doc.setLineWidth(0.3);
    doc.line(115, sBlockY + 10, 190, sBlockY + 10);
    
    doc.setFontSize(8);
    doc.setTextColor(30);
    doc.text(String(project.rt || '').toUpperCase(), 152.5, sBlockY + 14, { align: 'center' });
    doc.text(String(project.professionalTitle || '').toUpperCase(), 152.5, sBlockY + 18, { align: 'center' });
    doc.text(`${project.professionalCouncil}: ${project.professionalId || 'N/A'}`, 152.5, sBlockY + 22, { align: 'center' });
    doc.setFontSize(7);
    doc.text('Assinatura Eletrônica sob registro de ART', 152.5, sBlockY + 26, { align: 'center' });

    // Header & Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Solid border decoration
        doc.setDrawColor(navy[0], navy[1], navy[2]);
        doc.setLineWidth(0.2);
        doc.line(14, 283, 196, 283);

        // Header (except on page 1)
        if (i > 1) {
          doc.setFontSize(7.5);
          doc.setTextColor(100);
          doc.setFont('helvetica', 'italic');
          doc.text(`Laudo GR SPDA - Projeto: ${project.name || 'N/A'}`, 14, 15);
        }

        // Footer (Página no centro, Revisão no canto direito)
        doc.setFontSize(7.5);
        doc.setTextColor(110);
        doc.setFont('helvetica', 'normal');
        doc.text(`Laudo Auditável NBR-5419-2:2026`, 14, 288);
        doc.text(`Página ${i} de ${pageCount}`, 105, 288, { align: 'center' });
        doc.text(`Revisão: ${project.revision || '00'}`, 196, 288, { align: 'right' });

        if (project.logoUrl && i > 1) {
            try {
                doc.addImage(project.logoUrl, 'PNG', 180, 8, 16, 16, undefined, 'FAST');
            } catch (e) {
                console.warn('Unable to append logoUrl inside pages:', e);
            }
        }
    }

    doc.save(`Memorial_Audito_SPDA_${(project.name || 'Projeto').replace(/\s+/g, '_')}.pdf`);
  }
}
