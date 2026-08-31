/*
# ARGUS - Criação das tabelas principais

## Título
Cria as tabelas `licencas_usuarios` e `perfis_usuarios` para o sistema ARGUS.

## Descrição
- `licencas_usuarios`: armazena os dados de licenças de software por usuário.
- `perfis_usuarios`: armazena os perfis de acesso (RBAC) dos usuários autenticados.

## Tabelas novas

### licencas_usuarios
- `id` (uuid, PK)
- `email` (text, único, obrigatório)
- `nome` (text)
- `matricula` (text)
- `departamento_raiz` (text)
- `sub_departamento` (text)
- `possui_licenca` (boolean, default false)
- `tipo_licenca` (text) — ex: 'PDF Gear', 'Microsoft 365', etc.
- `status` (text) — ex: 'Ativo', 'Pendente', 'Inativo'
- `atualizado_por` (text)
- `atualizado_em` (timestamptz, default now())
- `created_at` (timestamptz, default now())

### perfis_usuarios
- `id` (uuid, PK)
- `email` (text, único, obrigatório)
- `role` (text) — 'super_admin', 'editor', 'consulta'
- `created_at` (timestamptz, default now())

## Segurança
- RLS habilitado em ambas as tabelas.
- Policies para usuários autenticados (@senado.leg.br).
- super_admin seed: josercn@senado.leg.br.

## Notas
- Policies permitem leitura para todos autenticados.
- Escrita/edição restrita: verificada no app via role na tabela perfis_usuarios.
- Políticas permissivas para leitura — controle granular de escrita no front-end.
*/

-- =============================================
-- TABELA: licencas_usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS licencas_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nome text,
  matricula text,
  departamento_raiz text,
  sub_departamento text,
  possui_licenca boolean NOT NULL DEFAULT false,
  tipo_licenca text,
  status text DEFAULT 'Pendente',
  atualizado_por text,
  atualizado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE licencas_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_licencas" ON licencas_usuarios;
CREATE POLICY "auth_select_licencas" ON licencas_usuarios FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_licencas" ON licencas_usuarios;
CREATE POLICY "auth_insert_licencas" ON licencas_usuarios FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_licencas" ON licencas_usuarios;
CREATE POLICY "auth_update_licencas" ON licencas_usuarios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_licencas" ON licencas_usuarios;
CREATE POLICY "auth_delete_licencas" ON licencas_usuarios FOR DELETE
  TO authenticated USING (true);

-- =============================================
-- TABELA: perfis_usuarios
-- =============================================
CREATE TABLE IF NOT EXISTS perfis_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'consulta' CHECK (role IN ('super_admin', 'editor', 'consulta')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE perfis_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_perfis" ON perfis_usuarios;
CREATE POLICY "auth_select_perfis" ON perfis_usuarios FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_perfis" ON perfis_usuarios;
CREATE POLICY "auth_insert_perfis" ON perfis_usuarios FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_perfis" ON perfis_usuarios;
CREATE POLICY "auth_update_perfis" ON perfis_usuarios FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_perfis" ON perfis_usuarios;
CREATE POLICY "auth_delete_perfis" ON perfis_usuarios FOR DELETE
  TO authenticated USING (true);

-- =============================================
-- SEED: super_admin padrão
-- =============================================
INSERT INTO perfis_usuarios (email, role)
VALUES ('josercn@senado.leg.br', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
