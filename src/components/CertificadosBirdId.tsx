import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ShieldCheck, Clock, XCircle, Calendar, User, FileKey, Download, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';

type Certificado = {
  id: number;
  nome: string;
  area: string;
  setor: string;
  cpf: string;
  numero: string;
  emissao: string;
  vencimento: string;
  telefone: string;
  dias?: number;
};

const STORAGE_KEY = 'bird_certs_v2';
const TOTAL_CONTRATO = 764;

function parseDate(venc: string): Date | null {
  if(!venc) return null;
  const v = new Date(venc.includes('/')? venc.split('/').reverse().join('-') : venc);
  v.setHours(12,0,0,0);
  return isNaN(v.getTime())? null : v;
}
function diasRestantes(venc: string){
  const v = parseDate(venc); if(!v) return 9999;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  v.setHours(0,0,0,0);
  return Math.ceil((v.getTime()-hoje.getTime())/(1000*60*60*24));
}
function formatBR(dateStr: string){
  const d = parseDate(dateStr);
  return d? d.toLocaleDateString('pt-BR') : dateStr;
}
// CORREÇÃO: AGORA MOSTRA DIA EXATO QUANDO FALTA <=7 DIAS
function getStatus(dias: number){
  if(dias<0) return { label:'VENCIDO', color:'bg-red-500/10 border-red-500/30 text-red-400', dot:'bg-red-500' };
  if(dias===0) return { label:'VENCE HOJE', color:'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot:'bg-red-500' };
  if(dias===1) return { label:'VENCE EM 1 DIA', color:'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot:'bg-red-500' };
  if(dias<=7) return { label:`VENCE EM ${dias} DIAS`, color:'bg-red-500/20 border-red-500/50 text-red-300 animate-pulse', dot:'bg-red-500' };
  if(dias<=15) return { label:'VENCE EM 15 DIAS', color:'bg-orange-500/10 border-orange-500/30 text-orange-300', dot:'bg-orange-500' };
  if(dias<=30) return { label:'VENCE EM 30 DIAS', color:'bg-amber-500/10 border-amber-500/30 text-amber-300', dot:'bg-amber-400' };
  if(dias<=60) return { label:'VENCE EM 60 DIAS', color:'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot:'bg-yellow-400' };
  return { label:'ATIVO', color:'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot:'bg-emerald-500' };
}

const DADOS_CSV: Certificado[] = [
  { id: 1, nome: 'AMELIA ROSANA ALVES POVOA DANTAS', area: 'Legislativo', setor: 'GSCMOURA', cpf: '59867132149', numero: '11DE2212124D1EBF', emissao: '2022-12-12', vencimento: '2025-12-12', telefone: '61991473257' },
  { id: 2, nome: 'ALEXANDRE DE LANA SILVA', area: 'Administrativo', setor: 'SEGS', cpf: '76076776668', numero: '11DE2303316A8F1B', emissao: '2023-04-03', vencimento: '2026-04-03', telefone: '61992829084' },
  { id: 3, nome: 'AMANDA RAQUEL ALVES NOGUEIRA', area: 'Administrativo', setor: 'NGAPD', cpf: '12416442767', numero: '11DE24082946CA51', emissao: '2024-08-29', vencimento: '2027-08-29', telefone: '61991644145' },
  { id: 4, nome: 'ALDO ASSUMPCAO ZAGONEL DOS SANTOS', area: 'Administrativo', setor: 'NAPOSF', cpf: '32971761134', numero: '11DE24092054DF3D', emissao: '2024-09-20', vencimento: '2027-09-20', telefone: '61992110496' },
  { id: 5, nome: 'ANA LUCIA COELHO ROMERO NOVELLI', area: 'Administrativo', setor: 'ASCOM', cpf: '58763910934', numero: '11DE2412045ED0D3', emissao: '2024-12-04', vencimento: '2027-12-04', telefone: '61982111406' },
  { id: 6, nome: 'ALEXANDRE FEDRIGO OLIVEIRA', area: 'Legislativo', setor: 'GSJWAG', cpf: '63564769153', numero: '11DE25121667352B', emissao: '2025-12-16', vencimento: '2028-12-16', telefone: '61984346767' },
  { id: 7, nome: 'ALAN RICK MIRANDA', area: 'Parlamentar', setor: 'GSARICK', cpf: '44726570234', numero: '11DE2603115E3F97', emissao: '2026-03-11', vencimento: '2029-03-11', telefone: '' },
];

export function CertificadosBirdId() {
  const [dados, setDados] = useState<Certificado[]>(() => {
    try{
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved){
        const parsed = JSON.parse(saved);
        if(Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((d:any)=> ({...d, dias: diasRestantes(d.vencimento)}));
        }
      }
    }catch{}
    return DADOS_CSV.map(d => ({...d, dias: diasRestantes(d.vencimento)}));
  });

  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos'|'vencidos'|'7'|'15'|'30'|'60'>('todos');
  const [filtroArea, setFiltroArea] = useState('Todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    const comDias = dados.map(d => diasRestantes(d.vencimento));
    localStorage.setItem('argus_bird_stats', JSON.stringify({
      vencidos: comDias.filter(d=>d<0).length,
      aVencer: comDias.filter(d=>d>=0 && d<=30).length,
      ativos: comDias.filter(d=>d>=0).length,
      total: dados.length
    }));
  }, [dados]);

  const apagarTodos = () => {
    if(confirm(`Apagar TODOS os ${dados.length} certificados?`)){
      localStorage.removeItem(STORAGE_KEY);
      setDados([]);
    }
  };

  const importarPlanilha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l=>l.trim());
      let start = 0;
      if(lines[0].toLowerCase().includes('nome')) start = 1;
      const novos: Certificado[] = [];
      for(let i=start; i<lines.length; i++){
        const match = lines[i].match(/(".*?"|[^",\n]+)(?=\s*,|\s*$)/g);
        let cols = match? match.map(c=>c.replace(/^"|"$/g,'').trim()) : lines[i].split(',').map(c=>c.replace(/^"|"$/g,'').trim());
        if(cols.length < 5) cols = lines[i].split(';').map(c=>c.replace(/^"|"$/g,'').trim());
        if(cols.length < 5) continue;
        const [nome, area, setor, cpf, certificado, emissao, vencimento,,, telefone] = cols;
        if(!nome || nome.toLowerCase().includes('total')) continue;
        novos.push({
          id: Date.now()+i,
          nome, area: area||'N/I', setor: setor||'N/I', cpf: cpf||'', numero: certificado||'',
          emissao: emissao?.slice(0,10)||'', vencimento: vencimento?.slice(0,10)||'', telefone: telefone||'',
          dias: diasRestantes(vencimento)
        });
      }
      if(novos.length>0) setDados(novos);
    };
    reader.readAsText(file, 'utf-8'); e.target.value='';
  };

  const stats = useMemo(() => {
    const comDias = dados.map(d => ({...d, dias: d.dias?? diasRestantes(d.vencimento)}));
    return {
      disponiveis: TOTAL_CONTRATO - comDias.length,
      emUso: comDias.length,
      ativos: comDias.filter(d=>d.dias!>=0).length,
      vencidos: comDias.filter(d=>d.dias! < 0).length,
      aVencer: comDias.filter(d=>d.dias!>=0 && d.dias!<=60).length,
      alert60: comDias.filter(d=>d.dias!>=0 && d.dias!<=60).length,
      alert30: comDias.filter(d=>d.dias!>=0 && d.dias!<=30).length,
      alert15: comDias.filter(d=>d.dias!>=0 && d.dias!<=15).length,
      alert7: comDias.filter(d=>d.dias!>=0 && d.dias!<=7).length,
      comDias
    };
  }, [dados]);

  const filtrados = useMemo(() => {
    const base = stats.comDias.filter(d => {
      const matchBusca =!busca || `${d.nome} ${d.setor} ${d.numero} ${d.cpf} ${d.area}`.toLowerCase().includes(busca.toLowerCase());
      const matchArea = filtroArea==='Todos' || d.area===filtroArea;
      let matchAlerta = true;
      if(filtroAlerta==='vencidos') matchAlerta = d.dias! < 0;
      if(filtroAlerta==='7') matchAlerta = d.dias!>=0 && d.dias!<=7;
      if(filtroAlerta==='15') matchAlerta = d.dias!>=0 && d.dias!<=15;
      if(filtroAlerta==='30') matchAlerta = d.dias!>=0 && d.dias!<=30;
      if(filtroAlerta==='60') matchAlerta = d.dias!>=0 && d.dias!<=60;
      return matchBusca && matchArea && matchAlerta;
    });

    // ORDEM: A VENCER (0-60) -> ATIVOS (>60) -> VENCIDOS (<0)
    return base.sort((a,b)=>{
      const da = a.dias!, db = b.dias!;
      const aVencer = da>=0 && da<=60;
      const bVencer = db>=0 && db<=60;
      const aAtivo = da>60;
      const bAtivo = db>60;

      if(aVencer &&!bVencer) return -1;
      if(!aVencer && bVencer) return 1;
      if(aVencer && bVencer) return da - db;
      if(aAtivo && bAtivo) return da - db;
      if(aAtivo && db<0) return -1;
      if(da<0 && bAtivo) return 1;
      if(da<0 && db<0) return db - da;
      return 0;
    });
  }, [stats.comDias, busca, filtroArea, filtroAlerta]);

  return (
    <div className="bg-[#020C1A] min-h-screen p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><FileKey className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Certificados Bird ID</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1 tracking-widest">GESTÃO DE CERTIFICADOS DIGITAIS • CT BIRD ID</p>
              <p className="text-[12px] text-zinc-400 mt-2">Gerencie os {stats.emUso} certificados carregados</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={importarPlanilha} className="hidden" />
            <button onClick={()=>fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10"><Upload className="w-4 h-4" /> Importar Planilha CSV</button>
            <button onClick={apagarTodos} disabled={stats.emUso===0} className="h-11 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] flex items-center gap-2 hover:bg-red-500/20 disabled:opacity-30"><Trash2 className="w-4 h-4" /> Apagar todos</button>
            <button onClick={()=>{
              const csv = ['Nome,Area,Setor,CPF,Certificado,Emissão,Vencimento,Dias Restantes,Status,Telefone',...stats.comDias.map(d=>`"${d.nome}","${d.area}","${d.setor}","${d.cpf}","${d.numero}","${d.emissao}","${d.vencimento}",${d.dias},"${getStatus(d.dias!).label}","${d.telefone}"`)].join('\n');
              const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`bird_id_${new Date().toISOString().split('T')[0]}.csv`; a.click();
            }} className="h-11 px-4 rounded-xl bg-[#0a1930] border border-white/10 text-[12px] flex items-center gap-2"><Download className="w-4 h-4" /> Exportar CSV</button>
          </div>
        </div>

        {stats.emUso===0 && (
          <div className="mb-6 p-8 rounded-2xl bg-[#0a1930] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
            <FileKey className="w-10 h-10 text-zinc-600 mb-3" />
            <div className="text-[14px] font-bold text-zinc-300">Nenhum certificado carregado</div>
            <div className="text-[12px] text-zinc-500 mt-1">Clique em Importar Planilha CSV</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Disponíveis</div><div className="text-[26px] font-bold mt-1">{stats.disponiveis}</div></div>
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Em Uso</div><div className="text-[26px] font-bold mt-1">{stats.emUso}</div><div className="text-[11px] text-[#D4AF37] mt-1">{stats.emUso} / {TOTAL_CONTRATO}</div></div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase">Ativos</div><div className="text-[26px] font-bold text-emerald-300 mt-1">{stats.ativos}</div></div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><div className="text-[10px] text-amber-400 uppercase">A Vencer</div><div className="text-[26px] font-bold text-amber-300 mt-1">{stats.aVencer}</div></div>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><div className="text-[10px] text-red-400 uppercase">Vencidos</div><div className="text-[26px] font-bold text-red-400 mt-1">{stats.vencidos}</div></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[{k:'60',label:'Vencendo em 60 dias',qtd:stats.alert60},{k:'30',label:'Vencendo em 30 dias',qtd:stats.alert30},{k:'15',label:'Vencendo em 15 dias',qtd:stats.alert15},{k:'7',label:'Vencendo em 7 dias',qtd:stats.alert7}].map(a=>(
            <button key={a.k} onClick={()=>setFiltroAlerta(filtroAlerta===a.k?'todos':a.k as any)} className={`p-4 rounded-2xl border text-left ${filtroAlerta===a.k? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-[#08152a] border-white/10'}`}>
              <div className="flex justify-between"><div className="text-[10px] uppercase font-bold opacity-70">{a.label}</div><Calendar className="w-4 h-4 opacity-50" /></div>
              <div className="text-[28px] font-bold mt-1">{a.qtd}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, CPF, setor..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px] outline-none" /></div>
          <select value={filtroArea} onChange={e=>setFiltroArea(e.target.value)} className="h-11 px-4 bg-[#08152a] border border-white/10 rounded-xl text-[12px]"><option>Todos</option><option>Legislativo</option><option>Administrativo</option><option>Parlamentar</option></select>
          <button onClick={()=>{setBusca(''); setFiltroArea('Todos'); setFiltroAlerta('todos')}} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px]">Limpar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cert => {
            const s = getStatus(cert.dias!);
            return (
              <div key={cert.id} className="bg-[#0a1930] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]"><User className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold truncate">{cert.nome}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap"><span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${s.color}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot} inline-block mr-1`} />{s.label}</span><span className="text-[11px] text-zinc-500">{cert.setor} • {cert.area}</span></div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
                  <div><div className="text-zinc-500 text-[10px] uppercase">Nº Certificado</div><div className="font-mono text-cyan-300 truncate">{cert.numero}</div></div>
                  <div><div className="text-zinc-500 text-[10px] uppercase">Vencimento</div><div className={`font-bold ${cert.dias! <0?'text-red-400':'text-white'}`}>{formatBR(cert.vencimento)} • {cert.dias! <0? `${Math.abs(cert.dias!)}d vencido` : `${cert.dias!}d restantes`}</div></div>
                  <div><div className="text-zinc-500 text-[10px] uppercase">CPF</div><div>{cert.cpf}</div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
