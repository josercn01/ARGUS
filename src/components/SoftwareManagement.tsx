import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Box, Layers } from 'lucide-react';
import type { Software } from '@/types';

const ADOBE_SINGLES = [
  "Photoshop",
  "Illustrator",
  "InDesign",
  "Premiere Pro",
  "After Effects",
  "Acrobat Pro DC",
  "Lightroom",
  "XD",
  "Audition",
  "Animate"
];

interface Props {
  softwares: Software[];
  onClose: () => void;
  onRefresh: () => void;
}

export function SoftwareManagement({ softwares, onClose, onRefresh }: Props) {
  // FORM - SEU FLUXO
  const [isAdobe, setIsAdobe] = useState(true);
  const [tipoAdobe, setTipoAdobe] = useState<'ALL_APPS' | 'ACROBAT' | 'SINGLE'>('SINGLE');
  const [nomeCustom, setNomeCustom] = useState('');
  const [nomeSingle, setNomeSingle] = useState('Photoshop');
  const [qtd, setQtd] = useState<number>(202);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    let nomeFinal = '';
    let familiaLegacy = '';

    if (isAdobe) {
      if (tipoAdobe === 'ALL_APPS') {
        nomeFinal = 'Todos os Apps - Edicao 4';
        familiaLegacy = 'ALL_APPS';
      } else if (tipoAdobe === 'ACROBAT') {
        nomeFinal = 'Acrobat Pro DC';
        familiaLegacy = 'ACROBAT';
      } else {
        nomeFinal = nomeSingle; // Photoshop, Illustrator...
        familiaLegacy = 'SINGLE_POOL';
      }
    } else {
      if (!nomeCustom.trim()) { alert('Digite o nome do software ex: AutoCAD'); setSaving(false); return; }
      nomeFinal = nomeCustom.trim();
      familiaLegacy = 'OUTROS';
    }

    const payload = {
      nome: nomeFinal,
      is_adobe: isAdobe,
      tipo_adobe: isAdobe? tipoAdobe : null,
      qtd_contratada: tipoAdobe === 'SINGLE' && isAdobe? 0 : Number(qtd),
      familia: familiaLegacy // para compatibilidade com seu codigo antigo
    };

    const { error } = await supabase.from('softwares').insert(payload);
    if (error) { alert(error.message); setSaving(false); return; }

    setNomeCustom('');
    setQtd(0);
    onRefresh();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este software?')) return;
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  const totalContratado = softwares.reduce((a,s)=>a+(s.qtd_contratada||0),0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col">

        <div className="flex justify-between items-center p-5 border-b border-[#1e293b]">
          <h3 className="text-white font-bold flex items-center gap-2"><Layers className="w-5 h-5 text-[#D4AF37]" /> Gerenciar Softwares - Cadastro</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#94a3b8]" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* SEU FLUXO: Novo Software > É Adobe? */}
          <div className="bg-[#001726] p-4 rounded-xl border border-[#1e293b] space-y-3">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">Novo Software</p>

            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input type="checkbox" checked={isAdobe} onChange={e=>setIsAdobe(e.target.checked)} className="accent-[#D4AF37]" />
              É Adobe?
            </label>

            {isAdobe? (
              <div className="space-y-3">
                <select value={tipoAdobe} onChange={e=>setTipoAdobe(e.target.value as any)} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm">
                  <option value="ALL_APPS">Adobe - Todos os Apps</option>
                  <option value="ACROBAT">Adobe - Acrobat PRO DC</option>
                  <option value="SINGLE">Adobe - Aplicativo Individual</option>
                </select>

                {tipoAdobe === 'SINGLE'? (
                  <>
                    <select value={nomeSingle} onChange={e=>setNomeSingle(e.target.value)} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm">
                      {ADOBE_SINGLES.map(app => <option key={app} value={app}>{app}</option>)}
                    </select>
                    <p className="text-[11px] text-[#64748b]">App individual consome 1 licença do Pool Single Apps (225). Qtd fica 0.</p>
                  </>
                ) : (
                  <input type="number" value={qtd} onChange={e=>setQtd(Number(e.target.value))} placeholder="Quantidade contratada ex: 202" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input value={nomeCustom} onChange={e=>setNomeCustom(e.target.value)} placeholder="Nome do software ex: AutoCAD, Revit" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
                <input type="number" value={qtd} onChange={e=>setQtd(Number(e.target.value))} placeholder="Quantidade de licencas ex: 10" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
              </div>
            )}

            <button onClick={handleSave} disabled={saving} className="w-full bg-[#D4AF37] text-[#001726] font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving? 'Salvando...' : 'Salvar Software'}
            </button>
          </div>

          {/* LISTA */}
          <div className="space-y-2">
            <p className="text-xs text-[#94a3b8]">Cadastrados ({softwares.length}) - Total contratado: {totalContratado}</p>
            {softwares.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Box className={`w-4 h-4 ${s.is_adobe? 'text-[#D4AF37]' : 'text-sky-400'}`} />
                  <div>
                    <p className="text-white text-sm font-medium">{s.nome}</p>
                    <p className="text-[11px] text-[#64748b]">{s.is_adobe? `Adobe - ${s.tipo_adobe}` : 'Não Adobe'} {s.qtd_contratada>0? ` - ${s.qtd_contratada} licenças` : ' - consome do pool'}</p>
                  </div>
                </div>
                <button onClick={()=>handleDelete(s.id)} className="text-xs text-red-400 hover:text-red-300">Excluir</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
