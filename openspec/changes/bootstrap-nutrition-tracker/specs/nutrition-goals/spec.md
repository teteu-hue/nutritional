## Purpose

Derivar e manter, para cada usuário, as metas diárias de energia e de macronutrientes a partir do perfil nutricional e do objetivo, permitindo override manual, para que o painel e o assistente de IA tenham um alvo objetivo com o qual comparar o consumo registrado.

## ADDED Requirements

### Requirement: Cálculo automático de metas
The system SHALL compute, from the user's nutritional profile, a daily energy target using the Mifflin–St Jeor equation multiplied by an activity factor (sedentário 1.2, leve 1.375, moderado 1.55, ativo 1.725, muito ativo 1.9) and adjusted by the user's goal (perder peso: −15%, manter: 0%, ganhar peso: +10%), together with default macronutrient split targets of 30% protein, 40% carbohydrate and 30% fat by energy.

#### Scenario: Metas geradas quando o perfil está completo
- **WHEN** um usuário completa ou atualiza o perfil nutricional com dados válidos
- **THEN** o sistema (re)calcula as metas diárias de energia e de macros e as disponibiliza como as metas ativas do usuário

#### Scenario: Perfil incompleto
- **WHEN** o perfil nutricional do usuário está incompleto (por exemplo, sem peso ou sem nível de atividade)
- **THEN** o sistema não gera metas automáticas e responde às consultas de meta indicando que o perfil precisa ser completado

### Requirement: Override manual de metas
The system SHALL let an authenticated user override the automatically computed daily targets by supplying custom values for energia (kcal), proteínas (g), carboidratos (g) e gorduras (g), and MUST persist those overrides as the active goals until the user clears them.

#### Scenario: Aplicação de override
- **WHEN** um usuário autenticado define valores manuais para uma ou mais metas
- **THEN** o sistema passa a usar esses valores como metas ativas para consultas subsequentes

#### Scenario: Limpeza do override
- **WHEN** um usuário limpa o override
- **THEN** o sistema volta a usar as metas calculadas automaticamente a partir do perfil atual

#### Scenario: Override inválido
- **WHEN** um override contém valor negativo, não numérico, ou um total de energia inconsistente com a soma dos macros informados em uma tolerância de 5%
- **THEN** o sistema rejeita a operação e explica a inconsistência

### Requirement: Consulta das metas ativas
The system SHALL let an authenticated user retrieve the currently active daily targets (energia, proteínas, carboidratos, gorduras), together with a flag indicating whether they were auto-computed or manually overridden.

#### Scenario: Metas auto-calculadas
- **WHEN** um usuário sem override consulta as metas ativas
- **THEN** o sistema retorna as metas derivadas do perfil e sinaliza a origem como "auto"

#### Scenario: Metas com override
- **WHEN** um usuário com override consulta as metas ativas
- **THEN** o sistema retorna as metas manuais persistidas e sinaliza a origem como "manual"
