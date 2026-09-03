import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

// ✅ IMPORT CORRETO DO MODAL (Verifique se o caminho e o nome do arquivo batem exatamente)
import { SoftwareModal } from '../components/SoftwareModal'; 

// Import do cliente do Supabase (ou da sua camada de serviços/banco)
import { supabase } from '../lib/supabase';

// Tipagem básica das tabelas/softwares
interface SoftwareItem {
  id: string;
  name: string;
  category?: string;
  total_licenses: number;
  used_licenses: number;
  created_at?: string;
}

export function Dashboard() {
  const [softwares, setSoftwares] = useState<SoftwareItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSoftware, setSelectedSoftware] = useState<SoftwareItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Função para buscar os dados das tabelas de software / licenças
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Ajuste o nome da tabela conforme configurado no Supabase (ex: 'softwares' ou 'licenses')
      const { data, error } = await supabase
        .from('softwares')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao buscar dados das tabelas:', error);
      } else if (data) {
        setSoftwares(data);
      }
    } catch (err) {
      console.error('Falha na requisição:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenNewModal = () => {
    setSelectedSoftware(null);
    setIsModalOpen(true);
  };

  const handleEditSoftware = (item: SoftwareItem) => {
    setSelectedSoftware(item);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Licenças e Softwares</h1>
          <p className="text-sm text-gray-500">Visão geral do inventário e controle de atribuições</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Package className="w-4 h-4" />
            Novo Software
          </button>
        </div>
      </div>

      {/* Resumo de Métricas / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total de Softwares</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{softwares.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Licenças Alocadas</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {softwares.reduce((acc, item) => acc + (item.used_licenses || 0), 0)}
          </p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Licenças Disponíveis</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {softwares.reduce((acc, item) => acc + ((item.total_licenses || 0) - (item.used_licenses || 0)), 0)}
          </p>
        </div>
      </div>

      {/* Tabela Principal de Dados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Softwares Cadastrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Software / Categoria</th>
                <th className="px-6 py-3">Total Licenças</th>
                <th className="px-6 py-3">Em Uso</th>
                <th className="px-6 py-3">Disponíveis</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {softwares.map((item) => {
                const disponivel = (item.total_licenses || 0) - (item.used_licenses || 0);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                      {item.category && (
                        <span className="block text-xs text-gray-400">{item.category}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{item.total_licenses}</td>
                    <td className="px-6 py-4 text-blue-600 font-medium">{item.used_licenses}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        disponivel > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {disponivel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditSoftware(item)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Editar / Gerenciar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {softwares.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhum software registrado nas tabelas até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renderização do Modal de Cadastro / Edição */}
      {isModalOpen && (
        <SoftwareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          software={selectedSoftware}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
