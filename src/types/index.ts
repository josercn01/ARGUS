export type SystemRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface LicencaUsuario {
  id: string;
  email: string;
  nome: string | null;
  login: string | null;
  departamento_raiz: string | null;
  cargo: string | null;
  tipo_licenca: string | null;
  tipo_produto: string | null;
  produto: string | null;
  app_individual: string | null;
  status: string | null;
  possui_licenca: boolean | null;
  atualizado_por: string | null;
  atualizado_em: string | null;
}

export interface Software {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo_produto: string | null;
  produto: string | null;
  descricao: string | null;
  qtd_licencas: number;
  quantidade_total?: number;
  updated_at?: string;
}

export interface LocalTrabalho {
  id: string;
  nome: string;
  endereco_logico?: string;
}
