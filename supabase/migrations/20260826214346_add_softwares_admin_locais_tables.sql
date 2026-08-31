/*
# ARGUS - Adição de tabelas de Softwares e Administradores Locais

## Título
Cria as tabelas `softwares` e `administradores_locais`, e atualiza a constraint de role em `perfis_usuarios` para incluir 'admin'.

## Descrição
- `softwares`: armazena o catálogo de softwares cadastrados e a quantidade total de licenças disponíveis para cada um.
- `administradores_locais`: armazena os registros de administradores locais importados via planilha, com endereço lógico, quantidade de admins, departamento, setor, justificativa e prefixo.
- `perfis_usuarios`: a constraint de role é atualizada para incluir o perfil 'admin' (entre super_admin e leitor/consulta).

## Tabelas novas

### softwares
- `id` (uuid, PK)
- `nome` (text, único, obrigatório) — nome do software
- `descricao` (text) — descrição opcional
- `qtd_licencas` (integer, default 0) — quantidade total de licenças disponíveis
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### administradores_locais
- `id` (uuid, PK)
- `endereco_logico` (text) — endereço lógico da máquina
- `qntd_admin` (integer) — quantidade de administradores na máquina
- `administradores` (text) — nomes dos administradores
- `departamento` (text) — departamento
- `setor` (text) — setor
- `justificativa` (text) — justificativa do privilégio administrativo
- `prefixo` (text) — prefixo
- `created_at` (timestamptz, default now())

## Modificações em tabelas existentes

### perfis_usuarios
- A constraint CHECK de role é substituída para incluir 'admin' além de 'super_admin', 'editor', 'consulta'.
- Seed atualizado: josercn@senado.leg.br permanece super_admin.

## Segurança
- RLS habilitado em ambas as novas tabelas.
- Policies permissivas para authenticated (leitura/escrita) — controle granular no front-end via role.
- Todas as policies usam drop-if-exists antes de create para idempotência.

## Notas
1. A tabela `softwares` permite que o módulo "Gerenciar Softwares" cadastre/editar/exclua softwares e defina qtd_licencas.
2. A tabela `administradores_locais` suporta importação em lote via planilha com colunas específicas.
3. O perfil 'admin' tem acesso de escrita mas não vê a aba "Gestão de Acessos" (apenas super_admin).
*/

-- =============================================
-- UPDATE: perfis_usuarios role constraint
-- =============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'perfis_usuarios_role_check'
      AND table_name = 'perfis_usuarios'
  ) THEN
    ALTER TABLE perfis_usuarios DROP CONSTRAINT perfis_usuarios_role_check;
  END IF;
END $$;

ALTER TABLE perfis_usuarios
  ADD CONSTRAINT perfis_usuarios_role_check
  CHECK (role IN ('super_admin', 'admin', 'editor', 'consulta'));

-- =============================================
-- TABELA: softwares
-- =============================================
CREATE TABLE IF NOT EXISTS softwares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  descricao text,
  qtd_licencas integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE softwares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_softwares" ON softwares;
CREATE POLICY "auth_select_softwares" ON softwares FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_softwares" ON softwares;
CREATE POLICY "auth_insert_softwares" ON softwares FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_softwares" ON softwares;
CREATE POLICY "auth_update_softwares" ON softwares FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_softwares" ON softwares;
CREATE POLICY "auth_delete_softwares" ON softwares FOR DELETE
  TO authenticated USING (true);

-- =============================================
-- TABELA: administradores_locais
-- =============================================
CREATE TABLE IF NOT EXISTS administradores_locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endereco_logico text,
  qntd_admin integer DEFAULT 0,
  administradores text,
  departamento text,
  setor text,
  justificativa text,
  prefixo text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE administradores_locais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_admin_locais" ON administradores_locais;
CREATE POLICY "auth_select_admin_locais" ON administradores_locais FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_admin_locais" ON administradores_locais;
CREATE POLICY "auth_insert_admin_locais" ON administradores_locais FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_admin_locais" ON administradores_locais;
CREATE POLICY "auth_update_admin_locais" ON administradores_locais FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_admin_locais" ON administradores_locais;
CREATE POLICY "auth_delete_admin_locais" ON administradores_locais FOR DELETE
  TO authenticated USING (true);

-- =============================================
-- SEED: softwares padrão
-- =============================================
INSERT INTO softwares (nome, descricao, qtd_licencas) VALUES
  ('PDF Gear', 'Licença PDF Gear', 0),
  ('Microsoft 365', 'Licença Microsoft 365', 0),
  ('Adobe Acrobat', 'Licença Adobe Acrobat Pro', 0),
  ('AutoCAD', 'Licença AutoCAD', 0)
ON CONFLICT (nome) DO NOTHING;
