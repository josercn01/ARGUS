import { useMemo, useState, useRef } from 'react';
import { Pencil, Trash2, Upload, Download, X, CheckCircle, AlertCircle, UserPlus, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  const [showImport, setShowImport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'parsing'|'importing'|'success'|'error'|'deleting'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [adicionados, setAdicionados] = useState<any[]>([]);
  const [ignorados, setIgnorados] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const contratados = softwares.filter((s:any)=>s.qtd_contratada>0);
    const total = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);
    let usadosAcrobat = 0;
    let usadosTodos = 0;
    let usadosSingle = 0;
    let usadosAutocad = 0;
    data.forEach((u:any)=>{
      const softs = (u.softwares||[]).map((s:any)=>s.nome.toLowerCase());
      const isTodos = softs.some((n:string)=> n.includes('todos') || n.includes('all apps') || n.includes('edicao 4') || n.includes('creative cloud') && n.includes('todos'));
      if (isTodos) { usadosTodos += 1; return; }
      let temAcrobat = false;
      let temAutocad = false;
      let temSingle = false;
      softs.forEach((n:string)=>{
        if (n.includes('acrobat')) temAcrobat = true;
        else if (n.includes('autocad')) temAutocad = true;
        else if (['photoshop','illustrator','indesign','premiere','after','lightroom','xd','audition','animate','dreamweaver','single'].some(x=>n.includes(x))) { temSingle = true; }
      });
      if(temAcrobat) usadosAcrobat++;
      if(temAutocad) usadosAutocad++;
      if(temSingle) usadosSingle++;
    });
    function getUsado(nomeBalde: string){
      const nb = nomeBalde.toLowerCase();
      if (nb.includes('single') || nb.includes('225')) return usadosSingle;
      if (nb.includes('todos') || nb.includes('edicao 4')) return usadosTodos;
      if (nb.includes('acrobat')) return usadosAcrobat;
      if (nb.includes('autocad')) return usadosAutocad;
      return 0;
    }
    const detalhe = contratados.map((b:any)=>{
      const usado = getUsado(b.nome);
      return {...b, usado, livre: b.qtd_contratada - usado };
    });
    const emUso = usadosAcrobat + usadosTodos + usadosSingle + usadosAutocad;
    const livres = total - emUso;
    return { total, emUso, livres, taxa: total? Math.round(emUso/total*100):0, detalhe };
  }, [data, softwares]);

  async function handleDelete(id: string){
    if(!confirm('Excluir este balde?')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh?.();
  }

  // --- NOVO: APAGAR TODOS USUÁRIOS ---
  async function handleDeleteAll(){
    if(data.length === 0) return alert('Nenhum usuário para apagar');
    if(!confirm(`Apagar TODOS os ${data.length} usuários? Essa ação não pode ser desfeita.`)) return;
    const confirmText = prompt(`Para confirmar, digite EXCLUIR em maiúsculas:`);
    if(confirmText!== 'EXCLUIR') return alert('Cancelado');

    setShowImport(true);
    setStatus('deleting');
    setProgress(10);
    setLogs([`Iniciando exclusão de ${data.length} usuários...`]);

    try{
      setProgress(30);
      setLogs(prev=>[...prev, 'Removendo vínculos de softwares...']);
      // Apaga todos os vínculos primeiro
      const { error: err1 } = await supabase.from('usuario_softwares').delete().neq('usuario_id', '00000000-0000-0000-0000-000000000000');
      if(err1) throw err1;

      setProgress(60);
      setLogs(prev=>[...prev, 'Removendo usuários...']);
      const { error: err2 } = await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if(err2) throw err2;

      setProgress(100);
      setStatus('success');
      setAdicionados([]);
      setLogs(prev=>[...prev, `✓ ${data.length} usuários apagados com sucesso`]);
      setTimeout(()=>{ onRefresh?.(); setShowImport(false); }, 1200);
    }catch(err:any){
      setStatus('error');
      setLogs(prev=>[...prev, `ERRO ao apagar: ${err.message}`]);
    }
  }

  function handleDownloadModelo(){
    const modelo = `Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto
abelardo.mendes@senado.leg.br;Abelardo Antonio Mendes Junior;SF-OSE-DGER-SEGRAF-COEDIT-SEMID;Efetivo - Chefe De Serviço;Todos os Apps;Todos os Apps
ADRIANAF@senado.leg.br;Adriana França Braga;SF-OAS-SECOM-SAGEN;Terceirizado - Operador De Multimídia (1 Substituição);Aplicativo Individual;Photoshop
`;
    const blob = new Blob([modelo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_argus_importacao.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    setShowImport(true);
    setStatus('parsing');
    setProgress(5);
    setLogs([`Arquivo: ${file.name} (${(file.size/1024).toFixed(1)} KB)`]);
    setAdicionados([]);
    setIgnorados(0);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length < 2){ setStatus('error'); setLogs(prev=>[...prev, 'ERRO: Arquivo vazio']); return; }
    const header = lines[0].split(';').map(h=>h.trim());
    const required = ['Email','NomeCompleto','Departamento','Cargo','Produto','Tipo de produto'];
    const missing = required.filter(c=>!header.includes(c));
    if(missing.length>0){ setStatus('error'); setLogs(prev=>[...prev, `ERRO: Colunas faltando: ${missing.join(', ')}`]); return; }

    const emailsExistentes = new Set((data||[]).map((u:any)=> (u.email||'').toLowerCase().trim()));
    const idxEmail = header.indexOf('Email');
    const idxNome = header.indexOf('NomeCompleto');
    const idxDepto = header.indexOf('Departamento');
    const idxCargo = header.indexOf('Cargo');
    const idxTipo = header.indexOf('Tipo de produto');
    const novosMap = new Map<string, any>();
    const duplicadosNaPlanilha = { count: 0 };

    for(let i=1;i<lines.length;i++){
      const cols = lines[i].split(';');
      if(cols.length < 6) continue;
      const email = cols[idxEmail]?.trim().toLowerCase();
      if(!email) continue;
      if(emailsExistentes.has(email)) continue;
      if(novosMap.has(email)){ duplicadosNaPlanilha.count++; continue; }
      novosMap.set(email, {
        email_original: cols[idxEmail]?.trim(),
        nome: cols[idxNome]?.trim(),
        depto: cols[idxDepto]?.trim(),
        cargo: cols[idxCargo]?.trim(),
        tipo: cols[idxTipo]?.trim(),
      });
    }

    const listaNovos = Array.from(novosMap.values());
    const totalLinhas = lines.length - 1;
    const jaExistiam = totalLinhas - listaNovos.length - duplicadosNaPlanilha.count;

    setProgress(30);
    setLogs(prev=>[...prev, `${totalLinhas} linhas na planilha`, `${emailsExistentes.size} já cadastrados`, `${jaExistiam} já existiam (ignorados)`, `${listaNovos.length} NOVOS para adicionar`]);

    if(listaNovos.length === 0){
      setProgress(100); setStatus('success'); setIgnorados(jaExistiam);
      setLogs(prev=>[...prev, 'Nenhum usuário novo para adicionar.']); return;
    }

    setStatus('importing');
    const adicionadosTemp: any[] = [];
    try{
      for(let i=0;i<listaNovos.length;i++){
        const row = listaNovos[i];
        setProgress(30 + Math.round((i / listaNovos.length) * 65));
        const { data: userExist } = await supabase.from('usuarios').select('id').eq('email', row.email_original).maybeSingle();
        let userId = userExist?.id;
        if(!userId){
          const { data: newUser } = await supabase.from('usuarios').insert({ email: row.email_original, nome: row.nome, departamento: row.depto, cargo: row.cargo }).select('id').single();
          userId = newUser?.id;
        }
        const tipos = (row.tipo||'').split('|').map((t:string)=>t.trim()).filter(Boolean);
        for(const t of tipos){
          const { data: soft } = await supabase.from('softwares').select('id').ilike('nome', `%${t}%`).limit(1).maybeSingle();
          if(soft && userId) await supabase.from('usuario_softwares').upsert({ usuario_id: userId, software_id: soft.id }, { onConflict: 'usuario_id,software_id' });
        }
        adicionadosTemp.push(row);
      }
      setAdicionados(adicionadosTemp); setIgnorados(jaExistiam); setProgress(100); setStatus('success');
      setLogs(prev=>[...prev, `✓ ${adicionadosTemp.length} novos adicionados`]);
      onRefresh?.();
    }catch(err:any){ setStatus('error'); setLogs(prev=>[...prev, `ERRO: ${err.message}`]); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#b8962e] text-black text-xs font-bold px-4 py-2 rounded-lg">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={handleDownloadModelo} className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] hover:bg-[#1e293b] text-white text-xs font-bold px-4 py-2 rounded-lg">
            <Download className="w-4 h-4" /> Modelo
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-[#64748b] hidden md:block">{data.length} usuários | Não duplica</p>
          <button onClick={handleDeleteAll} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-lg">
            <Trash className="w-4 h-4" /> Apagar todos
          </button>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[550px] p-5">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                {status==='success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {status==='error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {status==='deleting' && <Trash className="w-5 h-5 text-red-400 animate-pulse" />}
                {status==='importing' || status==='parsing'? 'Importando...' : status==='deleting'? 'Apagando todos...' : status==='success'? 'Concluído' : 'Erro'}
              </h3>
              <button onClick={()=>{ setShowImport(false); setStatus('idle'); }}><X className="w-5 h-5 text-white"/></button>
            </div>
            <div className="space-y-3">
              <div className="w-full bg-[#00121E] h-2 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full transition-all ${status==='error'?'bg-red-500': status==='deleting'?'bg-red-400' :'bg-[#D4AF37]'}`} style={{width: `${progress}%`}}></div>
              </div>
              <div className="bg-[#00121E] border border-[#1e293b] rounded p-3 max-h-32 overflow-auto text-[11px] font-mono text-[#cbd5e1] space-y-1">
                {logs.map((l,i)=><div key={i}>{l}</div>)}
              </div>
              {adicionados.length > 0 && status==='success' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                  <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1"><UserPlus className="w-4 h-4"/> +{adicionados.length} adicionados:</p>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {adicionados.map((a, idx)=>(
                      <div key={idx} className="text-[11px] text-white bg-[#001726] rounded px-2 py-1 flex justify-between"><span>{a.email_original}</span><span className="text-[#94a3b8]">{a.nome}</span></div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>{ setShowImport(false); setStatus('idle'); }} className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded text-white text-xs">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL CONTRATADO</p><p className="text-2xl font-bold text-white mt-2">{stats.total}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUso}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livres}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stats.detalhe.map((b:any)=>(
          <div key={b.id} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware?.(b)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]" /></button>
              <button onClick={()=>handleDelete(b.id)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] truncate pr-12">{b.nome}</p>
            <div className="flex justify-between items-end mt-1"><p className="text-white font-bold">{b.usado} / {b.qtd_contratada}</p><p className={`text-xs font-bold ${b.livre<0?'text-red-400':'text-sky-400'}`}>{b.livre} livres</p></div>
            <div className="w-full bg-[#00121E] h-1.5 rounded mt-2"><div className={`${b.livre<0?'bg-red-500':'bg-[#D4AF37]'} h-1.5 rounded`} style={{width: `${Math.min(100, b.qtd_contratada? b.usado/b.qtd_contratada*100:0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
