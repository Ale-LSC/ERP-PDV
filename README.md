# ERP-PDV

ERP e PDV multiempresa para pequenas e médias operações, com controle de
produtos, estoque por filial, caixa, vendas, compras, financeiro, equipe,
relatórios e módulos especializados por segmento.

O projeto foi construído como monorepo com **NestJS**, **React**, **PostgreSQL**
e **Drizzle ORM**, priorizando regras de negócio explícitas, validação de dados,
segurança por perfil de usuário e uma base preparada para crescer com integrações
reais de pagamento e emissão fiscal.

## Visão geral

O ERP-PDV cobre o fluxo operacional essencial de uma empresa:

- cadastro inicial do proprietário, empresa e matriz;
- gestão de usuários, perfis e filiais;
- catálogo de produtos com SKU e código de barras;
- estoque isolado por filial;
- compras com entrada automática de estoque e conta a pagar;
- caixa, venda, recebimentos, troco, cancelamento e comprovante;
- clientes, fornecedores, financeiro e relatórios;
- módulos por segmento: mercado, comércio, indústria, serviços ou operação geral;
- trilha de auditoria para operações de escrita;
- base técnica para integrações futuras com provedores de pagamento e emissão fiscal.

> O sistema registra pagamentos e documentos fiscais internamente, mas ainda não
> autoriza cartão/Pix real nem transmite NF-e/NFC-e para a SEFAZ. Essas etapas
> dependem de provedor homologado e credenciais de produção.

## Stack

| Camada         | Tecnologia                                  |
| -------------- | ------------------------------------------- |
| Backend        | NestJS 11, TypeScript, JWT, class-validator |
| Frontend       | React 19, Vite, TypeScript                  |
| Banco          | PostgreSQL 17                               |
| ORM/Migrations | Drizzle ORM / Drizzle Kit                   |
| Infra local    | Docker Compose                              |
| Pacotes        | pnpm workspace                              |
| Testes         | Jest, Supertest                             |
| Deploy         | Docker multi-stage + Nginx                  |

## Funcionalidades

### Empresas, filiais e equipe

- Onboarding público em uma transação: usuário proprietário, empresa e matriz.
- Multiempresa por usuário.
- Filiais com estoque, caixa, compras, vendas e movimentações isoladas.
- Perfis de acesso:
  - `owner`: acesso total;
  - `admin`: operação completa e gestão de equipe;
  - `finance`: financeiro e relatórios;
  - `stock`: produtos, estoque, fornecedores e compras;
  - `cashier`: PDV, clientes e reposição.
- Funcionários podem ser criados, editados, vinculados a filiais e inativados.

### Produtos e estoque

- Cadastro de produtos com preço de venda, custo, estoque mínimo e código de barras.
- Geração automática de SKU.
- Saldo por filial.
- Histórico de entradas, saídas e ajustes.
- Alertas de estoque baixo.
- Solicitações de reposição feitas pelo operador do PDV.

### PDV e caixa

- Abertura e fechamento de caixa.
- Venda com múltiplos itens.
- Pagamento em dinheiro, Pix, débito e crédito como registro operacional.
- Cálculo de desconto, total, valor recebido e troco.
- Baixa automática de estoque.
- Cancelamento de venda com devolução de estoque.
- Consulta de comprovante.
- Suporte a leitor de código de barras configurado como teclado.

### Compras e financeiro

- Cadastro de fornecedores.
- Registro de compras.
- Entrada automática de estoque.
- Geração de conta a pagar.
- Contas a pagar e receber.
- Baixa de lançamentos.
- Resumo financeiro por status e tipo.

### Relatórios

- Receita, quantidade de vendas, ticket médio e descontos.
- Totais por forma de pagamento.
- Produtos mais vendidos.
- Valor de estoque a custo e a venda.
- Quantidade de clientes e produtos em estoque baixo.

### Módulos por segmento

Ao criar uma empresa, o sistema habilita módulos de acordo com o segmento:

| Segmento  | Módulos principais                                         |
| --------- | ---------------------------------------------------------- |
| Mercado   | ERP, PDV, caixa, promoções, fiscal, validade/lotes         |
| Comércio  | ERP, PDV, caixa, promoções, fiscal                         |
| Indústria | produção, ficha técnica, MRP, qualidade, fiscal            |
| Serviços  | clientes, financeiro, ordens de serviço, agenda, contratos |
| Outro     | núcleo ERP comum                                           |

Os módulos ficam registrados em `company_enabled_modules`. O frontend usa esses
módulos para montar a navegação, e a API valida o módulo nas rotas protegidas.

### Produção, serviços e módulos operacionais

- Fichas técnicas com produto acabado, rendimento e insumos.
- Cálculo MRP por filial.
- Ordens de produção com baixa de insumos e entrada do produto acabado.
- Ordens de serviço.
- Agenda com validação contra sobreposição.
- Contratos com geração recorrente de contas a receber.
- Registros genéricos para módulos como fiscal e qualidade.

### Pagamentos e emissão fiscal

A estrutura já separa o registro interno da futura integração externa.

Hoje o sistema:

- registra a forma de pagamento na venda;
- cria transações internas em `payment_transactions`;
- mantém status, provedor, identificadores externos, autorização, NSU e payload;
- permite consultar e atualizar o resultado de provedor via endpoint administrativo;
- possui tabela `fiscal_documents` para NF-e/NFC-e, status, chave de acesso,
  protocolo, XML/PDF, payload e erros de autorização.

Ainda falta plugar um provedor real para:

- autorização de Pix/cartão/TEF;
- webhooks de confirmação e conciliação;
- emissão de NF-e/NFC-e;
- cancelamento fiscal;
- contingência;
- certificado digital e homologação.

Provedores que podem ser integrados posteriormente:

- pagamentos: Stone, Cielo, PagBank, Mercado Pago, Efí, Stripe, TEF homologado;
- fiscal: Nuvem Fiscal, Focus NFe, Tecnospeed, PlugNotas, eNotas ou SEFAZ direta.

## Arquitetura

```text
ERP-PDV
├── api/                 # NestJS API
│   ├── src/
│   │   ├── auth/        # Login, JWT e guarda de autenticação
│   │   ├── companies/   # Empresas, usuários, módulos e onboarding
│   │   ├── branches/    # Filiais e vínculo de usuários
│   │   ├── products/    # Produtos e SKU
│   │   ├── stock/       # Estoque e movimentações
│   │   ├── cash/        # Caixa
│   │   ├── sales/       # Vendas e cancelamentos
│   │   ├── payments/    # Estrutura para integrações de pagamento
│   │   ├── finance/     # Contas a pagar/receber
│   │   ├── purchases/   # Compras
│   │   ├── reports/     # Relatórios
│   │   └── database/    # Drizzle, schemas e migrations
│   └── drizzle/         # Migrações SQL
├── web/                 # React + Vite
│   └── src/
│       ├── features/    # Telas por domínio
│       ├── lib/         # API client, loaders e navegação
│       └── types.ts     # Tipos compartilhados do frontend
├── docs/                # Checklist de publicação
└── docker-compose*.yml  # Infra local e produção
```

## Requisitos

- Node.js 22+
- pnpm 11+
- Docker e Docker Compose
- PostgreSQL local via Docker Compose

## Configuração local

```bash
git clone <repo>
cd ERP-PDV

cp api/.env.example api/.env
cp web/.env.example web/.env

docker compose up -d
pnpm install
pnpm --filter api db:migrate
pnpm db:seed
```

Usuário demonstrativo:

```text
E-mail: demo@erp.local
Senha:  Demo1234!
```

## Execução

Em dois terminais:

```bash
pnpm --filter api start:dev
```

```bash
pnpm --filter web dev
```

Endereços padrão:

| Serviço      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost:5173        |
| API          | http://localhost:3000        |
| Health check | http://localhost:3000/health |

## Comandos úteis

```bash
pnpm check          # lint + testes + build
pnpm lint           # lint API e web
pnpm test           # testes unitários da API
pnpm test:e2e       # fluxo crítico end-to-end
pnpm build          # build API e web
pnpm db:seed        # dados demonstrativos locais
pnpm db:backup      # backup do banco local
```

Migrações:

```bash
pnpm --filter api db:generate
pnpm --filter api db:migrate
```

## Validação atual

O projeto foi validado com:

- lint da API;
- lint do frontend;
- testes unitários da API;
- testes E2E do fluxo crítico;
- build de produção da API;
- build de produção do frontend;
- geração de schema Drizzle sem divergências;
- migrações aplicadas com sucesso;
- API local iniciando e conectando ao PostgreSQL;
- login demo funcionando.

Fluxo E2E coberto:

1. health check da API e banco;
2. onboarding de empresa e proprietário;
3. login;
4. listagem de empresas e módulos;
5. cadastro de produto;
6. abertura de caixa;
7. venda;
8. baixa de estoque.

## Principais endpoints

### Autenticação

- `POST /onboarding`
- `POST /auth/login`
- `GET /auth/me`

### Empresas e equipe

- `GET /companies`
- `POST /companies`
- `GET /companies/:companyId/modules`
- `PATCH /companies/:companyId/modules`
- `GET /companies/:companyId/employees`
- `POST /companies/:companyId/employees`
- `PATCH /companies/:companyId/employees/:employeeId`
- `GET /companies/:companyId/branches`
- `POST /companies/:companyId/branches`

### Operação

- `GET /companies/:companyId/products`
- `POST /companies/:companyId/products`
- `PATCH /companies/:companyId/products/:productId`
- `GET /companies/:companyId/customers`
- `POST /companies/:companyId/customers`
- `GET /companies/:companyId/stock-movements`
- `POST /companies/:companyId/stock-movements`
- `GET /companies/:companyId/suppliers`
- `POST /companies/:companyId/suppliers`
- `GET /companies/:companyId/purchases`
- `POST /companies/:companyId/purchases`

### PDV

- `POST /companies/:companyId/cash-sessions/open`
- `GET /companies/:companyId/cash-sessions/current`
- `GET /companies/:companyId/cash-sessions/:sessionId/summary`
- `POST /companies/:companyId/cash-sessions/:sessionId/close`
- `POST /companies/:companyId/sales`
- `GET /companies/:companyId/sales`
- `GET /companies/:companyId/sales/:saleId`
- `POST /companies/:companyId/sales/:saleId/cancel`

### Pagamentos e fiscal

- `GET /companies/:companyId/payments/transactions`
- `GET /companies/:companyId/sales/:saleId/payments/transactions`
- `PATCH /companies/:companyId/payments/transactions/:transactionId/provider-result`

### Relatórios e financeiro

- `GET /companies/:companyId/reports/overview`
- `GET /companies/:companyId/finance/entries`
- `POST /companies/:companyId/finance/entries`
- `PATCH /companies/:companyId/finance/entries/:entryId/settle`
- `GET /companies/:companyId/finance/summary`

## Produção

Variáveis obrigatórias:

```bash
export POSTGRES_PASSWORD='uma-senha-forte'
export JWT_SECRET='um-segredo-aleatorio-com-mais-de-32-caracteres'
export APP_ORIGIN='https://erp.exemplo.com'
```

Subida com Docker Compose:

```bash
docker compose -f docker-compose.prod.yml up -d --build --wait
```

O compose de produção inclui:

- PostgreSQL;
- API NestJS;
- frontend estático servido por Nginx;
- proxy de `/api` para a API;
- health checks;
- execução automática das migrations antes da API iniciar.

Checklist completo: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Backup e restauração

Backup local:

```bash
docker compose exec -T postgres pg_dump -U postgres -d erp_pdv -Fc > erp-pdv.dump
```

Restauração:

```bash
docker compose exec -T postgres pg_restore -U postgres -d erp_pdv --clean --if-exists < erp-pdv.dump
```

Em produção, agende backup diário, armazene fora do servidor e teste restauração
periodicamente.

## Segurança

- JWT obrigatório nas rotas operacionais.
- `JWT_SECRET` deve ter pelo menos 32 caracteres.
- CORS restrito por `CORS_ORIGIN`.
- DTOs validam tipos e rejeitam propriedades desconhecidas.
- Perfil de usuário validado na API, não apenas no menu.
- Módulos da empresa validados nas rotas protegidas.
- Escritas relevantes entram em `audit_logs`.
- Senhas são armazenadas com hash bcrypt.

## Limites conhecidos

O MVP ainda não substitui integrações regulatórias ou financeiras externas.

Ainda não há:

- autorização real de cartão;
- Pix dinâmico com confirmação automática;
- TEF homologado;
- emissão NF-e/NFC-e;
- transmissão para SEFAZ;
- certificado digital;
- inutilização, carta de correção ou contingência fiscal;
- conciliação bancária automática;
- monitoramento produtivo pronto;
- rotina automatizada de backup remoto.

## Roadmap sugerido

1. Escolher provedor fiscal e provedor de pagamentos.
2. Implementar adapters concretos em cima das tabelas `payment_transactions` e
   `fiscal_documents`.
3. Adicionar webhooks de pagamento e fiscal.
4. Criar tela administrativa para credenciais por empresa.
5. Homologar emissão fiscal em ambiente de teste.
6. Validar PDV com leitor, impressora e operação real.
7. Adicionar observabilidade, backups automáticos e alertas.
8. Fazer teste de carga com múltiplos caixas/usuários.

## Status

O ERP-PDV está em estado de **MVP funcional validado localmente**. Ele é adequado
para demonstração, testes internos, evolução do produto e piloto controlado.

Para operação comercial definitiva, ainda é necessário homologar ambiente real,
backup, monitoramento, pagamentos e emissão fiscal conforme o provedor escolhido.
