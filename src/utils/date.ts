import { Period, Filter, Shift } from "../types";

export const getPeriodRange = (filter: Filter): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter.period) {
    case "today":
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 86400000 - 1),
      };
    case "this_week":
      const currentDay = today.getDay(); // Sunday is 0, Monday is 1
      const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return { start: startOfWeek, end: endOfWeek };
    case "last_7_days":
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return { start: sevenDaysAgo, end: new Date() };
    case "this_month":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      return { start: startOfMonth, end: endOfMonth };
    case "last_30_days":
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      return { start: thirtyDaysAgo, end: new Date() };
    case "all":
      return { start: new Date(0), end: new Date() };
    case "custom":
      if (!filter.customRange.start || !filter.customRange.end) {
        return { start: new Date(0), end: new Date(0) }; // Invalid range
      }
      const customStart = new Date(filter.customRange.start);
      customStart.setUTCHours(0, 0, 0, 0);
      const customEnd = new Date(filter.customRange.end);
      customEnd.setUTCHours(23, 59, 59, 999);
      return { start: customStart, end: customEnd };
    default:
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
  }
};

/**
 * Creates an ISO string from a Date object, but treats the local date/time components
 * as if they were UTC components. This is to counteract the timezone conversion
 * of toISOString() and keep the date consistent with user input across timezones.
 * @param date The local Date object.
 * @returns An ISO string like "YYYY-MM-DDTHH:mm:ss.sssZ".
 */
export const toNaiveUTCISOString = (date: Date): string => {
  // We use Date.UTC which takes components and returns ms since epoch for a UTC date.
  // The getters on `date` (getFullYear, etc.) return components in the local timezone.
  const utcMilliseconds = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );
  // Now create a new Date from these UTC milliseconds and convert to ISO string.
  return new Date(utcMilliseconds).toISOString();
};

/**
 * Returns the local date in 'YYYY-MM-DD' format.
 * This avoids timezone conversion issues from toISOString().
 * @param date The date to format (defaults to now).
 * @returns A string in 'YYYY-MM-DD' format.
 */
export const getLocalDateISOString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateFromNaiveUTC = (isoString: string): string => {
  if (!isoString || !isoString.includes("T")) return "";
  const datePart = isoString.split("T")[0];
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
};

export const formatTimeFromNaiveUTC = (isoString: string): string => {
  if (!isoString || !isoString.includes("T")) return "";
  const timePart = isoString.split("T")[1];
  return timePart.substring(0, 5); // HH:mm
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
};

export const formatNumber = (value: number, decimalPlaces = 2) => {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value || 0);
};

export const formatDuration = (milliseconds: number) => {
  if (milliseconds < 0) milliseconds = 0;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
};

export const formatHoursMinutes = (milliseconds: number) => {
  if (milliseconds < 0) milliseconds = 0;
  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export const calculatePauseDuration = (shift: Shift): number => {
  return shift.pauses.reduce((acc, pause) => {
    if (pause.start && pause.end) {
      const pauseStart = new Date(pause.start).getTime();
      const pauseEnd = new Date(pause.end).getTime();
      if (pauseEnd > pauseStart) {
        return acc + (pauseEnd - pauseStart);
      }
    }
    return acc;
  }, 0);
};

export const calculateShiftDuration = (
  shift: Shift,
  withPauses: boolean = true
): number => {
  if (!shift.start || !shift.end) return 0;

  const start = new Date(shift.start).getTime();
  const end = new Date(shift.end).getTime();

  if (end <= start) return 0;

  let duration = end - start;

  // In the main duration calculation, we *don't* subtract pauses, as that's handled separately for "worked hours"
  // This function now calculates the GROSS duration of the shift.
  // The net duration is calculated on the fly where needed.
  // Let's adjust for clarity. The function will return NET duration.
  if (withPauses) {
    const pauseDuration = calculatePauseDuration(shift);
    duration -= pauseDuration;
  }

  return duration > 0 ? duration : 0;
};
