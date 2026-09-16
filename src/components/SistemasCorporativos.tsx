import { useState, useMemo } from 'react';
import { Search, Database, Building2, Edit2, Trash2, X, Save, Mail, Plus, Layers } from 'lucide-react';

type Sistema = {
  id: number;
  categoria: string;
  sistema: string;
  descricao: string;
  tipoAcesso: string;
  quemSolicita: string;
  canal: string;
  setor: string;
  contato: string;
};

const DADOS_INICIAIS: Sistema[] = [
  { id: 1, categoria: 'Sistemas Corporativos', sistema: 'SIGAD', descricao: 'Sistema Integrado de Gestão de Documentos e Processos', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Servidor / Chefia', canal: 'E-mail', setor: 'SIGAD Suporte', contato: 'sigadsuporte@senado.leg.br | 1563/4862' },
  { id: 2, categoria: 'Sistemas Corporativos', sistema: 'SAC GABINETE / SAC', descricao: 'Serviço de Atendimento / Consultoria Legislativa e Orçamentária', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Servidor / Chefia', canal: 'E-mail', setor: 'CONLEG / CONORF / CECI', contato: 'conleg@senado.leg.br | 4324' },
  { id: 3, categoria: 'Sistemas Corporativos', sistema: 'SISTEMA COTAS (CEAPS)', descricao: 'Gestão da Cota para Exercício da Atividade Parlamentar', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe ou Subchefe', canal: 'E-mail', setor: 'SEGCPA', contato: 'ngcpa@senado.leg.br | 5865/5892' },
  { id: 4, categoria: 'Sistemas Corporativos', sistema: 'GEGAB / WEBGAB', descricao: 'Gestão de Gabinete Parlamentar', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe e/ou Subchefe', canal: 'Central', setor: 'PRODASEN', contato: 'Central Intranet' },
  { id: 5, categoria: 'Sistemas Corporativos', sistema: 'TRAMITA', descricao: 'Tramitação de Documentos Digitais', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Chefe de Gabinete', canal: 'Central', setor: 'PRODASEN', contato: 'Central Intranet' },
  { id: 6, categoria: 'Sistemas Corporativos', sistema: 'SPALM', descricao: 'Sistema de Administração de Almoxarifado', tipoAcesso: 'Automático ao Chefe', quemSolicita: 'Chefe de Gabinete', canal: 'Central', setor: 'SPALMADM', contato: 'spalmadm@senado.leg.br | 4181' },
  { id: 7, categoria: 'Sistemas Corporativos', sistema: 'SEDOL', descricao: 'Sistema de Elaboração de Documentos Legislativos', tipoAcesso: 'Solicitação Explicita', quemSolicita: 'Cadastrador', canal: 'Central', setor: 'PRODASEN', contato: 'Central Intranet' },
  { id: 8, categoria: 'Sistemas Corporativos', sistema: 'LEGIS / NMIL', descricao: 'Base e Acesso a Legislação e Normas', tipoAcesso: 'Automático conforme lotação', quemSolicita: 'Automático', canal: 'Central', setor: 'NMIL', contato: 'nmil@senado.leg.br' },
  { id: 9, categoria: 'Infraestrutura & T.I.', sistema: 'DRIVE U', descricao: 'Armazenamento de arquivos em rede institucional', tipoAcesso: 'Automático conforme lotação', quemSolicita: 'Automático', canal: 'Central', setor: 'PRODASEN', contato: 'Central Intranet' },
];

const VAZIO: Omit<Sistema,'id'> = { categoria: 'Sistemas Corporativos', sistema: '', descricao: '', tipoAcesso: 'Solicitação Explicita', quemSolicita: '', canal: 'Central de serviços', setor: '', contato: '' };

export function SistemasCorporativos() {
  const [dados, setDados] = useState<Sistema[]>(DADOS_INICIAIS);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todos');
  const [editItem, setEditItem] = useState<Sistema | null>(null);
  const [novoItem, setNovoItem] = useState<Omit<Sistema,'id'> | null>(null);

  const categorias = useMemo(() => ['Todos',...Array.from(new Set(dados.map(d => d.categoria)))], [dados]);

  const filtrados = useMemo(() => dados.filter(d => {
    const matchCat = catFiltro === 'Todos' || d.categoria === catFiltro;
    const matchBusca =!busca || `${d.sistema} ${d.descricao} ${d.setor}`.toLowerCase().includes(busca.toLowerCase());
    return matchCat && matchBusca;
  }), [busca, catFiltro, dados]);

  const excluir = (id: number) => { if(confirm('Excluir este sistema?')) setDados(p => p.filter(d => d.id!== id)); };
  const salvarEdicao = () => { if(!editItem) return; setDados(p => p.map(d => d.id === editItem.id? editItem : d)); setEditItem(null); };
  const salvarNovo = () => {
    if(!novoItem ||!novoItem.sistema.trim()) return alert('Informe o nome do sistema');
    setDados(p => [...p, {...novoItem, id: Date.now() }]);
    setNovoItem(null);
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9a7e25] flex items-center justify-center text-black font-bold"><Layers className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Sistemas Corporativos</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono tracking-widest mt-1">SENADO FEDERAL • {filtrados.length} SISTEMAS</p>
              <p className="text-[13px] text-zinc-400 mt-2">Catálogo centralizado de sistemas e procedimentos de TI.</p>
            </div>
          </div>
          <button onClick={() => setNovoItem({...VAZIO})} className="h-11 px-6 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2 hover:bg-[#e8c24a] transition shadow-[0_0_20px_rgba(212,175,55,0.3)]">
            <Plus className="w-4 h-4" /> Cadastrar Novo Sistema
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar sistema, descrição ou setor..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px] outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categorias.map(cat => (
              <button key={cat} onClick={() => setCatFiltro(cat)} className={`h-11 px-4 rounded-xl text-[12px] font-semibold border transition ${catFiltro === cat? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#08152a] border-white/10 text-zinc-400 hover:text-white'}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(item => (
            <div key={item.id} className="group relative bg-[#0a1930] border border-white/[0.07] rounded-2xl p-5 hover:border-[#D4AF37]/30 hover:bg-[#0e2145] transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0">{item.categoria.includes('Infra')? <Building2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}</div>
                  <div>
                    <h3 className="text-[13px] font-bold leading-tight group-hover:text-[#D4AF37] transition">{item.sistema}</h3>
                    <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-zinc-400">{item.categoria}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditItem(item)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#D4AF37] hover:text-black flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => excluir(item.id)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500 hover:text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-[12px] text-zinc-300 leading-relaxed min-h-[36px]">{item.descricao}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium ${item.tipoAcesso.includes('Automático')? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>{item.tipoAcesso}</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400">{item.quemSolicita}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between">
                <div><div className="text-[10px] text-zinc-500 uppercase">Setor</div><div className="text-[11px] font-semibold mt-0.5">{item.setor}</div></div>
                <div className="text-right max-w-[50%]"><div className="text-[10px] text-zinc-500 uppercase flex items-center justify-end gap-1"><Mail className="w-3 h-3" /> Contato</div><div className="text-[11px] text-cyan-300 truncate mt-0.5">{item.contato}</div></div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL EDITAR */}
        {editItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditItem(null)} />
            <div className="relative w-full max-w-xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="text-[14px] font-bold">Editar Sistema</h3><button onClick={() => setEditItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="space-y-3">
                <input value={editItem.sistema} onChange={e => setEditItem({...editItem, sistema: e.target.value})} placeholder="Nome do sistema" className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <textarea value={editItem.descricao} onChange={e => setEditItem({...editItem, descricao: e.target.value})} placeholder="Descrição" className="w-full min-h-[60px] p-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={editItem.categoria} onChange={e => setEditItem({...editItem, categoria: e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                  <input value={editItem.tipoAcesso} onChange={e => setEditItem({...editItem, tipoAcesso: e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={editItem.quemSolicita} onChange={e => setEditItem({...editItem, quemSolicita: e.target.value})} placeholder="Quem solicita" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                  <input value={editItem.setor} onChange={e => setEditItem({...editItem, setor: e.target.value})} placeholder="Setor" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                </div>
                <input value={editItem.contato} onChange={e => setEditItem({...editItem, contato: e.target.value})} placeholder="Contato" className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={() => setEditItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarEdicao} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button></div>
            </div>
          </div>
        )}

        {/* MODAL NOVO */}
        {novoItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNovoItem(null)} />
            <div className="relative w-full max-w-xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="text-[14px] font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-[#D4AF37]" /> Cadastrar Novo Sistema</h3><button onClick={() => setNovoItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="space-y-3">
                <input value={novoItem.sistema} onChange={e => setNovoItem({...novoItem, sistema: e.target.value})} placeholder="Nome do sistema *" className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] focus:border-[#D4AF37]/50 outline-none" />
                <textarea value={novoItem.descricao} onChange={e => setNovoItem({...novoItem, descricao: e.target.value})} placeholder="Descrição / Finalidade" className="w-full min-h-[60px] p-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] focus:border-[#D4AF37]/50 outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={novoItem.categoria} onChange={e => setNovoItem({...novoItem, categoria: e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]"><option>Sistemas Corporativos</option><option>Infraestrutura & T.I.</option><option>Telefonia & Outros</option><option>Governança & Delegação</option><option>Atuação & Presença</option></select>
                  <select value={novoItem.tipoAcesso} onChange={e => setNovoItem({...novoItem, tipoAcesso: e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]"><option>Solicitação Explicita</option><option>Automático conforme lotação</option><option>Automático ao Chefe de Gabinete</option></select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input value={novoItem.quemSolicita} onChange={e => setNovoItem({...novoItem, quemSolicita: e.target.value})} placeholder="Quem deve solicitar?" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                  <input value={novoItem.setor} onChange={e => setNovoItem({...novoItem, setor: e.target.value})} placeholder="Setor Responsável" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                </div>
                <input value={novoItem.contato} onChange={e => setNovoItem({...novoItem, contato: e.target.value})} placeholder="Contato / E-mail / Ramal" className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={() => setNovoItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarNovo} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Plus className="w-4 h-4" /> Cadastrar Sistema</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
