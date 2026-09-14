import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save } from 'lucide-react';

export function SoftwareManagement({ initialData, onClose, onRefresh }: any) {
  const [form, setForm] = useState({ nome:'', qtd_contratada:0, familia:'SINGLE_POOL', tipo_adobe:'SINGLE' });

  useEffect(()=>{
    if(initialData){
      setForm({
        nome: initialData.nome,
        qtd_contratada: initialData.qtd_contratada || 0,
        familia: initialData.familia || 'OUTROS',
        tipo_adobe: initialData.tipo_adobe || 'SINGLE'
      });
    }
  },[initialData]);

  async function handleSave(){
    if(!form.nome) return alert('Nome obrigatório');
    if(initialData){
      await supabase.from('softwares').update({...form, is_adobe: form.familia!=='OUTROS'}).eq('id', initialData.id);
    } else {
      await supabase.from('softwares').insert({...form, is_adobe: form.familia!=='OUTROS'});
    }
    onRefresh(); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[450px] p-5">
        <div className="flex justify-between mb-4">
          <h3 className="text-white font-bold">{initialData? 'Editar Software' : 'Cadastrar Software'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white"/></button>
        </div>
        <div className="space-y-3">
          <input value={form.nome} onChange={e=>setForm({...form, nome:e.target.value})} placeholder="Nome ex: AutoCAD ou Pool Single Apps - 225" className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2.5 text-white text-sm"/>
          <input type="number" value={form.qtd_contratada} onChange={e=>setForm({...form, qtd_contratada: Number(e.target.value)})} placeholder="Qtd contratada" className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2.5 text-white text-sm"/>
          <p className="text-[10px] text-[#64748b]">Use 0 para app filho (Photoshop) e &gt;0 para balde (225, 202, 10)</p>
          <select value={form.familia} onChange={e=>setForm({...form, familia:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2.5 text-white text-sm">
            <option value="SINGLE_POOL">SINGLE_POOL - Balde 225</option>
            <option value="ALL_APPS">ALL_APPS - Todos os Apps</option>
            <option value="ACROBAT">ACROBAT</option>
            <option value="OUTROS">OUTROS - AutoCAD, Revit</option>
          </select>
          <button onClick={handleSave} className="w-full bg-[#D4AF37] text-black font-bold p-3 rounded-lg flex justify-center gap-2"><Save className="w-4 h-4"/>{initialData?'Salvar Edição':'Cadastrar'}</button>
        </div>
      </div>
    </div>
  );
}
