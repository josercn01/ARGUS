import { useState, useMemo, useRef } from 'react';
import { Search, ShieldCheck, AlertTriangle, Clock, XCircle, Plus, Edit2, Trash2, X, Save, Calendar, User, FileKey, Download, Upload, FileSpreadsheet } from 'lucide-react';

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
  // aceita dd/mm/yyyy ou yyyy-mm-dd
  let v: Date;
  if(venc.includes('/')){ const [d,m,y]=venc.split('/').map(Number); v = new Date(y,m-1,d); }
  else { v = new Date(venc); }
  v.setHours(0,0,0,0);
  if(isNaN(v.getTime())) return 9999;
  return Math.ceil((v.getTime() - hoje.getTime()) / (1000*60*60*24));
}
function getStatus(dias: number, statusPlanilha: string) {
  const st = statusPlanilha?.toUpperCase() || '';
  if (st === 'VENCIDO' || dias < 0) return { label: 'VENCIDO', color: 'bg-red-500/10 border-red-500/30 text-red-400', dot: 'bg-red-500' };
  if (dias <= 7 && dias >=0) return { label: 'VENCE EM 7 DIAS', color: 'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot: 'bg-red-500' };
  if (dias <= 15 && dias >=0) return { label: 'VENCE EM 15 DIAS', color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-500' };
  if (dias <= 30 && dias >=0) return { label: 'VENCE EM 30 DIAS', color: 'bg-amber-500/10 border-amber-500/30 text-amber-300', dot: 'bg-amber-400' };
  if (dias <= 60 && dias >=0) return { label: 'VENCE EM 60 DIAS', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot: 'bg-yellow-400' };
  return { label: 'ATIVO', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-500' };
}

// DADOS INICIAIS - VAI SER SUBSTITUÍDO AO IMPORTAR PLANILHA
const DADOS_INICIAIS: Certificado[] = [
  { id: 1, nome: 'AMELIA ROSANA ALVES POVOA DANTAS', area: 'Legislativo', setor: 'GSCMOURA', cpf: '59867132149', numero: '11DE2212124D1EBF', emissao: '2022-12-12', vencimento: '2025-12-12', status: 'VENCIDO', telefone: '61991473257', observacao: 'Gabinete informado, não manifestou interesse' },
  { id: 2, nome: 'ALEXANDRE DE LANA SILVA', area: 'Administrativo', setor: 'SEGS', cpf: '76076776668', numero: '11DE2303316A8F1B', emissao: '2023-04-03', vencimento: '2026-04-03', status: 'VENCIDO', telefone: '61992829084', observacao: '' },
  { id: 3, nome: 'AMANDA RAQUEL ALVES NOGUEIRA', area: 'Administrativo', setor: 'NGAPD', cpf: '12416442767', numero: '11DE24082946CA51', emissao: '2024-08-29', vencimento: '2027-08-29', status: 'ATIVO', telefone: '61991644145', observacao: '' },
];

export function CertificadosBirdId() {
  const [dados, setDados] = useState<Certificado[]>(() => DADOS_INICIAIS.map(d => ({...d, dias: diasRestantes(d.vencimento)})));
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos'|'vencidos'|'7'|'15'|'30'|'60'>('todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [editItem, setEditItem] = useState<Certificado | null>(null);
  const [novoItem, setNovoItem] = useState<Omit<Certificado,'id'|'dias'> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importarPlanilha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l=>l.trim());
      // Detecta header
      let start = 0;
      for(let i=0;i<Math.min(10, lines.length);i++){
        if(lines[i].toLowerCase().includes('nome') && (lines[i].toLowerCase().includes('vencimento') || lines[i].toLowerCase().includes('cpf'))){ start = i+1; break; }
      }
      const novos: Certificado[] = [];
      for(let i=start;i<lines.length;i++){
        const cols = lines[i].split(/[,;\t]/).map(c=>c.replace(/^"|"$/g,'').trim());
        if(cols.length < 5) continue;
        // Tenta mapear: NOME, ÁREA, SETOR, CPF, Nº CERTIFICADO, EMISSÃO, VENCIMENTO, STATUS, TELEFONE, OBS
        // CSV do seu modelo: NOME,ÁREA,SETOR,CPF,Nº CERTIFICADO,EMISSÃO,VENCIMENTO,STATUS,TELEFONE,OBSERVAÇÃO
        // CSV exportado do site: Nome,Area,Setor,CPF,Certificado,Emissão,Vencimento,Dias Restantes,Status,Telefone
        let nome = cols[0]||'', area = cols[1]||'', setor = cols[2]||'', cpf = cols[3]||'', numero = cols[4]||'', emissao = cols[5]||'', vencimento = cols[6]||'', status = cols[7]||'ATIVO', telefone = cols[8]||'', obs = cols[9]||'';
        // Se export do site, ajusta índices
        if(cols.length>=10 &&!isNaN(Number(cols[7]))){ // Dias Restantes no lugar do status
          status = cols[8]||'ATIVO'; telefone = cols[9]||'';
        }
        if(!nome) continue;
        if(nome.toLowerCase().includes('total de certificados')) continue;
        novos.push({ id: Date.now()+i, nome, area, setor, cpf, numero, emissao: emissao.slice(0,10), vencimento: vencimento.slice(0,10), status: status.toUpperCase(), telefone, observacao: obs, dias: diasRestantes(vencimento) });
      }
      if(novos.length>0){
        setDados(novos);
        alert(`Importados ${novos.length} certificados com sucesso!`);
      } else {
        alert('Não consegui ler a planilha. Exporte como CSV (vírgula) com colunas: NOME, ÁREA, SETOR, CPF, Nº CERTIFICADO, EMISSÃO, VENCIMENTO, STATUS, TELEFONE');
      }
    };
    if(file.name.endsWith('.csv')) reader.readAsText(file, 'utf-8');
    else {
      // Para XLSX, pede CSV
      alert('Para XLSX, por favor exporte como CSV no Excel: Arquivo > Salvar como > CSV UTF-8. Depois importe o CSV aqui.');
    }
    e.target.value = '';
  };

  const stats = useMemo(() => {
    const comDias = dados.map(d => ({...d, dias: d.dias?? diasRestantes(d.vencimento)}));
    const vencidos = comDias.filter(d => d.dias! < 0).length;
    const ativos = comDias.filter(d => d.dias! >= 0).length;
    return {
      disponiveis: 761,
      emUso: comDias.length,
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
      const matchStatus = filtroStatus==='Todos' || d.status.toUpperCase().includes(filtroStatus.toUpperCase());
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
    const csv = ['NOME,ÁREA,SETOR,CPF,Nº CERTIFICADO,EMISSÃO,VENCIMENTO,STATUS,TELEFONE,OBSERVAÇÃO',...filtrados.map(d=>`"${d.nome}","${d.area}","${d.setor}","${d.cpf}","${d.numero}","${d.emissao}","${d.vencimento}","${d.status}","${d.telefone}","${d.observacao.replace(/"/g,'')}"`)].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`certificados_bird_id_${new Date().toISOString().split('T')[0]}.csv`; a.click();
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
              <p className="text-[12px] text-zinc-400 mt-2">Importe sua planilha ou gerencie os {stats.emUso} certificados carregados</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={importarPlanilha} className="hidden" />
            <button onClick={()=>fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10"><Upload className="w-4 h-4" /> Importar Planilha CSV</button>
            <button onClick={exportar} className="h-11 px-4 rounded-xl bg-[#0a1930] border border-white/10 text-[12px] flex items-center gap-2"><Download className="w-4 h-4" /> Exportar CSV</button>
            <button onClick={()=>setNovoItem({ nome:'', area:'Parlamentar', setor:'', cpf:'', numero:'', emissao: new Date().toISOString().split('T')[0], vencimento:'', status:'ATIVO', telefone:'', observacao:'' })} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
          </div>
        </div>

        {stats.emUso < 20 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <div className="flex-1">
              <div className="text-[13px] font-bold text-amber-300">Dados incompletos - importe sua planilha completa</div>
              <div className="text-[11px] text-amber-200/70">Você tem apenas {stats.emUso} certificados carregados. O total correto é 260 (200 ativos + 57 vencidos + 3 a vencer). Clique em Importar Planilha CSV e selecione o arquivo exportado do Excel.</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Disponíveis</div><div className="text-[26px] font-bold mt-1">761</div><div className="text-[11px] text-zinc-500 mt-1">Total Bird ID</div></div>
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Em Uso</div><div className="text-[26px] font-bold mt-1">{stats.emUso}</div><div className="text-[11px] text-[#D4AF37] mt-1">{stats.emUso} / 761 utilizados</div></div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Ativos</div><div className="text-[26px] font-bold text-emerald-300 mt-1">{stats.ativos}</div><div className="text-[11px] text-emerald-400/70 mt-1">Dentro da validade</div></div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><div className="text-[10px] text-amber-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> A Vencer</div><div className="text-[26px] font-bold text-amber-300 mt-1">{stats.aVencer}</div><div className="text-[11px] text-amber-400/70 mt-1">Próximos 60 dias</div></div>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><div className="text-[10px] text-red-400 uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Vencidos</div><div className="text-[26px] font-bold text-red-400 mt-1">{stats.vencidos}</div><div className="text-[11px] text-red-400/70 mt-1">Ação necessária</div></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[{k:'60',label:'Vencendo em 60 dias',qtd:stats.alert60},{k:'30',label:'Vencendo em 30 dias',qtd:stats.alert30},{k:'15',label:'Vencendo em 15 dias',qtd:stats.alert15},{k:'7',label:'Vencendo em 7 dias',qtd:stats.alert7}].map(a=>(
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                  <div><div className="text-zinc-500 uppercase text-[10px]">Vencimento</div><div className={`font-bold mt-1 ${cert.dias! <0?'text-red-400':'text-white'}`}>{cert.vencimento? new Date(cert.vencimento).toLocaleDateString('pt-BR'): '-'} • {cert.dias! <0? `${Math.abs(cert.dias!)}d vencido` : `${cert.dias!}d restantes`}</div></div>
                  <div><div className="text-zinc-500 uppercase text-[10px]">CPF / Contato</div><div className="mt-1 truncate">{cert.cpf}</div></div>
                </div>
                {cert.dias! >=0 && cert.dias! <=60 && (
                  <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className={`h-full ${cert.dias!<=7?'bg-red-500':cert.dias!<=15?'bg-orange-500':cert.dias!<=30?'bg-amber-400':'bg-yellow-400'}`} style={{width: `${Math.max(5, 100 - (cert.dias!/60)*100)}%`}} /></div>
                )}
                {cert.observacao && <div className="mt-3 text-[11px] text-zinc-400 bg-white/[0.03] border border-white/5 rounded-lg p-2">{cert.observacao}</div>}
              </div>
            );
          })}
        </div>

        {filtrados.length===0 && <div className="text-center py-12 text-zinc-500">Nenhum certificado encontrado. Importe sua planilha completa.</div>}

        {/* MODAIS - mantidos iguais */}
        {editItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setEditItem(null)} />
            <div className="relative w-full max-w-2xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="font-bold">Editar Certificado</h3><button onClick={()=>setEditItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <input value={editItem.nome} onChange={e=>setEditItem({...editItem, nome:e.target.value})} className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.setor} onChange={e=>setEditItem({...editItem, setor:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.area} onChange={e=>setEditItem({...editItem, area:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input type="date" value={editItem.emissao} onChange={e=>setEditItem({...editItem, emissao:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input type="date" value={editItem.vencimento} onChange={e=>setEditItem({...editItem, vencimento:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-amber-500/30 rounded-lg text-[13px]" />
                <input value={editItem.numero} onChange={e=>setEditItem({...editItem, numero:e.target.value})} className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px] font-mono" />
                <input value={editItem.cpf} onChange={e=>setEditItem({...editItem, cpf:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.telefone} onChange={e=>setEditItem({...editItem, telefone:e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <textarea value={editItem.observacao} onChange={e=>setEditItem({...editItem, observacao:e.target.value})} className="col-span-2 min-h-[60px] p-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={()=>setEditItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarEdicao} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button></div>
            </div>
          </div>
        )}
        {novoItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setNovoItem(null)} />
            <div className="relative w-full max-w-2xl bg-[#0a1930] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between mb-5"><h3 className="font-bold">Novo Certificado</h3><button onClick={()=>setNovoItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid grid-cols-2 gap-3">
                <input value={novoItem.nome} onChange={e=>setNovoItem({...novoItem, nome:e.target.value})} placeholder="Nome completo *" className="col-span-2 h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={novoItem.setor} onChange={e=>setNovoItem({...novoItem, setor:e.target.value})} placeholder="Setor" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
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
