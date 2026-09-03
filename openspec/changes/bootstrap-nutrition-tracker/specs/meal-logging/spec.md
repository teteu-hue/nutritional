## Purpose

Permitir que o usuário registre as refeições consumidas ao longo do dia, associando alimentos do catálogo a porções e horários, para que o sistema possa calcular totais nutricionais diários e alimentar o painel e o assistente de IA com dados reais.

## ADDED Requirements

### Requirement: Registro de refeição
The system SHALL let an authenticated user create a meal record with a date, an optional time, a meal type chosen from a fixed set (café da manhã, almoço, jantar, lanche) and one or more meal items, where each meal item MUST reference a food from the catalog visible to the user and specify a positive portion in grams or millilitres.

#### Scenario: Criação de uma refeição válida
- **WHEN** um usuário autenticado cria uma refeição com data válida, tipo permitido e pelo menos um item com alimento visível e porção positiva
- **THEN** o sistema persiste a refeição vinculada àquele usuário e retorna o identificador da refeição

#### Scenario: Item com alimento inacessível
- **WHEN** o usuário envia um item de refeição cujo alimento não existe ou pertence a outro usuário
- **THEN** o sistema rejeita a refeição inteira e informa o item inválido

#### Scenario: Porção não positiva
- **WHEN** o usuário envia um item com porção zero ou negativa
- **THEN** o sistema rejeita a refeição e informa o item inválido

### Requirement: Cálculo de macros por refeição
The system SHALL compute, for every persisted meal, the total energia (kcal), proteínas (g), carboidratos (g), gorduras (g), fibras (g) e sódio (mg) as the sum over its items, where each item's contribution is the food's per-100 g/ml value times the item's portion divided by 100.

#### Scenario: Totais calculados corretamente
- **WHEN** o usuário consulta uma refeição persistida
- **THEN** a resposta inclui os totais nutricionais da refeição derivados dos itens registrados, com os arredondamentos documentados

#### Scenario: Snapshot nutricional imutável
- **WHEN** o alimento referenciado por um item é editado depois da refeição ter sido criada
- **THEN** os totais e valores nutricionais da refeição já registrada permanecem inalterados, refletindo os valores vigentes no momento do registro

### Requirement: Edição e remoção de refeições
The system SHALL let an authenticated user update or delete only their own meals and MUST recompute the meal totals when items are added, changed or removed.

#### Scenario: Atualização de item
- **WHEN** o usuário altera a porção de um item de uma refeição já registrada
- **THEN** o sistema persiste a alteração e recalcula os totais da refeição

#### Scenario: Remoção de refeição
- **WHEN** o usuário remove uma refeição que lhe pertence
- **THEN** o sistema apaga a refeição e todos os seus itens, e ela deixa de aparecer nas consultas subsequentes

### Requirement: Consulta de refeições por data
The system SHALL let an authenticated user list their own meals filtered by a specific date, and MUST return them ordered by meal time when present or by creation order otherwise.

#### Scenario: Listagem por dia
- **WHEN** um usuário autenticado solicita as refeições de uma data
- **THEN** o sistema retorna apenas as refeições daquele usuário para aquela data, ordenadas cronologicamente
