import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Download, Upload, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LicencasManagement({ totalRegistros, fetchLicencas, fetchStats }: any) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleApagarTudo = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 5000); // auto cancela em 5s
      return;
    }

    setDeleting(true);
    try {
      // TENTA VIA RPC (mais rápido)
      const { error } = await supabase.rpc('apagar_todos_registros');
      
      if (error) {
        // FALLBACK: delete direto
        const { error: err2 } = await supabase
          .from('licencas_usuarios')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (err2) throw err2;
      }

      await fetchLicencas();
      await fetchStats();
      setShowConfirm(false);
      alert(`✅ ${totalRegistros} registros apagados! Voltou para 0 / 720`);
    } catch (e: any) {
      alert('Erro ao apagar: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" className="border-[#1e293b] text-[#94a3b8]">
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
        
        <Button variant="outline" size="sm" className="border-[#1e293b] text-[#94a3b8]">
          <Upload className="w-4 h-4 mr-2" /> Importar
        </Button>

        <Button size="sm" className="bg-[#facc15] text-black hover:bg-[#eab308]">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>

        {/* BOTÃO APAGAR TUDO - SÓ APARECE SE TEM REGISTRO */}
        {totalRegistros > 0 && (
          <Button
            size="sm"
            onClick={handleApagarTudo}
            disabled={deleting}
            className={`${
              showConfirm 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border border-red-400' 
                : 'bg-[#1a2332] hover:bg-red-950/50 text-red-400 border border-red-900/50'
            }`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Apagando...' : showConfirm ? `CONFIRMAR APAGAR ${totalRegistros}?` : `Apagar Tudo (${totalRegistros})`}
          </Button>
        )}
      </div>

      {showConfirm && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-200 font-semibold">Tem certeza?</p>
            <p className="text-red-300/80 text-xs">Isso vai apagar TODOS os {totalRegistros} usuários importados e voltar para EM USO 0 | LIVRE 720 | 0%. Essa ação não pode ser desfeita.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)} className="text-[#94a3b8]">Cancelar</Button>
            <Button size="sm" onClick={handleApagarTudo} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              Sim, Apagar Tudo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
