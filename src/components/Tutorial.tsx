import React from 'react';
import { 
  X, 
  Shield, 
  Camera, 
  Box, 
  Zap, 
  MapPin, 
  FileText, 
  HelpCircle,
  Layout,
  Maximize
} from 'lucide-react';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-brand-bg border-4 border-brand-text w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="bg-brand-text text-brand-bg p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle size={24} className="shrink-0" />
            <h2 className="text-sm md:text-xl font-bold uppercase tracking-tighter">Guia de Preenchimento - NBR 5419:2026</h2>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-red-500 p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 bg-white text-black font-sans">
          
          {/* Logo Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-blue-600 border-b-2 border-blue-600 pb-1">
              <Shield size={20} className="fill-blue-600" />
              <h3 className="font-bold uppercase">1. Inserção de Logotipo Profissional</h3>
            </div>
            <p className="text-sm leading-relaxed">
              No canto superior esquerdo do painel, você encontrará um atalho de <strong>escudo azul</strong> para a marca da sua empresa.
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>Passe o cursor sobre o escudo para revelar o ícone de <strong>Câmera</strong> <Camera size={14} className="inline" />.</li>
              <li>Clique e selecione um arquivo de imagem (PNG, JPG) — a imagem é salva localmente e incorporada com segurança.</li>
              <li>No relatório PDF gerado, a logo é exibida de forma inteligente no cabeçalho superior direito da primeira página e em todas as páginas consequentes.</li>
            </ul>
          </section>

          {/* Identification Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-brand-text border-b-2 border-brand-text pb-1">
              <Layout size={20} />
              <h3 className="font-bold uppercase">2. Configurações e Identificação Administrativa</h3>
            </div>
            <p className="text-sm leading-relaxed">
              O preenchimento desta aba alimenta os dados gerais do Laudo Técnico.
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>Informações do Profissional:</strong> Nome do RT, Conselho (CREA/CFT) e Registro de Classe que consolidam os dados de assinatura.</li>
              <li><strong>ART / TRT / RRT Vinculado:</strong> Importante para conferência jurídica no relatório.</li>
              <li><strong>Revisão de Projeto:</strong> Campo de identificação que agora é documentado formalmente no rodapé inferior direito do PDF.</li>
            </ul>
          </section>

          {/* Geometry Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-brand-text border-b-2 border-brand-text pb-1">
              <Maximize size={20} />
              <h3 className="font-bold uppercase">3. Geometria da Edificação</h3>
            </div>
            <p className="text-sm leading-relaxed">
              As dimensões fornecem o cálculo das áreas equivalentes de exposição conforme Tabela A.1 da NBR 5419-2:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>Comprimento (L), Largura (W) e Altura (H):</strong> Fornecem o cálculo preciso para a Área de Exposição Isolada (<i>Ad</i>), representando o impacto de descargas diretas.</li>
              <li><strong>Área Adjacente (Am):</strong> Área estendida que indica o impacto de descargas próximas na vizinhança da estrutura.</li>
            </ul>
          </section>

          {/* Service Lines Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-brand-text border-b-2 border-brand-text pb-1">
              <Zap size={20} />
              <h3 className="font-bold uppercase">4. Linhas de Serviço e Fatores de Indução</h3>
            </div>
            <p className="text-sm leading-relaxed">
              Representam a fiação metálica que entra ou sai da estrutura, gerando riscos adicionais de sobretensão:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>Insira linhas de Energia ou Telecom selecionando o método de instalação (Aérea ou Subterrânea).</li>
              <li>O sistema calcula automaticamente as áreas de condução direta (<i>Al</i>) e indução em loops (<i>Ai</i>) para cada ramal cadastrado.</li>
            </ul>
          </section>

          {/* Protection Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-brand-text border-b-2 border-brand-text pb-1">
              <Shield size={20} />
              <h3 className="font-bold uppercase">5. Medidas de Mitigação & Fatores de Blindagem</h3>
            </div>
            <p className="text-sm leading-relaxed">
              As barreiras diminuem a probabilidade total de acidentes e choque físico:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>Classe do SPDA:</strong> Selecione a classe recomendada (I, II, III ou IV). A ausência zera a eficácia das correntes de escoamento.</li>
              <li><strong>Coordenação de DPS:</strong> Define o nível de atenuação de surtos nos barramentos de equipotencialização.</li>
              <li><strong>Blindagem Eletromagnética (Fatores Ks1 / Ks2):</strong> Parâmetros normativos de atenuação espacial que reduzem a severidade de danos internos induzidos por descargas próximas.</li>
            </ul>
          </section>

          {/* Alinhamento Normativo Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-amber-600 border-b-2 border-amber-600 pb-1">
              <Shield size={20} className="fill-amber-500 text-amber-600" />
              <h3 className="font-bold uppercase">6. Padronização de Riscos R1, R2, R3 & Gráficos</h3>
            </div>
            <p className="text-sm leading-relaxed">
              O motor de cálculos unificado opera sem sobreposição ou redundâncias, garantindo conformidade matemática rígida:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>Processamento de Componentes:</strong> Os riscos R1 (Vida Humana), R2 (Serviço Público) e R3 (Patrimônio Cultural) utilizam o mesmo motor matemático de precisão, exibindo todas as componentes de acoplamento direto e indireto em notação científica padronizada de 4 casas decimais (ex: <code>1.0000e-5</code>).</li>
              <li><strong>Gráficos Logarítmicos Normalizados:</strong> A visualização na plataforma e no laudo PDF adota uma escala normalizada referente ao respectivo limite tolerável de cada risco.</li>
              <li><strong>Linha de Limite Unificada:</strong> Uma linha horizontal de cor vermelha tracejada indica o patamar exato de conformidade, facilitando a visualização rápida e inequívoca do status (Conforme / Não Conforme).</li>
            </ul>
          </section>

          {/* Report Structure Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-blue-600 border-b-2 border-blue-600 pb-1">
              <FileText size={20} />
              <h3 className="font-bold uppercase">7. Estrutura e Formatação do Relatório PDF</h3>
            </div>
            <p className="text-sm leading-relaxed">
              O PDF gerado segue padrões editoriais de alta qualidade técnica:
            </p>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li><strong>Capa Limpa:</strong> O título do Memorial é renderizado de forma fluida em texto preto sem retângulos poluentes de fundo, redimensionado dinamicamente para se alinhar simetricamente à logo profissional logo ao lado.</li>
              <li><strong>Paginação Centralizada:</strong> O indicador de página (ex: <i>Página X de Y</i>) é posicionado perfeitamente no centro do rodapé.</li>
              <li><strong>Revisão de Documento:</strong> O número de controle da revisão é exibido de forma discreta no canto inferior direito do rodapé de cada folha, facilitando o arquivamento seguro em prontuários técnicos industriais.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 border-t border-brand-text shrink-0 text-center">
            <button 
              onClick={onClose}
              className="px-8 py-2 bg-brand-text text-white font-bold uppercase tracking-tighter hover:bg-gray-800 transition-colors"
            >
              Entendi, vamos começar!
            </button>
        </div>
      </div>
    </div>
  );
};
