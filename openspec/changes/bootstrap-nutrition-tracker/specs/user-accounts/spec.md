## Purpose

Fornecer contas individuais de usuário e um perfil nutricional completo, para que todo dado registrado no sistema (refeições, metas, interações com a IA) seja isolado por usuário autenticado e possa ser usado como contexto pelas demais capacidades.

## ADDED Requirements

### Requirement: Cadastro de novo usuário
The system SHALL permit a visitor to create a new account by providing an e-mail address and a password of at least 8 characters, and SHALL reject the submission when the e-mail is already associated with an existing account.

#### Scenario: Cadastro bem-sucedido
- **WHEN** um visitante envia um cadastro com e-mail ainda não utilizado, senha com 8 ou mais caracteres e aceite dos termos de uso
- **THEN** o sistema cria a conta, retorna um identificador do usuário e envia o visitante para a etapa de completar o perfil

#### Scenario: E-mail já cadastrado
- **WHEN** um visitante envia um cadastro com e-mail já registrado em outra conta
- **THEN** o sistema rejeita o cadastro com uma mensagem indicando que o e-mail já está em uso, sem revelar outros dados da conta existente

#### Scenario: Senha fraca
- **WHEN** um visitante envia uma senha com menos de 8 caracteres
- **THEN** o sistema rejeita o cadastro com uma mensagem explicando o requisito mínimo de senha

### Requirement: Autenticação por e-mail e senha
The system SHALL authenticate a user by e-mail and password, MUST store passwords only as a salted cryptographic hash, and SHALL return a session token that authorizes subsequent API calls on behalf of that user.

#### Scenario: Login bem-sucedido
- **WHEN** um usuário existente envia e-mail e senha corretos
- **THEN** o sistema retorna um token de sessão associado exclusivamente àquele usuário

#### Scenario: Credenciais inválidas
- **WHEN** um usuário envia e-mail correto mas senha incorreta, ou e-mail inexistente
- **THEN** o sistema rejeita o login com uma mensagem genérica de credenciais inválidas, sem indicar qual campo falhou

#### Scenario: Sessão inválida ou expirada
- **WHEN** uma requisição autenticada usa um token ausente, malformado ou expirado
- **THEN** o sistema recusa a requisição com status de não autorizado, sem executar nenhuma alteração

### Requirement: Encerramento de sessão
The system SHALL provide a way for an authenticated user to invalidate the current session token so that it can no longer be used.

#### Scenario: Logout invalida o token
- **WHEN** um usuário autenticado solicita logout
- **THEN** o sistema invalida o token da sessão atual, e usos posteriores desse token são rejeitados como não autorizados

### Requirement: Perfil nutricional do usuário
The system SHALL maintain, for each user, a nutritional profile containing date of birth, biological sex, height in centimeters, current weight in kilograms, activity level (chosen from a fixed set: sedentário, leve, moderado, ativo, muito ativo) and goal (chosen from a fixed set: perder peso, manter peso, ganhar peso), and SHALL allow the user to update every field of that profile.

#### Scenario: Completar o perfil após o cadastro
- **WHEN** um usuário recém-cadastrado envia todos os campos exigidos do perfil com valores válidos
- **THEN** o sistema persiste o perfil e o marca como completo, habilitando o cálculo de metas nutricionais

#### Scenario: Atualização de peso
- **WHEN** um usuário autenticado atualiza o próprio peso atual com um valor positivo e plausível (entre 20 kg e 400 kg)
- **THEN** o sistema persiste o novo peso e disponibiliza o valor para o recálculo das metas nutricionais

#### Scenario: Valor fora do domínio
- **WHEN** o usuário envia um valor inválido em qualquer campo do perfil (ex.: altura negativa, sexo fora do conjunto permitido, objetivo desconhecido)
- **THEN** o sistema rejeita a atualização com uma mensagem indicando o campo e a restrição violada

### Requirement: Isolamento de dados por usuário
The system SHALL ensure that every user can read and modify only the records that belong to their own account, and MUST return "não encontrado" for records that belong to another user rather than revealing their existence.

#### Scenario: Acesso a recurso de outro usuário
- **WHEN** um usuário autenticado solicita, cria, atualiza ou remove um recurso identificado por um ID que pertence a outro usuário
- **THEN** o sistema responde como se o recurso não existisse para aquele usuário e não expõe nenhum dado do proprietário real
