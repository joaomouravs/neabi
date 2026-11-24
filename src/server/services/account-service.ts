import bcrypt from "bcryptjs";

import {
  CopyStatus,
  ReservationStatus,
  Role,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { audit } from "@/server/logger";
import type { Actor } from "@/server/permissions/rbac";
import { getSettings } from "@/server/repositories/settings-repository";

/**
 * Direitos do titular sobre a própria conta (LGPD, art. 18): acesso aos dados
 * e eliminação.
 *
 * As duas operações recebem o `Actor` da sessão e só tocam a conta dele —
 * nenhum identificador vem do cliente.
 */

/** Reservas que ainda podem ser canceladas em nome do titular. */
const CANCELLABLE_STATUSES: readonly ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
  ReservationStatus.READY_FOR_PICKUP,
];

/** Nome que substitui o do titular nas reservas depois da exclusão. */
export const DELETED_HOLDER_NAME = "Titular excluído";

export const DELETION_NOTE = "Cancelada porque o titular excluiu a conta.";

/**
 * Tudo o que o sistema guarda associado à pessoa, num formato legível.
 *
 * Fica de fora o que não é dado dela: notas internas da equipe sobre a
 * reserva, a senha (só existe cifrada) e os registros anônimos de visita.
 */
export async function exportAccountData(actor: Actor) {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      name: true,
      email: true,
      phone: true,
      registrationId: true,
      patronType: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      reservations: {
        orderBy: { createdAt: "asc" },
        select: {
          protocol: true,
          status: true,
          fullName: true,
          email: true,
          phone: true,
          registrationId: true,
          patronType: true,
          requestedDate: true,
          shift: true,
          purpose: true,
          createdAt: true,
          approvedAt: true,
          readyAt: true,
          pickupDeadline: true,
          pickedUpAt: true,
          returnedAt: true,
          cancelledAt: true,
          book: { select: { title: true, slug: true } },
          history: {
            orderBy: { changedAt: "asc" },
            select: { previousStatus: true, newStatus: true, changedAt: true },
          },
        },
      },
      searches: {
        orderBy: { createdAt: "asc" },
        select: { query: true, resultCount: true, createdAt: true },
      },
      views: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, book: { select: { title: true, slug: true } } },
      },
    },
  });
  if (!user || user.deletedAt) throw new NotFoundError("Conta não encontrada.");

  const [messages, settings] = await Promise.all([
    prisma.contactMessage.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { name: true, email: true, subject: true, message: true, createdAt: true },
    }),
    getSettings(),
  ]);

  return {
    sobre: {
      geradoEm: new Date().toISOString(),
      biblioteca: settings.libraryName,
      descricao:
        "Dados pessoais que a Biblioteca guarda associados à sua conta. A senha não aparece porque só existe cifrada.",
    },
    conta: {
      nome: user.name,
      email: user.email,
      telefone: user.phone,
      matricula: user.registrationId,
      vinculo: user.patronType,
      perfilDeAcesso: user.role,
      criadaEm: user.createdAt,
      atualizadaEm: user.updatedAt,
    },
    reservas: user.reservations.map((reservation) => ({
      protocolo: reservation.protocol,
      obra: reservation.book.title,
      enderecoDaObra: `/acervo/${reservation.book.slug}`,
      situacao: reservation.status,
      dadosInformados: {
        nome: reservation.fullName,
        email: reservation.email,
        telefone: reservation.phone,
        matricula: reservation.registrationId,
        vinculo: reservation.patronType,
        finalidade: reservation.purpose,
      },
      dataDesejada: reservation.requestedDate,
      turno: reservation.shift,
      solicitadaEm: reservation.createdAt,
      aprovadaEm: reservation.approvedAt,
      prontaEm: reservation.readyAt,
      prazoDeRetirada: reservation.pickupDeadline,
      retiradaEm: reservation.pickedUpAt,
      devolvidaEm: reservation.returnedAt,
      canceladaEm: reservation.cancelledAt,
      historico: reservation.history.map((entry) => ({
        de: entry.previousStatus,
        para: entry.newStatus,
        em: entry.changedAt,
      })),
    })),
    mensagensDeContato: messages.map((message) => ({
      nome: message.name,
      email: message.email,
      assunto: message.subject,
      mensagem: message.message,
      enviadaEm: message.createdAt,
    })),
    buscasComSessaoAberta: user.searches.map((search) => ({
      termo: search.query,
      resultados: search.resultCount,
      em: search.createdAt,
    })),
    obrasVisitadasComSessaoAberta: user.views.map((view) => ({
      obra: view.book.title,
      em: view.createdAt,
    })),
  };
}

export type AccountExport = Awaited<ReturnType<typeof exportAccountData>>;

/**
 * Exclui a conta a pedido do titular.
 *
 * Não é um `DELETE`: a reserva aponta para a conta, e apagá-la levaria junto o
 * histórico de circulação do acervo — quantas vezes uma obra foi pedida, por
 * que um exemplar ficou indisponível. Em vez disso, todo dado pessoal é
 * removido (da conta e das cópias que cada reserva guardou do formulário) e o
 * que sobra é estatística sem titular.
 *
 * Contas da equipe ficam de fora: tirar acesso de quem administra é decisão da
 * administração, que também garante que nunca falte uma pessoa administradora.
 */
export async function deleteOwnAccount(
  actor: Actor,
  input: { password: string },
): Promise<{ cancelledReservations: number }> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, email: true, role: true, passwordHash: true, deletedAt: true },
  });
  if (!user || user.deletedAt) throw new NotFoundError("Conta não encontrada.");

  if (user.role !== Role.MEMBER) {
    throw new ConflictError(
      "Contas da equipe não podem ser excluídas por aqui. Peça a uma pessoa administradora que retire o seu acesso.",
    );
  }

  if (!user.passwordHash) {
    throw new ValidationError(
      "Esta conta não usa senha. Peça a exclusão pelo formulário de contato.",
    );
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new ValidationError("Senha incorreta.", "password");

  // Um exemplar emprestado é patrimônio da biblioteca em mãos de alguém: a
  // equipe precisa saber com quem está até a devolução.
  const inHand = await prisma.reservation.findFirst({
    where: { userId: user.id, status: ReservationStatus.PICKED_UP },
    select: { protocol: true },
  });
  if (inHand) {
    throw new ConflictError(
      `Você está com um exemplar retirado (protocolo ${inHand.protocol}). Devolva-o à biblioteca antes de excluir a conta.`,
    );
  }

  const cancelledReservations = await prisma.$transaction(async (tx) => {
    const open = await tx.reservation.findMany({
      where: { userId: user.id, status: { in: [...CANCELLABLE_STATUSES] } },
      select: { id: true, status: true, copyId: true },
    });

    const now = new Date();
    for (const reservation of open) {
      if (reservation.copyId) {
        await tx.physicalCopy.updateMany({
          where: { id: reservation.copyId, status: CopyStatus.RESERVED },
          data: { status: CopyStatus.AVAILABLE },
        });
      }
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: now },
      });
      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          previousStatus: reservation.status,
          newStatus: ReservationStatus.CANCELLED,
          changedById: user.id,
          note: DELETION_NOTE,
        },
      });
    }

    await tx.reservation.updateMany({
      where: { userId: user.id },
      data: {
        fullName: DELETED_HOLDER_NAME,
        email: "",
        phone: "",
        registrationId: null,
        purpose: null,
      },
    });

    await tx.contactMessage.deleteMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
    });
    await tx.searchEvent.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await tx.bookView.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });

    await tx.user.update({
      where: { id: user.id },
      data: {
        // O e-mail é único: um endereço reservado e inválido libera o
        // original para um novo cadastro, se a pessoa um dia voltar.
        email: `excluida-${user.id}@contas.invalid`,
        name: null,
        emailVerified: null,
        image: null,
        passwordHash: null,
        phone: null,
        registrationId: null,
        patronType: null,
        active: false,
        deletedAt: now,
      },
    });

    return open.length;
  });

  audit("conta.excluida", { userId: user.id, reservasCanceladas: cancelledReservations });

  return { cancelledReservations };
}
