import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save } from 'lucide-react';

export function CreateUserModal({ softwares, onClose, onRefresh }: any) {
  const [form, setForm] = useState({ colaborador:'', login:'', email:'', setor:'', cargo:'', status:'ativo' });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Na atribuição não mostra o balde 225, mostra só os apps filhos
  const atribuiveis = (softwares||[]).filter((s:any)=>!s.nome.toLowerCase().includes('pool single apps'));

  async function handleCreate(){
    if(!form.colaborador ||!form.email) return alert('Nome e e-mail obrigatórios');
    setSaving(true);
    const { data: userRow, error } = await supabase.from('usuarios').insert({
      colaborador: form.colaborador,
      login: (form.login || form.email.split('@')[0]).toLowerCase(),
      email: form.email,
      setor: form.setor?.toUpperCase() || null,
      cargo: form.cargo || null,
      status: form.status
    }).select('id').single();

    if(error){ alert(error.message); setSaving(false); return; }
    if(userRow && selected.length){
      await supabase.from('usuario_softwares').insert(selected.map((sid:string)=>({ usuario_id: userRow.id, software_id: sid })));
    }
    onRefresh(); onClose(); setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[500px] p-5">
        <div className="flex justify-between mb-4">
          <h3 className="text-white font-bold">Novo Cadastro</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white"/></button>
        </div>
        <div className="space-y-3">
          <input value={form.colaborador} onChange={e=>setForm({...form, colaborador:e.target.value})} placeholder="Nome completo" className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm"/>
          <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="E-mail @senado.leg.br" className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm"/>
          <input value={form.setor} onChange={e=>setForm({...form, setor:e.target.value})} placeholder="Setor ex: SF-OSE-DGER-PRDSTI-COATEN" className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm"/>
          <input value={form.cargo} onChange={e=>setForm({...form, cargo:e.target.value})} placeholder="Cargo" className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm"/>

          <div className="border border-[#1e293b] rounded-lg p-3 bg-[#00121E]">
            <p className="text-[11px] text-[#D4AF37] font-bold mb-2 uppercase">Licenças</p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {atribuiveis.map((s:any)=>
                <label key={s.id} className="flex gap-2 text-xs text-white cursor-pointer hover:text-[#D4AF37]">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={e=>{
                    if(e.target.checked) setSelected([...selected, s.id]);
                    else setSelected(selected.filter(id=>id!==s.id));
                  }} className="accent-[#D4AF37]"/> {s.nome.replace(' - Edicao 4 (202)','').replace(' (202)','')}
                </label>
              )}
            </div>
            <p className="text-[10px] text-[#64748b] mt-2">Apps individuais consomem 1 do balde de 225</p>
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full bg-[#D4AF37] text-black font-bold p-3 rounded-lg flex justify-center gap-2 text-sm"><Save className="w-4 h-4"/>{saving?'Salvando...':'Cadastrar'}</button>
        </div>
      </div>
    </div>
  );
}
