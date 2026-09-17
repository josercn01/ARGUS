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
  if(dias===0) return { label:'VENCE HOJE', color:'bg-red-500/20 border-red-500/50 text-red-300', dot:'bg-red-500' };
  if(dias<=7) return { label:`VENCE EM ${dias} DIAS`, color:'bg-red-500/20 border-red-500/50 text-red-300', dot:'bg-red-500' };
  if(dias<=15) return { label:'VENCE EM 15 DIAS', color:'bg-orange-500/10 border-orange-500/30 text-orange-300', dot:'bg-orange-500' };
  if(dias<=30) return { label:'VENCE EM 30 DIAS', color:'bg-amber-500/10 border-amber-500/30 text-amber-300', dot:'bg-amber-400' };
  if(dias<=60) return { label:'VENCE EM 60 DIAS', color:'bg-yellow-500/10 border-yellow-500/30 text-yellow-300', dot:'bg-yellow-400' };
  return { label:'ATIVO', color:'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot:'bg-emerald-500' };
}

export function CertificadosBirdId() {
  const [dados, setDados] = useState<CertificadoDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('vw_bird_certificados').select('*').order('vencimento', { ascending: true });
    if(data) setDados(data as any);
    setLoading(false);
  };

  useEffect(()=>{
    // LIMPA LIXO ANTIGO DO LOCALSTORAGE
    localStorage.removeItem('bird_certs_v2');
    localStorage.removeItem('bird_certs_v1');
    localStorage.removeItem('argus_bird_stats');
    carregar();
  }, []);

  const apagarTodos = async () => {
    if(!confirm(`Apagar TODOS os ${dados.length} do BANCO SQL?`)) return;
    await supabase.from('bird_certificados').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setDados([]);
    localStorage.removeItem('bird_certs_v2');
  };

  const importarPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l=>l.trim());
    let start = 0;
    for(let i=0;i<Math.min(10, lines.length);i++){
      if(lines[i].toLowerCase().includes('nome') && lines[i].toLowerCase().includes('cpf')) { start = i+1; break; }
    }
    const novos: any[] = [];
    for(let i=start;i<lines.length;i++){
      let cols = lines[i].split(';');
      if(cols.length < 5) cols = lines[i].split(',');
      cols = cols.map(c=>c.replace(/^"|"$/g,'').trim());
      if(cols.length < 7) continue;
      const [nome, area, setor, cpf, numero, emissao, vencimento,,, telefone] = cols;
      if(!nome || nome.toLowerCase().includes('total') ||!numero) continue;
      // Converte DD/MM/AAAA -> YYYY-MM-DD
      const convData = (d:string) => {
        if(!d) return null;
        if(d.includes('/')){ const [dia,mes,ano] = d.split('/'); return `${ano}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`; }
        return d.slice(0,10);
      };
      novos.push({ nome, area, setor, cpf, numero, emissao: convData(emissao), vencimento: convData(vencimento), telefone });
    }
    if(novos.length>0){
      const { error } = await supabase.from('bird_certificados').upsert(novos, { onConflict: 'numero' });
      if(error) alert(error.message); else { alert(`${novos.length} importados!`); carregar(); }
    }
    e.target.value='';
  };

  const filtrados = useMemo(() => dados.filter(d =>!busca || `${d.nome} ${d.setor} ${d.numero}`.toLowerCase().includes(busca.toLowerCase())), [dados, busca]);

  if(loading) return <div className="bg-[#020C1A] min-h-screen p-8 text-white">Carregando do SQL...</div>;

  return (
    <div className="bg-[#020C1A] min-h-screen p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between mb-6">
          <div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-[#D4AF37] flex items-center justify-center text-black"><FileKey/></div><div><h1 className="text-[22px] font-bold">Certificados Bird ID</h1><p className="text-[11px] text-[#D4AF37]">BANCO SQL - {dados.length} registros</p></div></div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={importarPlanilha} className="hidden" />
            <button onClick={()=>fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2"><Upload className="w-4 h-4"/> Importar CSV pro Banco</button>
            <button onClick={apagarTodos} className="h-11 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] flex items-center gap-2"><Trash2 className="w-4 h-4"/> Apagar tudo do Banco</button>
          </div>
        </div>

        {dados.length===0 && <div className="p-10 rounded-2xl bg-[#0a1930] border border-dashed border-white/10 text-center text-zinc-500">Nenhum certificado no banco. Clique em Importar CSV pro Banco</div>}

        <div className="flex gap-3 mb-4"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px]"/></div></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cert => {
            const s = getStatus(cert.dias_restantes??9999);
            return (
              <div key={cert.id} className="bg-[#0a1930] border border-white/[0.07] rounded-2xl p-5">
                <div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]"><User className="w-5 h-5"/></div><div className="flex-1"><h3 className="text-[13px] font-bold">{cert.nome}</h3><span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${s.color}`}>{s.label}</span></div></div>
                <div className="mt-3 text-[11px] grid grid-cols-2 gap-2"><div>Nº {cert.numero}</div><div>Venc: {cert.vencimento} ({cert.dias_restantes}d)</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
