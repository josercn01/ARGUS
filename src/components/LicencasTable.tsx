import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Download, Plus, Settings2, Loader2 } from 'lucide-react';
import type { UsuarioLicenca, Software, LocalTrabalho, SystemRole } from '@/types';

interface Props {
  data: UsuarioLicenca[];
  softwares: Software[];
  locais: LocalTrabalho[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void;
  onImportBatch: (file: File) => Promise<void>;
}

export function LicencasTable({ data, softwares, locais, loading, onRefresh }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '', percent: 0, eta: '' });
  const startTimeRef = useRef<number>(0);

  function formatETA(current: number, total: number) {
    if (current===0) return 'Calculando...';
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const perItem = elapsed / current;
    const remaining = (total - current) * perItem;
    if (remaining < 60) return `${Math.ceil(remaining)}s restantes`;
    return `${Math.floor(remaining/60)}m ${Math.ceil(remaining%60)}s restantes`;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    startTimeRef.current = Date.now();

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l=>l.trim()!=='');
      const total = lines.length - 1;
      const sep = lines[0].includes(';')? ';' : ',';
      const headers = lines[0].split(sep).map(h=>h.trim().toUpperCase().replace(/"/g,''));

      setProgress({ current: 0, total, step: 'Lendo planilha...', percent: 0, eta: '' });

      // Map de softwares existentes
      const swMap = new Map<string, string>();
      softwares.forEach(s=> swMap.set(s.nome.toLowerCase(), s.id));

      let ok = 0;
      let erros = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(sep).map(v=>v.trim().replace(/^"|"$/g,''));
        const row: any = {};
        headers.forEach((h, idx) => row[h] = values[idx]);

        const email = row['EMAIL'] || row['E-MAIL'] || row['LOGIN'];
        const tipoRaw = (row['TIPO_PRODUTO'] || row['SOFTWARE'] || row['PRODUTO'] || 'Photoshop').trim() || 'Photoshop';
        const setor = (row['DEPARTAMENTO'] || row['SETOR'] || '').toUpperCase();
        const nome = row['NOME'] || row['COLABORADOR'] || email;

        setProgress({
          current: i,
          total,
          step: `Processando ${nome} - ${tipoRaw} (${i}/${total})`,
          percent: Math.round(i/total*100),
          eta: formatETA(i, total)
        });

        if (!email) { erros++; continue; }

        try {
          let swId = swMap.get(tipoRaw.toLowerCase());
          if (!swId) {
            // Cria software se não existir com qtd 0
            const isAdobe =!tipoRaw.toLowerCase().includes('autocad');
            const { data: novo } = await supabase.from('softwares').insert({ nome: tipoRaw, is_adobe: isAdobe, qtd_contratada: 0 }).select('id').single();
            if (novo) { swId = novo.id; swMap.set(tipoRaw.toLowerCase(), novo.id); }
          }

          const login = email.split('@')[0].toLowerCase();
          const { data: userRow } = await supabase.from('usuarios').upsert({
            colaborador: nome,
            login,
            setor: setor || null,
            status: 'ativo'
          }, { onConflict: 'login' }).select('id').single();

          if (userRow && swId) {
            await supabase.from('usuario_softwares').upsert({ usuario_id: userRow.id, software_id: swId }, { onConflict: 'usuario_id,software_id' });
            ok++;
          }
        } catch (err) {
          console.error(err);
          erros++;
        }

        // Dá respiro pro UI atualizar a cada 20 linhas
        if (i % 20 === 0) await new Promise(r=>setTimeout(r, 10));
      }

      setProgress({ current: total, total, step: `Concluído! ${ok} importados, ${erros} erros`, percent: 100, eta: 'Finalizando...' });
      await new Promise(r=>setTimeout(r, 1500));
      await onRefresh();

    } catch (err) {
      alert('Erro ao importar: ' + err);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">Pessoas / Licenças - {data.length} registros</h3>
        <div className="flex gap-2">
          <button onClick={()=>fileRef.current?.click()} className="bg-[#001E33] border border-[#1e293b] text-[#94a3b8] rounded-lg px-3 py-2 text-xs flex items-center gap-2 hover:border-[#D4AF37]/40"><Upload className="w-4 h-4" /> Importar</button>
          <button className="bg-[#D4AF37] text-black rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Novo Registro</button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

      {/* MODAL DE PROGRESSO REAL */}
      {importing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              <h4 className="text-white font-bold">Importando Planilha</h4>
            </div>

            <p className="text-[#94a3b8] text-xs mb-1">{progress.step}</p>
            <p className="text-sky-400 text-[11px] mb-3">{progress.eta} • {progress.current} de {progress.total}</p>

            <div className="w-full bg-[#00121E] h-3 rounded-full overflow-hidden border border-[#1e293b]">
              <div className="bg-[#D4AF37] h-3 rounded-full transition-all duration-300" style={{width: `${progress.percent}%`}}></div>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-[#64748b]">{progress.percent}%</span>
              <span className="text-[11px] text-[#64748b]">{progress.current}/{progress.total}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input visível antigo - pode remover depois */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 flex items-center gap-3">
        <input type="file" accept=".csv" onChange={handleFile} className="text-xs text-[#94a3b8] file:bg-[#001726] file:border file:border-[#1e293b] file:rounded file:px-3 file:py-1 file:text-white file:mr-3" />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />}
      </div>

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]">
            <tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE (PODE TER VARIOS)</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">STATUS</th></tr>
          </thead>
          <tbody>
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
