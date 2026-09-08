export type SystemRole = 'super_admin' | 'admin' | 'editor' | 'consulta';

export type Role = SystemRole;

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

export interface LicencaUsuario {
  id: string;
  email: string;
  nome: string | null;
  login: string | null;
  matricula: string | null;
  chapa_matricula: string | null;
  departamento_raiz: string | null;
  sub_departamento: string | null;
  possui_licenca: boolean;
  tipo_licenca: string | null;
  tipo_produto: string | null;
  produto: string | null;
  status: string | null;
  software_id: string | null;
  local_id: string | null;
  local_nome: string | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
  created_at: string;
}

export interface Software {
  id: string;
  nome: string;
  fabricante: string | null;
  versao: string | null;
  tipo_produto: string | null;
  produto: string | null;
  descricao: string | null;
  qtd_licencas: number | null;
  quantidade_total: number | null;
  quantidade: number | null;
  licencas_totais: number | null;
  created_at: string;
  updated_at: string;
}

export interface LocalTrabalho {
  id: string;
  nome: string;
  sigla: string | null;
  descricao: string | null;
  created_at: string;
}

export interface AdminLocalItem {
  id: string;
  hostname: string;
  usuario_admin: string;
  nome_colaborador: string | null;
  setor: string | null;
  justificativa_chamado: string | null;
  created_at: string | null;
}
