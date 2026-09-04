import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { LicencaModal } from '@/components/LicencaModal';
import { ImportCSV } from '@/components/ImportCSV';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';
import type { LicencaUsuario, Software, LocalTrabalho, SystemRole } from '@/types';

interface LicencasTableProps {
  data: LicencaUsuario[];
  softwares: Software[];
  locais: LocalTrabalho[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

type SortKey = 'nome' | 'email' | 'login' | 'chapa_matricula' | 'local' | 'software' | 'status';

const PODE_EDITAR: SystemRole[] = ['super_admin', 'admin', 'editor'];
const PODE_EXCLUIR: SystemRole[] = ['super_admin', 'admin'];

export function LicencasTable({ data, softwares, locais, role, loading, onRefresh }: LicencasTableProps) {
  const [modalItem, setModalItem] = useState<Partial<LicencaUsuario> | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortAsc, setSortAsc] = useState(true);

  const podeEditar = PODE_EDITAR.includes(role);
  const podeExcluir = PODE_EXCLUIR.includes(role);

  const softwareById = useMemo(() => {
    const map = new Map<string, Software>();
    (softwares || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [softwares]);

  const localById = useMemo(() => {
    const map = new Map<string, LocalTrabalho>();
    (locais || []).forEach((l) => map.set(l.id, l));
    return map;
  }, [locais]);

  function softwareLabel(u: LicencaUsuario) {
    const sw = u.software_id ? softwareById.get(u.software_id) : undefined;
    const partes = [
      sw?.fabricante ?? u.tipo_licenca,
      sw?.produto ?? u.produto ?? u.tipo_produto,
    ].filter(Boolean);
    return partes.length ? partes.join(' / ') : '—';
  }

  function localLabel(u: LicencaUsuario) {
    const l = u.local_id ? localById.get(u.local_id) : undefined;
    return l?.nome ?? u.local_nome ?? u.departamento_raiz ?? '—';
  }

  function chapaLabel(u: LicencaUsuario) {
    return u.chapa_matricula ?? u.matricula ?? '—';
  }

  const rows = useMemo(() => {
    const list = [...(data || [])];
    const value = (u: LicencaUsuario): string => {
      switch (sortKey) {
        case 'nome':
          return (u.nome ?? u.email ?? '').toLowerCase();
        case 'email':
          return (u.email ?? '').toLowerCase();
        case 'login':
          return (u.login ?? '').toLowerCase();
        case 'chapa_matricula':
          return (u.chapa_matricula ?? u.matricula ?? '').toLowerCase();
        case 'local':
          return localLabel(u).toLowerCase();
        case 'software':
          return softwareLabel(u).toLowerCase();
        case 'status':
          return (u.status ?? '').toLowerCase();
        default:
          return '';
      }
    };
    list.sort((a, b) => value(a).localeCompare(value(b), 'pt-BR'));
    return sortAsc ? list : list.reverse();
  }, [data, sortKey, sortAsc, softwareById, localById]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  async function handleSave(form: Partial<LicencaUsuario>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email ?? null;

    const sw = form.software_id ? softwareById.get(form.software_id) : undefined;
    const local = form.local_id ? localById.get(form.local_id) : undefined;

    const payload = {
      email: (form.email ?? '').trim().toLowerCase(),
      nome: form.nome?.trim() || null,
      login: form.login?.trim() || null,
      chapa_matricula: form.chapa_matricula?.trim() || null,
      matricula: form.chapa_matricula?.trim() || form.matricula?.trim() || null,
      local_id: form.local_id || null,
      local_nome: local?.nome ?? form.local_nome ?? null,
      departamento_raiz: form.departamento_raiz?.trim() || null,
      sub_departamento: form.sub_departamento?.trim() || null,
      software_id: form.software_id || null,
      tipo_licenca: form.tipo_licenca || sw?.fabricante || null,
      tipo_produto: form.tipo_produto || sw?.tipo_produto || null,
      produto: form.produto || sw?.produto || null,
      possui_licenca: Boolean(form.possui_licenca),
      status: form.status || 'Pendente',
      atualizado_por: atualizadoPor,
      atualizado_em: new Date().toISOString(),
    };

    if (!payload.email) throw new Error('O e-mail é obrigatório.');

    if (form.id) {
      const { error: err } = await supabase.from('licencas_usuarios').update(payload).eq('id', form.id);
      if (err) throw new Error(err.message);
    } else {
      const { error: err } = await supabase
        .from('licencas_usuarios')
        .upsert(payload, { onConflict: 'email' });
      if (err) throw new Error(err.message);
    }

    setModalItem(null);
    await onRefresh();
  }

  async function handleDelete(item: LicencaUsuario) {
    if (!window.confirm(`Excluir o registro de ${item.nome ?? item.email}?`)) return;
    setError(null);
    const { error: err } = await supabase.from('licencas_usuarios').delete().eq('id', item.id);
    if (err) setError(err.message);
    else await onRefresh();
  }

  async function handleImport(rowsToImport: Partial<LicencaUsuario>[]) {
    const errors: string[] = [];
    let success = 0;

    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email ?? null;
    const localByNome = new Map(
      (locais || []).map((l) => [l.nome.trim().toLowerCase(), l] as const),
    );

    for (const [index, raw] of rowsToImport.entries()) {
      const email = raw.email?.trim().toLowerCase();
      if (!email) {
        errors.push(`Linha ${index + 2}: e-mail ausente.`);
        continue;
      }

      const localNome = raw.local_nome?.trim();
      const local = localNome ? localByNome.get(localNome.toLowerCase()) : undefined;

      const { error: err } = await supabase.from('licencas_usuarios').upsert(
        {
          ...raw,
          email,
          local_id: local?.id ?? raw.local_id ?? null,
          local_nome: local?.nome ?? localNome ?? null,
          matricula: raw.chapa_matricula ?? raw.matricula ?? null,
          status: raw.status ?? 'Pendente',
          atualizado_por: atualizadoPor,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'email' },
      );

      if (err) errors.push(`Linha ${index + 2} (${email}): ${err.message}`);
      else success += 1;
    }

    await onRefresh();
    return { success, errors };
  }

  function handleExport() {
    const sheet = (rows || []).map((u) => ({
      NOME: u.nome ?? '',
      EMAIL: u.email ?? '',
      LOGIN: u.login ?? '',
      CHAPA_MATRICULA: u.chapa_matricula ?? u.matricula ?? '',
      LOCAL: localLabel(u) === '—' ? '' : localLabel(u),
      FABRICANTE: u.tipo_licenca ?? '',
      TIPO_PRODUTO: u.tipo_produto ?? '',
      PRODUTO: u.produto ?? '',
      POSSUI_LICENCA: u.possui_licenca ? 'Sim' : 'Não',
      STATUS: u.status ?? '',
      ATUALIZADO_POR: u.atualizado_por ?? '',
      ATUALIZADO_EM: u.atualizado_em ?? '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Licencas');
    XLSX.writeFile(wb, `argus-licencas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const thClass =
    'text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3 whitespace-nowrap';

  function SortableTh({ label, keyName }: { label: string; keyName: SortKey }) {
    return (
      <th className={thClass}>
        <button
          onClick={() => toggleSort(keyName)}
          className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors cursor-pointer uppercase"
        >
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortKey === keyName ? 'text-[#D4AF37]' : 'opacity-40'}`} />
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            Gestão de Licenças
          </h2>
          <p className="text-[#94a3b8] text-sm mt-0.5">
            {loading ? 'Carregando registros...' : `${rows.length} registro(s) exibido(s).`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white border border-[#1e293b] hover:border-[#D4AF37]/40 px-3 py-2 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>

          {podeEditar && (
            <button
              onClick={() => setShowImport((v) => !v)}
              className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white border border-[#1e293b] hover:border-[#D4AF37]/40 px-3 py-2 rounded-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>
          )}

          {podeEditar && (
            <button
              onClick={() => setModalItem({ status: 'Pendente', possui_licenca: false })}
              className="flex items-center gap-2 text-sm bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold px-4 py-2 rounded-lg transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Registro
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}

      {showImport && podeEditar && <ImportCSV onImport={handleImport} />}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <SortableTh label="Colaborador" keyName="nome" />
                <SortableTh label="Login" keyName="login" />
                <SortableTh label="Chapa / Matrícula" keyName="chapa_matricula" />
                <SortableTh label="Local de Trabalho" keyName="local" />
                <SortableTh label="Software / Produto" keyName="software" />
                <th className={thClass}>Licença</th>
                <SortableTh label="Status" keyName="status" />
                {(podeEditar || podeExcluir) && <th className="w-20 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center text-[#94a3b8] py-10 text-sm">
                    Carregando licenças...
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-[#94a3b8] py-10 text-sm">
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((u) => (
                  <tr key={u.id} className="hover:bg-[#001726]/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium">{u.nome ?? '—'}</p>
                      <p className="text-[#64748b] text-xs">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#94a3b8] text-sm whitespace-nowrap">{u.login ?? '—'}</td>
                    <td className="px-4 py-3 text-[#94a3b8] text-sm whitespace-nowrap">{chapaLabel(u)}</td>
                    <td className="px-4 py-3 text-[#94a3b8] text-sm">{localLabel(u)}</td>
                    <td className="px-4 py-3 text-[#D4AF37] text-sm font-medium">{softwareLabel(u)}</td>
                    <td className="px-4 py-3">
                      {u.possui_licenca ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Possui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#64748b] text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Não possui
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>

                    {(podeEditar || podeExcluir) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {podeEditar && (
                            <button
                              onClick={() => setModalItem(u)}
                              className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-md transition-all"
                              title="Editar / trocar permissões"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {podeExcluir && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalItem !== null && (
        <LicencaModal
          item={modalItem}
          softwares={softwares}
          locais={locais}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
