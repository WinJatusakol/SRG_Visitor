"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileClock, X } from "lucide-react";
import { BANGKOK_TIME_ZONE, formatThaiDateTime, formatThaiTimestamp, toBangkokDateInput } from "@/lib/thai-date-time";

type AuditLogRow = {
  id: string | number;
  created_at: string;
  actor_email: string | null;
  action: string;
  visitor_id: string;
  company_name?: string | null;
  before: unknown | null;
  after: unknown | null;
  meta: unknown | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stableStringify = (value: unknown): string => {
  if (value == null) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`).join(",")}}`;
};

const valuesEqual = (a: unknown, b: unknown) => {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") return stableStringify(a) === stableStringify(b);
  return String(a) === String(b);
};

const parseJsonDeep = (value: unknown) => {
  if (typeof value !== "string") return value;
  let text = value.trim();
  if (!text) return value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === "string") {
        const inner = parsed.trim();
        if (inner && (inner.startsWith("{") || inner.startsWith("["))) {
          text = inner;
          continue;
        }
      }
      return parsed;
    } catch {
      break;
    }
  }
  return value;
};

const knownFields = [
  "status",
  "visitDateTime",
  "clientCompany",
  "companyAddress",
  "country",
  "visitorType",
  "visitorTypeOther",
  "contactPhone",
  "purposeOfVisit",
  "welcomeMessage",
  "meetingRoomSelection",
  "transportType",
  "submittedBy",
  "guests",
  "internalAttendees",
  "cars",
  "shuttleSchedules",
  "foodPreferences",
  "siteVisit",
  "souvenirPreferences",
];

const importantFieldOrder = [
  "clientCompany",
  "visitDateTime",
  "meetingRoomSelection",
  "guests",
  "internalAttendees",
  "transportType",
  "status",
];

const fieldPriority = Object.fromEntries(
  importantFieldOrder.map((field, index) => [field, index + 1])
);

const sortChangeItems = (items: ChangeItem[]) =>
  [...items].sort((a, b) => {
    const aPriority = fieldPriority[a.field] ?? 999;
    const bPriority = fieldPriority[b.field] ?? 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.label.localeCompare(b.label, "th");
  });

const labelFor = (field: string) => {
  const labels: Record<string, string> = {
    status: "สถานะ",
    visitDateTime: "วันและเวลา",
    clientCompany: "ชื่อบริษัท/องค์กร",
    companyAddress: "ที่อยู่บริษัท/องค์กร",
    country: "ประเทศของบริษัท/องค์กร",
    visitorType: "ประเภทผู้เข้าเยี่ยมชม",
    visitorTypeOther: "ประเภทอื่นๆ",
    contactPhone: "เบอร์ผู้ประสานงาน",
    purposeOfVisit: "วัตถุประสงค์ในการเข้าพบ",
    welcomeMessage: "ข้อความ Welcome board",
    meetingRoomSelection: "ห้องประชุม",
    transportType: "การเดินทาง",
    submittedBy: "ชื่อผู้ยื่นคำร้อง",
    guests: "ผู้เข้าร่วม",
    internalAttendees: "ผู้เข้าร่วมภายใน",
    cars: "รถยนต์",
    shuttleSchedules: "รถรับ-ส่ง",
    foodPreferences: "อาหาร",
    siteVisit: "Site Visit",
    souvenirPreferences: "ของที่ระลึก",
  };
  return labels[field] ?? field;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const limitText = (value: string, max = 220) => (value.length > max ? `${value.slice(0, max)}...` : value);

const formatUnknownObject = (value: unknown) => {
  const v = parseJsonDeep(value);
  if (v == null || v === "") return "-";
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return limitText(v, 260);
  if (Array.isArray(v)) {
    const texts = v.map(asString).filter(Boolean);
    if (texts.length === v.length && texts.length > 0) return limitText(texts.join(", "), 260);
    return `(${v.length} รายการ)`;
  }
  if (isRecord(v)) {
    const keys = Object.keys(v).sort();
    const previewValue = (x: unknown) => {
      const p = parseJsonDeep(x);
      if (p == null || p === "") return "-";
      if (typeof p === "boolean") return p ? "ใช่" : "ไม่";
      if (typeof p === "number") return String(p);
      if (typeof p === "string") return limitText(p, 160);
      if (Array.isArray(p)) {
        const t = p.map(asString).filter(Boolean);
        if (t.length === p.length && t.length > 0) return limitText(t.join(", "), 160);
        return `(${p.length} รายการ)`;
      }
      if (isRecord(p)) return "(ข้อมูล)";
      return limitText(String(p), 160);
    };
    const lines = keys.slice(0, 8).map((k) => `${k}: ${previewValue(v[k])}`);
    const suffix = keys.length > 8 ? `\n... (+${keys.length - 8})` : "";
    return `${lines.join("\n")}${suffix}` || "-";
  }
  return limitText(String(v), 260);
};

const formatDateTime = (iso: string | null | undefined) => {
  const formatted = formatThaiTimestamp(iso, BANGKOK_TIME_ZONE);
  return formatted ? `${formatted} น.` : "-";
};

const statusText = (value: unknown) => {
  const n = Number(value);
  if (n === 0) return "ยกเลิกแล้ว";
  if (n === 2) return "เสร็จสิ้นแล้ว";
  return "ยังดำเนินการอยู่";
};

const actionText = (action: string) => {
  if (action === "cancel") return "ยกเลิกการจอง";
  if (action === "update") return "แก้ไขข้อมูล";
  return action || "-";
};

const actionBadgeClass = (action: string) => {
  if (action === "cancel") return "bg-red-50 text-red-700 border-red-200";
  if (action === "update") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const inlinePreview = (value: string) => {
  const oneLine = String(value ?? "").split("\n")[0] ?? "";
  return limitText(oneLine.trim() || "-", 90);
};

const formatFoodPreferences = (value: unknown) => {
  const fpRaw = parseJsonDeep(value);
  const fp = isRecord(fpRaw) ? fpRaw : null;
  if (!fp) return "-";

  const lines: string[] = [];
  const meals = Array.isArray(fp.meals) ? fp.meals.map(asString).filter(Boolean) : [];
  if (meals.length > 0) lines.push(`มื้ออาหาร: ${meals.join(", ")}`);

  const menus = isRecord(fp.menus) ? fp.menus : null;
  const breakfast = menus ? asString(menus.breakfast) : "";
  const breakfastOther = menus ? asString(menus.breakfastOther) : "";
  if (breakfast) lines.push(`เช้า: ${breakfast}${breakfastOther ? ` - ${breakfastOther}` : ""}`);

  const lunch = menus && isRecord(menus.lunch) ? menus.lunch : null;
  const lunchMain = lunch ? asString(lunch.main) : "";
  const lunchDessert = lunch ? asString(lunch.dessert) : "";
  const lunchOtherMain = lunch ? asString(lunch.otherMain) : "";
  const lunchOtherDessert = lunch ? asString(lunch.otherDessert) : "";
  if (lunchMain || lunchDessert) {
    const p: string[] = [];
    if (lunchMain) p.push(`เมนู ${lunchMain}${lunchOtherMain ? ` - ${lunchOtherMain}` : ""}`);
    if (lunchDessert) p.push(`ของหวาน ${lunchDessert}${lunchOtherDessert ? ` - ${lunchOtherDessert}` : ""}`);
    lines.push(`กลางวัน: ${p.join(" / ")}`);
  }

  const dinner = menus && isRecord(menus.dinner) ? menus.dinner : null;
  const dinnerMain = dinner ? asString(dinner.main) : "";
  const dinnerDessert = dinner ? asString(dinner.dessert) : "";
  const dinnerOtherMain = dinner ? asString(dinner.otherMain) : "";
  const dinnerOtherDessert = dinner ? asString(dinner.otherDessert) : "";
  if (dinnerMain || dinnerDessert) {
    const p: string[] = [];
    if (dinnerMain) p.push(`เมนู ${dinnerMain}${dinnerOtherMain ? ` - ${dinnerOtherMain}` : ""}`);
    if (dinnerDessert) p.push(`ของหวาน ${dinnerDessert}${dinnerOtherDessert ? ` - ${dinnerOtherDessert}` : ""}`);
    lines.push(`เย็น: ${p.join(" / ")}`);
  }

  const sd = isRecord(fp.specialDiet) ? fp.specialDiet : null;
  const halalSets = sd ? asNumber(sd.halalSets) : null;
  const veganSets = sd ? asNumber(sd.veganSets) : null;
  const sdParts: string[] = [];
  if (halalSets && halalSets > 0) sdParts.push(`ฮาลาล ${halalSets} ชุด`);
  if (veganSets && veganSets > 0) sdParts.push(`วีแกน ${veganSets} ชุด`);
  if (sdParts.length > 0) lines.push(`อาหารพิเศษ: ${sdParts.join(", ")}`);

  const al = isRecord(fp.allergies) ? fp.allergies : null;
  const items = al && Array.isArray(al.items) ? al.items.map(asString).filter(Boolean) : [];
  const other = al ? asString(al.other) : "";
  const alParts: string[] = [];
  if (items.length > 0) alParts.push(items.join(", "));
  if (other) alParts.push(other);
  if (alParts.length > 0) lines.push(`แพ้อาหาร: ${alParts.join(" / ")}`);

  if (lines.length === 0) return "-";
  return lines.map((x) => limitText(x, 260)).join("\n");
};

const formatSiteVisit = (value: unknown) => {
  const svRaw = parseJsonDeep(value);
  const sv = isRecord(svRaw) ? svRaw : null;
  if (!sv) return "-";
  const areas = Array.isArray(sv.areas) ? sv.areas.map(asString).filter(Boolean) : [];
  const approverName = asString(sv.approverName);
  const approverPosition = asString(sv.approverPosition);
  const lines: string[] = [];
  if (areas.length > 0) lines.push(`พื้นที่: ${areas.join(", ")}`);
  if (approverName || approverPosition) {
    const who = [approverName, approverPosition].filter(Boolean).join(" / ");
    lines.push(`ผู้อนุญาต: ${who}`);
  }
  if (lines.length === 0) return "-";
  return lines.map((x) => limitText(x, 260)).join("\n");
};

const formatSouvenirPreferences = (value: unknown) => {
  const spRaw = parseJsonDeep(value);
  const sp = isRecord(spRaw) ? spRaw : null;
  if (!sp) return "-";
  const giftSet = asString(sp.giftSet);
  const count = asNumber(sp.count);
  const extra = asString(sp.extra);
  const lines: string[] = [];
  if (giftSet) lines.push(`ประเภท: ${giftSet}`);
  if (count && count > 0) lines.push(`จำนวนชุด: ${count}`);
  if (extra) lines.push(`ของพิเศษ: ${extra}`);
  if (lines.length === 0) return "-";
  return lines.map((x) => limitText(x, 260)).join("\n");
};

const formatSubmittedBy = (value: unknown) => {
  const sbRaw = parseJsonDeep(value);
  const sb = isRecord(sbRaw) ? sbRaw : null;
  if (!sb) return "-";
  const name = asString(sb.name);
  const position = asString(sb.position);
  const text = [name, position].filter(Boolean).join(" / ");
  return text || "-";
};

const formatValue = (field: string, value: unknown) => {
  const v = parseJsonDeep(value);
  if (v == null || v === "") return "-";
  if (field === "status") return statusText(v);
  if (field === "visitDateTime" && typeof v === "string") {
    const formattedVisit = formatThaiDateTime(v, BANGKOK_TIME_ZONE);
    return formattedVisit ? `${formattedVisit} น.` : "-";
  }
  if (field === "transportType") {
    const t = asString(v);
    if (t === "personal") return "ส่วนตัว";
    if (t === "shuttle") return "รถรับ-ส่ง";
    return t || "-";
  }
  if (field === "foodPreferences") return formatFoodPreferences(v);
  if (field === "siteVisit") return formatSiteVisit(v);
  if (field === "souvenirPreferences") return formatSouvenirPreferences(v);
  if (field === "submittedBy") return formatSubmittedBy(v);
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return limitText(v, 260);
  return formatUnknownObject(v);
};

type ChangeItem = { field: string; label: string; from: string; to: string };

const fieldToSection = (field: string) => {
  if (["clientCompany", "companyAddress", "country", "visitorType", "visitorTypeOther", "purposeOfVisit", "welcomeMessage", "visitDateTime", "status"].includes(field)) {
    return "overview";
  }
  if (field === "guests") return "guests";
  if (field === "internalAttendees") return "internal-attendees";
  if (["transportType", "cars", "shuttleSchedules"].includes(field)) return "transport";
  if (field === "siteVisit") return "site-visit";
  if (["meetingRoomSelection", "souvenirPreferences"].includes(field)) return "facilities";
  if (field === "foodPreferences") return "food";
  if (["submittedBy", "contactPhone"].includes(field)) return "requester";
  return "";
};

const getChangeItems = (row: AuditLogRow): ChangeItem[] => {
  const beforeValue = parseJsonDeep(row.before);
  const afterValue = parseJsonDeep(row.after);
  const metaValue = parseJsonDeep(row.meta);
  const beforeRec = isRecord(beforeValue) ? beforeValue : null;
  const afterRec = isRecord(afterValue) ? afterValue : null;
  const metaRec = isRecord(metaValue) ? metaValue : null;
  const summaryRec = metaRec && isRecord(metaRec.summary) ? metaRec.summary : null;
  const summaryChanges =
    summaryRec && Array.isArray(summaryRec.changes)
      ? summaryRec.changes.filter((x: unknown) => isRecord(x))
      : [];

  const out: ChangeItem[] = [];

  for (const c of summaryChanges) {
    const field = typeof c.field === "string" ? c.field : "";
    if (!field) continue;
    const fromRaw = "from" in c ? (c as Record<string, unknown>).from : null;
    const toRaw = "to" in c ? (c as Record<string, unknown>).to : null;
    if (valuesEqual(fromRaw, toRaw)) continue;
    out.push({
      field,
      label: labelFor(field),
      from: formatValue(field, fromRaw),
      to: formatValue(field, toRaw),
    });
  }

  if (out.length > 0) return sortChangeItems(out);
  if (!beforeRec || !afterRec) return sortChangeItems(out);

  for (const field of knownFields) {
    if (!(field in beforeRec) && !(field in afterRec)) continue;
    const fromRaw = beforeRec[field];
    const toRaw = afterRec[field];
    if (valuesEqual(fromRaw, toRaw)) continue;
    out.push({
      field,
      label: labelFor(field),
      from: formatValue(field, fromRaw),
      to: formatValue(field, toRaw),
    });
  }

  if (out.length > 0) return sortChangeItems(out);

  const ignored = new Set(["id", "created_at", "updated_at", "visitorId", "visitor_id"]);
  const allKeys = Array.from(new Set([...Object.keys(beforeRec), ...Object.keys(afterRec)]))
    .filter((k) => !ignored.has(k))
    .sort();
  for (const field of allKeys) {
    const fromRaw = beforeRec[field];
    const toRaw = afterRec[field];
    if (valuesEqual(fromRaw, toRaw)) continue;
    out.push({
      field,
      label: labelFor(field),
      from: formatValue(field, fromRaw),
      to: formatValue(field, toRaw),
    });
  }
  return sortChangeItems(out);
};

const summarize = (row: AuditLogRow) => {
  const beforeValue = parseJsonDeep(row.before);
  const afterValue = parseJsonDeep(row.after);
  const metaValue = parseJsonDeep(row.meta);
  const beforeRec = isRecord(beforeValue) ? beforeValue : null;
  const afterRec = isRecord(afterValue) ? afterValue : null;
  const metaRec = isRecord(metaValue) ? metaValue : null;
  const summaryRec = metaRec && isRecord(metaRec.summary) ? metaRec.summary : null;
  const changes =
    summaryRec && Array.isArray(summaryRec.changes)
      ? summaryRec.changes.filter((x: unknown) => isRecord(x))
      : [];

  if (changes.length > 0) {
    const parts = changes
      .map((c) => {
        const field = typeof c.field === "string" ? c.field : "";
        if (!field) return "";
        const from = "from" in c ? c.from : null;
        const to = "to" in c ? c.to : null;
        return `${labelFor(field)}: ${formatValue(field, from)} → ${formatValue(field, to)}`;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }

  if (row.action === "update" && beforeRec && afterRec) {
    const parts = knownFields
      .map((field) => {
        if (!(field in beforeRec) && !(field in afterRec)) return "";
        const from = beforeRec[field];
        const to = afterRec[field];
        if (valuesEqual(from, to)) return "";
        return `${labelFor(field)}: ${formatValue(field, from)} → ${formatValue(field, to)}`;
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");

    const ignored = new Set(["id", "created_at", "updated_at", "visitorId", "visitor_id"]);
    const allKeys = Array.from(new Set([...Object.keys(beforeRec), ...Object.keys(afterRec)]))
      .filter((k) => !ignored.has(k))
      .sort();
    const genericParts = allKeys
      .map((field) => {
        const from = beforeRec[field];
        const to = afterRec[field];
        if (valuesEqual(from, to)) return "";
        return `${labelFor(field)}: ${formatValue(field, from)} → ${formatValue(field, to)}`;
      })
      .filter(Boolean)
      .slice(0, 10);
    if (genericParts.length > 0) return genericParts.join("\n");
  }

  if (row.action === "cancel") {
    const beforeStatus = beforeRec ? statusText(beforeRec.status) : "-";
    const afterStatus = afterRec ? statusText(afterRec.status) : "-";
    return `สถานะ: ${beforeStatus} → ${afterStatus}`;
  }
  if (row.action === "update") {
    return "แก้ไขข้อมูล";
  }
  return "-";
};

const primaryFieldForRow = (row: AuditLogRow) => {
  if (row.action === "cancel") return "status";
  const firstChange = getChangeItems(row)[0];
  return firstChange?.field ?? "";
};

export default function AuditLogsModal() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [detailsRow, setDetailsRow] = useState<AuditLogRow | null>(null);

  const [actorEmail, setActorEmail] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState<"" | "today" | "7d" | "30d">("");
  const [debouncedActorEmail, setDebouncedActorEmail] = useState("");
  const [debouncedCompanyQuery, setDebouncedCompanyQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCompanyQuery(companyQuery), 350);
    return () => window.clearTimeout(timer);
  }, [companyQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedActorEmail(actorEmail), 350);
    return () => window.clearTimeout(timer);
  }, [actorEmail]);

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedCompanyQuery.trim()) params.set("company", debouncedCompanyQuery.trim());
    if (debouncedActorEmail.trim()) params.set("actorEmail", debouncedActorEmail.trim());
    if (action.trim()) params.set("action", action.trim());
    if (dateFrom.trim()) params.set("dateFrom", dateFrom.trim());
    if (dateTo.trim()) params.set("dateTo", dateTo.trim());
    return params;
  }, [action, dateFrom, dateTo, debouncedActorEmail, debouncedCompanyQuery]);

  const loadPage = useCallback(async (pageOffset: number, mode: "reset" | "append") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(baseParams);
      params.set("limit", "200");
      params.set("offset", String(pageOffset));
      const url = `/api/admin/audit-logs?${params.toString()}`;
      const res = await fetch(url, { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error ?? `Request failed: ${res.status}`);
      }
      const nextItems = Array.isArray(json?.items) ? (json.items as AuditLogRow[]) : [];
      setItems((prev) => (mode === "reset" ? nextItems : [...prev, ...nextItems]));
      setHasMore(nextItems.length >= 200);
      setOffset(pageOffset + nextItems.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [baseParams]);

  const openBooking = useCallback((id: string, field?: string) => {
    const safeId = String(id ?? "").trim();
    if (!safeId) return;
    const sectionId = fieldToSection(String(field ?? "").trim());
    window.dispatchEvent(new CustomEvent("audit-log:open-visit", { detail: { visitorId: safeId, sectionId } }));
    setDetailsRow(null);
    setOpen(false);
  }, []);

  const applyQuickDateRange = useCallback((preset: "today" | "7d" | "30d") => {
    const today = new Date();
    const end = toBangkokDateInput(today);
    const startDate = new Date(today);
    if (preset === "7d") startDate.setDate(startDate.getDate() - 6);
    if (preset === "30d") startDate.setDate(startDate.getDate() - 29);
    const start = toBangkokDateInput(startDate);
    setDateFrom(start);
    setDateTo(end);
    setActiveDatePreset(preset);
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems([]);
    setOffset(0);
    setHasMore(true);
    void loadPage(0, "reset");
  }, [open, baseParams, loadPage]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition inline-flex items-center gap-2"
      >
        <FileClock className="w-4 h-4" />
        ประวัติการเปลี่ยนแปลง
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div className="w-full max-w-6xl h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <div className="text-lg font-bold text-gray-900">ประวัติการเปลี่ยนแปลงทั้งหมด</div>
                <div className="text-sm text-gray-500">บันทึกการแก้ไขและยกเลิกโดยแอดมิน</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                ปิด
              </button>
            </div>

            <div className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[140px]">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Company</div>
                  <input
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    placeholder="เช่น Sustain"
                    className="w-56 max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">From</div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setActiveDatePreset("");
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">To</div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setActiveDatePreset("");
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pb-0.5">
                  <button
                    type="button"
                    onClick={() => applyQuickDateRange("today")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeDatePreset === "today"
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDateRange("7d")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeDatePreset === "7d"
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    7 วันล่าสุด
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickDateRange("30d")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeDatePreset === "30d"
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    30 วันล่าสุด
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCompanyQuery("");
                    setActorEmail("");
                    setAction("");
                    setDateFrom("");
                    setDateTo("");
                    setActiveDatePreset("");
                  }}
                  disabled={loading}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  ล้างตัวกรอง
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAction("")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      action === ""
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction("update")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      action === "update"
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    แก้ไขข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction("cancel")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      action === "cancel"
                        ? "border border-[#1b2a18] bg-[#1b2a18] text-white"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    ยกเลิกการจอง
                  </button>
                </div>
                <input
                  value={actorEmail}
                  onChange={(e) => setActorEmail(e.target.value)}
                  placeholder="ค้นหาอีเมลผู้ดำเนินการ"
                  className="w-64 max-w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">ทุกการกระทำ</option>
                  <option value="update">แก้ไขข้อมูล</option>
                  <option value="cancel">ยกเลิกการจอง</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setItems([]);
                    setOffset(0);
                    setHasMore(true);
                    void loadPage(0, "reset");
                  }}
                  disabled={loading}
                  className="rounded-md bg-[#1b2a18] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? "กำลังโหลด..." : "รีเฟรช"}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">บริษัท: {companyQuery.trim() || "ทั้งหมด"}</span>
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">Action: {action ? actionText(action) : "ทั้งหมด"}</span>
                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">ช่วงเวลา: {dateFrom || "-"} ถึง {dateTo || "-"}</span>
              </div>
              {error && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
              <div className={`${items.length === 0 && !loading ? "hidden" : "overflow-hidden"} rounded-xl border border-gray-200 bg-white`}>
                <table className="min-w-full w-full table-fixed">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="w-52 border-r border-gray-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">เวลา</th>
                      <th className="w-72 border-r border-gray-100 px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">อีเมล</th>
                      <th className="w-36 border-r border-gray-100 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">การกระทำ</th>
                      <th className="w-36 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">บริษัท/องค์กร</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((row, idx) => (
                      <tr
                        key={String(row.id ?? idx)}
                        className={`${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="border-r border-gray-100 px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                        <td className="border-r border-gray-100 px-5 py-3 text-sm text-gray-700">
                          <div className="truncate">{row.actor_email || "-"}</div>
                        </td>
                        <td className="border-r border-gray-100 px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${actionBadgeClass(row.action)}`}>
                            {actionText(row.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          <div className="mb-1 truncate font-semibold text-gray-900">{row.company_name || "-"}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700">
                              #{row.visitor_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => openBooking(String(row.visitor_id ?? ""))}
                              className="hidden rounded-md border border-[#788B64]/30 bg-[#788B64]/10 px-2.5 py-1 text-xs font-semibold text-[#1b2a18] hover:bg-[#788B64]/20"
                            >
                              เปิด booking
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.action === "update" ? (
                            (() => {
                              const changes = getChangeItems(row);
                              if (changes.length === 0) return <div className="text-gray-400">-</div>;
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setDetailsRow(row)}
                                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                                  >
                                    ดูรายละเอียด
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openBooking(String(row.visitor_id ?? ""), primaryFieldForRow(row))}
                                    aria-label="เปิด booking"
                                    className="rounded-md border border-[#788B64]/30 bg-[#788B64]/10 px-3 py-1.5 text-[0px] font-semibold text-[#1b2a18] hover:bg-[#788B64]/20"
                                  >
                                    <span className="inline-flex items-center gap-1 text-sm">
                                      <ArrowUpRight className="h-3.5 w-3.5" />
                                      เปิด
                                    </span>
                                    เปิด booking
                                  </button>
                                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                    เปลี่ยน {changes.length} รายการ
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="whitespace-pre-line">{summarize(row)}</div>
                              <button
                                type="button"
                                onClick={() => openBooking(String(row.visitor_id ?? ""), primaryFieldForRow(row))}
                                aria-label="เปิด booking"
                                className="rounded-md border border-[#788B64]/30 bg-[#788B64]/10 px-3 py-1.5 text-[0px] font-semibold text-[#1b2a18] hover:bg-[#788B64]/20"
                              >
                                <span className="inline-flex items-center gap-1 text-sm">
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                  เปิด
                                </span>
                                เปิด booking
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                          ไม่มีข้อมูล
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {items.length === 0 && !loading && (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
                  <div className="text-base font-semibold text-gray-800">ไม่พบ log ตามเงื่อนไขนี้</div>
                  <div className="mt-2 text-sm text-gray-500">
                    ลองเปลี่ยนชื่อบริษัท, อีเมลผู้ดำเนินการ, ประเภทการกระทำ หรือช่วงวันที่ แล้วระบบจะค้นหาให้ใหม่
                  </div>
                </div>
              )}

              <div className={`mt-4 flex items-center justify-between gap-3 ${items.length === 0 && !loading ? "hidden" : ""}`}>
                <div className="text-xs text-gray-500">แสดง {items.length} รายการ</div>
                <button
                  type="button"
                  onClick={() => void loadPage(offset, "append")}
                  disabled={loading || !hasMore}
                  className="rounded-md bg-[#1b2a18] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? "กำลังโหลด..." : hasMore ? "โหลดเพิ่ม" : "ครบแล้ว"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && detailsRow && detailsRow.action === "update" && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setDetailsRow(null);
          }}
        >
          <div className="w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <div className="text-lg font-bold text-gray-900">รายละเอียดการแก้ไข</div>
                <div className="text-sm text-gray-500">
                  #{detailsRow.visitor_id} • {detailsRow.actor_email || "-"} • {formatDateTime(detailsRow.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsRow(null)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                ปิด
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 bg-gray-50/30">
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openBooking(String(detailsRow.visitor_id ?? ""), primaryFieldForRow(detailsRow))}
                    aria-label="เปิด booking"
                    className="rounded-md border border-[#788B64]/30 bg-[#788B64]/10 px-3 py-1.5 text-[0px] font-semibold text-[#1b2a18] hover:bg-[#788B64]/20"
                  >
                    <span className="inline-flex items-center gap-1 text-sm">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      เปิด
                    </span>
                    เปิด booking นี้
                  </button>
                </div>
                {(() => {
                  const items = getChangeItems(detailsRow);
                  if (items.length === 0) {
                    return <div className="p-6 text-sm text-gray-500">ไม่มีรายการเปลี่ยนแปลง</div>;
                  }
                  return (
                    <div className="divide-y divide-gray-100">
                      {items.map((c, i) => (
                        <details key={`${c.field}-${i}`} className="group p-4 open:bg-gray-50/40">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-900">{c.label}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  ก่อน: {inlinePreview(c.from)} → หลัง: {inlinePreview(c.to)}
                                </div>
                              </div>
                              <div className="shrink-0 text-xs font-semibold text-gray-600 group-open:hidden">ดู</div>
                              <div className="shrink-0 text-xs font-semibold text-gray-600 hidden group-open:block">ย่อ</div>
                            </div>
                          </summary>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="text-xs font-bold text-gray-500">ก่อนเปลี่ยน</div>
                              <div className="mt-1 text-sm text-gray-800 whitespace-pre-line break-words">{c.from}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <div className="text-xs font-bold text-gray-500">หลังเปลี่ยน</div>
                              <div className="mt-1 text-sm text-gray-800 whitespace-pre-line break-words">{c.to}</div>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

