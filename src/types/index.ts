export type SystemRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export type TabKey = 'dashboard' | 'admin-locais' | 'permissoes';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

// NOVO: CATÁLOGO DE SOFTWARES (balde + filhos)
export interface Software {
  id: string;
  nome: string; // ex: Photoshop, Todos os Apps - Edição 4, Acrobat Pro DC
  familia: 'ALL_APPS' | 'ACROBAT' | 'SINGLE_POOL' | string; // qual balde consome
  qtd_contratada: number; // >0 só para os 3 baldes: 202, 202, 225. Filhos = 0
  created_at?: string;
}

// NOVO: USUÁRIOS - REGISTRO DE PESSOAS (consome do balde)
export interface UsuarioLicenca {
  id: string;
  colaborador: string; // Nome
  login: string | null; // Email sem @
  email?: string | null;
  setor: string | null;
  software_id: string; // FK para Software
  software?: Software; // join
  status: 'ativo' | 'inativo' | null;
  created_at?: string;
}

// COMPATIBILIDADE: Mantém o nome antigo LicencaUsuario apontando pro novo
export type LicencaUsuario = UsuarioLicenca;

export interface LocalTrabalho {
  id: string;
  nome: string;
  endereco_logico?: string;
}

// Dashboard que alimenta os 4 cards
export interface DashboardStats {
  total_contratado: number; // 629
  em_uso: number; // 577
  disponiveis: number; // 52
  taxa: number; // 91.7
}
