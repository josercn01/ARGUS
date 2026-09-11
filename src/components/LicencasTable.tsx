import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Loader2 } from 'lucide-react';
import type { UsuarioLicenca, Software, LocalTrabalho, SystemRole } from '@/types';

export function LicencasTable({ data, softwares, loading, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '', percent: 0, eta: '' });

  function formatETA(current: number, total: number, start: number) {
    if (current < 3) return 'Calculando...';
    const elapsed = (Date.now() - start) / 1000;
    const per = elapsed / current;
    const rem = (total - current) * per;
    return rem < 60? `${Math.ceil(rem)}s restantes` : `${Math.floor(rem/60)}m ${Math.ceil(rem%60)}s`;
  }

  async function handleFile(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const start = Date.now();

    try {
      let text = await file.text();
      text = text.replace(/^\uFEFF/, ''); // remove BOM
      const lines = text.split(/\r?\n/).filter((l:any)=>l.trim()!=='');
      const total = lines.length - 1;
      const sep = ';';
      const headers = lines[0].split(sep).map((h:any)=>h.trim());

      // Mapa de softwares existentes
      const swMap = new Map<string,string>();
      softwares.forEach((s:any)=> swMap.set(s.nome.toLowerCase(), s.id));

      for (let i=1; i<lines.length; i++) {
        const cols = lines[i].split(sep);
        const row: any = {};
        headers.forEach((h:string, idx:number)=> row[h]= (cols[idx]||'').trim().replace(/^"|"$/g,''));

        const email = row['Email'] || '';
        const nome = row['NomeCompleto'] || email;
        const depto = row['Departamento'] || '';
        const cargo = row['Cargo'] || '';
        const tipoProduto = row['Tipo de produto'] || row['Produto'] || '';

        if (!email) continue;

        setProgress({
          current: i, total,
          step: `${nome} → ${tipoProduto}`,
          percent: Math.round(i/total*100),
          eta: formatETA(i, total, start)
        });

        // Tipo pode ser "Illustrator | Photoshop" ou "Todos os Apps"
        const softwaresDaLinha = tipoProduto.split('|').map((s:string)=>s.trim()).filter(Boolean);

        const login = email.split('@')[0].toLowerCase();

        const { data: userRow } = await supabase.from('usuarios').upsert({
          colaborador: nome,
          email,
          login,
          setor: depto,
          cargo: cargo,
          status: 'ativo'
        }, { onConflict: 'login' }).select('id').single();

        if (!userRow) continue;

        for (const nomeSw of softwaresDaLinha) {
          let swId = swMap.get(nomeSw.toLowerCase());
          if (!swId) {
            // cria se não existe
            const { data: novo } = await supabase.from('softwares').insert({
              nome: nomeSw,
              is_adobe: true,
              qtd_contratada: 0
            }).select('id').single();
            if (novo) { swId = novo.id; swMap.set(nomeSw.toLowerCase(), novo.id); }
          }
          if (swId) {
            await supabase.from('usuario_softwares').upsert(
              { usuario_id: userRow.id, software_id: swId },
              { onConflict: 'usuario_id,software_id' }
            );
          }
        }

        if (i % 15 === 0) await new Promise(r=>setTimeout(r,0));
      }

      setProgress({ current: total, total, step: `Concluído! ${total} linhas processadas`, percent: 100, eta: '' });
      await new Promise(r=>setTimeout(r,1500));
      await onRefresh();
    } catch(err:any) {
      alert('Erro: ' + err.message);
    } finally {
      setImporting(false);
      if(fileRef.current) fileRef.current.value='';
      e.target.value='';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Pessoas / Licenças - {data.length} registros</h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <button onClick={()=>fileRef.current?.click()} className="bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-4 py-2 text-xs flex items-center gap-2">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button className="bg-[#D4AF37] text-black rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Novo Registro</button>
        </div>
      </div>

      {importing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              <h4 className="text-white font-bold">Importando sua planilha</h4>
              <span className="ml-auto text-xs text-[#94a3b8]">{progress.percent}%</span>
            </div>
            <p className="text-white text-xs truncate mb-1">{progress.step}</p>
            <p className="text-sky-400 text-[11px] mb-2">{progress.current}/{progress.total} • {progress.eta}</p>
            <div className="w-full bg-[#00121E] h-3 rounded-full overflow-hidden">
              <div className="bg-[#D4AF37] h-3 rounded-full transition-all" style={{width: `${progress.percent}%`}}></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]">
            <tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE (PODE TER VARIOS)</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">CARGO</th><th className="p-3 text-left">STATUS</th></tr>
          </thead>
          <tbody>
            {data.map((u:any)=>(
              <tr key={u.id} className="border-t border-[#1e293b] text-white">
                <td className="p-3"><div>{u.colaborador}</div><div className="text-[11px] text-[#64748b]">{u.email || u.login}</div></td>
                <td className="p-3 text-xs">{u.softwares?.map((s:any)=>s.nome).join(', ')}</td>
                <td className="p-3 text-xs text-[#94a3b8]">{u.setor || '—'}</td>
                <td className="p-3 text-xs text-[#94a3b8]">{u.cargo || '—'}</td>
                <td className="p-3"><span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
