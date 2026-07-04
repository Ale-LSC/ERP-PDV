# Checklist de publicação do MVP

## Antes da publicação

- [ ] Criar servidor Linux com Docker e Docker Compose atualizados.
- [ ] Apontar o domínio para o servidor e configurar TLS no proxy externo.
- [ ] Definir `POSTGRES_PASSWORD`, `JWT_SECRET` e `APP_ORIGIN` com valores de produção.
- [ ] Executar `pnpm install --frozen-lockfile` e `pnpm check` na revisão da versão.
- [ ] Confirmar que o pipeline de CI concluiu lint, testes, build, migrações e E2E.
- [ ] Fazer backup do banco atual antes de cada atualização.

## Publicação

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build --wait
docker compose -f docker-compose.prod.yml ps
curl --fail https://SEU_DOMINIO/api/health
```

A API aplica automaticamente as migrações antes de iniciar. Não execute o seed
demonstrativo em produção.

## Validação funcional

- [ ] Entrar como proprietário e criar uma filial e um funcionário de teste.
- [ ] Cadastrar produto, fornecedor e cliente.
- [ ] Registrar uma compra e conferir a entrada no estoque e no financeiro.
- [ ] Abrir caixa, concluir e cancelar uma venda, conferindo estoque e resumo.
- [ ] Fechar caixa e conferir relatório e trilha de auditoria.
- [ ] Testar leitor de código de barras e impressora no equipamento real do caixa.

## Operação contínua

- [ ] Agendar backup diário criptografado fora do servidor da aplicação.
- [ ] Testar restauração do backup antes de liberar a operação e trimestralmente.
- [ ] Monitorar indisponibilidade de `/api/health`, espaço em disco e uso do banco.
- [ ] Definir retenção de logs e dados pessoais conforme a política LGPD da empresa.
- [ ] Manter um responsável e um procedimento de resposta a incidentes.

## Dependências externas ainda obrigatórias

Emissão fiscal e pagamentos integrados não são liberados somente com a publicação
do sistema. NF-e/NFC-e exige certificado, credenciamento e homologação com a SEFAZ
ou provedor fiscal. TEF/adquirente exige contrato, credenciais e homologação dos
equipamentos. Até essas integrações existirem, pagamentos são apenas registrados
no ERP e documentos fiscais devem ser emitidos pelo processo externo da empresa.
