import React, { useState } from 'react';
import { Pencil, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { StatusBadge, LicencaBadge } from '@/components/Badges';
import type { LicencaUsuario, Role } from '@/types';

interface LicencasTableProps {
  data: LicencaUsuario[];
  role: Role;
  onEdit: (item: LicencaUsuario) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

type SortKey = keyof LicencaUsuario;

/**
 * Tabela principal para exibição e gerenciamento de licenças de usuários (ARGUS - COATEN theme).
 */
export function LicencasTable({ data, role, onEdit, onDelete, onAdd }: LicencasTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const canWrite = role === 'editor' || role === 'admin' || role === 'super_admin';

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...data].sort((a, b) => {
    const va = String(a[sortKey] ?? '').toLowerCase();
    const vb = String(b[sortKey] ?? '').toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-[#D4AF37]" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
    );
  }

  function Th({ label, col }: { label: string; col: SortKey }) {
    return (
      <th
        className="text-left text-xs font-semibold text-[#94a3b8] uppercase tracking-wider px-4 py-3 cursor-pointer hover:text-[#D4AF37] transition-colors select-none whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  return (
    <div className="bg-[#001E33] border border-[#1e293b] rounded-[#3L] overflow-hidden shadow-xl text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
        <div>
          <h3 className="font-semibold text-lg text-white">Usuários & Licenças</h3>
          <p className="text-xs text-[#94a3b8]">
            {data.length} {data.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c19b2e] text-[#001726] font-bold text-sm px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            Novo Registro
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#001726] border-b border-[#1e293b]">
              <Th label="Nome" col="nome" />
              <Th label="E-mail" col="email" />
              <Th label="Matrícula" col="matricula" />
              <Th label="Departamento" col="departamento_raiz" />
              <Th label="Status" col="status" />
              <Th label="Licença" col="tipo_licenca" />
              {canWrite && <th className="px-4 py-3 text-right text-xs font-semibold text-[#94a3b8] uppercase">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {sorted.map((item) => (
              <tr key={item.id} className="hover:bg-[#001726]/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{item.nome || '-'}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{item.email}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{item.matricula || '-'}</td>
                <td className="px-4 py-3 text-[#94a3b8]">{item.departamento_raiz || '-'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3">
                  <LicencaBadge possui={Boolean(item.possui_licenca)} tipo={item.tipo_licenca} />
                </td>
                {canWrite && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37] hover:bg-[#001726] rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 text-[#94a3b8] hover:text-rose-400 hover:bg-[#001726] rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
