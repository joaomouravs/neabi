# Biblioteca NEABI-NI

Plataforma de acervo do **Núcleo de Estudos Afro-Brasileiros e Indígenas (NEABI)
— CEFET/RJ, campus Nova Iguaçu**.

Não é uma vitrine institucional: é um sistema de biblioteca em funcionamento —
catálogo público pesquisável, controle de exemplares físicos, reservas para
consulta presencial com fluxo de aprovação, painel administrativo e
armazenamento de arquivos.

---

## Sumário

- [Sobre](#sobre)
- [Princípios do produto](#princípios-do-produto)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Seed e acervo inicial](#seed-e-acervo-inicial)
- [Capas das obras](#capas-das-obras)
- [Autenticação e papéis](#autenticação-e-papéis)
- [Armazenamento de arquivos](#armazenamento-de-arquivos)
- [E-mail](#e-mail)
- [Testes](#testes)
- [Build e deploy](#build-e-deploy)
- [Rotas](#rotas)
- [Segurança](#segurança)
- [Acessibilidade](#acessibilidade)
- [Pendências para o NEABI](#pendências-para-o-neabi)

---

## Sobre

A Biblioteca NEABI-NI organiza e dá acesso ao acervo do núcleo. Qualquer pessoa
pode navegar, pesquisar e consultar a ficha de uma obra sem cadastro. Para
solicitar a consulta presencial de um exemplar, é preciso entrar em uma conta.
A equipe do NEABI cataloga, controla exemplares e conduz o atendimento pelo
painel administrativo.

**Reserva ≠ empréstimo domiciliar.** O sistema agenda a consulta ou retirada
presencial do exemplar conforme as normas do núcleo. Se o NEABI decidir oferecer
empréstimo no futuro, a regra entra na camada de domínio sem alterar interface
nem repositórios.

## Princípios do produto

Três decisões atravessam todo o código e não devem ser afrouxadas:

1. **Metadado desconhecido fica vazio.** Ano, ISBN, editora, paginação, edição,
   autoria, número de tombo e localização que não puderam ser conferidos
   permanecem `null` e a obra fica marcada como `NEEDS_REVIEW`. A interface
   omite o campo em vez de exibir "não informado" ou um valor estimado.

2. **Disponibilidade física é derivada, nunca declarada.** Não existe um booleano
   "disponível" na obra: a disponibilidade vem da contagem de `PhysicalCopy` com
   situação `AVAILABLE`. Uma obra pode ter vários exemplares, e um exemplar em
   manutenção não é acervo consultável.

3. **Consulta digital exige autorização explícita.** Enviar um PDF **não** libera
   a leitura online. É preciso um ato separado, restrito à administração, que
   registra a autorização — decisão com implicação de direito autoral. Enquanto
   isso não acontece, o botão "Ler online" não existe e o arquivo é inacessível
   por URL direta.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript em modo `strict` |
| Interface | React 19, Tailwind CSS v4, Radix UI (primitivas acessíveis), Motion |
| Formulários | Server Actions + Zod (validação compartilhada cliente/servidor) |
| Banco | PostgreSQL |
| ORM | Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Autenticação | Auth.js v5 (credenciais, sessão JWT, adapter Prisma) |
| Armazenamento | Abstração `StorageProvider` — disco local ou S3/R2/Supabase |
| E-mail | Abstração de transporte — log em desenvolvimento, SMTP em produção |
| Testes | Vitest, Testing Library, Playwright |

## Arquitetura

Regra de negócio não mora em componente React. O fluxo é sempre o mesmo:

```
UI (Server/Client Component)
      ↓
Server Action  (src/features/*/actions.ts)   ← valida entrada, verifica permissão
      ↓
Service        (src/server/services/)        ← regra de negócio, transações
      ↓
Repository     (src/server/repositories/)    ← consultas e escritas
      ↓
Prisma / PostgreSQL
```

```
src/
  app/
    (site)/                 catálogo público, obra, reserva, conta
    (auth)/login            entrada e cadastro
    admin/                  painel administrativo
    api/
      arquivos/[...key]     entrega de arquivos com verificação de autorização
      auth/[...nextauth]    Auth.js

  components/
    ui/                     botões, campos, estados (carregando, vazio, erro)
    layout/                 cabeçalho, rodapé, marca, páginas de erro
    books/                  capa, cartão, painel de disponibilidade, leitor
    catalog/                busca, filtros, ordenação, paginação
    reservations/           formulário, linha do tempo, listas
    auth/                   entrada e cadastro
    admin/                  casca, tabelas, formulários administrativos

  features/                 Server Actions por domínio
  server/
    services/               regra de negócio (funções puras quando possível)
    repositories/           acesso a dados
    permissions/            RBAC
    storage/                StorageProvider e validação de upload
    notifications/          eventos de e-mail e templates
    auth/                   configuração do Auth.js e helpers de sessão
  lib/                      utilidades sem dependência de domínio
  validators/               schemas Zod compartilhados
  config/                   constantes estruturais e rótulos

prisma/
  schema.prisma
  migrations/               migração base para `prisma migrate deploy`
  sql/                      índices opcionais (pg_trgm)
  acervo-inicial.ts         as 21 obras do acervo físico
  seed.ts
```

Funções puras (`reservation-rules.ts`, `availability.ts`, `search-text.ts`,
`rbac.ts`) concentram as decisões e são testadas isoladamente, sem banco.

## Instalação

Requisitos: **Node.js 22+** e npm.

```bash
git clone <repositório> neabi && cd neabi
npm install
cp .env.example .env
```

Preencha os segredos internos no `.env` — o servidor recusa subir sem eles:

```bash
# AUTH_SECRET
openssl rand -base64 48

# Senhas das três contas do seed (SEED_ADMIN/EDITOR/MEMBER_PASSWORD)
node -e "console.log(require('node:crypto').randomBytes(12).toString('base64url'))"
```

Suba o banco, aplique o schema e semeie o acervo:

```bash
npm run db:dev           # deixe rodando em um terminal
npm run db:setup         # em outro: migrações + índices + seed
npm run dev
```

Acesse <http://localhost:3000>.

## Variáveis de ambiente

Todas estão documentadas em `.env.example`, que é versionado justamente por
não conter segredo algum. O `.env` está no `.gitignore`.

A configuração é **validada com Zod na subida do servidor** (`src/server/env.ts`,
chamado por `src/instrumentation.ts`). Uma variável ausente ou incoerente
derruba o processo com a lista do que falta, em vez de virar um defeito que só
aparece quando alguém tenta entrar na conta ou enviar um arquivo.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL — recusada se não começar com `postgres://` |
| `DIRECT_URL` | Conexão sem pooler, usada pelas migrações |
| `AUTH_SECRET` | Segredo de assinatura da sessão — mínimo de 32 caracteres |
| `AUTH_URL` / `AUTH_TRUST_HOST` | URL pública e confiança no host |
| `NEXT_PUBLIC_SITE_URL` | Usada em metadados, OpenGraph e sitemap |
| `STORAGE_DRIVER` | `local` ou `s3` (exige `S3_BUCKET` quando `s3`) |
| `NEXT_PUBLIC_STORAGE_BASE_URL` | Base pública dos arquivos enviados |
| `MAIL_DRIVER` | `console` (padrão) ou `smtp` (exige `SMTP_HOST`) |
| `LOG_LEVEL` | `debug`…`silent`. Padrão por ambiente |
| `RATE_LIMIT_ENABLED` | Desligar só faz sentido em teste |
| `CRON_SECRET` | Autentica a rotina de expiração de reservas |
| `SEED_ADMIN_PASSWORD` etc. | Contas do seed — **sem valor padrão no código** |

### Segredos: o que você gera e o que o provedor emite

**Internos — gere localmente:**

```bash
# AUTH_SECRET
openssl rand -base64 48
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"

# CRON_SECRET
openssl rand -hex 32

# Senhas das contas do seed
node -e "console.log(require('node:crypto').randomBytes(12).toString('base64url'))"
```

**Externos — só o provedor emite:** `DATABASE_URL` de um Postgres gerenciado,
`S3_*`, `SMTP_*`. Ficam vazios até o serviço existir. Um valor inventado não
vira credencial válida: apenas troca um erro claro ("credencial ausente") por
um confuso ("credencial rejeitada").

O seed **falha** se `SEED_ADMIN_PASSWORD`, `SEED_EDITOR_PASSWORD` ou
`SEED_MEMBER_PASSWORD` não estiverem definidas com pelo menos 12 caracteres.
Não existe senha de reserva no código: uma senha escrita no repositório é uma
credencial pública, que entra no histórico do Git e continua valendo em
qualquer ambiente onde o seed rodar.

## Banco de dados

O projeto usa **PostgreSQL**. Em desenvolvimento, `npm run db:dev` sobe uma
instância real a partir de binários embarcados — mesmo motor de produção, sem
instalar nada no sistema e sem Docker. Os dados ficam em `.postgres/`
(ignorado pelo git).

```bash
npm run db:dev         # sobe o PostgreSQL local (porta 54329)
npm run db:setup       # migrações + índices + seed (do zero, em ordem)
npm run db:migrate     # aplica migrações (produção: prisma migrate deploy)
npm run db:indices     # aplica os índices de busca opcionais (pg_trgm)
npm run db:seed        # popula categorias, contas e o acervo inicial
npm run db:verificar   # confere conexão, migrações, CRUD e rollback
npm run db:studio      # inspeciona os dados
npm run db:push        # sincroniza o schema sem migração (só desenvolvimento)
npm run db:reset       # recria o schema e semeia de novo (apaga tudo)
npm run db:reset-dados # limpa reservas, acessos e buscas, preservando o catálogo
```

Em produção, aponte `DATABASE_URL` para um PostgreSQL gerenciado e use
`npm run db:migrate`. Se o provedor expõe um pooler, defina também
`DIRECT_URL` com a conexão direta — o pooler não aceita as instruções DDL das
migrações.

`npm run db:verificar` é a checagem que vale rodar depois de um deploy:
confirma a conexão, lista as migrações registradas, executa escrita, leitura,
atualização e exclusão reais, e prova que uma transação com erro no meio não
deixa nada gravado.

> **Banco criado com `db:push`?** O `_prisma_migrations` fica vazio e
> `prisma migrate status` acusa a migração como pendente mesmo com o schema
> correto. Registre a linha de base sem reexecutar nada:
> `npx prisma migrate resolve --applied 00000000000000_init`.

### Busca sem depender de extensão

A busca precisa encontrar "étnico" quando alguém digita "etnico". Em vez de
depender da extensão `unaccent` — indisponível em parte dos PostgreSQL
gerenciados —, cada obra guarda em `Book.searchText` uma versão normalizada
(minúsculas, sem diacríticos) de título, subtítulo, pessoas, editora,
instituição, categorias, assuntos, tags, coleção, ano e ISBN. A consulta aplica
a mesma normalização ao termo digitado.

Para acervos grandes, um índice trigram acelera bastante essa busca. Como
`pg_trgm` também não está em todo lugar, ele fica fora da migração principal —
uma migração que falha por falta de extensão travaria o deploy inteiro por causa
de uma otimização. O script aplica o índice quando dá e apenas avisa quando não:

```bash
npm run db:indices
```

## Seed e acervo inicial

`prisma/acervo-inicial.ts` contém as **21 obras** do acervo físico do NEABI, com
uma regra rígida: **nada é inventado**. Só entram os dados efetivamente
visíveis nos exemplares. O seed cria:

- 9 categorias de navegação;
- as pessoas e instituições identificadas nas capas;
- as 21 obras, publicadas e marcadas como `NEEDS_REVIEW`;
- **um exemplar físico por obra**, com situação `AVAILABLE` e número de tombo,
  prateleira e localização em branco — o NEABI atribui esses dados;
- as configurações institucionais e as contas de acesso.

O seed é idempotente: rodar de novo não duplica nada e não sobrescreve senhas
nem contatos já preenchidos pela equipe.

## Capas das obras

As capas são **fotografias dos exemplares físicos reais**. Nenhuma é gerada,
redesenhada ou substituída por outra edição. Hoje 20 das 21 obras têm
fotografia vinculada, em WebP de qualidade 95 — as fotos chegaram em PNG, que é
o formato errado para fotografia: 37,5 MB viraram 5,1 MB sem tocar em dimensão,
enquadramento ou cor.

Coloque os arquivos em `public/acervo/capas/` nomeados pelo slug da obra:

```
public/acervo/capas/espirito-das-periferias.webp
```

e rode `npm run db:seed`. O seed vincula cada arquivo encontrado, preenche o
texto alternativo quando a equipe ainda não escreveu um e avisa sobre nomes que
não correspondem a nenhuma obra. A lista completa está em
`public/acervo/capas/README.md`.

O caminho da capa vive no banco (`Book.coverImage`), nunca em mapas dentro dos
componentes: quem exibe uma capa lê o dado da obra. Pelo painel, em
Acervo → obra → Arquivos, a equipe adiciona, substitui e remove a capa —
remover zera apenas `coverImage`/`coverAlt`, sem tocar em nenhum outro dado.

As fotos têm proporções diferentes entre si e **nunca são distorcidas**: no
grid a foto é enquadrada (`object-fit: cover`) numa área de proporção fixa, o
que mantém os cartões da mesma altura, e na página da obra ela aparece inteira
(`object-fit: contain`). Fotos tiradas com o livro sobre a mesa são aceitas
normalmente.

Sem fotografia — ou se o arquivo indicado falhar ao carregar — entra
`BookCoverPlaceholder`: uma ficha do sistema em tipografia institucional, com a
etiqueta "Sem fotografia de capa", que é assumidamente uma ficha da biblioteca e
nunca uma capa fabricada.

**Desigualdades Raciais: Construções da Infância e da Juventude**, de Iolanda
Oliveira, permanece sem capa por decisão do projeto — marcada como
`coverIntentionallyAbsent` em `prisma/acervo-inicial.ts` para que a ausência
seja lida como decisão, e não como pendência a "resolver" com a capa de outra
obra.

## Autenticação e papéis

Contas com e-mail e senha (Auth.js, sessão JWT, hash bcrypt). Três papéis:

| Papel | Pode |
|---|---|
| `MEMBER` | Reservar, acompanhar as próprias reservas, editar o perfil |
| `EDITOR` | Tudo do MEMBER + catalogar obras, exemplares, categorias, arquivos, conduzir reservas e atender as mensagens de contato |
| `ADMIN` | Tudo + autorizar consulta digital, excluir obras e mensagens, alterar papéis e editar configurações |

A sessão é um JWT de sete dias, mas a conta é **conferida no banco a cada
leitura da sessão**: desativar uma conta ou rebaixar um papel tem efeito na
requisição seguinte, sem esperar o token expirar.

**Senha esquecida.** Sem um provedor de e-mail não há link de recuperação. A
administração gera uma senha temporária em `/admin/usuarios` → "Redefinir
senha"; ela aparece uma única vez, não vai para log, e a pessoa a troca em
Minha conta → Perfil. A tela de entrada explica esse caminho.

As permissões são declaradas em `src/server/permissions/rbac.ts` e verificadas
**no servidor a cada ação**. O menu nunca é o mecanismo de proteção — mas
também não oferece o que a pessoa não pode abrir: cada item declara a mesma
permissão que a página exige.

Contas criadas pelo seed (desenvolvimento):

| Papel | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@neabi.local` | `SEED_ADMIN_PASSWORD` do `.env` |
| EDITOR | `editor@neabi.local` | `SEED_EDITOR_PASSWORD` do `.env` |
| MEMBER | `usuario@neabi.local` | `SEED_MEMBER_PASSWORD` do `.env` |

> **Em produção**, defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` antes de
> rodar o seed e troque a senha no primeiro acesso. As contas de exemplo
> `editor@` e `usuario@` devem ser desativadas em `/admin/usuarios`.

## Armazenamento de arquivos

`StorageProvider` (`src/server/storage/`) abstrai o destino dos arquivos:

- **`local`** (padrão): grava em `storage/uploads/`, **fora de `public/`**;
- **`blob`**: Vercel Blob — a opção para quem hospeda na Vercel;
- **`s3`**: qualquer serviço compatível — Cloudflare R2, Amazon S3, MinIO,
  Supabase Storage.

Os três devolvem chaves da mesma forma, então trocar de armazenamento não
invalida os `DigitalAsset` já gravados — só exige mover os arquivos.

> **Na Vercel, `local` não serve.** O sistema de arquivos da função é
> somente-leitura: o upload falha ao criar o diretório de destino e a pessoa
> recebe um erro genérico no painel. Use `blob`:
>
> ```bash
> vercel blob create-store <nome> --access private --yes
> ```
>
> A store é privada **de propósito**. Publicar as capas direto no CDN seria mais
> rápido — elas são públicas de qualquer forma —, mas criaria dois caminhos de
> saída para os arquivos do acervo: um pela rota que confere autorização e outro
> sem conferência nenhuma. Um PDF cadastrado com a visibilidade errada passaria a
> ser acessível por URL. Com a store privada, `/api/arquivos` é a única porta, e
> uma tentativa de acesso direto ao Blob responde 403.
>
> O custo é uma invocação de função por arquivo, mitigado porque a rota marca
> capa como `immutable` por um ano e o CDN serve as repetições.

Arquivos enviados nunca são servidos como estáticos. Eles passam por
`/api/arquivos/[...key]`, que resolve a chave no banco e verifica a autorização
antes de entregar qualquer byte: capas são públicas, documentos exigem
`authorized`. Um PDF cadastrado e ainda não liberado é inacessível mesmo para
quem descobrir a chave.

Todo upload valida tipo MIME, tamanho e **assinatura binária** do arquivo — um
executável renomeado para `.jpg` é recusado. O nome enviado nunca vira caminho:
a chave é gerada com UUID e extensão derivada do tipo já validado.

> **Limite de 4 MB na Vercel.** Funções da Vercel recusam requisições e
> respostas acima de 4,5 MB antes de o código rodar — e o upload passa por
> Server Action e a entrega por `/api/arquivos`. Por isso, na Vercel, capas e
> PDFs ficam limitados a 4 MB (`uploadLimits()` em `src/server/storage/`); fora
> dela valem 8 MB para imagem e 60 MB para PDF. O formulário mostra o limite
> real e recusa o arquivo grande antes de enviá-lo, com uma mensagem clara.
>
> PDFs de livros costumam passar de 4 MB. Antes de oferecer consulta digital
> de obras inteiras na Vercel, o envio precisa ir direto do navegador ao Blob
> (`@vercel/blob/client`, com token emitido após conferir a permissão) e a
> entrega precisa ser por streaming, não por `Buffer`. Hoje o acervo não tem
> nenhum PDF autorizado, então isso não bloqueia o uso atual.

## E-mail

Eventos notificados: `reservation_requested`, `reservation_approved`,
`reservation_rejected`, `ready_for_pickup`, `reservation_cancelled`,
`reservation_expired`.

O transporte padrão (`MAIL_DRIVER="console"`) apenas registra no log — nenhuma
mensagem real sai em desenvolvimento. Para produção, use `MAIL_DRIVER="smtp"` e
configure `SMTP_*`. Os templates estão em
`src/server/notifications/templates.ts`, com a identidade visual do NEABI e
versão em texto puro.

Falha de e-mail nunca desfaz a operação: a reserva já está registrada e o banco
é a fonte de verdade.

As mensagens do formulário de contato **não dependem de e-mail**: ficam no
banco e são lidas em `/admin/mensagens`, com selo de mensagens novas no menu.
Abrir uma mensagem a marca como lida; "respondida" e "arquivada" são marcadas
pela equipe. A resposta sai do e-mail de quem atende — o botão já abre a
resposta com o assunto preenchido. Excluir é exclusivo da administração e
serve para atender a pedidos de eliminação de dados.

## Testes

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm test              # Vitest (unitários, integração e componentes)
npm run test:e2e      # Playwright (requer banco no ar e semeado)
npm run build         # build de produção
```

Cobertura por camada:

- **Unitários** — máquina de estados da reserva, validação de data e turno,
  disponibilidade, normalização de busca, RBAC e schemas Zod.
- **Infraestrutura** — validação do ambiente (banco não-PostgreSQL, segredo
  ausente ou curto, driver sem as variáveis que ele exige), redação de dados
  sensíveis no log, limitação de taxa, validação de upload por assinatura
  binária e confinamento do armazenamento ao diretório de uploads.
- **Integração** — serviços contra o banco real:
  - *reservas* — transações, alocação atômica de exemplar, limite por pessoa,
    obra sem exemplar livre, obra despublicada, histórico gravado na mesma
    transação e a garantia de que dois pedidos concorrentes nunca recebem o
    mesmo exemplar;
  - *catalogação* — criação com autoridades bibliográficas e vínculos numa só
    transação, resolução de instituição por nome, endereço único, substituição
    (e não acúmulo) de vínculos na edição, publicação/arquivamento, recusa de
    exclusão com histórico e a derivação de `digitalAvailable`.
- **Componentes** — cartão de obra: disponibilidade real, créditos, omissão de
  campos ausentes, títulos longos.
- **E2E** — em desktop e mobile: fluxo público completo, reserva do pedido à
  devolução, catalogação administrativa e controle de acesso.
- **Responsividade** — projeto `responsivo`: percorre as rotas públicas, a área
  da pessoa usuária e o painel em 375, 390, 430, 768, 1024, 1280 e 1440 px e
  falha se o documento rolar horizontalmente em qualquer uma delas.

Os testes E2E usam as contas do seed, com as senhas do `.env` — não há
credencial escrita no código de teste. O projeto `setup` do Playwright
autentica uma vez por papel e reaproveita a sessão.

Os testes de integração e E2E exigem o banco no ar (`npm run db:dev`) e
semeado (`npm run db:seed`). Cada arquivo de integração cria e remove os
próprios registros, identificados por prefixo, sem tocar no acervo semeado.

```bash
npx playwright test --project=responsivo   # só a varredura de larguras
```

A verificação de rolagem horizontal existe porque o defeito é invisível em
telas largas: um descendente `position: absolute` (um rótulo `.sr-only`, por
exemplo) escapa do recorte de um contêiner `overflow-x-auto` sem contexto de
posicionamento, e uma coluna de grade dimensionada pelo conteúdo é esticada por
uma tabela com largura mínima. Em ambos os casos a página inteira passa a rolar
para o lado no celular.

## Build e deploy

```bash
npm run build
npm start
```

Checklist de produção:

1. `DATABASE_URL` apontando para o PostgreSQL gerenciado;
2. `AUTH_SECRET` gerado com entropia real e `AUTH_URL` com o domínio público;
3. migrações aplicadas — na Vercel, o próprio build de **produção** roda
   `prisma migrate deploy` (`scripts/migrate-on-deploy.mjs`) pela conexão
   direta (`DIRECT_URL`, ou `DATABASE_URL_UNPOOLED` da integração Neon) e
   falha se não houver uma válida; preview e build local não tocam o banco.
   Fora da Vercel, `npm run db:migrate`. Nunca `db:push` em produção;
4. `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` definidos antes do `db:seed`;
5. `STORAGE_DRIVER="s3"` com bucket **privado** e credenciais configuradas;
6. `MAIL_DRIVER="smtp"` configurado;
7. as fotografias das capas em `public/acervo/capas/`;
8. opcionalmente, `prisma/sql/search-indexes.sql` aplicado;
9. contas de exemplo desativadas.

`experimental.authInterrupts` está habilitado em `next.config.ts` para que
`forbidden()` responda com status HTTP 403 real, em vez de uma página 200 que
apenas se parece com um erro de permissão.

## Rotas

**Público**

| Rota | Descrição |
|---|---|
| `/` | Home: hero, busca, acervo em destaque, eixos temáticos |
| `/acervo` | Catálogo com busca, filtros e paginação, em ordem alfabética por padrão |
| `/acervo/[slug]` | Página da obra: ficha, disponibilidade, obras relacionadas |
| `/acervo/[slug]/reservar` | Formulário de reserva presencial (exige conta) |
| `/acervo/[slug]/reservar/confirmacao` | Protocolo e orientações |
| `/acervo/[slug]/ler` | Leitor digital (só com PDF autorizado) |
| `/sobre`, `/contato` | Páginas institucionais |
| `/login` | Entrada e cadastro |

**Conta**

`/minha-conta` · `/minha-conta/reservas` · `/minha-conta/reservas/[id]` ·
`/minha-conta/historico`

**Administração**

`/admin` · `/admin/acervo` · `/admin/acervo/novo` · `/admin/acervo/[id]` ·
`/admin/exemplares` · `/admin/categorias` · `/admin/reservas` ·
`/admin/reservas/[id]` · `/admin/mensagens` · `/admin/mensagens/[id]` ·
`/admin/usuarios` · `/admin/arquivos` ·
`/admin/analytics` · `/admin/configuracoes`

**Rotas de serviço**

| Rota | Descrição |
|---|---|
| `GET /api/arquivos/[...key]` | Entrega de arquivos com verificação de autorização |
| `POST /api/auth/[...nextauth]` | Auth.js |
| `GET`/`POST /api/manutencao/expirar-reservas` | Expira reservas com prazo vencido e devolve os exemplares ao acervo. Exige `Authorization: Bearer $CRON_SECRET` |

Sem essa rotina, um exemplar reservado por alguém que nunca apareceu ficaria
indisponível para sempre. Na Vercel ela é agendada em `vercel.json` (todo dia
às 09:00 UTC, 06:00 em Nova Iguaçu — antes do atendimento): a Vercel Cron faz
`GET` e envia o `CRON_SECRET` do projeto no cabeçalho por conta própria. Fora
da Vercel, qualquer agendador serve:

```bash
curl -X POST https://<host>/api/manutencao/expirar-reservas \
     -H "Authorization: Bearer $CRON_SECRET"
```

## Segurança

- Autorização verificada no servidor em toda ação, por permissão nomeada;
- nenhum identificador vindo do cliente é aceito como autoridade — o usuário vem
  da sessão, a obra do slug da rota, o exemplar é escolhido pelo serviço;
- validação com Zod no cliente **e** no servidor;
- upload com validação de MIME, tamanho e assinatura binária, nome gerado e
  destino confinado ao diretório de armazenamento;
- arquivos entregues por rota que confere autorização;
- limite de taxa em login, cadastro, troca de senha, reservas e contato — o
  login limita por conta (contra força bruta) e por origem com folga generosa,
  para não bloquear uma rede institucional inteira;
- proteção anti-spam no contato sem CAPTCHA (campo-armadilha + tempo mínimo de
  preenchimento + limite de taxa);
- cabeçalhos de segurança e CSP restritiva em `next.config.ts`;
- proteção contra redirecionamento aberto no `callbackUrl`;
- salvaguardas contra a administração remover o próprio acesso ou deixar o
  sistema sem nenhuma conta administradora;
- registro de visualizações sem armazenar IP em claro;
- configuração validada na subida do servidor: não é possível subir sem segredo
  de sessão ou com um banco que não seja PostgreSQL;
- rotina de manutenção (`POST /api/manutencao/expirar-reservas`) autenticada
  por `CRON_SECRET` com comparação em tempo constante — sem o segredo
  configurado ela responde 503, porque uma rotina de escrita aberta é pior do
  que uma rotina que não roda.

> **Onde mora o limite de login.** A contagem por conta acontece dentro do
> `authorize` do Auth.js, e não na Server Action do formulário. O motivo é
> concreto: `POST /api/auth/callback/credentials` é uma rota pública que chega
> ao mesmo ponto sem passar pela ação — um limite implementado só na ação
> protegeria a tela, não a conta. O formulário apenas *consulta* a janela, sem
> consumir tentativa, para dizer quanto tempo falta.

### Registro e auditoria

`src/server/logger.ts` produz texto legível em desenvolvimento e JSON por linha
em produção. Campos sensíveis (`password`, `passwordHash`, `token`, `cookie`,
`secret`…) são redigidos por nome, em qualquer profundidade — a redação não
depende de quem chama lembrar de omitir.

Eventos de auditoria (`audit:*`) respondem "quem fez o quê": login e falha de
login, criação de conta, troca de papel e de ativação, criação e transição de
reserva, alterações no acervo, envio e autorização de arquivos, e mudança de
configurações. Registram o identificador de quem agiu — nunca nome, e-mail ou
senha.

> A limitação de taxa é em memória, por processo — adequada a uma instância. Na
> Vercel, cada instância da função tem a sua própria contagem, então o limite
> de login vale por instância e não globalmente: ainda dificulta força bruta,
> mas não a impede de forma estrita. Para um limite global, troque o
> armazenamento em `src/server/rate-limit.ts` por Redis (ex.: Upstash, pelo
> Marketplace da Vercel); a interface do módulo não muda.

### Dependências

`npm audit --omit=dev` aponta um alerta remanescente: `nodemailer` ≤ 10.0.5
(SSRF e leitura de arquivo via opção `raw` ou conteúdo resolvido por caminho ou
URL). A correção é a série 10, mas o Auth.js exige a série 8 — instalá-la deixa
a árvore de dependências inválida. O projeto só envia `subject`, `text` e
`html` como texto e desliga `disableFileAccess`/`disableUrlAccess` no
transporte, o que fecha os vetores descritos. Atualize quando o `next-auth`
aceitar `nodemailer` 10.

## Acessibilidade

Meta: **WCAG 2.1 nível AA**.

- HTML semântico, um `<h1>` por página e hierarquia de títulos consistente;
- link "Pular para o conteúdo" como primeiro elemento focável;
- foco visível com contraste alto em todo o produto;
- rótulos, descrições e mensagens de erro ligados por `aria-describedby` e
  `aria-invalid` automaticamente pelo componente `Field`;
- erros anunciados por `role="alert"`; contagem de resultados por `aria-live`;
- cor nunca é o único portador de significado;
- alvos de toque com no mínimo 44px;
- diálogos com armadilha de foco e fechamento por Escape (Radix);
- `prefers-reduced-motion` respeitado globalmente;
- painel de disponibilidade renderizado **uma única vez** e reposicionado por
  CSS, evitando conteúdo e identificadores duplicados.

## Pendências para o NEABI

Itens que dependem de informação institucional e ficaram deliberadamente vazios:

1. **Fotografia da capa de uma obra** — 20 das 21 já estão vinculadas.
   "Desigualdades Raciais" permanece sem capa por decisão do projeto; qualquer
   obra nova segue o caminho descrito em [Capas das obras](#capas-das-obras).
2. **Contatos** — e-mail, telefone e endereço não foram preenchidos para não
   publicar dado incorreto. Configure em `/admin/configuracoes`; a interface
   omite as linhas em branco.
3. **Redes sociais** — mesmo caminho.
4. **Regras de atendimento** — dias, turnos, antecedência mínima, janela de
   agendamento, prazo de retirada e limite de reservas por pessoa começam com
   valores conservadores e devem ser ajustados às normas reais do núcleo.
5. **Dados bibliográficos** — as 21 obras estão como `NEEDS_REVIEW`. Ano, ISBN,
   editora e paginação devem ser conferidos na ficha catalográfica e
   preenchidos em `/admin/acervo`.
6. **Números de tombo e localização** dos exemplares.
7. **Autoria não identificada** — algumas obras (Cadernos PENESB 1, Orientações
   e Ações, Vozes Negras no Serviço Público, Inventário dos Terreiros) estão sem
   autoria porque ela não foi confirmada. Não presuma.
8. **Marca oficial** — `NeabiMark` é uma composição tipográfica com as cores
   institucionais. Ao receber o arquivo vetorial do núcleo, basta substituir o
   conteúdo desse componente.
9. **Envio de e-mail** — em produção `MAIL_DRIVER="console"`: aprovação,
   recusa e prazo de retirada não chegam por e-mail, só aparecem em Minhas
   reservas, e não há recuperação de senha por link. Exige uma conta SMTP
   institucional (`SMTP_*`, `MAIL_FROM`) — credencial que só o CEFET/RJ emite.
10. **LGPD** — a política de privacidade não identifica o controlador, o
    encarregado (DPO), a base legal nem o prazo de retenção dos dados, porque
    são definições institucionais. Preencha-os em `/privacidade` com o setor
    responsável do CEFET/RJ.
11. **Backup** — o Neon guarda histórico para restauração conforme o plano
    contratado; confirme a janela de restauração do plano em uso e defina uma
    cópia periódica independente (`pg_dump` agendado) e quem a guarda.
12. **Domínio** — o site está em `neabi-alpha.vercel.app`. Um endereço
    institucional exige configuração de DNS pelo CEFET/RJ.

---

Memória, conhecimento, ancestralidade, educação, resistência, diversidade e
acesso ao conhecimento.
