import { ReactNode } from "@tanstack/react-router";
import { format, isToday, isYesterday, isWithinInterval, isSameYear } from "date-fns";

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

export function formatDateWithTime(date: Date): ReactNode {
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return (
      <>
        <span className="font-bold">Yesterday</span> {format(date, "h:mm a")}
      </>
    );
  } else if (
    isWithinInterval(date, {
      start: new Date(),
      end: new Date(new Date().setDate(new Date().getDate() - 6)),
    })
  ) {
    return (
      <>
        <span className="font-bold">{format(date, "EEEE")}</span> at {format(date, "h:mm a")}
      </>
    );
  } else if (isSameYear(date, new Date())) {
    return (
      <>
        <span className="font-bold">{format(date, "MMM d")}</span> {format(date, "h:mm a")}
      </>
    );
  } else {
    return (
      <>
        <span className="font-bold">{format(date, "MMM d, yyyy")}</span> {format(date, "h:mm a")}
      </>
    );
  }
}
