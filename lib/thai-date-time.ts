export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export const extractVisitDateTimeParts = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return null;
  return { date: match[1], time: match[2] };
};

export const formatThaiDateLabel = (
  dateValue: string,
  timeZone = BANGKOK_TIME_ZONE,
  month: "short" | "long" = "long"
) => {
  const date = new Date(`${dateValue}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month,
    day: "numeric",
    timeZone,
  }).format(date);
};

export const formatThaiDateTime = (
  value: string | null | undefined,
  timeZone = BANGKOK_TIME_ZONE
) => {
  const parts = extractVisitDateTimeParts(value);
  if (parts) {
    const dateLabel = formatThaiDateLabel(parts.date, timeZone, "long");
    return dateLabel ? `${dateLabel} ${parts.time}` : null;
  }

  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
};

export const formatThaiTimestamp = (
  value: string | null | undefined,
  timeZone = BANGKOK_TIME_ZONE
) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
};

export const formatThaiMonthShort = (
  value: string | Date,
  timeZone = BANGKOK_TIME_ZONE
) => {
  if (typeof value === "string") {
    const dateLabel = formatThaiDateLabel(value, timeZone, "short");
    return dateLabel ? dateLabel.replace(/^\d+\s*/, "").replace(/\s*\d+$/, "").trim() : "";
  }
  return new Intl.DateTimeFormat("th-TH", {
    month: "short",
    timeZone,
  }).format(value);
};

export const formatThaiDay = (value: string | Date, timeZone = BANGKOK_TIME_ZONE) => {
  if (typeof value === "string") {
    const parts = value.split("-");
    return parts.length === 3 ? parts[2] : "";
  }
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    timeZone,
  }).format(value);
};

export const formatThaiTime = (value: string | Date, timeZone = BANGKOK_TIME_ZONE) => {
  if (typeof value === "string") return value;
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(value);
};

export const formatThaiWeekday = (value: string | Date, timeZone = BANGKOK_TIME_ZONE) => {
  if (typeof value === "string") {
    const date = new Date(`${value}T00:00:00+07:00`);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("th-TH", {
      weekday: "long",
      timeZone,
    }).format(date);
  }
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    timeZone,
  }).format(value);
};

export const getVisitDateKey = (
  value: string | null | undefined,
  timeZone = BANGKOK_TIME_ZONE
) => {
  const parts = extractVisitDateTimeParts(value);
  if (parts) return parts.date;
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export const getVisitTimeKey = (value: string | null | undefined) => {
  const parts = extractVisitDateTimeParts(value);
  if (parts) return parts.time;
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BANGKOK_TIME_ZONE,
  }).format(d);
};

export const toBangkokDateInput = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
