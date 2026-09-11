import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { LicencaModal } from '@/components/LicencaModal';
import { ImportCSV } from '@/components/ImportCSV';
import { Users, Plus, Pencil, Trash2, Download, Upload, AlertCircle, CheckCircle2, XCircle, ArrowUpDown, Trash } from 'lucide-react';
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

const ADOBE_PRODUTO_MAP: Record<string,string> = {
  'SUITE - TODOS APPS': 'All Apps - Edition 4 (ETLA - 65236301FDB01C0D043A)',
  'ADOBE PRO DC': 'Acrobat Pro DC (ETLA - 65236301FDB01C0D043A)',
  'APLICATIVO INDIVIDUAL': 'Single App - Edition 4 (ETLA - 65236301FDB01C0D043A)',
};

const COLUNAS_BANCO = ['email','nome','login','departamento_raiz','tipo_licenca','tipo_produto','produto','app_individual','possui_licenca','status','local_id','atualizado_por','atualizado_em'] as const;

function normalizeTipoProduto(valor: string): string {
  if (!valor) return 'ADOBE PRO DC';
  const v = valor.toLowerCase().trim();
  if (v.includes('all apps')) return 'SUITE - TODOS APPS';
  if (v.includes('single app')) return 'APLICATIVO INDIVIDUAL';
  if (v.includes('acrobat')) return 'ADOBE PRO DC';
  // compat com modelo antigo
  if (v.includes('suite') || v.includes('todos')) return 'SUITE - TODOS APPS';
  if (v.includes('individual')) return 'APLICATIVO INDIVIDUAL';
  return valor.toUpperCase();
}

function tipoParaProdutoAdobe(tipo: string): string {
  return ADOBE_PRODUTO_MAP[tipo] || 'Acrobat Pro DC (ETLA - 65236301FDB01C0D043A)';
}

export function LicencasTable({ data, softwares, locais, role, loading, onRefresh }: LicencasTableProps) {
  const [modalItem, setModalItem] = useState<Partial<LicencaUsuario> | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortAsc, setSortAsc] = useState(true);
  const [excluindoTudo, setExcluindoTudo] = useState(false);

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
    const tipo = (u.tipo_produto || '').toUpperCase();
    if (tipo === 'SUITE - TODOS APPS') return 'All Apps - Todos os Apps';
    if (tipo === 'APLICATIVO INDIVIDUAL') {
      const app = (u as any).app_individual;
      return app && app!== 'Photoshop'? `Single App / ${app}` : 'Single App';
    }
    if (tipo === 'ADOBE PRO DC') return 'Acrobat Pro DC';
    const sw = (u as any).software_id? softwareById.get((u as any).software_id) : undefined;
    return [sw?.fabricante?? u.tipo_licenca, sw?.produto?? u.produto].filter(Boolean).join(' / ') || '—';
  }

  function localLabel(u: LicencaUsuario) {
    const l = (u as any).local_id? localById.get((u as any).local_id) : undefined;
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
    const tipoNorm = normalizeTipoProduto((form as any).tipo_produto || (form as any).produto || '');
    let produtoFinal = tipoNorm === 'SUITE - TODOS APPS'? 'Suite - Todos os Apps' : tipoNorm === 'APLICATIVO INDIVIDUAL'? 'Aplicativo Individual' : 'Acrobat Pro DC';
    const appFinal = tipoNorm === 'APLICATIVO INDIVIDUAL'? ((form as any).app_individual || 'Photoshop') : null;

    const rawPayload = {
      email: (form.email?? '').trim().toLowerCase(),
      nome: form.nome?.trim() || null,
      login: form.login?.trim() || (form.email?.split('@')[0].toLowerCase()) || null,
      departamento_raiz: (form as any).departamento_raiz?.trim().toUpperCase() || null,
      tipo_licenca: 'Adobe',
      tipo_produto: tipoNorm,
      produto: produtoFinal,
      app_individual: appFinal,
      possui_licenca: Boolean(form.possui_licenca),
      status: form.status || 'Ativo',
      local_id: (form as any).local_id || null,
      atualizado_por: atualizadoPor,
      atualizado_em: new Date().toISOString(),
    };
    if (!rawPayload.email) throw new Error('O e-mail é obrigatório.');
    const payload = cleanPayload(rawPayload);
    if ((form as any).id) {
      const { error: err } = await supabase.from('licencas_usuarios').update(payload).eq('id', (form as any).id);
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
    const { error: err } = await supabase.from('licencas_usuarios').delete().eq('id', (item as any).id);
    if (err) setError(err.message);
    else await onRefresh();
  }

  async function handleExcluirTodosRegistros() {
    const total = data?.length || 0;
    if (total === 0) return;
    if (!window.confirm(`Apagar TODOS os ${total} registros?`)) return;
    if (!window.confirm(`CONFIRMAÇÃO FINAL: Apagar ${total} DEFINITIVAMENTE?`)) return;
    setExcluindoTudo(true);
    try {
      const { error: err } = await supabase.from('licencas_usuarios').delete().neq('email', '');
      if (err) throw err;
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExcluindoTudo(false);
    }
  }

  async function handleImport(rowsToImport: Partial<LicencaUsuario>[]) {
    const errors: string[] = [];
    let success = 0;
    const { data: sessionData } = await supabase.auth.getSession();
    const atualizadoPor = sessionData.session?.user?.email?? null;
    for (const [index, raw] of rowsToImport.entries()) {
      const email = (raw as any).email?.trim().toLowerCase();
      if (!email) { errors.push(`Linha ${index + 2}: e-mail ausente.`); continue; }
      const tipoNorm = normalizeTipoProduto((raw as any).tipo_produto || (raw as any).produto || '');
      const payload = cleanPayload({
        email,
        nome: (raw as any).nome || null,
        login: (raw as any).login || email.split('@')[0],
        departamento_raiz: (raw as any).departamento_raiz || null,
        tipo_licenca: 'Adobe',
        tipo_produto: tipoNorm,
        produto: tipoNorm === 'SUITE - TODOS APPS'? 'Suite - Todos os Apps' : tipoNorm === 'APLICATIVO INDIVIDUAL'? 'Aplicativo Individual' : 'Acrobat Pro DC',
        app_individual: (raw as any).app_individual || (tipoNorm === 'APLICATIVO INDIVIDUAL'? 'Photoshop' : null),
        status: (raw as any).status || 'Ativo',
        possui_licenca: true,
        atualizado_por: atualizadoPor,
        atualizado_em: new Date().toISOString(),
      });
      const { error: err } = await supabase.from('licencas_usuarios').upsert(payload, { onConflict: 'email' });
      if (err) errors.push(`Linha ${index + 2} (${email}): ${err.message}`);
      else success++;
    }
    await onRefresh();
    return { success, errors };
  }

  // AJUSTADO PARA SEU PADRÃO NOVO Email;Nome;Sobrenome;Produtos corporativos
  async function handleImportBatchFile(file: File) {
    const text = await file.text();
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    if (!cleanText) return { success: 0, errors: ['Arquivo vazio'] };

    const linhas = cleanText.split(/\r?\n/).filter(l => l.trim());
    const header = linhas[0].split(';').map(h => h.trim().toLowerCase());

    // Detecta se é padrão Adobe (Email;Nome;Sobrenome;Produtos corporativos) ou padrão ARGUS antigo
    const isAdobePadrao = header.includes('email') && header.includes('produtos corporativos');

    let normalized: any[] = [];

    if (isAdobePadrao) {
      const idxEmail = header.indexOf('email');
      const idxNome = header.indexOf('nome');
      const idxSobrenome = header.indexOf('sobrenome');
      const idxProd = header.indexOf('produtos corporativos');

      linhas.slice(1).forEach(l => {
        const cols = l.split(';');
        const email = cols[idxEmail]?.trim().toLowerCase();
        if (!email) return;
        const nome = `${cols[idxNome] || ''} ${cols[idxSobrenome] || ''}`.trim();
        const produtosRaw = cols[idxProd] || '';
        if (!produtosRaw.trim()) return; // ignora quem não tem licença

        // Pode ter multi-produto separado por vírgula: Acrobat + Single App
        const tokens = produtosRaw.split(',').map(t => t.trim()).filter(Boolean);
        // Pega o de maior prioridade para não duplicar email (All Apps > Single > Acrobat)
        let melhor = tokens[0];
        if (tokens.some(t => t.toLowerCase().includes('all apps'))) melhor = tokens.find(t => t.toLowerCase().includes('all apps'))!;
        else if (tokens.some(t => t.toLowerCase().includes('single app'))) melhor = tokens.find(t => t.toLowerCase().includes('single app'))!;

        const tipo = normalizeTipoProduto(melhor);
        normalized.push({
          nome,
          email,
          login: email.split('@')[0],
          departamento_raiz: null,
          tipo_licenca: 'Adobe',
          tipo_produto: tipo,
          produto: tipo,
          app_individual: tipo === 'APLICATIVO INDIVIDUAL'? 'Photoshop' : null,
          status: 'Ativo',
          possui_licenca: true,
        });
      });
    } else {
      // Fallback modelo antigo setor;tipo_produto;produto
      normalized = linhas.slice(1).map(l => {
        const vals = l.split(';');
        const obj: any = {};
        header.forEach((h,i) => obj[h] = vals[i]?.trim());
        return {
          nome: obj.nome,
          email: obj.email?.toLowerCase(),
          login: obj.email?.split('@')[0].toLowerCase(),
          departamento_raiz: obj.setor?.toUpperCase(),
          tipo_licenca: 'Adobe',
          tipo_produto: normalizeTipoProduto(obj.tipo_produto || obj.produto || ''),
          produto: obj.produto,
          app_individual: obj.app_individual || obj.app || null,
          status: obj.status || 'Ativo',
          possui_licenca: true,
        };
      }).filter((r: any) => r.email);
    }

    // Deduplica por email mantendo All Apps
    const prioridade: any = { 'SUITE - TODOS APPS': 3, 'APLICATIVO INDIVIDUAL': 2, 'ADOBE PRO DC': 1 };
    normalized.sort((a,b) => (prioridade[b.tipo_produto]||0) - (prioridade[a.tipo_produto]||0));
    const unicos = new Map();
    normalized.forEach(r => { if(!unicos.has(r.email)) unicos.set(r.email, r); });

    return handleImport(Array.from(unicos.values()));
  }

  function handleExport() {
    // Exporta nos DOIS padrões: o novo Adobe que você usa + XLSX completo
    // 1. CSV padrão Adobe Email;Nome;Sobrenome;Produtos corporativos
    const csvAdobe = [
      'Email;Nome;Sobrenome;Produtos corporativos',
     ...rows.map(u => {
        const nomeCompleto = (u.nome || '').trim();
        const partes = nomeCompleto.split(' ');
        const primeiro = partes[0] || '';
        const resto = partes.slice(1).join(' ') || '';
        const prodAdobe = tipoParaProdutoAdobe(u.tipo_produto || '');
        return `${u.email};${primeiro};${resto};${prodAdobe}`;
      })
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvAdobe}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adobe-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // 2. Também gera XLSX detalhado
    const sheet = rows.map((u) => ({
      EMAIL: u.email?? '', NOME: u.nome?? '', LOGIN: (u as any).login?? '',
      SETOR: localLabel(u), TIPO_PRODUTO: u.tipo_produto?? '', PRODUTO: softwareLabel(u),
      APP_INDIVIDUAL: (u as any).app_individual?? '', STATUS: u.status?? '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Licencas');
    XLSX.writeFile(wb, `licencas-detalhado-${new Date().toISOString().slice(0,10)}.xlsx`);
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
          <p className="text-[#94a3b8] text-sm">{loading? 'Carregando...' : `${rows.length} registro(s) - ${rows.filter(r=>r.tipo_produto==='SUITE - TODOS APPS').length} All Apps | ${rows.filter(r=>r.tipo_produto==='ADOBE PRO DC').length} Acrobat | ${rows.filter(r=>r.tipo_produto==='APLICATIVO INDIVIDUAL').length} Single App`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} disabled={rows.length === 0} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg hover:text-white disabled:opacity-50"><Download className="w-4 h-4" />Exportar (Adobe + XLSX)</button>
          {podeEditar && <button onClick={() => setShowImport((v) =>!v)} className="flex items-center gap-2 text-sm text-[#94a3b8] border border-[#1e293b] px-3 py-2 rounded-lg hover:text-white"><Upload className="w-4 h-4" />Importar</button>}
          {podeExcluir && data.length > 0 && <button onClick={handleExcluirTodosRegistros} disabled={excluindoTudo} className="flex items-center gap-2 text-sm bg-red-950/60 border border-red-900/50 text-red-400 hover:bg-red-900/60 px-3 py-2 rounded-lg font-bold disabled:opacity-50"><Trash className="w-4 h-4" />{excluindoTudo? 'Excluindo...' : `Excluir todos (${data.length})`}</button>}
          {podeEditar && <button onClick={() => setModalItem({ status: 'Ativo', possui_licenca: true, tipo_produto: 'ADOBE PRO DC' } as any)} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg hover:bg-[#c19b2e]"><Plus className="w-4 h-4" />Novo Registro</button>}
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
                <tr key={(u as any).id} className="hover:bg-[#001726]/50">
                  <td className="px-4 py-3"><p className="text-white text-sm">{u.nome?? '—'}</p><p className="text-[#64748b] text-xs">{u.email}</p></td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{(u as any).login?? '—'}</td>
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
export default LicencasTable;
