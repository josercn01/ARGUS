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
}

type SortKey = 'nome' | 'email' | 'login' | 'local' | 'software' | 'status';
const PODE_EDITAR: SystemRole[] = ['super_admin', 'admin', 'editor'];
const PODE_EXCLUIR: SystemRole[] = ['super_admin', 'admin'];

// Só o que REALMENTE existe no seu banco hoje
const COLUNAS_BANCO = ['email','nome','login','departamento_raiz','tipo_licenca','tipo_produto','produto','possui_licenca','status','local_id','atualizado_por','atualizado_em'] as const;

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
    const sw = u.software_id? softwareById.get(u.software_id) : undefined;
    return [sw?.fabricante?? u.tipo_licenca, sw?.produto?? u.produto].filter(Boolean).join(' / ') || '—';
  }
  function localLabel(u: LicencaUsuario) {
    const l = u.local_id? localById.get(u.local_id) : undefined;
    return l?.nome?? (u as any).departamento_raiz?? '—';
  }

  const rows = useMemo(() => {
    const list = [...(data || [])];
    const value = (u: LicencaUsuario): string => {
      switch (sortKey) {
        case 'nome': return (u.nome?? u.email?? '').toLowerCase();
        case 'email': return (u.email?? '').toLowerCase();
        case 'login': return (u.login?? '').toLowerCase();
        case 'local': return localLabel(u).toLowerCase();
        case 'software': return softwareLabel(u).toLowerCase();
        case 'status': return (u.status?? '').toLowerCase();
        default: return '';
      }
    };
    list.sort((a, b) => value(a).localeCompare(value(b), 'pt-BR'));
    return sortAsc? list : list.reverse();
  }, [data, sortKey, sortAsc, softwareById, localById]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) =>!v);
    else { setSortKey(key); setSortAsc(true); }
  }

  function cleanPayload(raw: any) {
    const payload: any = {};
    COLUNAS_BANCO.forEach(k => { if(raw[k]!== undefined) payload[k] = raw[k]; });
    return payload;
  }

  async function handleSave(form: Partial<LicencaUsuario>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email?? null;

    const sw = (form as any).software_id? softwareById.get((form as any).software_id) : undefined;

    const rawPayload = {
      email: (form.email?? '').trim().toLowerCase(),
      nome: form.nome?.trim() || null,
      login: form.login?.trim() || null,
      departamento_raiz: (form as any).departamento_raiz?.trim() || null,
      tipo_licenca: form.tipo_licenca || sw?.fabricante || null,
      tipo_produto: form.tipo_produto || sw?.tipo_produto || null,
      produto: form.produto || sw?.produto || null,
      possui_licenca: Boolean(form.possui_licenca),
      status: form.status || 'Ativo',
      local_id: (form as any).local_id || null,
      atualizado_por: atualizadoPor,
      atualizado_em: new Date().toISOString(),
    };

    if (!rawPayload.email) throw new Error('O e-mail é obrigatório.');
    const payload = cleanPayload(rawPayload);

    if (form.id) {
      const { error: err } = await supabase.from('licencas_usuarios').update(payload).eq('id', form.id);
      if (err) throw new Error(err.message);
    } else {
      const { error: err } = await supabase.from('licencas_usuarios').upsert(payload, { onConflict: 'email' });
      if (err) throw new Error(err.message);
    }
    setModalItem(null);
    await onRefresh();
  }

  async function handleDelete(item: LicencaUsuario) {
    if (!window.confirm(`Excluir ${item.nome?? item.email}?`)) return;
    const { error: err } = await supabase.from('licencas_usuarios').delete().eq('id', item.id);
    if (err) setError(err.message);
    else await onRefresh();
  }

  async function handleImport(rowsToImport: Partial<LicencaUsuario>[]) {
    const errors: string[] = [];
    let success = 0;
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email?? null;

    for (const [index, raw] of rowsToImport.entries()) {
      const email = (raw as any).email?.trim().toLowerCase();
      if (!email) { errors.push(`Linha ${index + 2}: e-mail ausente.`); continue; }

      const rawPayload = {
        email,
        nome: (raw as any).nome || null,
        login: (raw as any).login || email.split('@')[0],
        departamento_raiz: (raw as any).departamento_raiz || null,
        tipo_licenca: (raw as any).tipo_licenca || 'Adobe',
        tipo_produto: (raw as any).tipo_produto || 'ADOBE PRO DC',
        produto: (raw as any).produto || 'Acrobat Pro DC',
        status: (raw as any).status || 'Ativo',
        possui_licenca: true,
        atualizado_por: atualizadoPor,
        atualizado_em: new Date().toISOString(),
      };

      const payload = cleanPayload(rawPayload);
      const { error: err } = await supabase.from('licencas_usuarios').upsert(payload, { onConflict: 'email' });
      if (err) errors.push(`Linha ${index + 2} (${email}): ${err.message}`);
      else success++;
    }
    await onRefresh();
    return { success, errors };
  }

  // Handler para o modal antigo que manda File
  async function handleImportBatchFile(file: File) {
    const text = await file.text();
    const linhas = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
    const header = linhas[0].split(';').map(h => h.toLowerCase().trim());
    const rawRows = linhas.slice(1).map(l => {
      const vals = l.split(';');
      const obj: any = {};
      header.forEach((h,i) => obj[h] = vals[i]?.trim());
      return obj;
    });
    const normalized = rawRows.map((r: any) => ({
      nome: r.nome,
      email: r.email?.toLowerCase(),
      login: r.email?.split('@')[0].toLowerCase(),
      departamento_raiz: r.setor?.toUpperCase(),
      tipo_licenca: r.tipo_licenca || 'Adobe',
      tipo_produto: r.tipo_produto || 'ADOBE PRO DC',
      produto: r.produto || 'Acrobat Pro DC',
      status: r.status || 'Ativo',
      possui_licenca: true,
    })).filter((r: any) => r.email);

    return handleImport(normalized);
  }

  function handleExport() {
    const sheet = rows.map((u) => ({
      NOME: u.nome?? '', EMAIL: u.email?? '', LOGIN: u.login?? '',
      SETOR: localLabel(u), FABRICANTE: u.tipo_licenca?? '',
      TIPO_PRODUTO: u.tipo_produto?? '', PRODUTO: u.produto?? '',
      POSSUI_LICENCA: u.possui_licenca? 'true' : 'false', STATUS: u.status?? '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Licencas');
    XLSX.writeFile(wb, `licencas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const thClass = 'text-xs font-semibold text-[#94a3b8] uppercase px-4 py-3 whitespace-nowrap';
  function SortableTh({ label, keyName }: { label: string; keyName: SortKey }) {
    return <th className={thClass}><button onClick={() => toggleSort(keyName)} className="flex items-center gap-1 hover:text-[#D4AF37] uppercase">{label}<ArrowUpDown className={`w-3 h-3 ${sortKey === keyName? 'text-[#D4AF37]' : 'opacity-40'}`} /></button></th>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-[#D4AF37]" />Gestão de Licenças</h2>
          <p className="text-[#94a3b8] text-sm">{loading? 'Carregando...' : `${rows.length} registro(s).`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={rows.length === 0} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg"><Download className="w-4 h-4" />Exportar</button>
          {podeEditar && <button onClick={() => setShowImport((v) =>!v)} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg"><Upload className="w-4 h-4" />Importar</button>}
          {podeEditar && <button onClick={() => setModalItem({ status: 'Ativo', possui_licenca: true } as any)} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg"><Plus className="w-4 h-4" />Novo Registro</button>}
        </div>
      </div>
      {error && <div className="flex gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
      {showImport && podeEditar && <ImportCSV onImport={handleImport} />}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><SortableTh label="Colaborador" keyName="nome" /><SortableTh label="Login" keyName="login" /><SortableTh label="Setor" keyName="local" /><SortableTh label="Software" keyName="software" /><th className={thClass}>Licença</th><SortableTh label="Status" keyName="status" /><th className="w-20 px-4 py-3" /></tr></thead>
            <tbody className="divide-y divide-[#1e293b]">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-[#001726]/50">
                  <td className="px-4 py-3"><p className="text-white text-sm">{u.nome?? '—'}</p><p className="text-[#64748b] text-xs">{u.email}</p></td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{u.login?? '—'}</td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{localLabel(u)}</td>
                  <td className="px-4 py-3 text-[#D4AF37] text-sm">{softwareLabel(u)}</td>
                  <td className="px-4 py-3">{u.possui_licenca? <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Possui</span> : <span className="text-[#64748b] text-xs flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Não</span>}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">{podeEditar && <button onClick={() => setModalItem(u)} className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37]"><Pencil className="w-4 h-4" /></button>}{podeExcluir && <button onClick={() => handleDelete(u)} className="p-1.5 text-[#94a3b8] hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modalItem!== null && <LicencaModal item={modalItem} softwares={softwares} locais={locais} onClose={() => setModalItem(null)} onSave={handleSave} onImportBatch={handleImportBatchFile as any} />}
    </div>
  );
}
