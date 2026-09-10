import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Header, type TabKey } from '@/components/Header';
import { MetricsCards } from '@/components/MetricsCards';
import { FiltersBar } from '@/components/FiltersBar';
import { LicencasTable } from '@/components/LicencasTable';
import { SoftwareManagement } from '@/components/SoftwareManagement';
import { AdminLocais } from '@/components/AdminLocais';
import { AccessManagement } from '@/components/AccessManagement';
import type { AuthUser, SystemRole, LicencaUsuario, Software, LocalTrabalho } from '@/types';

interface DashboardProps {
  user: AuthUser | null;
  role: SystemRole;
}

export function Dashboard({ user, role }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [licRes, softRes, locRes] = await Promise.all([
        supabase.from('licencas_usuarios').select('*').order('nome'),
        supabase.from('softwares').select('*').order('nome'),
        supabase.from('administradores_locais').select('*').order('endereco_logico'),
      ]);

      if (licRes.data) setLicencas(licRes.data);
      if (softRes.data) setSoftwares(softRes.data);
      if (locRes.data) {
        const mappedLocais = locRes.data.map((item: any) => ({
          id: item.id,
          nome: item.endereco_logico,
          ...item
        }));
        setLocais(mappedLocais);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Função de Importação em Lote alinhada ao modelo novo
  const handleImportBatch = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error('O arquivo CSV está vazio ou sem dados.');

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toUpperCase().replace(/"/g, ''));

    const registros = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 || !values.some(Boolean)) continue;

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          rowData[header] = values[index];
        }
      });

      const email = rowData['EMAIL'] || rowData['E-MAIL'];
      if (!email) continue;

      let tipoProdutoRaw = rowData['TIPO_PRODUTO'] || '';
      const prodVal = (rowData['PRODUTO'] || '').toUpperCase();
      const tipoVal = tipoProdutoRaw.toUpperCase();

      let tipo_produto_final = tipoProdutoRaw;
      if (tipoVal.includes('PRO') || prodVal.includes('PRO')) {
        tipo_produto_final = 'ADOBE PRO DC';
      } else if (tipoVal.includes('SUITE') || tipoVal.includes('CC') || prodVal.includes('SUITE')) {
        tipo_produto_final = 'SUITE CC';
      } else if (tipoVal.includes('INDIVIDUAL') || tipoVal.includes('APLICATIVO') || prodVal.includes('PHOTOSHOP') || prodVal.includes('ILLUSTRATOR')) {
        tipo_produto_final = 'APLICATIVO INDIVIDUAL';
      }

      const possuiLicencaStr = (rowData['POSSUI_LICENCA'] || 'VERDADEIRO').toUpperCase();
      const possui_licenca = possuiLicencaStr === 'VERDADEIRO' || possuiLicencaStr === 'TRUE' || possuiLicencaStr === '1';

      // Objeto estritamente limpo contendo apenas as colunas existentes na tabela
      registros.push({
        email: email,
        nome: rowData['NOME'] || null,
        login: rowData['LOGIN'] || null,
        departamento_raiz: rowData['DEPARTAMENTO'] || null,
        tipo_licenca: rowData['FABRICANTE'] || null,
        tipo_produto: tipo_produto_final || null,
        produto: rowData['PRODUTO'] || null,
        status: rowData['STATUS'] || 'Ativo',
        possui_licenca: possui_licenca
      });
    }

    for (const reg of registros) {
      const { error } = await supabase
        .from('licencas_usuarios')
        .upsert(reg, { onConflict: 'email' });

      if (error) {
        throw new Error(`Erro ao importar e-mail ${reg.email}: ${error.message}`);
      }
    }

    await loadData();
  };

      // Objeto limpo enviado ao Supabase contendo SOMENTE as colunas reais da tabela
      registros.push({
        email: email,
        nome: rowData['NOME'] || null,
        login: rowData['LOGIN'] || null,
        departamento_raiz: rowData['DEPARTAMENTO'] || null,
        tipo_licenca: rowData['FABRICANTE'] || null,
        tipo_produto: tipo_produto_final || null,
        produto: rowData['PRODUTO'] || null,
        status: rowData['STATUS'] || 'Ativo',
        possui_licenca: possui_licenca
      });
    }

    for (const reg of registros) {
      const { error } = await supabase
        .from('licencas_usuarios')
        .upsert(reg, { onConflict: 'email' });

      if (error) {
        throw new Error(`Erro ao importar e-mail ${reg.email}: ${error.message}`);
      }
    }

    await loadData();
  };

  // Aplicar filtros
  const filteredLicencas = licencas.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchNome = item.nome?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchLogin = (item as any).login?.toLowerCase().includes(q);
      if (!matchNome && !matchEmail && !matchLogin) return false;
    }

    if (selectedSoftware && (item as any).software_id !== selectedSoftware) return false;
    if (selectedLocal && (item as any).local_id !== selectedLocal) return false;
    if (selectedStatus && item.status !== selectedStatus) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-[#00121E] text-white flex flex-col">
      <Header
        user={user}
        role={role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <MetricsCards
              data={licencas}
              softwares={softwares}
            />

            <FiltersBar
              search={search}
              onSearchChange={setSearch}
              software={selectedSoftware}
              onSoftwareChange={setSelectedSoftware}
              local={selectedLocal}
              onLocalChange={setSelectedLocal}
              status={selectedStatus}
              onStatusChange={setSelectedStatus}
              softwares={softwares}
              locais={locais}
            />

            <LicencasTable
              data={filteredLicencas}
              softwares={softwares}
              locais={locais}
              role={role}
              loading={loading}
              onRefresh={loadData}
              onImportBatch={handleImportBatch}
            />
          </div>
        )}

        {activeTab === 'softwares' && (
          <SoftwareManagement />
        )}

        {activeTab === 'admin-locais' && (
          <AdminLocais role={role} />
        )}

        {activeTab === 'permissoes' && (
          <AccessManagement currentRole={role} />
        )}
      </main>
    </div>
  );
}
