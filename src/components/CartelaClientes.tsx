import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Users, Building2, Plus, Edit2, Trash2, X, Save, Upload, Download, Briefcase } from 'lucide-react';

type Cliente = {
  id: number;
  gerente: string;
  cliente: string;
  suplente?: string;
  status: string;
};

const STORAGE_KEY = 'argus_cartela_clientes_v2';

const DADOS_BASE: Cliente[] = [
  { id: 1, gerente: 'Bruna', cliente: 'Senador Angelo Coronel', status: 'ATIVO' },
  { id: 2, gerente: 'Bruna', cliente: 'Senador Paulo Paim', status: 'ATIVO' },
  { id: 3, gerente: 'Bruna', cliente: 'LIDERANÇA DA MAIORIA Lider Veneziano Vital do Rêgo', status: 'ATIVO' },
  { id: 4, gerente: 'Bruna', cliente: 'Senador Veneziano Vital do Rêgo', status: 'ATIVO' },
  { id: 5, gerente: 'Bruna', cliente: 'LIDERANÇA DO GOVERNO Lider Teresa Leitão', status: 'ATIVO' },
  { id: 6, gerente: 'Bruna', cliente: 'Senador Eduardo Girão', suplente: 'fabia', status: 'ATIVO' },
  { id: 7, gerente: 'Bruna', cliente: 'Senador Jaques Wagner', status: 'ATIVO' },
  { id: 8, gerente: 'Bruna', cliente: 'Senador Laércio Oliveira', status: 'ATIVO' },
  { id: 9, gerente: 'Bruna', cliente: 'Senador Plínio Valério', status: 'ATIVO' },
  { id: 10, gerente: 'Bruna', cliente: 'GABINETE DA LIDERANÇA DO PARTIDO PROGRESSISTA - Tereza Cristina', status: 'ATIVO' },
  { id: 11, gerente: 'Bruna', cliente: 'Gabinete da Liderança do PSDB - Lider Senador Plínio Valério', status: 'ATIVO' },
  { id: 12, gerente: 'Bruna', cliente: 'Senadora Tereza Cristina', status: 'ATIVO' },
  { id: 13, gerente: 'Bruna', cliente: 'Senadora Teresa Leitão', status: 'ATIVO' },
  { id: 14, gerente: 'Claudilene', cliente: 'Senador Oriovisto Guimarães', status: 'ATIVO' },
  { id: 15, gerente: 'Claudilene', cliente: 'Senadora Margareth Buzetti', status: 'ATIVO' },
  { id: 16, gerente: 'Claudilene', cliente: 'Senador Marcos do Val', status: 'ATIVO' },
  { id: 17, gerente: 'Claudilene', cliente: 'Senador Eduardo Gomes', status: 'ATIVO' },
  { id: 18, gerente: 'Claudilene', cliente: 'Senador Sérgio Petecão', status: 'ATIVO' },
  { id: 19, gerente: 'Claudilene', cliente: 'Senadora Jussara Lima', status: 'ATIVO' },
  { id: 20, gerente: 'Claudilene', cliente: 'Bloco Parlamentar Democracia - Professora Dorinha', status: 'ATIVO' },
  { id: 21, gerente: 'Claudilene', cliente: 'Liderança da Bancada Feminina - Professora Dorinha', status: 'ATIVO' },
  { id: 22, gerente: 'Claudilene', cliente: 'Senadora Professora Dorinha', status: 'ATIVO' },
  { id: 23, gerente: 'Claudilene', cliente: 'Senador Wilder Morais', status: 'ATIVO' },
  { id: 24, gerente: 'Danielle', cliente: 'Senador Márcio Bittar', status: 'ATIVO' },
  { id: 25, gerente: 'Danielle', cliente: 'DIRETORIA GERAL', status: 'ATIVO' },
  { id: 26, gerente: 'Danielle', cliente: 'Senador Carlos Portinho', status: 'ATIVO' },
  { id: 27, gerente: 'Danielle', cliente: 'Senador Sérgio Moro', status: 'ATIVO' },
  { id: 28, gerente: 'Danielle', cliente: 'Senador Alan Rick', status: 'ATIVO' },
  { id: 29, gerente: 'Danielle', cliente: 'Senador Jorge Seif', status: 'ATIVO' },
  { id: 30, gerente: 'Danielle', cliente: 'Senadora Leila Barros', status: 'ATIVO' },
  { id: 31, gerente: 'Danielle', cliente: 'BLOCO PARLAMENTAR DEMOCRACIA (MDB/UNIÃO/PODEMOS/PSDB) Lider Efraim Filho', status: 'ATIVO' },
  { id: 32, gerente: 'Danielle', cliente: 'LIDERANÇA DO PL', status: 'ATIVO' },
  { id: 33, gerente: 'Danielle', cliente: 'LIDERANÇA DO PARTIDO UNIÃO BRASIL', status: 'ATIVO' },
  { id: 34, gerente: 'Danielle', cliente: 'Senadora Augusta Brito', status: 'ATIVO' },
  { id: 35, gerente: 'Guilherme', cliente: 'Senador Iraja', status: 'ATIVO' },
  { id: 36, gerente: 'Guilherme', cliente: 'LIDERANÇA DO REPUBLICANOS', status: 'ATIVO' },
  { id: 37, gerente: 'Guilherme', cliente: 'LIDERANÇA DO PDT', status: 'ATIVO' },
  { id: 38, gerente: 'Guilherme', cliente: 'LIDERANÇA DA MAIORIA DO CONGRESSO NACIONAL', status: 'ATIVO' },
  { id: 39, gerente: 'Guilherme', cliente: 'Senador Flávio Bolsonaro', status: 'ATIVO' },
  { id: 40, gerente: 'Guilherme', cliente: 'Senador Rogério Carvalho', status: 'ATIVO' },
  { id: 41, gerente: 'Guilherme', cliente: 'Senador Giordano', status: 'ATIVO' },
  { id: 42, gerente: 'Guilherme', cliente: 'Senador Lucas Barreto', status: 'ATIVO' },
  { id: 43, gerente: 'Guilherme', cliente: 'Senador Efraim Filho', status: 'ATIVO' },
  { id: 44, gerente: 'Hermes', cliente: 'Senador Cleitinho Azevedo', status: 'ATIVO' },
  { id: 45, gerente: 'Hermes', cliente: 'Senadora Damares Alves', status: 'ATIVO' },
  { id: 46, gerente: 'Hermes', cliente: 'Senador DR. Hiran', status: 'ATIVO' },
  { id: 47, gerente: 'Hermes', cliente: 'Senador Fabiano Contarato', status: 'ATIVO' },
  { id: 48, gerente: 'Hermes', cliente: 'Senador Humberto Costa', status: 'ATIVO' },
  { id: 49, gerente: 'Hermes', cliente: 'Senador Luis Carlos Heinze / Ireneu Orth', status: 'ATIVO' },
  { id: 50, gerente: 'Hermes', cliente: 'Senador Wellington Fagundes / Rosana Martinelli', status: 'ATIVO' },
  { id: 51, gerente: 'Hermes', cliente: 'BLOCO PARLAMENTAR VANGUARDA - PL - NOVO - Lider Wellington Fagundes', status: 'ATIVO' },
  { id: 52, gerente: 'Hermes', cliente: 'Senador Magno Malta', status: 'ATIVO' },
  { id: 53, gerente: 'Hermes', cliente: 'BLOCO PARLAMENTAR ALIANÇA PP - REPUBLICANOS - Lider Dr. Hiran', status: 'ATIVO' },
  { id: 54, gerente: 'Hermínio', cliente: 'Presidencia', status: 'ATIVO' },
  { id: 55, gerente: 'Hermínio', cliente: 'Senadora Ana Paula Lobato', status: 'ATIVO' },
  { id: 56, gerente: 'Hermínio', cliente: 'Senador Davi Alcolumbre', status: 'ATIVO' },
  { id: 57, gerente: 'Hermínio', cliente: 'Senador Jayme Campos', status: 'ATIVO' },
  { id: 58, gerente: 'Hermínio', cliente: '1ª secretaria Senadora Daniela Ribeiro', status: 'ATIVO' },
  { id: 59, gerente: 'Hermínio', cliente: '2ª secretaria Senador Confucio Moura', status: 'ATIVO' },
  { id: 60, gerente: 'Hermínio', cliente: '3ª secretaria Senadora Ana Paula', status: 'ATIVO' },
  { id: 61, gerente: 'Hermínio', cliente: '4ª secretaria Senador Laercio Oliveira', status: 'ATIVO' },
  { id: 62, gerente: 'Hermínio', cliente: 'LIDERANÇA DO BLOCO DA MINORIA Lider Ciro Nogueira', status: 'ATIVO' },
  { id: 63, gerente: 'Hermínio', cliente: 'LIDERANÇA DO PSB', status: 'ATIVO' },
  { id: 64, gerente: 'Hermínio', cliente: 'LIDERANÇA DO PSD - Lider Otto Alencar', status: 'ATIVO' },
  { id: 65, gerente: 'Hermínio', cliente: 'Senador Ciro Nogueira', status: 'ATIVO' },
  { id: 66, gerente: 'Hermínio', cliente: 'Senador Otto Alencar', status: 'ATIVO' },
  { id: 67, gerente: 'Paulo DG', cliente: 'Senador Astronauta Marcos Pontes', status: 'ATIVO' },
  { id: 68, gerente: 'Paulo DG', cliente: 'Senador Jorge Kajuru', status: 'ATIVO' },
  { id: 69, gerente: 'Paulo DG', cliente: 'Senadora Zenaide Maia', status: 'ATIVO' },
  { id: 70, gerente: 'Paulo DG', cliente: 'Senador Styvenson Valentim', status: 'ATIVO' },
  { id: 71, gerente: 'Paulo DG', cliente: 'Senador Marcos Rogerio', status: 'ATIVO' },
  { id: 72, gerente: 'Paulo DG', cliente: 'Senadora Eliziane Gama / Bene Camacho', status: 'ATIVO' },
  { id: 73, gerente: 'Paulo DG', cliente: 'Senador Renan Calheiros', status: 'ATIVO' },
  { id: 74, gerente: 'Paulo DG', cliente: 'Senador Jader Barbalho', status: 'ATIVO' },
  { id: 75, gerente: 'Paulo DG', cliente: 'Bloco Parlamentar Pelo Brasil - Weverton Rocha', status: 'ATIVO' },
  { id: 76, gerente: 'Paulo DG', cliente: 'LIDERANÇA DO BLOCO PELO BRASIL', status: 'ATIVO' },
  { id: 77, gerente: 'Paulo DG', cliente: 'Senador Weverton Rocha', status: 'ATIVO' },
  { id: 78, gerente: 'Paulo DG', cliente: 'Senador Randolfe Rodrigues - REDE', status: 'ATIVO' },
  { id: 79, gerente: 'Ronaldo', cliente: 'Senador Beto Faro', status: 'ATIVO' },
  { id: 80, gerente: 'Ronaldo', cliente: 'Senador Carlos Viana / Castellar Neto', status: 'ATIVO' },
  { id: 81, gerente: 'Ronaldo', cliente: 'Senadora Dra. Eudócia', status: 'ATIVO' },
  { id: 82, gerente: 'Ronaldo', cliente: 'Senador Hamilton Mourão', status: 'ATIVO' },
  { id: 83, gerente: 'Ronaldo', cliente: 'Senador Izalci Lucas', status: 'ATIVO' },
  { id: 84, gerente: 'Ronaldo', cliente: 'Senador Jaime Bagattoli', status: 'ATIVO' },
  { id: 85, gerente: 'Ronaldo', cliente: 'Senador Omar Aziz', status: 'ATIVO' },
  { id: 86, gerente: 'Ronaldo', cliente: 'Senador Otto Alencar', status: 'ATIVO' },
  { id: 87, gerente: 'Ronaldo', cliente: 'Senador Romário', status: 'ATIVO' },
  { id: 88, gerente: 'Ronaldo', cliente: 'Senadora Soraya Thronicke', status: 'ATIVO' },
  { id: 89, gerente: 'Ronaldo', cliente: 'Senador Mecias de Jesus', status: 'ATIVO' },
  { id: 90, gerente: 'Tatiane', cliente: 'LIDERANÇA DA OPOSIÇÃO Lider Rogerio Marinho', status: 'ATIVO' },
  { id: 91, gerente: 'Tatiane', cliente: 'Senador Alessandro Vieira', status: 'ATIVO' },
  { id: 92, gerente: 'Tatiane', cliente: 'Senador Chico Rodrigues', status: 'ATIVO' },
  { id: 93, gerente: 'Tatiane', cliente: 'Senador Esperidião Amin', status: 'ATIVO' },
  { id: 94, gerente: 'Tatiane', cliente: 'Senador Flávio Arns', status: 'ATIVO' },
  { id: 95, gerente: 'Tatiane', cliente: 'Senador Marcelo Castro', status: 'ATIVO' },
  { id: 96, gerente: 'Tatiane', cliente: 'Senadora Mara Gabrilli', status: 'ATIVO' },
  { id: 97, gerente: 'Tatiane', cliente: 'Senador Eduardo Braga', status: 'ATIVO' },
  { id: 98, gerente: 'Tatiane', cliente: 'Senador Rogério Marinho / Flavio Azevedo', status: 'ATIVO' },
  { id: 99, gerente: 'Tatiane', cliente: 'Senador Vanderlan Cardoso', status: 'ATIVO' },
  { id: 100, gerente: 'Tatiane', cliente: 'LIDERANÇA DO PODEMOS', status: 'ATIVO' },
  { id: 101, gerente: 'Wellber', cliente: 'Senador Nelsinho Trad', status: 'ATIVO' },
  { id: 102, gerente: 'Wellber', cliente: 'Senador Randolfe Rodrigues', status: 'ATIVO' },
  { id: 103, gerente: 'Wellber', cliente: 'Senador Rodrigo Pacheco', status: 'ATIVO' },
  { id: 104, gerente: 'Wellber', cliente: 'BLOCO DA LIDERANÇA DA MINORIA NO CONGRESSO NACIONAL', status: 'ATIVO' },
  { id: 105, gerente: 'Wellber', cliente: 'Senadora Ivete da Silveira / Beto Martins', status: 'ATIVO' },
  { id: 106, gerente: 'Wellber', cliente: 'Senador Zequinha Marinho', status: 'ATIVO' },
  { id: 107, gerente: 'Wellber', cliente: 'LIDERANÇA DO PT', status: 'ATIVO' },
  { id: 108, gerente: 'Wellber', cliente: 'LIDERANÇA DO PSD', status: 'ATIVO' },
  { id: 109, gerente: 'Wellber', cliente: 'Senador Fernando Dueire', status: 'ATIVO' },
  { id: 110, gerente: 'Wellber', cliente: 'Senador Mecias De Jesus / Roberta Acioly', status: 'ATIVO' },
  { id: 111, gerente: 'Wellber', cliente: 'Senador Carlos Portinho - Suplente', status: 'ATIVO' },
];

export function CartelaClientes() {
  const [dados, setDados] = useState<Cliente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length >= 50) return parsed;
      }
    } catch {}
    return DADOS_BASE;
  });

  const [gerenteSelecionado, setGerenteSelecionado] = useState<string | null>(null);
  const [buscaModal, setBuscaModal] = useState('');
  const [editItem, setEditItem] = useState<Cliente | null>(null);
  const [novoItem, setNovoItem] = useState<Partial<Cliente> | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const stats = useMemo(() => {
    const gerentes = [...new Set(dados.map(d => d.gerente))].sort();
    return {
      total: dados.length,
      gerentes: gerentes.length,
      porGerente: gerentes.map(g => ({
        gerente: g,
        total: dados.filter(d => d.gerente === g).length,
        clientes: dados.filter(d => d.gerente === g).sort((a,b) => a.cliente.localeCompare(b.cliente))
      })).sort((a,b) => b.total - a.total)
    };
  }, [dados]);

  const clientesDoModal = useMemo(() => {
    if (!gerenteSelecionado) return [];
    let lista = gerenteSelecionado === 'TOTAL'? dados : dados.filter(d => d.gerente === gerenteSelecionado);
    if (buscaModal) {
      lista = lista.filter(c => `${c.cliente} ${c.suplente}`.toLowerCase().includes(buscaModal.toLowerCase()));
    }
    return lista.sort((a,b) => a.cliente.localeCompare(b.cliente));
  }, [dados, gerenteSelecionado, buscaModal]);

  const excluir = (id: number) => { if (confirm('Excluir cliente?')) setDados(p => p.filter(d => d.id!== id)); };
  const salvarEdicao = () => { if (!editItem) return; setDados(p => p.map(d => d.id === editItem.id? editItem : d)); setEditItem(null); };
  const salvarNovo = () => {
    if (!novoItem?.cliente?.trim() ||!novoItem?.gerente?.trim()) return alert('Gerente e Cliente obrigatórios');
    setDados(p => [...p, { id: Date.now(), gerente: novoItem.gerente!, cliente: novoItem.cliente!, suplente: novoItem.suplente || '', status: 'ATIVO' }]);
    setNovoItem(null);
  };

  const importarPlanilha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result as string;
        const lines = data.split('\n').filter(l => l.trim());
        let start = 0;
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          if (lines[i].toLowerCase().includes('gerente')) { start = i + 1; break; }
        }
        const novos: Cliente[] = [];
        for (let i = start; i < lines.length; i++) {
          const cols = lines[i].split(/[,;\t]/).map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length < 2 ||!cols[0]) continue;
          novos.push({ id: Date.now() + i, gerente: cols[0], cliente: cols[1], suplente: cols[2], status: 'ATIVO' });
        }
        if (novos.length > 0) { setDados(novos); alert(`Importados ${novos.length} clientes!`); }
      } catch (err) { alert('Erro ao importar'); }
    };
    reader.readAsText(file, 'utf-8'); e.target.value = '';
  };

  const exportar = (gerente: string) => {
    const lista = gerente === 'TOTAL'? dados : dados.filter(d => d.gerente === gerente);
    const csv = ['GERENTE,CLIENTE,SUPLENTE,STATUS',...lista.map(d => `"${d.gerente}","${d.cliente}","${d.suplente || ''}","${d.status}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cartela_${gerente}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="bg-[#020C1A] min-h-screen -m-8 p-8 text-white">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><Building2 className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Cartela de Clientes</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1 tracking-widest">GERENTES DE RELACIONAMENTO • ARGUS</p>
              <p className="text-[12px] text-zinc-400 mt-2">{stats.total} clientes • {stats.gerentes} gerentes • Base importada</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={importarPlanilha} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10"><Upload className="w-4 h-4" /> Importar Planilha</button>
            <button onClick={() => setShowExportModal(true)} className="h-11 px-4 rounded-xl bg-[#0a1930] border border-white/10 text-[12px] flex items-center gap-2"><Download className="w-4 h-4" /> Exportar</button>
            <button onClick={() => setNovoItem({ gerente: '', cliente: '' })} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[13px] flex items-center gap-2"><Plus className="w-4 h-4" /> Novo</button>
          </div>
        </div>

        {/* CARDS APENAS GERENTES */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.porGerente.map(g => (
            <button
              key={g.gerente}
              onClick={() => { setGerenteSelecionado(g.gerente); setBuscaModal(''); }}
              className="text-left p-4 rounded-2xl bg-[#0a1930] border border-white/10 hover:border-[#D4AF37]/40 hover:bg-[#0a1930]/80 transition-all group cursor-pointer"
            >
              <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 group-hover:text-[#D4AF37] transition"><Briefcase className="w-3 h-3" /> {g.gerente}</div>
              <div className="text-[28px] font-bold mt-2 group-hover:text-[#D4AF37] transition">{g.total}</div>
              <div className="text-[11px] text-zinc-500 mt-1">clientes • clique para ver</div>
            </button>
          ))}
          <button
            onClick={() => { setGerenteSelecionado('TOTAL'); setBuscaModal(''); }}
            className="text-left p-4 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-all group cursor-pointer"
          >
            <div className="text-[10px] text-[#D4AF37] uppercase">TOTAL GERAL</div>
            <div className="text-[28px] font-bold text-[#D4AF37] mt-2">{stats.total}</div>
            <div className="text-[11px] text-[#D4AF37]/70 mt-1">{stats.gerentes} gerentes</div>
          </button>
        </div>

        {/* MODAL LISTA DE CLIENTES */}
        {gerenteSelecionado && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGerenteSelecionado(null)} />
            <div className="relative w-full max-w-3xl bg-[#0a1930] border border-white/10 rounded-2xl flex flex-col max-h-[85vh]">
              {/* Header Modal */}
              <div className="p-6 border-b border-white/10 shrink-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]"><Users className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-[16px]">{gerenteSelecionado === 'TOTAL'? 'Todos os Clientes' : `Clientes de ${gerenteSelecionado}`}</h3>
                      <p className="text-[11px] text-zinc-500 mt-1">{clientesDoModal.length} cliente{clientesDoModal.length!== 1? 's' : ''} {buscaModal && `• filtrado por "${buscaModal}"`}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => exportar(gerenteSelecionado)} className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-[11px] flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Exportar</button>
                    <button onClick={() => setGerenteSelecionado(null)} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={buscaModal} onChange={e => setBuscaModal(e.target.value)} placeholder="Buscar cliente neste gerente..." className="w-full h-10 pl-10 pr-4 bg-[#020C1A] border border-white/10 rounded-xl text-[13px] outline-none focus:border-[#D4AF37]/50" />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {clientesDoModal.map(cli => (
                  <div key={cli.id} className="group flex items-center justify-between gap-3 p-4 rounded-xl bg-[#020C1A] border border-white/5 hover:border-white/10 transition">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0"><Users className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{cli.cliente}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37]">{cli.gerente}</span>
                          {cli.suplente && <span className="text-[11px] text-zinc-500 truncate">Suplente: {cli.suplente}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => setEditItem(cli)} className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center transition"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => excluir(cli.id)} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 flex items-center justify-center transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {clientesDoModal.length === 0 && (
                  <div className="text-center py-12 text-zinc-500 text-[13px]">Nenhum cliente encontrado</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAIS EDIT / NOVO / EXPORT */}
        {editItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditItem(null)} />
            <div className="relative w-full max-w-lg bg-[#0a1930] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between mb-5"><h3 className="font-bold">Editar Cliente</h3><button onClick={() => setEditItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid gap-3">
                <input value={editItem.gerente} onChange={e => setEditItem({...editItem, gerente: e.target.value})} placeholder="Gerente" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.cliente} onChange={e => setEditItem({...editItem, cliente: e.target.value})} placeholder="Cliente" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={editItem.suplente||''} onChange={e => setEditItem({...editItem, suplente: e.target.value})} placeholder="Suplente" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={() => setEditItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarEdicao} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Save className="w-4 h-4" /> Salvar</button></div>
            </div>
          </div>
        )}

        {novoItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setNovoItem(null)} />
            <div className="relative w-full max-w-lg bg-[#0a1930] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between mb-5"><h3 className="font-bold">Novo Cliente</h3><button onClick={() => setNovoItem(null)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="grid gap-3">
                <select value={novoItem.gerente||''} onChange={e => setNovoItem({...novoItem, gerente: e.target.value})} className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]">
                  <option value="">Selecione Gerente</option>
                  {stats.porGerente.map(g => <option key={g.gerente} value={g.gerente}>{g.gerente}</option>)}
                </select>
                <input value={novoItem.cliente||''} onChange={e => setNovoItem({...novoItem, cliente: e.target.value})} placeholder="Nome do Cliente *" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
                <input value={novoItem.suplente||''} onChange={e => setNovoItem({...novoItem, suplente: e.target.value})} placeholder="Suplente (opcional)" className="h-10 px-3 bg-[#020C1A] border border-white/10 rounded-lg text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 mt-6"><button onClick={() => setNovoItem(null)} className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-[12px]">Cancelar</button><button onClick={salvarNovo} className="h-10 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2"><Plus className="w-4 h-4" /> Cadastrar</button></div>
            </div>
          </div>
        )}

        {showExportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
            <div className="relative w-full max-w-md bg-[#0a1930] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between mb-5"><h3 className="font-bold text-[14px]">Exportar Cartela</h3><button onClick={() => setShowExportModal(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                <button onClick={() => { exportar('TOTAL'); setShowExportModal(false); }} className="w-full text-left p-3 rounded-xl bg-[#020C1A] border border-white/10 hover:border-[#D4AF37]/30"><div className="text-[12px] font-bold">Todos os gerentes</div><div className="text-[11px] text-zinc-500">{stats.total} clientes</div></button>
                {stats.porGerente.map(g => (
                  <button key={g.gerente} onClick={() => { exportar(g.gerente); setShowExportModal(false); }} className="w-full text-left p-3 rounded-xl bg-[#020C1A] border border-white/10 hover:border-[#D4AF37]/30"><div className="text-[12px] font-bold">{g.gerente}</div><div className="text-[11px] text-zinc-500">{g.total} clientes</div></button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
