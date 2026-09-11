import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Loader2, AlertCircle } from 'lucide-react';
import type { UsuarioLicenca, Software, LocalTrabalho, SystemRole } from '@/types';

interface Props {
  data: UsuarioLicenca[];
  softwares: Software[];
  locais: LocalTrabalho[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void;
  onImportBatch?: (file: File) => Promise<void>;
}

export function LicencasTable({ data, softwares, loading, onRefresh }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '', percent: 0, eta: '', erro: '' });

  function formatETA(current: number, total: number, start: number) {
    if (current <= 2) return 'Calculando...';
    const elapsed = (Date.now() - start) / 1000;
    const perItem = elapsed / current;
    const remaining = (total - current) * perItem;
    if (remaining < 60) return `${Math.ceil(remaining)}s restantes`;
    return `${Math.floor(remaining/60)}m ${Math.ceil(remaining%60)}s restantes`;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    console.log('Arquivo selecionado:', file?.name);
    if (!file) return;

    setImporting(true);
    const startTime = Date.now();
    const swMap = new Map<string, string>();
    softwares.forEach(s=> swMap.set(s.nome.toLowerCase().trim(), s.id));

    try {
      const text = await file.text();
      console.log('Primeiros 200 chars:', text.slice(0,200));
      const lines = text.split(/\r?\n/).filter(l=>l.trim()!=='');
      if (lines.length < 2) throw new Error('Arquivo vazio');

      const sep = lines[0].includes(';')? ';' : ',';
      const headers = lines[0].split(sep).map(h=>h.trim().toUpperCase().replace(/"/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
      console.log('Headers:', headers);

      const total = lines.length - 1;
      setProgress({ current: 0, total, step: `Lendo ${total} linhas...`, percent: 0, eta: '', erro: '' });

      let ok = 0;
      for (let i = 1; i < lines.length; i++) {
        const raw = lines[i];
        if (!raw.trim()) continue;
        const values = raw.split(sep).map(v=>v.trim().replace(/^"|"$/g,''));
        const row: any = {};
        headers.forEach((h, idx) => row[h] = values[idx] || '');

        const nome = row['COLABORADOR'] || row['NOME'] || '';
        const softwareNome = row['SOFTWARE'] || row['SOFTWARE (PODE TER VARIOS)'] || row['TIPO'] || 'Photoshop';
        const setor = (row['SETOR'] || '').toUpperCase();

        // Gera login a partir do nome se não tem email
        const login = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'') || `user_${i}`;

        setProgress({
          current: i,
          total,
          step: `${nome} → ${softwareNome}`,
          percent: Math.round(i/total*100),
          eta: formatETA(i, total, startTime),
          erro: ''
        });

        try {
          let swId = swMap.get(softwareNome.toLowerCase().trim());
          if (!swId) {
            const isAdobe =!softwareNome.toLowerCase().includes('autocad');
            const { data: novo, error } = await supabase.from('softwares').insert({ nome: softwareNome, is_adobe: isAdobe, qtd_contratada: 0 }).select('id').single();
            if (error) throw error;
            if (novo) { swId = novo.id; swMap.set(softwareNome.toLowerCase().trim(), novo.id); }
          }

          const { data: userRow, error: uErr } = await supabase.from('usuarios').upsert({
            colaborador: nome,
            login,
            setor: setor || null,
            status: 'ativo'
          }, { onConflict: 'login' }).select('id').single();

          if (uErr) throw uErr;

          if (userRow && swId) {
            await supabase.from('usuario_softwares').upsert({ usuario_id: userRow.id, software_id: swId }, { onConflict: 'usuario_id,software_id' });
            ok++;
          }
        } catch (inner: any) {
          console.error('Erro linha', i, inner);
          setProgress(p=>({...p, erro: `Erro linha ${i}: ${inner.message}`}));
        }

        if (i % 10 === 0) await new Promise(r=>setTimeout(r, 0));
      }

      setProgress({ current: total, total, step: `Concluído! ${ok}/${total} importados`, percent: 100, eta: '0s', erro: '' });
      await new Promise(r=>setTimeout(r, 2000));
      await onRefresh();

    } catch (err: any) {
      alert('Falha no import: ' + err.message);
      console.error(err);
    } finally {
      setImporting(false);
      // ESSENCIAL: reseta o input para poder selecionar o mesmo arquivo de novo
      if (fileRef.current) fileRef.current.value = '';
      e.target.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Pessoas / Licenças - {data.length} registros {loading && <Loader2 className="inline w-4 h-4 animate-spin ml-2" />}</h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          <button onClick={()=>fileRef.current?.click()} disabled={importing} className="bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-4 py-2 text-xs flex items-center gap-2 hover:border-[#D4AF37]/50 disabled:opacity-50">
            <Upload className="w-4 h-4" /> {importing? 'Importando...' : 'Importar'}
          </button>
          <button className="bg-[#D4AF37] text-black rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Novo Registro</button>
        </div>
      </div>

      {importing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              <h4 className="text-white font-bold">Importando Planilha</h4>
              <span className="ml-auto text-xs text-[#94a3b8]">{progress.percent}%</span>
            </div>

            <p className="text-white text-xs mb-1 truncate">{progress.step}</p>
            <p className="text-sky-400 text-[11px] mb-1">{progress.current} de {progress.total} • {progress.eta}</p>
            {progress.erro && <p className="text-red-400 text-[11px] mb-2 flex gap-1"><AlertCircle className="w-3 h-3" />{progress.erro}</p>}

            <div className="w-full bg-[#00121E] h-3 rounded-full overflow-hidden border border-[#1e293b]">
              <div className="bg-[#D4AF37] h-3 rounded-full transition-all duration-200" style={{width: `${progress.percent}%`}}></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]">
            <tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE (PODE TER VARIOS)</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">STATUS</th></tr>
          </thead>
          <tbody>
            {data.length===0 &&!loading && <tr><td colSpan={4} className="p-8 text-center text-[#64748b] text-xs">Nenhum registro. Clique em Importar.</td></tr>}
            {data.map(u=>(
              <tr key={u.id} className="border-t border-[#1e293b] text-white">
                <td className="p-3"><div>{u.colaborador}</div><div className="text-[11px] text-[#64748b]">{u.login}</div></td>
                <td className="p-3 text-xs">{u.softwares?.map(s=>s.nome).join(', ') || '—'}</td>
                <td className="p-3 text-xs text-[#94a3b8]">{u.setor || '—'}</td>
                <td className="p-3"><span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
