import { Search, ChevronDown, FilterX } from 'lucide-react';
import type { Software, LocalTrabalho } from '@/types';

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  software: string;
  onSoftwareChange: (v: string) => void;
  local: string;
  onLocalChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  softwares: Software[];
  locais: LocalTrabalho[];
}

const STATUS_OPTIONS = ['Ativo', 'Pendente', 'Inativo'];

function softwareLabel(s: Software) {
  const partes = [s.fabricante, s.produto || s.tipo_produto].filter(Boolean);
  if (partes.length === 0) return s.nome;
  if (s.nome && !partes.includes(s.nome)) return `${s.nome} — ${partes.join(' / ')}`;
  return partes.join(' / ');
}

const selectClass =
  'appearance-none bg-[#001E33] border border-[#1e293b] text-white rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:border-[#D4AF37] transition-all min-w-[190px] cursor-pointer';

export function FiltersBar({
  search,
  onSearchChange,
  software,
  onSoftwareChange,
  local,
  onLocalChange,
  status,
  onStatusChange,
  softwares,
  locais,
}: FiltersBarProps) {
  const temFiltro = Boolean(search || software || local || status);

  function limpar() {
    onSearchChange('');
    onSoftwareChange('');
    onLocalChange('');
    onStatusChange('');
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Busca textual: nome, e-mail, login ou chapa/matrícula */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, login ou chapa/matrícula..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[#001E33] border border-[#1e293b] text-white placeholder-[#64748b] rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#D4AF37] transition-all"
        />
      </div>

      {/* Software */}
      <div className="relative">
        <select value={software} onChange={(e) => onSoftwareChange(e.target.value)} className={selectClass}>
          <option value="">Todos os Softwares</option>
          {(softwares || []).map((s) => (
            <option key={s.id} value={s.id}>
              {softwareLabel(s)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
      </div>

      {/* Local de trabalho */}
      <div className="relative">
        <select value={local} onChange={(e) => onLocalChange(e.target.value)} className={selectClass}>
          <option value="">Todos os Locais</option>
          {(locais || []).map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
      </div>

      {/* Status */}
      <div className="relative">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={`${selectClass} min-w-[150px]`}
        >
          <option value="">Todos os Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] pointer-events-none" />
      </div>

      {temFiltro && (
        <button
          onClick={limpar}
          title="Limpar filtros"
          className="flex items-center justify-center gap-2 text-sm text-[#94a3b8] hover:text-[#D4AF37] border border-[#1e293b] hover:border-[#D4AF37]/40 rounded-lg px-3 py-2.5 transition-all cursor-pointer"
        >
          <FilterX className="w-4 h-4" />
          <span className="lg:hidden">Limpar filtros</span>
        </button>
      )}
    </div>
  );
}
