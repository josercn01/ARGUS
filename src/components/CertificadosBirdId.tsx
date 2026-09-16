import { useState, useMemo } from 'react';
import { Search, ShieldCheck, AlertTriangle, Clock, XCircle, Plus, Edit2, Trash2, X, Save, Calendar, User, Building2, FileKey, Download } from 'lucide-react';

type Certificado = {
  id: number;
  nome: string;
  area: string;
  setor: string;
  cpf: string;
  numero: string;
  emissao: string;
  vencimento: string;
  status: string;
  telefone: string;
  observacao: string;
};

// DADOS REAIS DA SUA PLANILHA - 260 registros (exemplo com 15, cole o resto via script)
const DADOS_INICIAIS: Certificado[] = [
  { id: 1, nome: 'ALAN RICK MIRANDA', area: 'Parlamentar', setor: 'GSARICK', cpf: '44726570234', numero: '11DE2603115E3F97', emissao: '2026-03-11', vencimento: '2029-03-11', status: 'ATIVO', telefone: '', observacao: '' },
  { id: 2, nome: 'ALDO ASSUMPCAO ZAGONEL DOS SANTOS', area: 'Administrativo', setor: 'NAPOSF', cpf: '32971761134', numero: '11DE24092054DF3D', emissao: '2024-09-20', vencimento: '2027-09-20', status: 'ATIVO', telefone: '61992110496', observacao: '' },
  { id: 3, nome: 'ALEXANDRE DE LANA SILVA', area: 'Administrativo', setor: 'SEGS', cpf: '76076776668', numero: '11DE2303316A8F1B', emissao: '2023-04-03', vencimento: '2026-04-03', status: 'VENCIDO', telefone: '61992829084', observacao: '' },
  { id: 4, nome: 'ALEXANDRE FEDRIGO OLIVEIRA', area: 'Legislativo', setor: 'GSJWAG', cpf: '63564769153', numero: '11DE25121667352B', emissao: '2025-12-16', vencimento: '2028-12-16', status: 'ATIVO', telefone: '61984346767', observacao: '' },
  { id: 5, nome: 'AMANDA RAQUEL ALVES NOGUEIRA', area: 'Administrativo', setor: 'NGAPD', cpf: '12416442767', numero: '11DE24082946CA51', emissao: '2024-08-29', vencimento: '2027-08-29', status: 'ATIVO', telefone: '61991644145', observacao: '' },
  { id: 6, nome: 'AMELIA ROSANA ALVES POVOA DANTAS', area: 'Legislativo', setor: 'GSCMOURA', cpf: '59867132149', numero: '11DE2212124D1EBF', emissao: '2022-12-12', vencimento: '2025-12-12', status: 'VENCIDO', telefone: '61991473257', observacao: 'Gabinete informado, não manifestou interesse em renovar' },
  { id: 7, nome: 'ANA LUCIA COELHO ROMERO NOVELLI', area: 'Administrativo', setor: 'ASCOM', cpf: '58763910934', numero: '11DE2412045ED0D3', emissao: '2024-12-04', vencimento: '2027-12-04', status: 'ATIVO', telefone: '61982111406', observacao: '' },
  //... ADICIONE OS OUTROS 253 DA PLANILHA AQUI
];

function diasRestantes(venc: string): number {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const v = new Date(venc); v.setHours(0,0,0,0);
  return Math.ceil((v.getTime() - hoje.getTime()) / (1000*60*60*24));
}
function getStatus(dias: number) {
  if (dias < 0) return { label: 'VENCIDO', color: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' };
  if (dias <= 7) return { label: 'VENCE EM 7 DIAS', color: 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot: 'bg-red-500' };
  if (dias <= 15) return { label: 'VENCE EM 15 DIAS', color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-500' };
  if (dias <= 30) return { label: 'VENCE EM 30 DIAS', color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' };
  if (dias <= 60) return { label: 'VENCE EM 60 DIAS', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400' };
  return { label: 'ATIVO', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-500' };
}

export function CertificadosBirdId() {
  const [dados, setDados] = useState<Certificado[]>(DADOS_INICIAIS);
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos'|'vencidos'|'7'|'15'|'30'|'60'>('todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [editItem, setEditItem] = useState<Certificado | null>(null);
  const [novoItem, setNovoItem] = useState<Omit<Certificado,'id'> | null>(null);

  const stats = useMemo(() => {
    const hoje = new Date();
    const comDias = dados.map(d => ({...d, dias: diasRestantes(d.vencimento)}));
    return {
      total: 761, emUso: comDias.length, ativos: comDias.filter(d=>d.dias>=0).length,
      vencidos: comDias.filter(d=>d.dias<0).length,
      aVencer: comDias.filter(d=>d.dias>=0 && d.dias<=60).length,
      alert60: comDias.filter(d=>d.dias>=0 && d.dias<=60).length,
      alert30: comDias.filter(d=>d.dias>=0 && d.dias<=30).length,
      alert15: comDias.filter(d=>d.dias>=0 && d.dias<=15).length,
      alert7: comDias.filter(d=>d.dias>=0 && d.dias<=7).length,
      comDias
    };
  }, [dados]);

  const filtrados = useMemo(() => {
    return stats.comDias.filter(d => {
      const matchBusca =!busca || `${d.nome} ${d.setor} ${d.numero} ${d.cpf}`.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus==='Todos' || d.status===filtroStatus;
      let matchAlerta = true;
      if(filtroAlerta==='vencidos') matchAlerta = d.dias<0;
      if(filtroAlerta==='7') matchAlerta = d.dias>=0 && d.dias<=7;
      if(filtroAlerta==='15') matchAlerta = d.dias>=0 && d.dias<=15;
      if(filtroAlerta==='30') matchAlerta = d.dias>=0 && d.dias<=30;
      if(filtroAlerta==='60') matchAlerta = d.dias>=0 && d.dias<=60;
      return matchBusca && matchStatus && matchAlerta;
    }).sort((a,b)=>a.dias-b.dias);
  }, [stats.comDias, busca, filtroStatus, filtroAlerta]);

  const excluir = (id:number)=>{ if(confirm('Excluir certificado?')) setDados(p=>p.filter(d=>d.id!==id)); };
  const salvarEdicao = ()=>{ if(!editItem) return; setDados(p=>p.map(d=>d.id===editItem.id?editItem:d)); setEditItem(null); };
  const salvarNovo = ()=>{
    if(!novoItem?.nome.trim() ||!novoItem?.vencimento) return alert('Nome e vencimento obrigatórios');
    setDados(p=>[...p, {...novoItem, id: Date.now()} as Certificado]); setNovoItem(null);
  };

  const exportar = ()=>{
    const csv = ['Nome,Area,Setor,CPF,Certificado,Emissão,Vencimento,Dias Restantes,Status,Telefone',...filtrados.map(d=>`"${d.nome}","${d.area}","${d.setor}","${d.cpf}","${d.numero}","${d.emissao}","${d.vencimento}",${d.dias},"${getStatus(d.dias).label}","${d.telefone}"`)].join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='certificados_bird_id.csv'; a.click();
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><FileKey className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Certificados Bird ID</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1 tracking-widest">GESTÃO DE CERTIFICADOS DIGITAIS • CT BIRD ID</p>
              <p className="text-[12px] text-zinc-400 mt-2">Controle de validade com alertas automáticos de vencimento em 60, 30, 15 e 7 dias</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportar} className="h-11 px-4 rounded-xl bg-[#0a1930] border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/5"><Download className="w-4 h-4" /> Exportar CSV</button>
            <button onClick={()=>setNovoItem({ nome:'', area:'Parlamentar', setor:'', cpf:'', numero:'', emissao: new Date().toISOString().split('T')[0], vencimento:'', status:'ATIVO', telefone:'', observacao:'' })} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2 hover:bg-[#e8c24a] shadow-[0_0_20px_rgba(212,175,55,0.3)]"><Plus className="w-4 h-4" /> Novo Certificado</button>
          </div>
        </div>

        {/* DASHBOARD CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Disponíveis</div><div className="text-[26px] font-bold mt-1">{stats.total}</div><div className="text-[11px] text-zinc-500 mt-1">Total Bird ID</div></div>
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Em Uso</div><div className="text-[26px] font-bold mt-1">{stats.emUso}</div><div className="text-[11px] text-[#D4AF37] mt-1">{stats.emUso} / {stats.total} utilizados</div></div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Ativos</div><div className="text-[26px] font-bold text-emerald-300 mt-1">{stats.ativos}</div><div className="text-[11px] text-emerald-400/70 mt-1">Dentro da validade</div></div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><div className="text-[10px] text-amber-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> A Vencer</div><div className="text-[26px] font-bold text-amber-300 mt-1">{stats.aVencer}</div><div className="text-[11px] text-amber-400/70 mt-1">Próximos 60 dias</div></div>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><div className="text-[10px] text-red-400 uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Vencidos</div><div className="text-[26px] font-bold text-red-400 mt-1">{stats.vencidos}</div><div className="text-[11px] text-red-400/70 mt-1">Ação necessária</div></div>
        </div>

        {/* ALERTAS 60/30/15/7 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { k:'60', label:'Vencendo em 60 dias', qtd: stats.alert60, color:'yellow', icon: Calendar },
            { k:'30', label:'Vencendo em 30 dias', qtd: stats.alert30, color:'amber', icon: Clock },
            { k:'15', label:'Vencendo em 15 dias', qtd: stats.alert15, color:'orange', icon: AlertTriangle },
            { k:'7', label:'Vencendo em 7 dias', qtd: stats.alert7, color:'red', icon: XCircle },
          ].map(a => {
            const Icon = a.icon;
            const isActive = filtroAlerta===a.k;
            return (
              <button key={a.k} onClick={()=>setFiltroAlerta(filtroAlerta===a.k?'todos':a.k as any)} className={`p-4 rounded-2xl border text-left transition ${isActive? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg' : 'bg-[#08152a] border-white/10 hover:border-white/20'}`}>
                <div className="flex items-center justify-between"><div className={`text-[10px] uppercase font-bold ${isActive?'text-black/70':'text-zinc-500'}`}>{a.label}</div><Icon className={`w-4 h-4 ${isActive?'text-black':'text-zinc-500'}`} /></div>
                <div className="text-[28px] font-bold mt-1">{a.qtd}</div>
                <div className={`text-[11px] mt-1 ${isActive?'text-black/60':'text-zinc-500'}`}>Clique para filtrar</div>
              </button>
            );
          })}
        </div>

        {/* FILTROS */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, CPF, setor, nº certificado..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px] outline-none focus:border-[#D4AF37]/50" /></div>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="h-11 px-4 bg-[#08152a] border border-white/10 rounded-xl text-[12px]"><option>Todos</option><option>ATIVO</option><option>VENCIDO</option><option>ALERTA DE VENCIMENTO</option></select>
          <button onClick={()=>{setFiltroAlerta('todos'); setFiltroStatus('Todos'); setBusca('')}} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px]">Limpar filtros</button>
        </div>

        {/* LISTA PROFISSIONAL - CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cert => {
            const s = getStatus((cert as any).dias);
            const dias = (cert as any).dias;
            return (
              <div key={cert.id} className={`group relative bg-[#0a1930] border rounded-2xl p-5 hover:bg-[#0e2145] transition-all ${dias<0? 'border-red-500/20' : dias<=7? 'border-red-500/30' : dias<=15? 'border-orange-500/20' : 'border-white/[0.07] hover:border-[#D4AF37]/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0"><User className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-bold truncate pr-2">{cert.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-bold ${s.color}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
                        <span className="text-[11px] text-zinc-500">{cert.setor} • {cert.area}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={()=>setEditItem(cert)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#D4AF37] hover:text-black flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>excluir(cert.id)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500 hover:text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
                  <div><div className="text-zinc-500 uppercase text-[10px]">Nº Certificado</div><div className="font-mono text-cyan-300 truncate mt-1">{cert.numero}</div></div>
                  <div><div className="text-zinc-500 uppercase text-[10px]">Vencimento</div><div className={`font-bold mt-1 ${dias<0?'text-red-400':dias<=15?'text-orange-300':'text-white'}`}>{new Date(cert.vencimento).toLocaleDateString('pt-BR')} • {dias<0? `${Math.abs(dias)}d vencido` : `${dias}d restantes`}</div></div>
                  <div><div className="text-zinc-500 uppercase text-[10px]">CPF / Contato</div><div className="mt-1 truncate">{cert.cpf} {cert.telefone? `• ${cert.telefone}`:''}</div></div>
                </div>

                {dias>=0 && dias<=60 && (
                  <div className="mt-4">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${dias<=7?'bg-red-500':dias<=15?'bg-orange-500':dias<=30?'bg-amber-400':'bg-yellow-400'}`} style={{width: `${Math.max(5, 100 - (dias/60)*100)}%`}} />
                    </div>
                  </div>
                )}
                {cert.observacao && <div className="mt-3 text-[11px] text-zinc-400 bg-white/[0.03] border border-white/5 rounded-lg p-2">{cert.observacao}</div>}
              </div>
            );
          })}
        </div>

        {/* MODAIS - EDIÇÃO E NOVO (mesmo padrão anterior) */}
        {editItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setEditItem(null)} />
            <div className="relative w-full max-w-2xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="font-bold">Editar Certificado</h3><button onClick={()=>setEditItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <input value={editItem.nome} onChange={e=>setEditItem({...editItem, nome:e.target.value})} placeholder="Nome" className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.setor} onChange={e=>setEditItem({...editItem, setor:e.target.value})} placeholder="Setor" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.area} onChange={e=>setEditItem({...editItem, area:e.target.value})} placeholder="Área" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input type="date" value={editItem.emissao} onChange={e=>setEditItem({...editItem, emissao:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input type="date" value={editItem.vencimento} onChange={e=>setEditItem({...editItem, vencimento:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] border-amber-500/30" />
                <input value={editItem.numero} onChange={e=>setEditItem({...editItem, numero:e.target.value})} placeholder="Nº Certificado" className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] font-mono" />
                <input value={editItem.cpf} onChange={e=>setEditItem({...editItem, cpf:e.target.value})} placeholder="CPF" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.telefone} onChange={e=>setEditItem({...editItem, telefone:e.target.value})} placeholder="Telefone" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <textarea value={editItem.observacao} onChange={e=>setEditItem({...editItem, observacao:e.target.value})} placeholder="Observação" className="col-span-2 min-h-[60px] p-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={()=>setEditItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarEdicao} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button></div>
            </div>
          </div>
        )}
        {novoItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setNovoItem(null)} />
            <div className="relative w-full max-w-2xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-[#D4AF37]" /> Novo Certificado Bird ID</h3><button onClick={()=>setNovoItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <input value={novoItem.nome} onChange={e=>setNovoItem({...novoItem, nome:e.target.value})} placeholder="Nome completo *" className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={novoItem.setor} onChange={e=>setNovoItem({...novoItem, setor:e.target.value})} placeholder="Setor (GS...)" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <select value={novoItem.area} onChange={e=>setNovoItem({...novoItem, area:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]"><option>Parlamentar</option><option>Administrativo</option><option>Legislativo</option></select>
                <input type="date" value={novoItem.vencimento} onChange={e=>setNovoItem({...novoItem, vencimento:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-amber-500/30 rounded-lg text-[13px]" />
                <input type="date" value={novoItem.emissao} onChange={e=>setNovoItem({...novoItem, emissao:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={novoItem.numero} onChange={e=>setNovoItem({...novoItem, numero:e.target.value})} placeholder="Nº Certificado" className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] font-mono" />
                <input value={novoItem.cpf} onChange={e=>setNovoItem({...novoItem, cpf:e.target.value})} placeholder="CPF" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={novoItem.telefone} onChange={e=>setNovoItem({...novoItem, telefone:e.target.value})} placeholder="Telefone" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={()=>setNovoItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarNovo} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Plus className="w-4 h-4" /> Cadastrar</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
