import { Badge, type BadgeProps } from "@/components/ui/badge";
import { reservationStatusLabels } from "@/config/catalog";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

/**
 * Sistema visual dos status de reserva.
 *
 * Âmbar para o que ainda depende da equipe, verde para o que avançou (e verde
 * cheio quando a pessoa precisa agir: o exemplar está separado), vermelho para
 * a recusa e tons neutros para o que já terminou. O ponto colorido é reforço;
 * o texto sempre carrega o significado.
 */
const STATUS_STYLE: Record<
  ReservationStatus,
  { variant: NonNullable<BadgeProps["variant"]>; dot: string }
> = {
  PENDING: { variant: "amber", dot: "bg-neabi-amber-600" },
  APPROVED: { variant: "green", dot: "bg-neabi-green" },
  READY_FOR_PICKUP: { variant: "greenSolid", dot: "bg-white" },
  PICKED_UP: { variant: "neutral", dot: "bg-ink-500" },
  RETURNED: { variant: "muted", dot: "bg-ink-400" },
  REJECTED: { variant: "red", dot: "bg-neabi-red-600" },
  CANCELLED: { variant: "muted", dot: "bg-neabi-red-600" },
  EXPIRED: { variant: "neutral", dot: "bg-ink-400" },
};

export function ReservationStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: ReservationStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  return (
    <Badge variant={style.variant} size={size} className={className}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", style.dot)} />
      {reservationStatusLabels[status]}
    </Badge>
  );
}
