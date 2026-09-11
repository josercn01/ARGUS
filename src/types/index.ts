export type SystemRole = 'super_admin' | 'admin' | 'editor' | 'viewer';
export type TabKey = 'dashboard' | 'admin-locais' | 'permissoes';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: { full_name?: string; };
}

// REVISADO - PASSO 2: Voce mesmo cadastra, sem nome BALDE
export interface Software {
  id: string;
  nome: string; // Photoshop, AutoCAD, Acrobat Pro DC, Todos os Apps
  
  // NOVO - Para seu fluxo: É adobe? Se sim qual tipo
  is_adobe: boolean; 
  tipo_adobe: 'ALL_APPS' | 'ACROBAT' | 'SINGLE' | null; // null = nao adobe (Autodesk)
  
  qtd_contratada: number; // Voce cadastra: 202, 225, 10 do AutoCAD...
  
  // COMPATIBILIDADE - Mantem para nao quebrar seu codigo antigo
  familia?: 'ALL_APPS' | 'ACROBAT' | 'SINGLE_POOL' | string; 
  
  created_at?: string;
}

// REVISADO - Usuario agora pode ter VARIAS licencas
export interface UsuarioLicenca {
  id: string;
  colaborador: string;
  login: string | null;
  email?: string | null;
  setor: string | null;
  
  // COMPATIBILIDADE - ainda existe para o codigo antigo funcionar
  software_id?: string; 
  software?: Software; 
  
  // NOVO - O que voce pediu: LUCAS | ACROBAT | PHOTOSHOP
  softwares?: Software[]; // varias licencas
  software_ids?: string[]; // ids para salvar

  status: 'ativo' | 'inativo' | null;
  created_at?: string;
}

// Tabela intermediaria para consumir 1 de cada
export interface UsuarioSoftware {
  usuario_id: string;
  software_id: string;
}

export type LicencaUsuario = UsuarioLicenca;

export interface LocalTrabalho {
  id: string;
  nome: string;
  endereco_logico?: string;
}

export interface DashboardStats {
  total_contratado: number;
  em_uso: number;
  disponiveis: number;
  taxa: number;
}
