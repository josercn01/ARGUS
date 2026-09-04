export type Role = 'super_admin' | 'admin' | 'editor' | 'consulta';

/**
 * Alias usado pelos componentes de RBAC (Módulo 5).
 * Mantido separado de `Role` apenas por legibilidade — é o mesmo conjunto.
 */
export type SystemRole = Role;

export type LicencaStatus = 'Ativo' | 'Pendente' | 'Inativo';

/** Módulo 4 — Administração de Locais (tabela `locais_trabalho`) */
export interface LocalTrabalho {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

/** Módulo 2 — Gestão de Licenças (tabela `licencas_usuarios`) */
export interface LicencaUsuario {
  id: string;
  email: string;
  nome: string | null;
  /** Login de rede do colaborador */
  login: string | null;
  /** Chapa / matrícula */
  chapa_matricula: string | null;
  /** @deprecated mantido para compatibilidade com dados legados; use `chapa_matricula` */
  matricula: string | null;

  /** Vínculo local/setorial */
  local_id: string | null;
  local_nome: string | null;
  departamento_raiz: string | null;
  sub_departamento: string | null;

  /** Vínculo com o catálogo de softwares */
  software_id: string | null;
  tipo_licenca: string | null;
  tipo_produto: string | null;
  produto: string | null;

  possui_licenca: boolean;
  status: string | null;

  atualizado_por: string | null;
  atualizado_em: string | null;
  created_at: string;
}

/** Módulo 3 — Gestão de Softwares (tabela `softwares`) */
export interface Software {
  id: string;
  nome: string;
  fabricante: string | null;
  tipo_produto: string | null;
  produto: string | null;
  descricao: string | null;
  /** Teto contratado */
  qtd_licencas: number;
  /** Espelho de `qtd_licencas` mantido por compatibilidade */
  quantidade_total?: number | null;
  /** Campo legado de bases antigas */
  quantidade?: number | null;
  created_at: string;
  updated_at: string;
}

/** Módulo 5 — Gestão de Acessos (tabela `perfis_usuarios`) */
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
