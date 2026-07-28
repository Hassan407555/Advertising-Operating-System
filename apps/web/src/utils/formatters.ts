import { format } from "date-fns";

export function formatDateTime(value: string | Date, pattern = "yyyy-MM-dd HH:mm") {
  return format(new Date(value), pattern);
}
