import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

// --- INPUT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="text-[#64748b] text-xs font-medium block mb-1">{label}</label>}
      <input
        className={`w-full bg-[#0c1526] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-colors placeholder-[#334155] ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// --- TEXTAREA ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="text-[#64748b] text-xs font-medium block mb-1">{label}</label>}
      <textarea
        className={`w-full bg-[#0c1526] border border-[#1e293b] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-colors placeholder-[#334155] resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// --- BUTTON ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles = "flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer";
  
  const variants = {
    primary: "bg-[#D4AF37] hover:bg-[#c9a227] text-[#002B49]",
    secondary: "border border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// --- MODAL ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#001E33] border border-[#1e293b] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <h3 className="text-white font-semibold text-base">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// --- BADGE ---
export function Badge({ children, type = 'default' }: { children: ReactNode; type?: 'default' | 'success' | 'warning' }) {
  const styles = {
    default: "bg-[#1e293b] text-[#94a3b8]",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>
      {children}
    </span>
  );
}

// --- STAT CARD (Métricas) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const iconColors = {
    default: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4 flex items-center gap-4 shadow-lg">
      <div className={`p-3 rounded-lg border ${iconColors[variant]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#64748b] font-medium">{title}</p>
        <p className="text-xl font-bold text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// --- CAPACITY CARD (Progresso de Licenças) ---
interface CapacityCardProps {
  name: string;
  used: number;
  total: number;
}

export function CapacityCard({ name, used, total }: CapacityCardProps) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  
  return (
    <div className="bg-[#0c1526] border border-[#1e293b] rounded-lg p-3 space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-white truncate max-w-[140px]">{name}</span>
        <span className="text-[#64748b]">
          <strong className="text-white">{used}</strong> / {total}
        </span>
      </div>
      <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-[#D4AF37] h-full transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
