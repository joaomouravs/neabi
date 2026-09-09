import { Badge } from "@/components/ui/badge";
import {
  reservationStatusLabels,
  reservationStatusTone,
} from "@/config/catalog";
import type { ReservationStatus } from "@/generated/prisma/enums";

const TONE_TO_VARIANT = {
  neutral: "neutral",
  amber: "amber",
  green: "green",
  red: "red",
} as const;

export function ReservationStatusBadge({
  status,
  size = "md",
}: {
  status: ReservationStatus;
  size?: "sm" | "md";
}) {
  return (
    <Badge variant={TONE_TO_VARIANT[reservationStatusTone[status]]} size={size}>
      {reservationStatusLabels[status]}
    </Badge>
  );
}
