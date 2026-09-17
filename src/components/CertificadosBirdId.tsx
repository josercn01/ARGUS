import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calendar, User, FileKey, Upload, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type CertificadoDB = {
  id: string;
  nome: string;
  area: string | null;
  setor: string | null;
  cpf: string | null;
  numero: string;
  emissao: string | null;
  vencimento: string;
  telefone: string | null;
  dias_restantes?: number;
};

const TOTAL_CONTRATO = 764;

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

export function CertificadosBirdId() {
  const [dados, setDados] = useState<CertificadoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState<'todos'|'vencidos'|'7'|'15'|'30'|'60'>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
     .from('vw_bird_certificados')
     .select('*')
     .order('vencimento', { ascending: true });

    if(!error && data) {
      setDados(data as any);
    }
    setLoading(false);
  };

  useEffect(()=>{
    localStorage.removeItem('bird_certs_v2');
    localStorage.removeItem('bird_certs_v1');
    localStorage.removeItem('argus_bird_stats');
    carregar();
  }, []);

  const apagarTodos = async () => {
    if(!confirm(`Apagar TODOS os ${dados.length} do BANCO SQL?`)) return;
    const { error } = await supabase.from('bird_certificados').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if(!error) {
      setDados([]);
      alert('Banco limpo!');
    } else {
      alert(error.message);
    }
  };

  const importarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l=>l.trim());

    let start = 0;
    for(let i=0;i<Math.min(15, lines.length);i++){
      const low = lines[i].toLowerCase();
      if(low.includes('nome') && (low.includes('cpf') || low.includes('certificado'))) {
        start = i+1;
        break;
      }
    }

    const mapa = new Map<string, any>();

    for(let i=start;i<lines.length;i++){
      let cols = lines[i].split(';');
      if(cols.length < 5) cols = lines[i].split(',');
      cols = cols.map(c=>c.replace(/^"|"$/g,'').trim());
      if(cols.length < 7) continue;

      const [nome, area, setor, cpf, numero, emissao, vencimento,,, telefone] = cols;
      if(!nome || nome.toLowerCase().includes('total') || nome.toLowerCase().includes('resumo') ||!numero) continue;

      const convData = (d:string) => {
        if(!d) return null;
        if(d.includes('/')){
          const parts = d.split('/');
          if(parts.length===3){
            const [dia,mes,ano] = parts;
            return `${ano}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`;
          }
        }
        return d.slice(0,10);
      };

      mapa.set(numero, {
        nome: nome.trim(),
        area: area?.trim() || null,
        setor: setor?.trim() || null,
        cpf: cpf?.trim() || null,
        numero: numero.trim(),
        emissao: convData(emissao),
        vencimento: convData(vencimento),
        telefone: telefone?.trim() || null
      });
    }

    const novos = Array.from(mapa.values()).filter(n => n.vencimento);

    if(novos.length===0){
      alert('Nenhum dado válido encontrado no CSV');
      e.target.value='';
      return;
    }

    try {
      for(let i=0; i<novos.length; i+=100){
        const lote = novos.slice(i, i+100);
        const { error } = await supabase.from('bird_certificados').upsert(lote, { onConflict: 'numero' });
        if(error) throw error;
      }
      alert(`${novos.length} certificados importados! (duplicados removidos)`);
      carregar();
    } catch(err:any) {
      alert('Erro: '+err.message);
    }
    e.target.value='';
  };

  const stats = useMemo(() => {
    return {
      disponiveis: TOTAL_CONTRATO - dados.length,
      emUso: dados.length,
      ativos: dados.filter(d=> (d.dias_restantes??999) > 60).length,
      vencidos: dados.filter(d=> (d.dias_restantes??0) < 0).length,
      aVencer: dados.filter(d=> (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=60).length,
      alert60: dados.filter(d=> (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=60).length,
      alert30: dados.filter(d=> (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=30).length,
      alert15: dados.filter(d=> (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=15).length,
      alert7: dados.filter(d=> (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=7).length,
    };
  }, [dados]);

  const filtrados = useMemo(() => {
    let base = dados.filter(d => {
      const matchBusca =!busca || `${d.nome} ${d.setor} ${d.numero} ${d.cpf}`.toLowerCase().includes(busca.toLowerCase());
      let matchAlerta = true;
      if(filtroAlerta==='vencidos') matchAlerta = (d.dias_restantes??0) < 0;
      if(filtroAlerta==='7') matchAlerta = (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=7;
      if(filtroAlerta==='15') matchAlerta = (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=15;
      if(filtroAlerta==='30') matchAlerta = (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=30;
      if(filtroAlerta==='60') matchAlerta = (d.dias_restantes??0) >=0 && (d.dias_restantes??0) <=60;
      return matchBusca && matchAlerta;
    });

    return base.sort((a,b)=>{
      const da = a.dias_restantes??9999, db = b.dias_restantes??9999;
      const aVencer = da>=0 && da<=60, bVencer = db>=0 && db<=60;
      if(aVencer &&!bVencer) return -1;
      if(!aVencer && bVencer) return 1;
      if(aVencer && bVencer) return da - db;
      if(da>60 && db>60) return da - db;
      if(da>60 && db<0) return -1;
      if(da<0 && db>60) return 1;
      return da - db;
    });
  }, [dados, busca, filtroAlerta]);

  if(loading) return <div className="bg-[#020C1A] min-h-screen p-8 text-white">Carregando do SQL...</div>;

  return (
    <div className="bg-[#020C1A] min-h-screen p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><FileKey className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Certificados Bird ID</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1">BANCO SQL • {dados.length} registros</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={importarPlanilha} className="hidden" />
            <button onClick={()=>fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10"><Upload className="w-4 h-4" /> Importar CSV pro Banco</button>
            <button onClick={apagarTodos} className="h-11 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] flex items-center gap-2 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /> Apagar tudo do Banco</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Disponíveis</div><div className="text-[26px] font-bold">{stats.disponiveis}</div></div>
          <div className="p-4 rounded-2xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Em Uso</div><div className="text-[26px] font-bold">{stats.emUso}</div><div className="text-[11px] text-[#D4AF37] mt-1">{stats.emUso} / {TOTAL_CONTRATO}</div></div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase">Ativos</div><div className="text-[26px] font-bold text-emerald-300">{stats.ativos}</div></div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"><div className="text-[10px] text-amber-400 uppercase">A Vencer</div><div className="text-[26px] font-bold text-amber-300">{stats.aVencer}</div></div>
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><div className="text-[10px] text-red-400 uppercase">Vencidos</div><div className="text-[26px] font-bold text-red-400">{stats.vencidos}</div></div>
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
          <button onClick={()=>{setBusca(''); setFiltroAlerta('todos')}} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px]">Limpar</button>
        </div>

        {dados.length===0 && (
          <div className="p-10 rounded-2xl bg-[#0a1930] border border-dashed border-white/10 text-center text-zinc-500">Nenhum certificado no banco. Clique em Importar CSV pro Banco</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cert => {
            const s = getStatus(cert.dias_restantes??9999);
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
                  <div><div className="text-zinc-500 text-[10px] uppercase">Vencimento</div><div className={`font-bold ${(cert.dias_restantes??0) <0?'text-red-400':'text-white'}`}>{cert.vencimento} • {cert.dias_restantes}d</div></div>
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
