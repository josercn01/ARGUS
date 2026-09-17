import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Building2, Plus, Edit2, Trash2, X, Save, Upload, Download } from 'lucide-react';

type Cliente = {
  id: number;
  nome: string;
  cnpj?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  setor?: string;
  contrato?: string;
  licencas?: string;
  status: string;
  observacao?: string;
};

const STORAGE_KEY = 'argus_cartela_clientes_v1';

export function CartelaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, nome: 'Câmara dos Deputados', cnpj: '00.530.352/0001-59', contato: 'João Silva', telefone: '61 99999-9999', setor: 'TI', contrato: 'CT-001/2024', licencas: '50 Bird ID', status: 'ATIVO', observacao: '' },
    ];
  });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [editItem, setEditItem] = useState<Cliente | null>(null);
  const [novoItem, setNovoItem] = useState<Partial<Cliente> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NÃO PERDE MAIS OS DADOS
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
  }, [clientes]);

  const importarPlanilha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      let start = 0;
      for (let i = 0; i < 10; i++) {
        if (lines[i]?.toLowerCase().includes('nome') || lines[i]?.toLowerCase().includes('cliente')) { start = i + 1; break; }
      }
      const novos: Cliente[] = [];
      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 2 ||!cols[0]) continue;
        novos.push({
          id: Date.now() + i,
          nome: cols[0], cnpj: cols[1], contato: cols[2], telefone: cols[3],
          email: cols[4], setor: cols[5], contrato: cols[6], licencas: cols[7],
          status: (cols[8] || 'ATIVO').toUpperCase(), observacao: cols[9] || ''
        });
      }
      if (novos.length > 0) { setClientes(novos); alert(`Importados ${novos.length} clientes!`); }
    };
    reader.readAsText(file, 'utf-8'); e.target.value = '';
  };

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const mBusca =!busca || `${c.nome} ${c.cnpj} ${c.contato}`.toLowerCase().includes(busca.toLowerCase());
      const mStatus = filtroStatus === 'Todos' || c.status.includes(filtroStatus);
      return mBusca && mStatus;
    }).sort((a,b) => a.nome.localeCompare(b.nome));
  }, [clientes, busca, filtroStatus]);

  const excluir = (id: number) => { if (confirm('Excluir?')) setClientes(p => p.filter(c => c.id!== id)); };
  const salvarEdicao = () => { if (!editItem) return; setClientes(p => p.map(c => c.id === editItem.id? editItem : c)); setEditItem(null); };
  const salvarNovo = () => {
    if (!novoItem?.nome?.trim()) return alert('Nome obrigatório');
    setClientes(p => [...p, { id: Date.now(), nome: novoItem.nome!, status: 'ATIVO',...novoItem } as Cliente]);
    setNovoItem(null);
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold">Cartela de Clientes</h1>
            <p className="text-[11px] text-[#D4AF37] font-mono">GESTÃO DE CLIENTES • ARGUS - {clientes.length} clientes</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={importarPlanilha} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2"><Upload className="w-4 h-4" /> Importar</button>
            <button onClick={() => setNovoItem({ nome: '', status: 'ATIVO' })} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Cliente</button>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full h-11 pl-10 pr-4 bg-[#08152a] border border-white/10 rounded-xl text-[13px]" /></div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="h-11 px-4 bg-[#08152a] border border-white/10 rounded-xl text-[12px]"><option>Todos</option><option>ATIVO</option><option>INATIVO</option></select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map(cli => (
            <div key={cli.id} className="bg-[#0a1930] border border-white/10 rounded-2xl p-5">
              <div className="flex justify-between">
                <div><h3 className="text-[13px] font-bold">{cli.nome}</h3><span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{cli.status}</span></div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditItem(cli)} className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => excluir(cli.id)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-zinc-400">{cli.cnpj} • {cli.contato} • {cli.telefone}</div>
            </div>
          ))}
        </div>

        {editItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70" onClick={() => setEditItem(null)} />
            <div className="relative bg-[#0a1930] border border-white/10 rounded-2xl p-6 w-full max-w-xl">
              <h3 className="font-bold mb-4">Editar Cliente</h3>
              <input value={editItem.nome} onChange={e => setEditItem({...editItem, nome: e.target.value })} className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg mb-2" />
              <input value={editItem.cnpj} onChange={e => setEditItem({...editItem, cnpj: e.target.value })} className="w-full h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg mb-2" />
              <div className="flex justify-end gap-2 mt-4"><button onClick={() => setEditItem(null)} className="h-10 px-5 bg-white/5 rounded-xl">Cancelar</button><button onClick={salvarEdicao} className="h-10 px-5 bg-[#D4AF37] text-black font-bold rounded-xl">Salvar</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
