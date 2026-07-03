# ERP-PDV

ERP multiempresa com catálogo de produtos, controle de estoque e a fundação do
ponto de venda. Construído como monorepo com NestJS, React, PostgreSQL e Drizzle
ORM.

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker e Docker Compose

## Ambiente local

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
docker compose up -d
pnpm install
pnpm --filter api db:migrate
```

Em terminais separados:

```bash
pnpm --filter api start:dev
pnpm --filter web dev
```

A API usa `http://localhost:3000` e o frontend usa `http://localhost:5173`.

## Ordem do cadastro

O primeiro cadastro é feito em uma única transação na seguinte ordem:

1. Administrador principal (dono da conta).
2. Empresa e sua unidade Matriz.
3. Filiais adicionais, cadastradas pelo administrador.
4. Administradores e funcionários, com função e filial definidas.

O endpoint público `POST /onboarding` cria o administrador, a empresa, a matriz
e todos os vínculos iniciais. Depois disso, novos acessos são criados somente
por dono ou administrador na seção **Funcionários**.

## Comandos

```bash
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm db:seed
pnpm db:backup
```

## Endpoints atuais

- `GET /health`: verifica se a API alcança o PostgreSQL.
- `POST /users`: cria um usuário.
- `GET /users`: lista usuários; requer token JWT.
- `POST /auth/login`: autentica e retorna um token.
- `GET /auth/me`: retorna o usuário do token.
- `POST /companies`: cria uma empresa e vincula o usuário como proprietário.
- `GET /companies`: lista as empresas do usuário.
- `POST /companies/:companyId/members`: adiciona ou altera um membro.
- `GET /companies/:companyId/members`: lista os membros da empresa.
- `POST /companies/:companyId/employees`: cria um funcionário, função e acesso à filial.
- `GET /companies/:companyId/employees`: lista funcionários, filiais e status.
- `PATCH /companies/:companyId/employees/:employeeId`: edita função, filial ou status do funcionário.
- `POST /companies/:companyId/products`: cadastra um produto.
- `GET /companies/:companyId/products`: lista produtos ativos.
- `PATCH /companies/:companyId/products/:productId`: edita um produto.
- `POST /companies/:companyId/customers`: cadastra um cliente.
- `GET /companies/:companyId/customers`: lista clientes ativos.
- `PATCH /companies/:companyId/customers/:customerId`: edita ou inativa um cliente.
- `POST /companies/:companyId/stock-movements`: movimenta o estoque.
- `GET /companies/:companyId/stock-movements`: consulta o histórico de estoque.
- `POST /companies/:companyId/cash-sessions/open`: abre o caixa do operador.
- `GET /companies/:companyId/cash-sessions/current`: consulta o caixa aberto.
- `POST /companies/:companyId/cash-sessions/:sessionId/close`: fecha o caixa.
- `GET /companies/:companyId/cash-sessions/:sessionId/summary`: confere vendas e pagamentos do caixa.
- `POST /companies/:companyId/sales`: conclui uma venda e baixa o estoque.
- `GET /companies/:companyId/sales`: lista as vendas recentes.
- `GET /companies/:companyId/sales/:saleId`: detalha uma venda para consulta ou impressão.
- `POST /companies/:companyId/sales/:saleId/cancel`: cancela a venda e devolve o estoque.
- `GET /companies/:companyId/reports/overview`: resume vendas, pagamentos, estoque e produtos por período; requer proprietário ou administrador.
- `POST /companies/:companyId/finance/entries`: cria uma conta a pagar ou receber.
- `GET /companies/:companyId/finance/entries`: lista lançamentos financeiros.
- `PATCH /companies/:companyId/finance/entries/:entryId/settle`: registra a baixa de um lançamento.
- `GET /companies/:companyId/finance/summary`: resume valores pagos, recebidos e pendentes.
- `POST /companies/:companyId/suppliers`: cadastra um fornecedor.
- `GET /companies/:companyId/suppliers`: lista fornecedores ativos.
- `PATCH /companies/:companyId/suppliers/:supplierId`: edita ou inativa um fornecedor.
- `POST /companies/:companyId/purchases`: registra compra, entrada de estoque e conta a pagar.
- `GET /companies/:companyId/purchases`: lista as compras recentes.
- `POST /companies/:companyId/purchases/:purchaseId/cancel`: cancela uma compra e reverte seus efeitos.

## Estado atual

O fluxo operacional cobre empresas, equipe, clientes, fornecedores, produtos,
estoque, compras, caixa, vendas, comprovantes, relatórios e financeiro.

### Perfis de acesso

- `owner`: acesso completo e gestão de proprietários.
- `admin`: acesso operacional completo e gestão da equipe.
- `finance`: financeiro e relatórios.
- `stock`: produtos, estoque, fornecedores e compras.
- `cashier`: somente PDV, clientes e solicitações de reposição.

A seção **Funcionários** permite cadastrar nome, e-mail, senha inicial, função
e filial em um modal. Ao entrar, cada funcionário é direcionado automaticamente
para sua área principal: PDV, estoque, financeiro ou painel administrativo.
O dono ou administrador também pode editar e inativar o acesso. A inativação é
por empresa: ela não interfere no acesso do mesmo usuário a outra organização.

O cadastro público legado em `/users` permanece desabilitado. Novos usuários
são criados pelo onboarding inicial ou por um administrador na seção de
funcionários.

No cadastro, a empresa informa segmento (mercado, indústria, comércio,
serviços ou outro) e porte. Esses dados formam a base para ativar fluxos
especializados sem misturar regras de segmentos diferentes.

### Módulos por segmento

Ao criar uma empresa, o sistema habilita automaticamente módulos operacionais
de acordo com o segmento escolhido. Esses módulos controlam os menus e criam a
base para evoluir o produto sem espalhar regras específicas de segmento pela
aplicação.

- `market`: ERP + PDV, caixa, promoções, fiscal e controle de validade/lotes.
- `industry`: ERP industrial com produção, ficha técnica, MRP, qualidade e fiscal.
- `retail`: ERP comercial com PDV, caixa, promoções e fiscal.
- `services`: clientes, financeiro, ordens de serviço, agenda e contratos.
- `other`: núcleo ERP comum com produtos, estoque, compras, financeiro e relatórios.

Os módulos habilitados ficam em `company_enabled_modules`. Empresas antigas são
preenchidas pela migração conforme o segmento já cadastrado.

Proprietários e administradores podem alterar os módulos pela tela
**Configuração**. A API também valida o módulo em cada rota operacional; ocultar
o menu não é usado como mecanismo de segurança.

Os módulos fiscal e qualidade usam `module_records` para registrar atividades
com título, descrição, prazo e status. Os demais módulos possuem estruturas de
negócio específicas, mantendo os dados isolados por empresa e módulo.

Produção possui fichas técnicas, cálculo MRP por filial e ordens que movimentam
insumos e produtos acabados de forma transacional. Para empresas de serviços,
ordens concluídas geram contas a receber, a agenda impede choque de horários e
contratos armazenam vigência, valor e ciclo de cobrança.

Vendas com lotes cadastrados consomem o saldo por FEFO (primeiro a vencer), não
usam lotes vencidos e restauram as alocações ao cancelar. Contratos ativos geram
contas a receber recorrentes sem repetir períodos já processados. Operações de
escrita são registradas em `audit_logs`.

O operador do PDV pode solicitar reposição de itens com estoque baixo. A equipe
de estoque acompanha e marca cada solicitação como atendida.

### Filiais

Cada empresa possui uma matriz e pode cadastrar outras unidades na tela de
equipe. O catálogo de produtos é compartilhado, enquanto saldo de estoque,
movimentações, solicitações, compras, caixas e vendas são isolados pela filial
selecionada no topo da aplicação. Os dados existentes foram preservados na
matriz durante a migração.

## Leitor de código de barras

O PDV aceita leitores USB ou Bluetooth configurados no modo teclado. Cadastre o
código no produto, mantenha o cursor na busca do PDV e configure o leitor para
enviar `Enter` após a leitura. O produto é incluído automaticamente e o campo é
limpo para a próxima leitura. Também é possível digitar um SKU e pressionar
`Enter`.

## Estoque

- **Quantidade disponível** é o saldo real que pode ser vendido.
- **Alerta de estoque mínimo** é apenas o limite usado para avisar que o produto
  precisa de reposição; ele não altera o saldo.
- Entradas, saídas e ajustes sempre geram histórico. Alterar a quantidade pela
  edição do produto cria um movimento de ajuste na mesma transação.
- A tela exibe as 100 movimentações mais recentes da empresa.

## Produção e segurança

- Defina um `JWT_SECRET` aleatório com ao menos 32 caracteres.
- Restrinja `CORS_ORIGIN` aos endereços reais do frontend, separados por vírgula.
- Use um usuário e uma senha exclusivos no PostgreSQL; não mantenha as credenciais
  locais do `docker-compose.yml` em produção.
- A API rejeita propriedades desconhecidas, valida todos os DTOs e encerra o pool
  do banco de forma graciosa.
- Proprietários e administradores controlam compras, financeiro, relatórios e
  cancelamentos; operadores ficam restritos à operação do caixa.

Backup manual do banco local:

```bash
docker compose exec -T postgres pg_dump -U postgres -d erp_pdv -Fc > erp-pdv.dump
```

Restauração em um banco vazio:

```bash
docker compose exec -T postgres pg_restore -U postgres -d erp_pdv --clean --if-exists < erp-pdv.dump
```

Antes de publicar uma versão:

```bash
pnpm install --frozen-lockfile
pnpm --filter api db:migrate
pnpm check
pnpm test:e2e
```

## Dados demonstrativos

Em ambiente local, `pnpm db:seed` cria dados idempotentes para avaliação:

- usuário: `demo@erp.local`
- senha: `Demo1234!`

O comando é bloqueado quando `NODE_ENV=production`.

## Execução em produção

Defina senhas próprias e inicie a composição de produção:

```bash
export POSTGRES_PASSWORD='uma-senha-forte'
export JWT_SECRET='um-segredo-aleatorio-com-mais-de-32-caracteres'
export APP_ORIGIN='https://erp.exemplo.com'
docker compose -f docker-compose.prod.yml up -d --build --wait
```

A API aplica as migrações antes de iniciar. O Nginx publica o frontend e
encaminha `/api` para a API. O health check externo fica em `/api/health`.

Este MVP não emite NF-e ou NFC-e. Operação fiscal real exige certificado
digital, credenciamento e homologação com a SEFAZ ou um provedor fiscal.
