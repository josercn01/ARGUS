export type Role = 'super_admin' | 'admin' | 'editor' | 'consulta';

export interface LicencaUsuario {
  id: string;
  email: string;
  nome: string | null;
  matricula: string | null;
  departamento_raiz: string | null;
  sub_departamento: string | null;
  possui_licenca: boolean;
  tipo_licenca: string | null;
  tipo_produto: string | null;
  produto: string | null;
  status: string | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
  created_at: string;
}

export interface Software {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo_produto: string | null;
  produto: string | null;
  descricao: string | null;
  qtd_licencas: number;
  created_at: string;
  updated_at: string;
}

export interface AdminLocal {
  id: string;
  endereco_logico: string | null;
  qntd_admin: number;
  administradores: string | null;
  departamento: string | null;
  setor: string | null;
  justificativa: string | null;
  prefixo: string | null;
  created_at: string;
}

export interface PerfilUsuario {
  id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}
