import { useMemo, useState, useRef } from 'react';
import { Pencil, Trash2, Upload, Download, X, Trash, Layers, Users, PackageCheck, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  const [showImport, setShowImport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'parsing'|'importing'|'success'|'error'|'deleting'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [adicionados, setAdicionados] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const contratados = (softwares || []).filter((s:any)=> Number(s.qtd_contratada) > 0);
    const totalGeral = contratados.reduce((a:any,b:any)=> a + (Number(b.qtd_contratada)||0), 0);

    const poolId = (softwares || []).find((s:any)=> s.nome.toLowerCase().includes('pool single'))?.id;
    const nomesPool = ['photoshop','indesign','premiere','illustrator','lightroom','audition',' xd','adobe xd'];
    const idsPoolAvulso = new Set(
      (softwares || [])
       .filter((s:any)=>!Number(s.qtd_contratada) && nomesPool.some(n=> s.nome.toLowerCase().includes(n)))
       .map((s:any)=> s.id)
    );

    const usoPorSoftware = new Map<string, number>();
    (data || []).forEach((u:any)=>{
      (u.softwares || []).forEach((s:any)=>{
        if(!s?.id) return;
        usoPorSoftware.set(s.id, (usoPorSoftware.get(s.id)||0) + 1);
      });
    });

    const poolVirtual = Array.from(usoPorSoftware.entries())
     .filter(([id])=> idsPoolAvulso.has(id))
     .reduce((acc,[,c])=> acc + c, 0);

    const detalhe = contratados.map((b:any)=>{
      let usado = usoPorSoftware.get(b.id) || 0;
      if(b.id === poolId) usado = poolVirtual;
      const total = Number(b.qtd_contratada)||0;
      const livre = total - usado;
      const perc = total? (usado/total)*100 : 0;
      return {...b, usado, livre, perc };
    }).sort((a:any,b:any)=> b.perc - a.perc);

    const emUso = detalhe.reduce((a:any,c:any)=> a + c.usado, 0);
    const livres = totalGeral - emUso;
    const taxa = totalGeral? Math.round((emUso/totalGeral)*100) : 0;

    return { totalGeral, emUso, livres, taxa, detalhe, usoPorSoftware, poolVirtual };
  }, [data, softwares]);

  async function handleDelete(id: string){
    if(!confirm('Excluir este software?')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh?.();
  }

  async function handleDeleteAll(){
    if(!confirm(`Apagar TODOS os ${data.length} usuários?`)) return;
    if(prompt('Digite EXCLUIR')!== 'EXCLUIR') return;
    setShowImport(true); setStatus('deleting'); setProgress(10); setLogs([`Apagando ${data.length}...`]);
    await supabase.from('usuario_softwares').delete().neq('usuario_id','00000000-0000-0000-0000-000000000000');
    await supabase.from('usuarios').delete().neq('id','00000000-0000-0000-0000-000000000000');
    setProgress(100); setStatus('success'); onRefresh?.(); setTimeout(()=>setShowImport(false),800);
  }

  function handleDownloadModelo(){
    const modelo = `Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto\nusuario@senado.leg.br;Nome Completo;SECOM;Analista;Acrobat Pro DC;Acrobat Pro DC\n`;
    const blob = new Blob([modelo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='modelo_import.csv'; a.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; 
    if(!file) return;

    setShowImport(true); 
    setStatus('parsing'); 
    setProgress(5); 
    setLogs([`Lendo arquivo: ${file.name}`]);

    try {
      const text = await file.text(); 
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      
      if (lines.length <= 1) {
        throw new Error('O arquivo CSV está vazio ou contém apenas o cabeçalho.');
      }

      const totalRegistrosArquivo = lines.length - 1;
      const header = lines[0].split(';').map(h=>h.trim());
      
      const idxEmail = header.indexOf('Email');
      const idxNome = header.indexOf('NomeCompleto');
      const idxDepto = header.indexOf('Departamento');
      const idxCargo = header.indexOf('Cargo');
      const idxProd = header.indexOf('Produto');
      const idxTipo = header.indexOf('Tipo de produto');

      if (idxEmail === -1 || idxNome === -1) {
        throw new Error('Cabeçalho inválido. As colunas "Email" e "NomeCompleto" são obrigatórias.');
      }

      const emailsExistentes = new Set((data||[]).map((u:any)=>(u.email||'').toLowerCase().trim()));
      const novosMap = new Map<string, any>();

      for(let i=1; i<lines.length; i++){
        const cols = lines[i].split(';').map(c => c?.trim() || ''); 
        const emailRaw = cols[idxEmail];
        const emailLow = emailRaw?.toLowerCase(); 
        
        if(!emailLow || !emailLow.includes('@')) continue;
        if(emailsExistentes.has(emailLow) || novosMap.has(emailLow)) continue;

        novosMap.set(emailLow, { 
          email_original: emailRaw, 
          nome: cols[idxNome] || 'Desconhecido', 
          depto: idxDepto !== -1 ? cols[idxDepto] : '', 
          cargo: idxCargo !== -1 ? cols[idxCargo] : '', 
          produto: idxProd !== -1 ? cols[idxProd] : '', 
          tipo: idxTipo !== -1 ? cols[idxTipo] : '' 
        });
      }

      const listaNovos = Array.from(novosMap.values());
      setProgress(25); 
      setLogs(prev=>[
        ...prev, 
        `Total no arquivo: ${totalRegistrosArquivo} registros.`,
        `Novos identificados para importar: ${listaNovos.length} registros.`
      ]);

      if(listaNovos.length === 0){ 
        setProgress(100); 
        setStatus('success'); 
        setLogs(prev=>[...prev, 'Nenhum registro novo encontrado (todos já cadastrados).']);
        return; 
      }

      setStatus('importing');
      setLogs(prev=>[...prev, 'Buscando catálogo de softwares...']);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      const resSoft = await fetch(`${supabaseUrl}/rest/v1/softwares?select=id,nome`, { headers });
      if (!resSoft.ok) throw new Error('Falha ao buscar softwares no banco.');
      const todosSofts = await resSoft.json();

      const softMap = new Map<string, string>(); 
      (todosSofts||[]).forEach((s:any)=> softMap.set(s.nome.toLowerCase(), s.id));
      
      const findSoftId = (t:string)=>{ 
        if(!t) return null;
        const tl=t.toLowerCase(); 
        for(const [n,id] of softMap.entries()) {
          if(tl.includes(n) || n.includes(tl)) return id;
        } 
        return null; 
      };

      const payload = listaNovos.map(r=>({ 
        email: r.email_original, 
        login: r.email_original.split('@')[0].toLowerCase(), 
        colaborador: r.nome, 
        nome: r.nome, 
        nome_completo: r.nome, 
        departamento: r.depto, 
        setor: r.depto, 
        cargo: r.cargo, 
        produto: r.produto, 
        tipo_produto: r.tipo, 
        status: 'ativo' 
      }));

      let insertedIds: any[] = [];
      setLogs(prev=>[...prev, `Inserindo usuários em lotes (tratando conflitos por login)...`]);

      for(let i=0; i<payload.length; i+=100){
        const lote = payload.slice(i, i+100);
        const resUser = await fetch(`${supabaseUrl}/rest/v1/usuarios?on_conflict=login`, {
          method: 'POST',
          headers: { 
            ...headers, 
            'Prefer': 'resolution=merge-duplicates,return=representation' 
          },
          body: JSON.stringify(lote)
        });
        
        if(!resUser.ok) {
          const errTxt = await resUser.text();
          throw new Error(`Erro ao inserir usuários: ${errTxt}`);
        }
        const inserted = await resUser.json();
        if(inserted) insertedIds.push(...inserted);
        setProgress(30 + Math.round(((i + lote.length) / payload.length) * 40));
      }

      const emailToId = new Map(insertedIds.map((u:any)=>[u.email.toLowerCase(), u.id]));
      
      if(emailToId.size < listaNovos.length){
        const resBusca = await fetch(`${supabaseUrl}/rest/v1/usuarios?select=id,email`, { headers });
        if(resBusca.ok) {
          const buscados = await resBusca.json();
          buscados?.forEach((u:any)=> emailToId.set(u.email.toLowerCase(), u.id));
        }
      }

      const vinculos: any[] = [];
      listaNovos.forEach(r=>{
        const uid = emailToId.get(r.email_original.toLowerCase()); 
        if(!uid) return;
        r.tipo.split('|').map((t:string)=>t.trim()).filter(Boolean).forEach((t:string)=>{ 
          const sid = findSoftId(t); 
          if(sid) vinculos.push({ usuario_id: uid, software_id: sid }); 
        });
      });

      setLogs(prev=>[...prev, `Vinculando ${vinculos.length} licenças...`]);
      
      for(let i=0; i<vinculos.length; i+=200){
        const loteVinculos = vinculos.slice(i, i+200);
        await fetch(`${supabaseUrl}/rest/v1/usuario_softwares`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify(loteVinculos)
        });
      }

      setAdicionados(listaNovos); 
      setProgress(100); 
      setStatus('success'); 
      setLogs(prev=>[...prev, `✓ Importação concluída com sucesso! ${listaNovos.length} processados.`]); 
      onRefresh?.();

    } catch(err:any){ 
      console.error('Erro crítico na importação:', err);
      setStatus('error'); 
      setLogs(prev=>[...prev, `ERRO: ${err.message || 'Falha desconhecida'}`]); 
    } finally {
      if(fileRef.current) fileRef.current.value = '';
    }
  }

  const getBarGradient = (perc: number) => {
    if(perc >= 100) return 'from-red-500 to-orange-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    if(perc >= 90) return 'from-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
    if(perc >= 70) return 'from-cyan-400 to-blue-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
    return 'from-emerald-400 to-teal-300 shadow-[0_0_6px_rgba(52,211,153,0.5)]';
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#F5D76E] text-black text-xs font-bold px-4 py-2 rounded-lg shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:brightness-110"><Upload className="w-4 h-4"/> Importar</button>
          <button onClick={handleDownloadModelo} className="flex items-center gap-2 bg-[#0a1930] border border-cyan-500/30 text-cyan-300 text-xs font-bold px-4 py-2 rounded-lg hover:border-cyan-400/60 hover:shadow-[0_0_10px_rgba(0,229,255,0.3)]"><Download className="w-4 h-4"/> Modelo</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange}/>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-[#7a9bb8] font-mono tracking-wide">{data.length} usuários • {stats.emUso} licenças em uso • Pool {stats.poolVirtual}/225</p>
          <button onClick={handleDeleteAll} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-500/20"><Trash className="w-4 h-4"/> Apagar todos</button>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-cyan-500/20 rounded-xl w-full max-w-[550px] p-5 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
            <div className="flex justify-between mb-4"><h3 className="text-white font-bold">{status==='success'?`Concluído +${adicionados.length}`:'Importando...'}</h3><button onClick={()=>setShowImport(false)}><X className="w-5 h-5 text-white"/></button></div>
            <div className="w-full bg-[#00121E] h-2 rounded-full overflow-hidden mb-3"><div className="h-2 rounded bg-gradient-to-r from-[#D4AF37] to-cyan-400 transition-all" style={{width:`${progress}%`}}></div></div>
            <div className="bg-[#00121E] border border-white/5 rounded p-3 max-h-32 overflow-auto text-[11px] font-mono text-[#cbd5e1] space-y-1">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0d1f3a] to-[#021024] border border-amber-400/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <p className="text-[11px] tracking-widest text-amber-200/70 font-bold flex items-center gap-2"><Layers className="w-4 h-4 text-amber-300"/> TOTAL LICENÇAS</p>
          <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD76E] to-[#D4AF37] mt-3">{stats.totalGeral}</p>
          <p className="text-[11px] text-[#7a9bb8] mt-1">Contratadas no sistema</p>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a1f3a] to-[#021a2e] border border-cyan-400/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
          <p className="text-[11px] tracking-widest text-cyan-200/70 font-bold flex items-center gap-2"><Users className="w-4 h-4 text-cyan-300"/> EM USO</p>
          <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mt-3">{stats.emUso}</p>
          <p className="text-[11px] text-[#7a9bb8] mt-1">{data.length} usuários ativos</p>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a2a1f] to-[#021a14] border border-emerald-400/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
          <p className="text-[11px] tracking-widest text-emerald-200/70 font-bold flex items-center gap-2"><PackageCheck className="w-4 h-4 text-emerald-300"/> DISPONÍVEIS</p>
          <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300 mt-3">{stats.livres}</p>
          <p className="text-[11px] text-[#7a9bb8] mt-1">Prontas para alocar</p>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1f0a2e] to-[#160a24] border border-fuchsia-400/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(232,121,249,0.15)]">
          <p className="text-[11px] tracking-widest text-fuchsia-200/70 font-bold flex items-center gap-2"><Percent className="w-4 h-4 text-fuchsia-300"/> TAXA DE USO</p>
          <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-purple-400 mt-3">{stats.taxa}%</p>
          <p className="text-[11px] text-[#7a9bb8] mt-1">Utilização geral</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.detalhe.map((b:any)=>(
          <div key={b.id} className="group relative bg-gradient-to-br from-[#0b1e36]/90 to-[#050e1c] border border-white/10 rounded-xl p-4 hover:border-cyan-400/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition">
            <div className="flex justify-between items-start">
              <div className="pr-12">
                <p className="text-[13px] font-bold text-white tracking-wide truncate">{b.nome}</p>
                <p className="text-[11px] text-[#6b8aa8] mt-0.5">{b.qtd_contratada} contratadas</p>
              </div>
              <div className="absolute top-3 right-3 flex gap-1">
                <button onClick={()=>onEditSoftware?.(b)} className="p-1.5 bg-[#0f243e] border border-white/10 rounded-md hover:border-amber-400/50"><Pencil className="w-3.5 h-3.5 text-amber-300"/></button>
                <button onClick={()=>handleDelete(b.id)} className="p-1.5 bg-[#0f243e] border border-white/10 rounded-md hover:border-red-400/50"><Trash2 className="w-3.5 h-3.5 text-red-300"/></button>
              </div>
            </div>
            <div className="flex justify-between items-end mt-4">
              <p className="text-white font-black text-[15px]">{b.usado} / {b.qtd_contratada}</p>
              <p className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${b.livre<0?'bg-red-500/20 text-red-300 border border-red-500/30': b.livre===0?'bg-amber-500/20 text-amber-300 border border-amber-500/30':'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'}`}>{b.livre<0?`${Math.abs(b.livre)} em excesso`: b.livre===0?'Esgotado':`${b.livre} livres`}</p>
            </div>
            <div className="w-full bg-[#021121] h-1.5 rounded-full mt-3 overflow-hidden border border-white/5">
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${getBarGradient(b.perc)} transition-all duration-700`} style={{width:`${Math.min(100, b.perc)}%`}}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
