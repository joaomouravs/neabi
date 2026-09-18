# Capas do acervo NEABI

Esta pasta guarda as **fotografias reais** dos exemplares físicos do acervo.

## Regras

- As imagens são fotografias dos livros do NEABI. **Não gerar capas com IA, não
  redesenhar, não recompor partes ausentes e não alterar a arte editorial.**
- Muitas fotos foram tiradas com o livro sobre uma mesa, e não são scans de
  capa. Isso é esperado: no grid do acervo a foto é enquadrada com
  `object-fit: cover` numa área de proporção fixa, e na página da obra aparece
  inteira com `object-fit: contain`. Em nenhum dos dois ela é distorcida.
- Uma foto pode ser substituída depois por um scan de melhor resolução, pelo
  painel administrativo (Acervo → obra → Arquivos) ou trocando o arquivo aqui.

## Nomeação

Cada arquivo tem o **slug da obra** como nome, em `.jpg`, `.jpeg`, `.png`,
`.webp` ou `.avif`:

```
public/acervo/capas/<slug-da-obra>.webp
```

**Prefira WebP como formato de entrada.** Fotografia em PNG é um descompasso
entre conteúdo e formato: as 19 capas somavam 37,5 MB e passaram a 5,1 MB em
WebP de qualidade 95, com a mesma dimensão, o mesmo enquadramento e o perfil de
cor preservado — recodificação, não edição. Para converter uma foto nova:

```bash
node -e "require('sharp')('foto.png').withMetadata().webp({quality:95,effort:6}).toFile('public/acervo/capas/<slug>.webp')"
```

Guarde o arquivo original fora do repositório: o que fica versionado aqui é a
cópia de publicação.

Depois de acrescentar ou trocar um arquivo, rode:

```bash
npm run db:seed
```

O seed vincula cada arquivo encontrado à obra de mesmo slug, preenche o texto
alternativo (`Capa do livro <título>`, quando a equipe ainda não escreveu um) e
avisa sobre arquivos cujo nome não corresponde a nenhuma obra.

## Estado atual — 20 de 21 obras com fotografia

| # | Obra | Arquivo |
|---|------|---------|
| 01 | A África Explicada aos Meus Filhos | `a-africa-explicada-aos-meus-filhos.webp` |
| 02 | A Transversalidade de Gênero e Raça nas Políticas Públicas | `transversalidade-de-genero-e-raca-nas-politicas-publicas.webp` |
| 03 | Cadernos PENESB 1 | `cadernos-penesb-1-relacoes-raciais-e-educacao.webp` |
| 04 | Cadernos PENESB 3 | `cadernos-penesb-3-a-producao-de-saberes-e-praticas-pedagogicas.webp` |
| 05 | Cadernos PENESB 4 | `cadernos-penesb-4.webp` |
| 06 | Cadernos PENESB 6 | `cadernos-penesb-6.webp` |
| 07 | Cartilha do GTPCEGDS | `cartilha-gtpcegds.webp` |
| 08 | Censo Étnico-Racial da UFF e da UFMT | `censo-etnico-racial-uff-ufmt.webp` |
| 09 | Cinquenta Dias a Bordo de um Navio Negreiro | `cinquenta-dias-a-bordo-de-um-navio-negreiro.jpg` |
| 10 | Desigualdades Raciais | **sem fotografia, por decisão do projeto** |
| 11 | Espírito das Periferias | `espirito-das-periferias.webp` |
| 12 | Etnopesquisa Crítica e Etnopesquisa-Formação | `etnopesquisa-critica-e-etnopesquisa-formacao.webp` |
| 13 | Formação Inicial de Professores | `formacao-inicial-de-professores.webp` |
| 14 | História e Cultura Afro-Brasileira | `historia-e-cultura-afro-brasileira.webp` |
| 15 | Inventário dos Terreiros do Distrito Federal e Entorno | `inventario-dos-terreiros-do-distrito-federal-e-entorno.webp` |
| 16 | Negra Sou! | `negra-sou.webp` |
| 17 | Orientações e Ações para a Educação das Relações Étnico-Raciais | `orientacoes-e-acoes-para-a-educacao-das-relacoes-etnico-raciais.webp` |
| 18 | Plano Nacional … Povos e Comunidades Tradicionais de Matriz Africana | `plano-nacional-desenvolvimento-sustentavel-povos-comunidades-matriz-africana-2013-2015.webp` |
| 19 | Políticas Públicas e Raça | `politicas-publicas-e-raca-avancos-e-perspectivas.webp` |
| 20 | Relações Étnico-Raciais e Educação no Brasil | `relacoes-etnico-raciais-e-educacao-no-brasil.webp` |
| 21 | Vozes Negras no Serviço Público | `vozes-negras-no-servico-publico.webp` |

### A obra sem capa

**Desigualdades Raciais: Construções da Infância e da Juventude**, de Iolanda
Oliveira, permanece sem fotografia de capa por decisão do projeto. Não procure
imagem alternativa, não reaproveite a capa de outra obra e não gere nada: a
decisão está registrada em `prisma/acervo-inicial.ts`
(`coverIntentionallyAbsent`) e o seed a reporta como decisão, não como
pendência.

Enquanto não existir arquivo, `Book.coverImage` fica `null` e a obra aparece com
a ficha do sistema (`BookCoverPlaceholder`) — tipografia institucional com a
etiqueta "Sem fotografia de capa", que é assumidamente uma ficha da biblioteca e
nunca uma capa fabricada.
