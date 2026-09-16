import { useState, useMemo } from 'react';
import { Search, ShieldCheck, AlertTriangle, Clock, XCircle, Plus, Edit2, Trash2, X, Save, Calendar, User, FileKey, Download } from 'lucide-react';

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
  dias?: number;
};

function diasRestantes(venc: string): number {
  if(!venc) return 9999;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const v = new Date(venc); v.setHours(0,0,0,0);
  if(isNaN(v.getTime())) return 9999;
  return Math.ceil((v.getTime() - hoje.getTime()) / (1000*60*60*24));
}
function getStatus(dias: number, statusPlanilha: string) {
  const st = statusPlanilha?.toUpperCase() || '';
  if (st === 'VENCIDO' || dias < 0) return { label: 'VENCIDO', color: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' };
  if (st.includes('ALERTA') || (dias >=0 && dias <= 60)) {
    if (dias <= 7) return { label: 'VENCE EM 7 DIAS', color: 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot: 'bg-red-500' };
    if (dias <= 15) return { label: 'VENCE EM 15 DIAS', color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-500' };
    if (dias <= 30) return { label: 'VENCE EM 30 DIAS', color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' };
    if (dias <= 60) return { label: 'VENCE EM 60 DIAS', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400' };
  }
  return { label: 'ATIVO', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-500' };
}

// COLE AQUI OS 260 REGISTROS DA PLANILHA - ESTOU DEIXANDO O TEMPLATE CORRETO
// Para gerar automático, reenvie a planilha e eu gero o arquivo completo
const DADOS_INICIAIS: Certificado[] = [
  // Exemplo - substitua pelos 260 reais
  { id: 1, nome: 'AMELIA ROSANA ALVES POVOA DANTAS', area: 'Legislativo', setor: 'GSCMOURA', cpf: '59867132149', numero: '11DE2212124D1EBF', emissao: '2022-12-12', vencimento: '2025-12-12', status: 'VENCIDO', telefone: '61991473257', observacao: 'Gabinete informado, não manifestou interesse' },
  { id: 2, nome: 'ALEXANDRE DE LANA SILVA', area: 'Administrativo', setor: 'SEGS', cpf: '76076776668', numero: '11DE2303316A8F1B', emissao: '2023-04-03', vencimento: '2026-04-03', status: 'VENCIDO', telefone: '61992829084', observacao: '' },
  //... continue com todos
];

export function CertificadosBirdId() {
  const [dados, setDados] = useState<Certificado[]>(() => DADOS_INICIAIS.map(d => ({...d, dias: diasRestantes(d.vencimento)})));
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos'|'vencidos'|'7'|'15'|'30'|'60'>('todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [editItem, setEditItem] = useState<Certificado | null>(null);
  const [novoItem, setNovoItem] = useState<Omit<Certificado,'id'|'dias'> | null>(null);

  const stats = useMemo(() => {
    const comDias = dados.map(d => ({...d, dias: d.dias?? diasRestantes(d.vencimento)}));
    const vencidos = comDias.filter(d => d.dias! < 0 || d.status.toUpperCase() === 'VENCIDO').length;
    const ativos = comDias.filter(d => d.dias! >= 0 && d.status.toUpperCase()!== 'VENCIDO').length;
    const emUso = comDias.length;
    return {
      disponiveis: 761,
      emUso,
      ativos,
      vencidos,
      aVencer: comDias.filter(d=>d.dias!>=0 && d.dias!<=60).length,
      alert60: comDias.filter(d=>d.dias!>=0 && d.dias!<=60).length,
      alert30: comDias.filter(d=>d.dias!>=0 && d.dias!<=30).length,
      alert15: comDias.filter(d=>d.dias!>=0 && d.dias!<=15).length,
      alert7: comDias.filter(d=>d.dias!>=0 && d.dias!<=7).length,
      comDias
    };
  }, [dados]);

  const filtrados = useMemo(() => {
    return stats.comDias.filter(d => {
      const matchBusca =!busca || `${d.nome} ${d.setor} ${d.numero} ${d.cpf}`.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus==='Todos' || d.status.toUpperCase().includes(filtroStatus.toUpperCase()) || getStatus(d.dias!, d.status).label.includes(filtroStatus.toUpperCase());
      let matchAlerta = true;
      if(filtroAlerta==='vencidos') matchAlerta = d.dias! < 0;
      if(filtroAlerta==='7') matchAlerta = d.dias!>=0 && d.dias!<=7;
      if(filtroAlerta==='15') matchAlerta = d.dias!>=0 && d.dias!<=15;
      if(filtroAlerta==='30') matchAlerta = d.dias!>=0 && d.dias!<=30;
      if(filtroAlerta==='60') matchAlerta = d.dias!>=0 && d.dias!<=60;
      return matchBusca && matchStatus && matchAlerta;
    }).sort((a,b)=>a.dias!-b.dias!);
  }, [stats.comDias, busca, filtroStatus, filtroAlerta]);

  const excluir = (id:number)=>{ if(confirm('Excluir certificado?')) setDados(p=>p.filter(d=>d.id!==id)); };
  const salvarEdicao = ()=>{ if(!editItem) return; setDados(p=>p.map(d=>d.id===editItem.id? {...editItem, dias: diasRestantes(editItem.vencimento)}:d)); setEditItem(null); };
  const salvarNovo = ()=>{
    if(!novoItem?.nome.trim() ||!novoItem?.vencimento) return alert('Nome e vencimento obrigatórios');
    setDados(p=>[...p, {...novoItem, id: Date.now(), dias: diasRestantes(novoItem.vencimento)}]); setNovoItem(null);
  };
  const exportar = ()=>{
    const csv = ['Nome,Area,Setor,CPF,Certificado,Emissão,Vencimento,Dias,Status,Telefone',...filtrados.map(d=>`"${d.nome}","${d.area}","${d.setor}","${d.cpf}","${d.numero}","${d.emissao}","${d.vencimento}",${d.dias},"${getStatus(d.dias!, d.status).label}","${d.telefone}"`)].join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='certificados_bird_id.csv'; a.click();
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><FileKey className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Certificados Bird ID</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1 tracking-widest">GESTÃO DE CERTIFICADOS DIGITAIS • CT BIRD ID</p>
              <p className="text-[12px] text-zinc-400 mt-2">Controle com alertas automáticos em 60, 30, 15 e 7 dias</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportar} className="h-11 px-4 rounded-xl bg-[#0a1930] border border-white/10 text-[12px] flex items-center gap-2"><Download className="w-4 h-4" /> Exportar CSV</button>
            <button onClick={()=>setNovoItem({ nome:'', area:'Parlamentar', setor:'', cpf:'', numero:'', emissao: new Date().toISOString().split('T')[0], vencimento:'', status:'ATIVO', telefone:'', observacao:'' })} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)]"><Plus className="w-4 h-4" /> Novo Certificado</button>
          </div>
        </div>

        {/* DASHBOARD CORRIGIDO */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Disponíveis</div><div className="text-[26px] font-bold mt-1">{stats.disponiveis}</div><div className="text-[11px] text-zinc-500 mt-1">Total Bird ID</div></div>
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Em Uso</div><div className="text-[26px] font-bold mt-1">{stats.emUso}</div><div className="text-[11px] text-[#D4AF37] mt-1">{stats.emUso} / {stats.disponiveis} utilizados</div></div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Ativos</div><div className="text-[26px] font-bold text-emerald-300 mt-1">{stats.ativos}</div><div className="text-[11px] text-emerald-400/70 mt-1">Dentro da validade</div></div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><div className="text-[10px] text-amber-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> A Vencer</div><div className="text-[26px] font-bold text-amber-300 mt-1">{stats.aVencer}</div><div className="text-[11px] text-amber-400/70 mt-1">Próximos 60 dias</div></div>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><div className="text-[10px] text-red-400 uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Vencidos</div><div className="text-[26px] font-bold text-red-400 mt-1">{stats.vencidos}</div><div className="text-[11px] text-red-400/70 mt-1">Ação necessária</div></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { k:'60', label:'Vencendo em 60 dias', qtd: stats.alert60 },
            { k:'30', label:'Vencendo em 30 dias', qtd: stats.alert30 },
            { k:'15', label:'Vencendo em 15 dias', qtd: stats.alert15 },
            { k:'7', label:'Vencendo em 7 dias', qtd: stats.alert7 },
          ].map(a => (
            <button key={a.k} onClick={()=>setFiltroAlerta(filtroAlerta===a.k?'todos':a.k as any)} className={`p-4 rounded-2xl border text-left transition ${filtroAlerta===a.k? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#08152a] border-white/10 hover:border-white/20'}`}>
              <div className="flex justify-between"><div className="text-[10px] uppercase font-bold opacity-70">{a.label}</div><Calendar className="w-4 h-4 opacity-50" /></div>
              <div className="text-[28px] font-bold mt-1">{a.qtd}</div>
              <div className="text-[11px] mt-1 opacity-60">Clique para filtrar</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, CPF, setor, nº certificado..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px] outline-none focus:border-[#D4AF37]/50" /></div>
          <select value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)} className="h-11 px-4 bg-[#08152a] border border-white/10 rounded-xl text-[12px]"><option>Todos</option><option>ATIVO</option><option>VENCIDO</option><option>ALERTA</option></select>
          <button onClick={()=>{setFiltroAlerta('todos'); setFiltroStatus('Todos'); setBusca('')}} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px]">Limpar filtros</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cert => {
            const s = getStatus(cert.dias!, cert.status);
            return (
              <div key={cert.id} className="group relative bg-[#0a1930] border border-white/[0.07] rounded-2xl p-5 hover:border-[#D4AF37]/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0"><User className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-bold truncate">{cert.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-bold ${s.color}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>
                        <span className="text-[11px] text-zinc-500">{cert.setor} • {cert.area}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={()=>setEditItem(cert)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#D4AF37] hover:text-black flex items-center justify-center"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>excluir(cert.id)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
                  <div><div className="text-zinc-500 uppercase text-[10px]">Nº Certificado</div><div className="font-mono text-cyan-300 truncate mt-1">{cert.numero}</div></div>
                  <div><div className="text-zinc-500 uppercase text-[10px]">Vencimento</div><div className={`font-bold mt-1 ${cert.dias! <0?'text-red-400':'text-white'}`}>{cert.vencimento? new Date(cert.vencimento).toLocaleDateString('pt-BR'): '-'} • {cert.dias! <0? `${Math.abs(cert.dias!)}d vencido` : `${cert.dias!}d`}</div></div>
                  <div><div className="text-zinc-500 uppercase text-[10px]">CPF / Contato</div><div className="mt-1 truncate">{cert.cpf} {cert.telefone? `• ${cert.telefone}`:''}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
