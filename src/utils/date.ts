import {
  format,
  isToday,
  isYesterday,
  isWithinInterval,
  isSameYear,
} from "date-fns";

export function formatDate(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else if (
    isWithinInterval(date, {
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() - 6)),
    })
  ) {
    return format(date, "EEEE");
  } else if (isSameYear(date, new Date())) {
    return format(date, "MMM d");
  } else {
    return format(date, "MMM d, yyyy");
  }
}
