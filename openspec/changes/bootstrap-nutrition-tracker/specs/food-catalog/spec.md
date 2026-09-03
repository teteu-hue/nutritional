## Purpose

Manter um catálogo pesquisável de alimentos com valores nutricionais padronizados, e permitir que cada usuário complemente esse catálogo com alimentos personalizados, para que o registro de refeições possa se apoiar em uma fonte de dados nutricionais consistente.

## ADDED Requirements

### Requirement: Catálogo base de alimentos
The system SHALL provide, out of the box, a catalog of common foods, where each food item MUST expose a unique identifier, a name, a base unit (100 g for solids or 100 ml for liquids), and nutritional values per base unit for energia (kcal), proteínas (g), carboidratos (g), gorduras totais (g), fibras (g) e sódio (mg).

#### Scenario: Consulta ao catálogo base
- **WHEN** um usuário autenticado consulta um alimento do catálogo base pelo seu identificador
- **THEN** o sistema retorna o nome, a unidade base e todos os valores nutricionais por unidade base

#### Scenario: Valores nutricionais completos por item
- **WHEN** um alimento é incluído no catálogo base
- **THEN** os campos energia, proteínas, carboidratos, gorduras totais, fibras e sódio DEVEM estar presentes e ser numéricos não negativos

### Requirement: Busca textual de alimentos
The system SHALL let an authenticated user search foods by a partial, case-insensitive and accent-insensitive text match against the food name, and MUST return results ordered by relevance and limited to a paginated response of at most 50 items per page.

#### Scenario: Busca com resultados
- **WHEN** um usuário autenticado busca por um termo que corresponde a um ou mais alimentos (ex.: "arroz")
- **THEN** o sistema retorna a página de resultados com os alimentos correspondentes, cada um com identificador, nome e resumo nutricional

#### Scenario: Busca sem resultados
- **WHEN** um usuário busca por um termo que não corresponde a nenhum alimento visível para ele
- **THEN** o sistema retorna uma lista vazia com status de sucesso, sem erro

#### Scenario: Insensibilidade a acentos e caixa
- **WHEN** um usuário busca por "acai" ou "AÇAÍ"
- **THEN** o sistema retorna os alimentos cujo nome contém "açaí"

### Requirement: Alimentos personalizados do usuário
The system SHALL let an authenticated user create, update and delete their own custom food items, which MUST follow the same nutritional schema as base foods and MUST be visible only to the user who created them.

#### Scenario: Criação de alimento personalizado
- **WHEN** um usuário autenticado cria um alimento personalizado com nome único para ele e valores nutricionais válidos
- **THEN** o sistema persiste o alimento vinculado à conta do usuário e o inclui nas buscas subsequentes daquele usuário

#### Scenario: Visibilidade restrita
- **WHEN** um usuário busca alimentos
- **THEN** o resultado inclui os alimentos do catálogo base mais os alimentos personalizados daquele usuário, e NÃO inclui alimentos personalizados de outros usuários

#### Scenario: Edição de alimento personalizado
- **WHEN** um usuário autenticado edita um dos seus alimentos personalizados
- **THEN** o sistema atualiza o alimento, e os registros de refeições passados que apontam para ele mantêm os valores nutricionais que estavam vigentes no momento em que a refeição foi registrada

### Requirement: Validação de valores nutricionais
The system SHALL reject any food creation or update in which any nutritional field is negative or non-numeric, or in which the name is empty or exceeds 120 characters.

#### Scenario: Valor nutricional negativo
- **WHEN** um usuário tenta criar ou atualizar um alimento com um valor nutricional negativo
- **THEN** o sistema rejeita a operação e indica o campo inválido

#### Scenario: Nome ausente ou muito longo
- **WHEN** um usuário envia um alimento com nome vazio ou com mais de 120 caracteres
- **THEN** o sistema rejeita a operação com uma mensagem sobre o comprimento do nome
