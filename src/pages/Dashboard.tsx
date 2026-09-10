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

const ADOBE_SINGLE_APPS = [
  "Photoshop","Illustrator","InDesign","Premiere Pro","After Effects",
  "Audition","Lightroom","XD","Animate","Dreamweaver","Acrobat Pro"
];

function normalizeTipoProduto(valor: string): string {
  if (!valor) return 'ADOBE PRO DC';
  const v = valor.toLowerCase().trim();
  if (v.includes('acrobat') || v.includes('pro dc')) return 'ADOBE PRO DC';
  if (v.includes('todos') || v.includes('suite') || v.includes('all apps') || v.includes('edição') || v.includes('edicao') || v.includes('cc')) return 'SUITE - TODOS APPS';
  if (v.includes('individual') || v.includes('single') || ADOBE_SINGLE_APPS.some(a => v.includes(a.toLowerCase()))) return 'APLICATIVO INDIVIDUAL';
  return valor.toUpperCase();
}

export function Dashboard({ user, role }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [licencas, setLicencas] = useState<LicencaUsuario[]>([]);
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedSoftware, setSelectedSoftware] = useState('');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [licRes, softRes, locRes] = await Promise.all([
        supabase.from('licencas_usuarios').select('*').order('nome'),
        supabase.from('softwares').select('*').order('tipo_produto'),
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

  const handleImportBatch = async (
    file: File,
    onProgress?: (progress: { current: number; total: number; percent: number; message: string }) => void
  ) => {
    if (onProgress) onProgress({ current: 0, total: 0, percent: 0, message: 'Lendo arquivo...' });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim()!== '');
    if (lines.length < 2) throw new Error('O arquivo CSV está vazio ou sem dados.');

    const separator = lines[0].includes(';')? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toUpperCase().replace(/"/g, ''));

    const registros = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 ||!values.some(Boolean)) continue;

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (values[index]!== undefined) {
          rowData[header] = values[index];
        }
      });

      const email = rowData['EMAIL'] || rowData['E-MAIL'];
      if (!email) continue;

      let tipoProdutoRaw = rowData['TIPO_PRODUTO'] || rowData['TIPO'] || '';
      const produtoRaw = rowData['PRODUTO'] || '';
      const appRaw = rowData['APP_INDIVIDUAL'] || rowData['APP'] || '';

      // Detecta se produto é um app solto tipo Photoshop
      const isSingleApp = ADOBE_SINGLE_APPS.some(a =>
        produtoRaw.toLowerCase() === a.toLowerCase() || appRaw.toLowerCase() === a.toLowerCase()
      );

      let tipoFinal = normalizeTipoProduto(isSingleApp? 'APLICATIVO INDIVIDUAL' : (tipoProdutoRaw || produtoRaw));
      let produtoFinal = 'Acrobat Pro DC';
      let appFinal: string | null = null;

      if (tipoFinal === 'ADOBE PRO DC') {
        produtoFinal = 'Acrobat Pro DC';
      } else if (tipoFinal === 'SUITE - TODOS APPS') {
        produtoFinal = 'Suite - Todos os Apps';
      } else if (tipoFinal === 'APLICATIVO INDIVIDUAL') {
        produtoFinal = 'Aplicativo Individual';
        // Guarda qual app é
        const foundApp = ADOBE_SINGLE_APPS.find(a =>
          a.toLowerCase() === produtoRaw.toLowerCase() || a.toLowerCase() === appRaw.toLowerCase()
        );
        appFinal = foundApp || appRaw || produtoRaw || 'Photoshop';
      }

      const possuiLicencaStr = (rowData['POSSUI_LICENCA'] || 'VERDADEIRO').toUpperCase();
      const possui_licenca = ['VERDADEIRO','TRUE','1','SIM'].includes(possuiLicencaStr);

      registros.push({
        email: email.toLowerCase(),
        nome: rowData['NOME'] || null,
        login: (rowData['LOGIN'] || email.split('@')[0]).toLowerCase(),
        departamento_raiz: (rowData['DEPARTAMENTO'] || rowData['SETOR'] || null)?.toUpperCase() || null,
        tipo_licenca: 'Adobe',
        tipo_produto: tipoFinal,
        produto: produtoFinal,
        app_individual: appFinal,
        status: rowData['STATUS'] || 'Ativo',
        possui_licenca: possui_licenca
      });
    }

    const totalRegs = registros.length;
    if (totalRegs === 0) throw new Error('Nenhum registro válido encontrado.');

    for (let index = 0; index < totalRegs; index++) {
      const reg = registros[index];
      const currentNum = index + 1;
      const percent = Math.round((currentNum / totalRegs) * 100);

      if (onProgress) {
        onProgress({
          current: currentNum,
          total: totalRegs,
          percent,
          message: `Importando ${currentNum} de ${totalRegs} (${reg.email})...`
        });
      }

      const { error } = await supabase
       .from('licencas_usuarios')
       .upsert(reg, { onConflict: 'email' });

      if (error) {
        throw new Error(`Erro ao importar ${reg.email}: ${error.message}`);
      }
    }

    if (onProgress) {
      onProgress({ current: totalRegs, total: totalRegs, percent: 100, message: 'Importação concluída!' });
    }

    await loadData();
  };

  const filteredLicencas = licencas.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchNome = item.nome?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchLogin = (item as any).login?.toLowerCase().includes(q);
      const matchApp = (item as any).app_individual?.toLowerCase().includes(q);
      if (!matchNome &&!matchEmail &&!matchLogin &&!matchApp) return false;
    }

    // Filtro agora por tipo_produto (modelo fixo)
    if (selectedSoftware) {
      if (item.tipo_produto!== selectedSoftware) return false;
    }
    if (selectedLocal && (item as any).local_id!== selectedLocal) return false;
    if (selectedStatus && item.status!== selectedStatus) return false;

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
