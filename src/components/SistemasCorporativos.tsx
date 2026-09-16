import { useState, useMemo } from 'react';
import { Search, Download, Building2, Database, Phone, Shield, Users } from 'lucide-react';

type Sistema = {
  categoria: string;
  sistema: string;
  descricao: string;
  tipoAcesso: string;
  quemSolicita: string;
  canal: string;
  setor: string;
  contato: string;
};

const DADOS: Sistema[] = [
  { categoria: 'Sistemas Corporativos', sistema: 'SIGAD', descricao: 'Sistema Integrado de Gestão de Documentos e Processos', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Servidor / Chefia', canal: 'E-mail de solicitação', setor: 'SIGAD Suporte', contato: 'sigadsuporte@senado.leg.br | Ramal 1563/4862' },
  { categoria: 'Sistemas Corporativos', sistema: 'SAC GABINETE / SAC', descricao: 'Serviço de Atendimento / Consultoria Legislativa e Orçamentária', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Servidor / Chefia', canal: 'E-mail de solicitação', setor: 'CONLEG / CONORF / CECI', contato: 'conleg@senado.leg.br / conorf@senado.leg.br | Ramal 4324' },
  { categoria: 'Sistemas Corporativos', sistema: 'SISTEMA COTAS (CEAPS)', descricao: 'Gestão da Cota para Exercício da Atividade Parlamentar', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe ou Subchefe de Gabinete', canal: 'E-mail de solicitação', setor: 'SEGCPA - Serviço de Gestão da CEAPS', contato: 'ngcpa@senado.leg.br | Ramal 5865/5892' },
  { categoria: 'Sistemas Corporativos', sistema: 'GEGAB / WEBGAB', descricao: 'Gestão de Gabinete Parlamentar (Contatos, Demandas e Pessoas)', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe e/ou Subchefe de Gabinete', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
  { categoria: 'Sistemas Corporativos', sistema: 'TRAMITA', descricao: 'Tramitação de Documentos Digitais', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe de Gabinete', canal: 'Central de serviços', setor: 'PRODASEN / Apoio a Aplicativos', contato: 'Central de Serviços Intranet' },
  { categoria: 'Sistemas Corporativos', sistema: 'SPALM', descricao: 'Sistema de Administração de Almoxarifado', tipoAcesso: 'Automático ao Chefe de Gabinete', quemSolicita: 'Chefe de Gabinete', canal: 'Central de Serviços', setor: 'SPALMADM', contato: 'spalmadm@senado.leg.br | Ramal 4181/4182' },
  { categoria: 'Sistemas Corporativos', sistema: 'SEDOL', descricao: 'Sistema de Elaboração de Documentos Legislativos', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Cadastrador do Gabinete ou Chefe', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
  { categoria: 'Sistemas Corporativos', sistema: 'LEGIS / NMIL', descricao: 'Base e Acesso a Legislação e Normas', tipoAcesso: 'Automático conforme lotação', quemSolicita: 'Automático (NMIL casos especiais)', canal: 'Central de Serviços', setor: 'NMIL', contato: 'nmil@senado.leg.br' },
  { categoria: 'Sistemas Corporativos', sistema: 'CadastroWeb / Protocolo Legislativo', descricao: 'Sistemas de Apoio e Processos Internos', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe de Gabinete', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
  { categoria: 'Infraestrutura & T.I.', sistema: 'DRIVE U', descricao: 'Armazenamento de arquivos em rede institucional', tipoAcesso: 'Automático conforme lotação', quemSolicita: 'Automático', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
  { categoria: 'Sistemas Corporativos', sistema: 'ERepresenta / Senado Digital', descricao: 'Representação e sistemas digitais do Senado', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe de Gabinete', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
  { categoria: 'Sistemas Corporativos', sistema: 'SINFOVIA', descricao: 'Sistema de informações legislativas', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Servidor', canal: 'Central de serviços', setor: 'PRODASEN', contato: 'Central de Serviços Intranet' },
];

const ICONS: any = {
  'Sistemas Corporativos': Database,
  'Infraestrutura & T.I.': Building2,
  'Telefonia & Outros': Phone,
  'Governança & Delegação': Shield,
  'Atuação & Presença': Users,
};

export function SistemasCorporativos() {
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todos');

  const categorias = useMemo(() => ['Todos',...Array.from(new Set(DADOS.map(d => d.categoria)))], []);

  const filtrados = useMemo(() => {
    return DADOS.filter(d => {
      const matchCat = catFiltro === 'Todos' || d.categoria === catFiltro;
      const matchBusca =!busca ||
        d.sistema.toLowerCase().includes(busca.toLowerCase()) ||
        d.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        d.setor.toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    });
  }, [busca, catFiltro]);

  const exportar = () => {
    const csv = ['Categoria,Sistema,Descrição,Tipo Acesso,Quem Solicita,Canal,Setor,Contato',
     ...filtrados.map(d => `"${d.categoria}","${d.sistema}","${d.descricao}","${d.tipoAcesso}","${d.quemSolicita}","${d.canal}","${d.setor}","${d.contato}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sistemas_corporativos_senado.csv'; a.click();
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-6 text-white">
      <div className="max-w-[1400px] mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold flex items-center gap-2">Sistemas Corporativos <span className="text-[11px] px-2 py-0.5 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37]">SENADO FEDERAL</span></h1>
            <p className="text-[12px] text-zinc-400 mt-1">Levantamento Geral de Sistemas, Requisitos de Acesso e Procedimentos Administrativos de TI - {filtrados.length} sistemas</p>
          </div>
          <button onClick={exportar} className="h-9 px-4 bg-[#0e213f] border border-white/10 rounded-lg text-[12px] flex items-center gap-2 hover:bg-white/10">
            <Download className="w-4 h-4" /> Exportar para CSV
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {categorias.filter(c=>c!=='Todos').map(cat => {
            const Icon = ICONS[cat] || Database;
            const qtd = DADOS.filter(d=>d.categoria===cat).length;
            return (
              <div key={cat} onClick={()=>setCatFiltro(cat)} className={`p-3 rounded-xl border cursor-pointer transition ${catFiltro===cat? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#0a1930] border-white/10 hover:bg-white/[0.05]'}`}>
                <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="text-[11px] font-bold uppercase truncate">{cat}</span></div>
                <div className="text-[20px] font-bold mt-1">{qtd}</div>
              </div>
            );
          })}
        </div>

        {/* BUSCA */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar sistema, descrição, setor..." className="w-full h-10 pl-9 pr-4 bg-[#0a1930] border border-white/10 rounded-lg text-[13px] outline-none focus:border-[#D4AF37]/50" />
          </div>
          <select value={catFiltro} onChange={e=>setCatFiltro(e.target.value)} className="h-10 px-3 bg-[#0a1930] border border-white/10 rounded-lg text-[12px]">
            {categorias.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* TABELA */}
        <div className="bg-[#0a1930] border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10 bg-[#08152a]">
              <div className="col-span-2">Sistema / Serviço</div>
              <div className="col-span-3">Descrição / Finalidade</div>
              <div className="col-span-1">Tipo Acesso</div>
              <div className="col-span-2">Quem Solicita?</div>
              <div className="col-span-2">Setor / Suporte</div>
              <div className="col-span-2">Contato</div>
            </div>
            {filtrados.map((row,i) => (
              <div key={i} className="grid grid-cols-12 px-5 py-3 items-start border-b border-white/[0.05] hover:bg-white/[0.03] text-[12px]">
                <div className="col-span-2 pr-2">
                  <div className="font-bold text-white text-[13px]">{row.sistema}</div>
                  <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-white/10 inline-block text-zinc-400">{row.categoria}</div>
                </div>
                <div className="col-span-3 pr-3 text-zinc-300 leading-snug">{row.descricao}</div>
                <div className="col-span-1"><span className={`text-[10px] px-2 py-1 rounded border ${row.tipoAcesso.includes('Automático')? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>{row.tipoAcesso}</span></div>
                <div className="col-span-2 pr-2 text-zinc-400">{row.quemSolicita}</div>
                <div className="col-span-2 pr-2 text-zinc-300 font-medium">{row.setor}</div>
                <div className="col-span-2 text-[11px] text-cyan-300 break-all">{row.contato}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 mt-3">Fonte: SENADO FEDERAL - SISTEMAS CORPORATIVOS (Planilha de Transição). Total: 48 sistemas catalogados.</p>
      </div>
    </div>
  );
}
