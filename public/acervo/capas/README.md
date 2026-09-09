# Capas do acervo NEABI

Esta pasta guarda as **fotografias reais** dos exemplares físicos do acervo.

## Regras

- As imagens são fotografias dos livros do NEABI. **Não gerar capas com IA, não
  redesenhar, não recompor partes ausentes e não alterar a arte editorial.**
- Muitas fotos foram tiradas com o livro sobre uma mesa, e não são scans de
  capa. Isso é esperado: a interface usa `object-fit: cover` e mantém a
  proporção sem distorcer a imagem.
- Uma foto pode ser substituída depois por um scan de melhor resolução, pelo
  painel administrativo (Acervo → obra → Arquivos) ou trocando o arquivo aqui.

## Nomeação

Nomeie cada arquivo com o **slug da obra**, em `.jpg`, `.jpeg`, `.png`,
`.webp` ou `.avif`:

```
public/acervo/capas/<slug-da-obra>.jpg
```

Depois rode:

```bash
npm run db:seed
```

O seed vincula automaticamente cada arquivo encontrado à obra correspondente e
avisa sobre arquivos cujo nome não corresponde a nenhum slug.

## Slugs das 21 obras do acervo inicial

| # | Obra | Arquivo esperado |
|---|------|------------------|
| 01 | Inventário dos Terreiros do Distrito Federal e Entorno | `inventario-dos-terreiros-do-distrito-federal-e-entorno.jpg` |
| 02 | Vozes Negras no Serviço Público | `vozes-negras-no-servico-publico.jpg` |
| 03 | Etnopesquisa Crítica e Etnopesquisa-Formação | `etnopesquisa-critica-e-etnopesquisa-formacao.jpg` |
| 04 | História e Cultura Afro-Brasileira | `historia-e-cultura-afro-brasileira.jpg` |
| 05 | Cinquenta Dias a Bordo de um Navio Negreiro | `cinquenta-dias-a-bordo-de-um-navio-negreiro.jpg` |
| 06 | Formação Inicial de Professores | `formacao-inicial-de-professores.jpg` |
| 07 | Relações Étnico-Raciais e Educação no Brasil | `relacoes-etnico-raciais-e-educacao-no-brasil.jpg` |
| 08 | Censo Étnico-Racial da UFF e da UFMT | `censo-etnico-racial-uff-ufmt.jpg` |
| 09 | Cadernos PENESB 1 | `cadernos-penesb-1-relacoes-raciais-e-educacao.jpg` |
| 10 | A África Explicada aos Meus Filhos | `a-africa-explicada-aos-meus-filhos.jpg` |
| 11 | Políticas Públicas e Raça | `politicas-publicas-e-raca-avancos-e-perspectivas.jpg` |
| 12 | Orientações e Ações para a Educação das Relações Étnico-Raciais | `orientacoes-e-acoes-para-a-educacao-das-relacoes-etnico-raciais.jpg` |
| 13 | Negra Soul | `negra-soul.jpg` |
| 14 | Cadernos PENESB 3 | `cadernos-penesb-3-a-producao-de-saberes-e-praticas-pedagogicas.jpg` |
| 15 | Cadernos PENESB 6 | `cadernos-penesb-6.jpg` |
| 16 | A Transversalidade de Gênero e Raça nas Políticas Públicas | `transversalidade-de-genero-e-raca-nas-politicas-publicas.jpg` |
| 17 | Desigualdades Raciais | `desigualdades-raciais-construcoes-da-infancia-e-da-juventude.jpg` |
| 18 | Espírito das Periferias | `espirito-das-periferias.jpg` |
| 19 | Cartilha do GTPCEGDS | `cartilha-gtpcegds.jpg` |
| 20 | Cadernos PENESB 4 | `cadernos-penesb-4.jpg` |
| 21 | Plano Nacional … Povos e Comunidades Tradicionais de Matriz Africana | `plano-nacional-desenvolvimento-sustentavel-povos-comunidades-matriz-africana-2013-2015.jpg` |

Enquanto o arquivo não existir, `Book.coverImage` fica `null` e a obra aparece
com um cartão tipográfico de fallback — nunca com uma capa fabricada.
