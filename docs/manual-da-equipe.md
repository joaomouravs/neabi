# Manual da equipe — Biblioteca NEABI-NI

Guia de uso do painel administrativo para quem atende e cataloga. Não é preciso
saber programar. Para instalação, hospedagem e detalhes técnicos, veja o
[README](../README.md).

O painel fica em **`/admin`** — o mesmo endereço do site, seguido de `/admin`.
Entre com a sua conta; o menu mostra só o que o seu papel permite.

---

## 1. Papéis

| Papel | Para quem | O que faz no painel |
|---|---|---|
| **Usuário** | estudantes, docentes, pesquisadores, visitantes | Não acessa o painel. Pede e acompanha reservas em *Minha conta*. |
| **Edição do acervo** | quem cataloga e atende | Cataloga obras, cuida de exemplares, categorias e arquivos, conduz reservas e responde mensagens. |
| **Administração** | coordenação do NEABI | Tudo acima, mais: excluir obras e mensagens, autorizar leitura digital de PDF, mudar papéis, desativar contas, redefinir senhas, editar configurações e consultar o registro de atividades. |

Toda conta nova nasce como **Usuário**. Só a Administração muda papéis, em
*Usuários*. O sistema não deixa ninguém tirar o próprio acesso nem ficar sem
nenhuma conta de Administração.

---

## 2. Atender uma reserva

A reserva é para **consulta ou retirada presencial** de um exemplar físico —
não é empréstimo domiciliar.

Caminho de uma reserva:

```
Aguardando análise → Aprovada → Pronta para retirada → Em consulta → Devolvida
        ↘ Recusada        ↘ Cancelada / Expirada
```

1. **Aguardando análise** — a pessoa pediu pelo site. Abra em *Reservas*. Você
   vê a obra, a data e o turno desejados e quem pediu.
2. **Aprovar** — o sistema separa um exemplar disponível. Se dois atendentes
   aprovarem pedidos da mesma obra ao mesmo tempo, o sistema nunca entrega o
   mesmo exemplar duas vezes: o segundo recebe outro exemplar ou um aviso de
   que não há exemplar livre.
3. **Recusar** — escreva o motivo: ele aparece para a pessoa em *Minhas
   reservas*.
4. **Pronta para retirada** — o exemplar está separado. A partir daqui corre o
   **prazo de retirada** (definido em *Configurações*).
5. **Em consulta** — a pessoa pegou o exemplar.
6. **Devolvida** — o exemplar voltou; ele fica disponível de novo no site.

**Expiração automática.** Todo dia, às 6h, o sistema expira as reservas cujo
prazo de retirada passou e devolve o exemplar ao acervo. Ninguém precisa fazer
isso à mão.

**A pessoa é avisada?** Enquanto o envio de e-mail não estiver ligado (ver
§9), **não**. Cada mudança aparece em *Minha conta → Minhas reservas*, com a
linha do tempo do pedido. Se for preciso avisar com urgência, use o telefone
ou o e-mail cadastrado no perfil da pessoa.

---

## 3. Catalogar uma obra

*Acervo → Nova obra.*

- **Preencha só o que está confirmado.** Ano, ISBN, editora, páginas e
  autoria que você não conseguiu conferir ficam **em branco**. O site omite o
  campo em vez de mostrar um palpite, e a obra fica marcada como *revisão
  pendente* até alguém completar.
- A obra começa como **Rascunho** — invisível no site. Quando a ficha estiver
  pronta, **Publicar**.
- **Arquivar** tira a obra do site sem apagar o histórico. Prefira arquivar a
  excluir: uma obra com reservas registradas não pode ser excluída.

### Capa

Em *Acervo → obra → Arquivos*: envie a **fotografia do exemplar físico**. Nunca
use capa de outra edição nem imagem gerada. Sem fotografia, o site mostra uma
ficha tipográfica "Sem fotografia de capa" — isso é esperado.

> "Desigualdades Raciais: Construções da Infância e da Juventude" fica **sem
> capa por decisão do projeto**.

### PDF e leitura digital

Enviar um PDF **não** o publica. A leitura online exige um segundo passo,
restrito à Administração: **autorizar a consulta digital** — uma decisão de
direito autoral. O registro de atividades guarda quem autorizou e quando.
Na hospedagem atual, arquivos acima de **4 MB** são recusados.

---

## 4. Exemplares

Cada obra pode ter vários exemplares. A disponibilidade que o site mostra vem
**sempre** da situação deles — nunca é digitada:

| Situação | Conta como disponível? |
|---|---|
| Disponível | sim |
| Reservado, Em consulta | não (o sistema muda sozinho durante a reserva) |
| Indisponível, Em manutenção, Extraviado | não |

Número de tombo, prateleira e localização ficam em branco até o NEABI
atribuí-los.

---

## 5. Mensagens do formulário de contato

*Mensagens.* Tudo o que chega pela página de contato fica aqui — o site não
encaminha por e-mail. Um selo no menu mostra quantas são novas.

- Abrir uma mensagem a marca como **lida**.
- **Responder** abre o seu e-mail com o assunto preenchido. Depois, marque como
  **respondida**.
- **Excluir** é definitivo e só a Administração pode — use para atender a um
  pedido de eliminação de dados pessoais.

---

## 6. Contas e senhas

*Usuários* (Administração).

- **Esqueceu a senha?** Enquanto não houver envio de e-mail, a recuperação é
  feita aqui: *Redefinir senha* gera uma senha temporária que aparece **uma
  única vez**. Entregue-a à pessoa por um canal seguro e peça que ela a troque
  em *Minha conta → Perfil*.
- **Desativar** uma conta corta o acesso na hora, sem apagar o histórico.
- As contas de exemplo `editor@` e `usuario@` devem ficar desativadas em
  produção.

---

## 7. Configurações

*Configurações* (Administração). O que está em branco não aparece no site.

- **Contatos**: e-mail, telefone e endereço do núcleo.
- **Atendimento**: dias e turnos de atendimento, antecedência mínima para
  pedir, até quantos dias à frente se pode agendar, prazo de retirada e limite
  de reservas ativas por pessoa. Os valores iniciais são provisórios — ajuste
  às normas do NEABI.
- **Instruções de reserva**: o texto que a pessoa lê ao pedir e ao receber o
  protocolo (onde retirar, documento a apresentar etc.).
- **E-mail**: mostra se o envio está ligado e permite mandar um teste para a
  sua própria conta.
- **Proteção de dados (LGPD)**: controlador, encarregado (DPO) e prazos de
  guarda, que aparecem na página de Privacidade. Preencha só com o que o setor
  responsável do CEFET/RJ confirmar; em branco, não aparecem.

Quem tem conta de leitor pode, em *Minha conta → Perfil*, baixar uma cópia
dos próprios dados e excluir a conta. Na exclusão, as reservas em andamento
são canceladas (o exemplar volta a ficar disponível) e, no painel, a reserva
passa a mostrar "Titular excluído". Quem estiver com um exemplar retirado só
consegue excluir depois de devolvê-lo.

Alterações nas configurações e no acervo aparecem no site **na hora**.

---

## 8. Registro de atividades

*Atividades* (Administração) mostra quem fez o quê no painel, e quando:
catalogação, edição, publicação e exclusão de obras; envio, exclusão e
autorização de arquivos; mudanças de papel, ativação e senha de contas;
configurações; e o tratamento de mensagens. As mudanças de cada reserva estão
na linha do tempo da própria reserva.

---

## 9. Se algo der errado

| Sintoma | O que fazer |
|---|---|
| O site mostra "Payment required" ou não abre | A hospedagem bloqueou o projeto por uso. Avise quem cuida da hospedagem (§10). |
| Uma obra publicada não aparece | Confira se ela está *Publicada* e não *Rascunho* ou *Arquivada*. |
| A disponibilidade parece errada | Confira a situação dos exemplares em *Exemplares*. |
| Envio de arquivo recusado | Confira o tipo (capa em JPG, PNG, WebP ou AVIF; documento em PDF) e o tamanho (até 4 MB). |
| Alguém não consegue entrar | Confira se a conta está ativa; se for senha, use *Redefinir senha*. |
| E-mails não chegam | Use *Configurações → E-mail → Enviar e-mail de teste* e leve a mensagem de erro a quem cuida da hospedagem (§10). As notificações continuam em *Minhas reservas*. |

---

## 10. Responsáveis

Preencha quando o NEABI definir:

- Responsável pelo atendimento presencial: ______________________
- Responsável pela catalogação: ______________________
- Responsável técnico (hospedagem, domínio, backups): ______________________
- Encarregado de dados pessoais (LGPD) no CEFET/RJ: ______________________
