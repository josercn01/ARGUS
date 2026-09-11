import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Box, Layers, Pencil, Trash2 } from 'lucide-react';
import type { Software } from '@/types';

const ADOBE_SINGLES = [
  "Photoshop","Illustrator","InDesign","Premiere Pro","After Effects",
  "Acrobat Pro DC","Lightroom","XD","Audition","Animate"
];

interface Props {
  softwares: Software[];
  initialData?: Software | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function SoftwareManagement({ softwares, initialData, onClose, onRefresh }: Props) {
  const [isAdobe, setIsAdobe] = useState(true);
  const [tipoAdobe, setTipoAdobe] = useState<'ALL_APPS' | 'ACROBAT' | 'SINGLE'>('SINGLE');
  const [nomeCustom, setNomeCustom] = useState('');
  const [nomeSingle, setNomeSingle] = useState('Photoshop');
  const [qtd, setQtd] = useState<number>(202);
  const [isPoolSingle, setIsPoolSingle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm(){
    setEditingId(null);
    setNomeCustom('');
    setQtd(202);
    setIsPoolSingle(false);
    setNomeSingle('Photoshop');
    setTipoAdobe('SINGLE');
    setIsAdobe(true);
  }

  function startEdit(s: any){
    setEditingId(s.id);
    setIsAdobe(s.is_adobe);
    setQtd(s.qtd_contratada || 0);
    if(s.is_adobe){
      if(s.tipo_adobe) setTipoAdobe(s.tipo_adobe);
      if(s.familia === 'SINGLE_POOL' && s.qtd_contratada > 0){
        setIsPoolSingle(true);
      } else if(s.familia === 'SINGLE_POOL'){
        setIsPoolSingle(false);
        setNomeSingle(s.nome);
        setTipoAdobe('SINGLE');
      }
    } else {
      setNomeCustom(s.nome);
    }
  }

  useEffect(()=>{
    if(initialData) startEdit(initialData);
  }, [initialData]);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    let nomeFinal = '';
    let familiaLegacy = '';
    let qtdFinal = Number(qtd) || 0;

    if (isAdobe) {
      if (tipoAdobe === 'ALL_APPS') {
        nomeFinal = qtdFinal > 0? `Todos os Apps - Edicao 4 (${qtdFinal})` : 'Todos os Apps - Edicao 4';
        familiaLegacy = 'ALL_APPS';
      } else if (tipoAdobe === 'ACROBAT') {
        nomeFinal = qtdFinal > 0? `Acrobat Pro DC (${qtdFinal})` : 'Acrobat Pro DC';
        familiaLegacy = 'ACROBAT';
      } else {
        if (isPoolSingle) {
          nomeFinal = `Pool Single Apps - ${qtdFinal} licencas`;
          familiaLegacy = 'SINGLE_POOL';
          qtdFinal = Number(qtd) || 225;
        } else {
          nomeFinal = nomeSingle;
          familiaLegacy = 'SINGLE_POOL';
          qtdFinal = 0;
        }
      }
    } else {
      if (!nomeCustom.trim()) { alert('Digite o nome do software ex: AutoCAD'); setSaving(false); return; }
      nomeFinal = nomeCustom.trim();
      familiaLegacy = 'OUTROS';
    }

    const payload = { nome: nomeFinal, is_adobe: isAdobe, tipo_adobe: isAdobe? tipoAdobe : null, qtd_contratada: qtdFinal, familia: familiaLegacy };

    let error;
    if(editingId){
      const res = await supabase.from('softwares').update(payload).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('softwares').insert(payload);
      error = res.error;
    }

    if (error) { alert(error.message); setSaving(false); return; }
    resetForm(); onRefresh(); setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este software? Vai remover de todos os usuários vinculados.')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  const totalContratado = softwares.reduce((a, s) => a + (s.qtd_contratada || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-[#1e293b]">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#D4AF37]" /> Gerenciar Softwares - {editingId? 'Editar' : 'Cadastro'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-[#94a3b8]" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-[#001726] p-4 rounded-xl border border-[#1e293b] space-y-3">
            <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">{editingId? 'Editando Software' : 'Novo Software'}</p>

            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input type="checkbox" checked={isAdobe} onChange={e => setIsAdobe(e.target.checked)} className="accent-[#D4AF37]" />
              É Adobe?
            </label>

            {isAdobe? (
              <div className="space-y-3">
                <select value={tipoAdobe} onChange={e => setTipoAdobe(e.target.value as any)} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm">
                  <option value="ALL_APPS">Adobe - Todos os Apps</option>
                  <option value="ACROBAT">Adobe - Acrobat PRO DC</option>
                  <option value="SINGLE">Adobe - Aplicativo Individual</option>
                </select>
                {tipoAdobe === 'SINGLE'? (
                  <>
                    <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                      <input type="checkbox" checked={isPoolSingle} onChange={e => setIsPoolSingle(e.target.checked)} className="accent-[#D4AF37]" />
                      Este cadastro é o Pool (ex: 225 licenças)
                    </label>
                    {isPoolSingle? (
                      <input type="number" value={qtd} onChange={e => setQtd(Number(e.target.value))} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
                    ) : (
                      <>
                        <select value={nomeSingle} onChange={e => setNomeSingle(e.target.value)} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm">
                          {ADOBE_SINGLES.map(app => <option key={app} value={app}>{app}</option>)}
                        </select>
                        <p className="text-[11px] text-[#64748b]">App individual com qtd 0, consome 1 do Pool.</p>
                      </>
                    )}
                  </>
                ) : (
                  <input type="number" value={qtd} onChange={e => setQtd(Number(e.target.value))} className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input value={nomeCustom} onChange={e => setNomeCustom(e.target.value)} placeholder="Nome do software ex: AutoCAD, Revit" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
                <input type="number" value={qtd} onChange={e => setQtd(Number(e.target.value))} placeholder="Quantidade ex: 10" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg px-3 py-2.5 text-white text-sm" />
              </div>
            )}

            <div className="flex gap-2">
              {editingId && <button onClick={resetForm} className="flex-1 bg-[#1e293b] text-white font-bold py-2.5 rounded-lg text-sm">Cancelar</button>}
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#D4AF37] text-[#001726] font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving? 'Salvando...' : editingId? 'Atualizar Software' : 'Salvar Software'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#94a3b8]">Cadastrados ({softwares.length}) - Total: {totalContratado}</p>
            {softwares.map(s => (
              <div key={s.id} className="flex justify-between items-center bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Box className={`w-4 h-4 ${s.is_adobe? 'text-[#D4AF37]' : 'text-sky-400'}`} />
                  <div>
                    <p className="text-white text-sm font-medium">{s.nome}</p>
                    <p className="text-[11px] text-[#64748b]">{s.is_adobe? `Adobe - ${s.tipo_adobe}` : 'Não Adobe'} {s.qtd_contratada > 0? ` - ${s.qtd_contratada} licenças` : ' - consome do pool'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(s)} className="p-1.5 bg-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
