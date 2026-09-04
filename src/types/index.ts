export type SystemRole = 'super_admin' | 'admin' | 'editor' | 'consulta';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface PermissaoUsuario {
  id: string;
  email: string;
  role: SystemRole;
  created_at: string;
  updated_at: string;
}

export interface AdminLocalItem {
  id: string;
  hostname: string;
  usuario_admin: string;
  nome_colaborador?: string;
  setor?: string;
  justificativa_chamado?: string;
  created_at?: string;
}

export interface Software {
  id: string;
  nome: string;
  fabricante?: string;
  versao?: string;
  licencas_totais?: number;
  descricao?: string;
  created_at?: string;
}

export interface LocalTrabalho {
  id: string;
  nome: string;
  sigla?: string;
  descricao?: string;
  created_at?: string;
}
