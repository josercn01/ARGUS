/*
# ARGUS - Adição de campos de granularidade (Tipo de Produto e Produto)

## Título
Adiciona os campos `tipo_produto` e `produto` às tabelas `softwares` e `licencas_usuarios` para suportar granularidade por produto e tipo de produto.

## Descrição
- `softwares`: ganha `fabricante` (ex: Adobe, Microsoft), `tipo_produto` (ex: Creative Cloud, Nuvem de Documentos) e `produto` (ex: Photoshop, Acrobat Pro DC).
- `licencas_usuarios`: ganha `tipo_produto` e `produto` para vincular o usuário a um produto/perfil específico de uma licença.

## Modificações em tabelas existentes

### softwares
- `fabricante` (text) — fabricante do software (ex: Adobe, Microsoft 365, Figma, Autodesk, Copilot)
- `tipo_produto` (text) — tipo de produto (ex: Creative Cloud, Aplicativo Individual, Nuvem de Documentos, M335 Enterprise)
- `produto` (text) — produto/perfil específico (ex: Photoshop, Illustrator, Acrobat Pro DC, Figma Professional)

### licencas_usuarios
- `tipo_produto` (text) — tipo de produto atribuído
- `produto` (text) — produto/perfil específico atribuído

## Segurança
- Nenhuma alteração de RLS — as policies existentes já cobrem os novos campos.

## Notas
1. Todos os campos são opcionais (nullable) para manter compatibilidade com dados existentes.
2. O formulário de softwares passa a exibir Fabricante, Tipo de Produto e Produto.
3. O formulário de usuários passa a ter selects encadeados: Fabricante → Tipo de Produto → Produto.
4. O modelo de planilha .xlsx é atualizado com colunas TIPO_PRODUTO e PRODUTO.
*/

-- =============================================
-- ALTER: softwares - adicionar fabricante, tipo_produto, produto
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'softwares' AND column_name = 'fabricante'
  ) THEN
    ALTER TABLE softwares ADD COLUMN fabricante text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'softwares' AND column_name = 'tipo_produto'
  ) THEN
    ALTER TABLE softwares ADD COLUMN tipo_produto text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'softwares' AND column_name = 'produto'
  ) THEN
    ALTER TABLE softwares ADD COLUMN produto text;
  END IF;
END $$;

-- =============================================
-- ALTER: licencas_usuarios - adicionar tipo_produto, produto
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licencas_usuarios' AND column_name = 'tipo_produto'
  ) THEN
    ALTER TABLE licencas_usuarios ADD COLUMN tipo_produto text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licencas_usuarios' AND column_name = 'produto'
  ) THEN
    ALTER TABLE licencas_usuarios ADD COLUMN produto text;
  END IF;
END $$;
