import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { LicencaModal } from '@/components/LicencaModal';
import { ImportCSV } from '@/components/ImportCSV';
import { Users, Plus, Pencil, Trash2, Download, Upload, AlertCircle, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react';
import type { LicencaUsuario, Software, LocalTrabalho, SystemRole } from '@/types';

interface LicencasTableProps {
  data: LicencaUsuario[];
  softwares: Software[];
  locais: LocalTrabalho[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onImportBatch?: (file: File) => Promise<{ success: number; errors: string[] }>;
}

type SortKey = 'nome' | 'email' | 'cargo' | 'departamento' | 'software' | 'status';
const PODE_EDITAR: SystemRole[] = ['super_admin', 'admin', 'editor'];
const PODE_EXCLUIR: SystemRole[] = ['super_admin', 'admin'];

export const COLUNAS_BANCO = ['email', 'nome', 'login', 'departamento_raiz', 'cargo', 'tipo_licenca', 'tipo_produto', 'produto', 'app_individual', 'possui_licenca', 'status', 'atualizado_por', 'atualizado_em'] as const;

export function LicencasTable({ data, softwares, locais, role, loading, onRefresh }: LicencasTableProps) {
  const [modalItem, setModalItem] = useState<Partial<LicencaUsuario> | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortAsc, setSortAsc] = useState(true);

  const podeEditar = PODE_EDITAR.includes(role);
  const podeExcluir = PODE_EXCLUIR.includes(role);

  function softwareLabel(u: LicencaUsuario) {
    return (u as any).app_individual || u.tipo_produto || u.produto || '—';
  }

  const rows = useMemo(() => {
    const list = [...(data || [])];
    const value = (u: LicencaUsuario): string => {
      switch (sortKey) {
        case 'nome': return (u.nome ?? u.email ?? '').toLowerCase();
        case 'email': return (u.email ?? '').toLowerCase();
        case 'cargo': return (u.cargo ?? '').toLowerCase();
        case 'departamento': return (u.departamento_raiz ?? '').toLowerCase();
        case 'software': return softwareLabel(u).toLowerCase();
        case 'status': return (u.status ?? '').toLowerCase();
        default: return '';
      }
    };
    list.sort((a, b) => value(a).localeCompare(value(b), 'pt-BR'));
    return sortAsc ? list : list.reverse();
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  async function handleSave(form: Partial<LicencaUsuario>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email ?? null;

    const payload = {
      email: (form.email ?? '').trim().toLowerCase(),
      nome: form.nome?.trim() || null,
      login: (form.email?.split('@')[0].toLowerCase()) || null,
      departamento_raiz: form.departamento_raiz?.trim().toUpperCase() || null,
      cargo: form.cargo?.trim() || null,
      tipo_licenca: 'Adobe',
      tipo_produto: form.app_individual || form.tipo_produto || null,
      produto: form.produto || 'Aplicativo Individual',
      app_individual: form.app_individual || null,
      possui_licenca: Boolean(form.possui_licenca),
      status: form.status || 'Ativo',
      atualizado_por: atualizadoPor,
      atualizado_em: new Date().toISOString(),
    };

    if (!payload.email) throw new Error('O e-mail é obrigatório.');

    const { error: err } = await supabase.from('licencas_usuarios').upsert(payload, { onConflict: 'email' });
    if (err) throw new Error(err.message);

    setModalItem(null);
    await onRefresh();
  }

  async function handleDelete(item: LicencaUsuario) {
    if (!window.confirm(`Excluir ${item.nome ?? item.email}?`)) return;
    const { error: err } = await supabase.from('licencas_usuarios').delete().eq('id', (item as any).id);
    if (err) setError(err.message);
    else await onRefresh();
  }

  async function handleImport(rowsToImport: Partial<LicencaUsuario>[]) {
    let success = 0;
    const errors: string[] = [];
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email ?? null;

    for (const [index, raw] of rowsToImport.entries()) {
      const email = (raw as any).email?.trim().toLowerCase();
      if (!email) { errors.push(`Linha ${index + 2}: e-mail ausente.`); continue; }

      const payload = {
        email,
        nome: (raw as any).nome || null,
        login: email.split('@')[0],
        departamento_raiz: (raw as any).departamento_raiz || null,
        cargo: (raw as any).cargo || null,
        tipo_licenca: 'Adobe',
        tipo_produto: (raw as any).app_individual || (raw as any).tipo_produto || null,
        produto: (raw as any).produto || 'Aplicativo Individual',
        app_individual: (raw as any).app_individual || null,
        status: 'Ativo',
        possui_licenca: true,
        atualizado_por: atualizadoPor,
        atualizado_em: new Date().toISOString(),
      };

      const { error: err } = await supabase.from('licencas_usuarios').upsert(payload, { onConflict: 'email' });
      if (err) errors.push(`Linha ${index + 2} (${email}): ${err.message}`);
      else success++;
    }
    await onRefresh();
    return { success, errors };
  }

  function handleExport() {
    const csvContent = [
      'Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto',
      ...rows.map(u => `${u.email};${u.nome || ''};${u.departamento_raiz || ''};${u.cargo || ''};${u.produto || ''};${u.app_individual || u.tipo_produto || ''}`)
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licencas-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const thClass = 'text-xs font-semibold text-[#94a3b8] uppercase px-4 py-3 whitespace-nowrap';
  function SortableTh({ label, keyName }: { label: string; keyName: SortKey }) {
    return <th className={thClass}><button onClick={() => toggleSort(keyName)} className="flex items-center gap-1 hover:text-[#D4AF37] uppercase">{label}<ArrowUpDown className={`w-3 h-3 ${sortKey === keyName ? 'text-[#D4AF37]' : 'opacity-40'}`} /></button></th>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-[#D4AF37]" />Gestão de Licenças</h2>
          <p className="text-[#94a3b8] text-sm">{loading ? 'Carregando...' : `${rows.length} registro(s) encontrados`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} disabled={rows.length === 0} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg hover:text-white disabled:opacity-50"><Download className="w-4 h-4" />Exportar CSV</button>
          {podeEditar && <button onClick={() => setShowImport((v) => !v)} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg hover:text-white"><Upload className="w-4 h-4" />Importar</button>}
          {podeEditar && <button onClick={() => setModalItem({ status: 'Ativo', possui_licenca: true, produto: 'Aplicativo Individual' })} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg hover:bg-[#c19b2e]"><Plus className="w-4 h-4" />Novo Registro</button>}
        </div>
      </div>
      {error && <div className="flex gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
      {showImport && podeEditar && <ImportCSV onImport={handleImport} />}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><SortableTh label="Colaborador" keyName="nome" /><SortableTh label="Departamento" keyName="departamento" /><SortableTh label="Cargo" keyName="cargo" /><SortableTh label="Softwares" keyName="software" /><th className={thClass}>Licença</th><SortableTh label="Status" keyName="status" /><th className="w-20 px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-[#1e293b]">
              {rows.map((u) => (
                <tr key={(u as any).id} className="hover:bg-[#001726]/50">
                  <td className="px-4 py-3"><p className="text-white text-sm">{u.nome ?? '—'}</p><p className="text-[#64748b] text-xs">{u.email}</p></td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{u.departamento_raiz ?? '—'}</td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{u.cargo ?? '—'}</td>
                  <td className="px-4 py-3 text-[#D4AF37] text-sm font-medium">{softwareLabel(u)}</td>
                  <td className="px-4 py-3">{u.possui_licenca ? <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Possui</span> : <span className="text-[#64748b] text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Não</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">{podeEditar && <button onClick={() => setModalItem(u)} className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37]"><Pencil className="w-4 h-4" /></button>}{podeExcluir && <button onClick={() => handleDelete(u)} className="p-1.5 text-[#94a3b8] hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalItem !== null && <LicencaModal item={modalItem} softwares={softwares} locais={locais} onClose={() => setModalItem(null)} onSave={handleSave} />}
    </div>
  );
}
export default LicencasTable;
