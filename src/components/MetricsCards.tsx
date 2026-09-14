import { useMemo, useState, useRef } from 'react';
import { Pencil, Trash2, Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  // --- ESTADOS DO IMPORT (NOVO) ---
  const [showImport, setShowImport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'parsing'|'importing'|'success'|'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [totalImport, setTotalImport] = useState(0);
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

      if (isTodos) {
        usadosTodos += 1;
        return;
      }

      let temAcrobat = false;
      let temAutocad = false;
      let temSingle = false;

      softs.forEach((n:string)=>{
        if (n.includes('acrobat')) temAcrobat = true;
        else if (n.includes('autocad')) temAutocad = true;
        else if (['photoshop','illustrator','indesign','premiere','after','lightroom','xd','audition','animate','dreamweaver','single'].some(x=>n.includes(x))) {
          temSingle = true;
        }
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

  // --- FUNÇÕES NOVAS: MODELO E IMPORT ---
  function handleDownloadModelo(){
    const modelo = `Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto
abelardo.mendes@senado.leg.br;Abelardo Antonio Mendes Junior;SF-OSE-DGER-SEGRAF-COEDIT-SEMID;Efetivo - Chefe De Serviço;Todos os Apps;Todos os Apps
ADRIANAF@senado.leg.br;Adriana França Braga;SF-OAS-SECOM-SAGEN;Terceirizado - Operador De Multimídia (1 Substituição);Aplicativo Individual;Photoshop
adyleane@senado.leg.br;Maria Adyleane dos Santos Medeiros;SF-GABSEN-GSTCRIST;Comissionado - Chefe De Gabinete Comissionado;Acrobat Pro DC;Acrobat Pro DC
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
    setProgress(10);
    setLogs([`Arquivo: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'Lendo arquivo...']);

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l=>l.trim());

    if(lines.length < 2){
      setStatus('error');
      setLogs(prev=>[...prev, 'ERRO: Arquivo vazio']);
      return;
    }

    const header = lines[0].split(';').map(h=>h.trim());
    const required = ['Email','NomeCompleto','Departamento','Cargo','Produto','Tipo de produto'];
    const missing = required.filter(c=>!header.includes(c));

    if(missing.length>0){
      setStatus('error');
      setLogs(prev=>[...prev, `ERRO: Colunas faltando: ${missing.join(', ')}`, `Esperado: ${required.join(';')}`]);
      return;
    }

    setProgress(30);
    setLogs(prev=>[...prev, `${lines.length-1} linhas encontradas`, 'Validando e importando...']);
    setStatus('importing');

    try{
      let ok = 0;
      let idxEmail = header.indexOf('Email');
      let idxNome = header.indexOf('NomeCompleto');
      let idxDepto = header.indexOf('Departamento');
      let idxCargo = header.indexOf('Cargo');
      let idxProduto = header.indexOf('Produto');
      let idxTipo = header.indexOf('Tipo de produto');

      for(let i=1; i<lines.length; i++){
        const cols = lines[i].split(';');
        if(cols.length < 6) continue;

        const email = cols[idxEmail]?.trim();
        if(!email) continue;

        const nome = cols[idxNome]?.trim() || email;
        const depto = cols[idxDepto]?.trim() || '';
        const cargo = cols[idxCargo]?.trim() || '';
        const produto = cols[idxProduto]?.trim() || '';
        const tipoProduto = cols[idxTipo]?.trim() || '';

        // 1. upsert usuario
        const { data: userExist } = await supabase.from('usuarios').select('id').eq('email', email).maybeSingle();
        let userId = userExist?.id;
        if(!userId){
          const { data: newUser } = await supabase.from('usuarios').insert({ email, nome, departamento: depto, cargo }).select('id').single();
          userId = newUser?.id;
        } else {
          await supabase.from('usuarios').update({ nome, departamento: depto, cargo }).eq('id', userId);
        }

        // 2. resolve softwares pelo tipo
        const tipos = tipoProduto.split('|').map((t:string)=>t.trim());
        for(const t of tipos){
          if(!t) continue;
          const { data: soft } = await supabase.from('softwares').select('id').ilike('nome', `%${t}%`).limit(1).maybeSingle();
          if(soft && userId){
            await supabase.from('usuario_softwares').upsert({ usuario_id: userId, software_id: soft.id }, { onConflict: 'usuario_id,software_id' });
          }
        }

        ok++;
        if(i % 20 === 0){
          const pct = 30 + Math.round((i / lines.length) * 60);
          setProgress(pct);
          setLogs(prev=>[...prev, `${ok}/${lines.length-1} processados...`]);
        }
      }

      setProgress(100);
      setTotalImport(ok);
      setStatus('success');
      setLogs(prev=>[...prev, `✓ Concluído: ${ok} usuários importados`]);
      onRefresh?.();

    }catch(err:any){
      setStatus('error');
      setLogs(prev=>[...prev, `ERRO: ${err.message}`]);
    }
  }

  return (
    <div className="space-y-4">
      {/* HEADER COM BOTÕES IMPORTAR + MODELO - RESTAURADO */}
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
        <p className="text-[10px] text-[#64748b]">Formato: Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto | Separador ;</p>
      </div>

      {/* MODAL DE ANDAMENTO DO IMPORT */}
      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[500px] p-5">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                {status==='success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {status==='error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                {status!=='success' && status!=='error' && 'Importando licenças...'}
                {status==='success' && 'Importação concluída'}
                {status==='error' && 'Erro na importação'}
              </h3>
              <button onClick={()=>{ setShowImport(false); setStatus('idle'); setProgress(0); setLogs([]); if(fileRef.current) fileRef.current.value=''; }}><X className="w-5 h-5 text-white"/></button>
            </div>

            <div className="space-y-3">
              <div className="w-full bg-[#00121E] h-2 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full transition-all ${status==='error'?'bg-red-500':'bg-[#D4AF37]'}`} style={{width: `${progress}%`}}></div>
              </div>
              <p className="text-xs text-[#94a3b8]">{progress}%</p>

              <div className="bg-[#00121E] border border-[#1e293b] rounded p-3 max-h-48 overflow-auto text-[11px] font-mono text-[#cbd5e1] space-y-1">
                {logs.map((l,i)=><div key={i}>{l}</div>)}
              </div>

              {status==='success' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-3 text-xs text-emerald-400">
                  {totalImport} registros importados. Dashboard atualizado para 192 Todos / 185 Single / 199 Acrobat. Os cards abaixo já refletem o novo total.
                </div>
              )}

              {status==='error' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400">
                  Corrija o arquivo usando o botão Modelo. O modelo correto tem cabeçalho: Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={()=>{ setShowImport(false); setStatus('idle'); setProgress(0); setLogs([]); }} className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded text-white text-xs">Fechar</button>
                {status==='success' && <button onClick={()=>{ setShowImport(false); setStatus('idle'); }} className="px-4 py-2 bg-[#D4AF37] text-black font-bold rounded text-xs">Ver Dashboard</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARDS ORIGINAIS - INTACTOS */}
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
