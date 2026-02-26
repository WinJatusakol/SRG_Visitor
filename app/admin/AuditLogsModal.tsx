"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileClock, X } from "lucide-react";

type AuditLogRow = {
  id: string | number;
  created_at: string;
  actor_email: string | null;
  action: string;
  visitor_id: string;
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
  "vipCompany",
  "clientCompany",
  "nationality",
  "contactPhone",
  "visitTopic",
  "visitDetail",
  "meetingRoomSelection",
  "transportType",
  "hostName",
  "executiveHost",
  "submittedBy",
  "guests",
  "cars",
  "foodPreferences",
  "siteVisit",
  "souvenirPreferences",
];

const labelFor = (field: string) => {
  const labels: Record<string, string> = {
    status: "สถานะ",
    visitDateTime: "วันและเวลา",
    vipCompany: "บริษัท VIP",
    clientCompany: "บริษัทลูกค้า",
    nationality: "สัญชาติ",
    contactPhone: "เบอร์โทรศัพท์",
    visitTopic: "หัวข้อ",
    visitDetail: "รายละเอียด",
    meetingRoomSelection: "ห้องประชุม",
    transportType: "การเดินทาง",
    hostName: "ชื่อผู้ถูกเข้าพบ",
    executiveHost: "ชื่อผู้ดูแลต้อนรับ",
    submittedBy: "ชื่อผู้ยื่นคำร้อง",
    guests: "ผู้เข้าร่วม",
    cars: "รถยนต์",
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

const limitText = (value: string, max = 220) => (value.length > max ? `${value.slice(0, max)}…` : value);

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
    const suffix = keys.length > 8 ? `\n… (+${keys.length - 8})` : "";
    return `${lines.join("\n")}${suffix}` || "-";
  }
  return limitText(String(v), 260);
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(d);
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
  if (action === "status_change") return "เปลี่ยนสถานะ";
  return action || "-";
};

const actionBadgeClass = (action: string) => {
  if (action === "cancel") return "bg-red-50 text-red-700 border-red-200";
  if (action === "status_change") return "bg-amber-50 text-amber-800 border-amber-200";
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
  if (breakfast) lines.push(`เช้า: ${breakfast}`);

  const lunch = menus && isRecord(menus.lunch) ? menus.lunch : null;
  const lunchMain = lunch ? asString(lunch.main) : "";
  const lunchDessert = lunch ? asString(lunch.dessert) : "";
  if (lunchMain || lunchDessert) {
    const p: string[] = [];
    if (lunchMain) p.push(`เมนู ${lunchMain}`);
    if (lunchDessert) p.push(`ของหวาน ${lunchDessert}`);
    lines.push(`กลางวัน: ${p.join(" / ")}`);
  }

  const dinner = menus && isRecord(menus.dinner) ? menus.dinner : null;
  const dinnerMain = dinner ? asString(dinner.main) : "";
  const dinnerDessert = dinner ? asString(dinner.dessert) : "";
  if (dinnerMain || dinnerDessert) {
    const p: string[] = [];
    if (dinnerMain) p.push(`เมนู ${dinnerMain}`);
    if (dinnerDessert) p.push(`ของหวาน ${dinnerDessert}`);
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

const formatExecutiveHost = (value: unknown) => {
  const exRaw = parseJsonDeep(value);
  const ex = isRecord(exRaw) ? exRaw : null;
  if (!ex) return "-";
  const type = asString(ex.type);
  if (type === "preset") return asString(ex.name) || "-";
  if (type === "other") {
    const fullName = [asString(ex.firstName), asString(ex.middleName), asString(ex.lastName)].filter(Boolean).join(" ");
    const position = asString(ex.position);
    const text = [fullName, position].filter(Boolean).join(" / ");
    return text || "-";
  }
  const text = asString(ex.name);
  return text || "-";
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
  if (field === "visitDateTime" && typeof v === "string") return formatDateTime(v);
  if (field === "transportType") {
    const t = asString(v);
    if (t === "personal") return "ส่วนตัว";
    if (t === "public") return "สาธารณะ";
    return t || "-";
  }
  if (field === "foodPreferences") return formatFoodPreferences(v);
  if (field === "siteVisit") return formatSiteVisit(v);
  if (field === "souvenirPreferences") return formatSouvenirPreferences(v);
  if (field === "executiveHost") return formatExecutiveHost(v);
  if (field === "submittedBy") return formatSubmittedBy(v);
  if (typeof v === "boolean") return v ? "ใช่" : "ไม่";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return limitText(v, 260);
  return formatUnknownObject(v);
};

type ChangeItem = { field: string; label: string; from: string; to: string };

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

  if (out.length > 0) return out;
  if (!beforeRec || !afterRec) return out;

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

  if (out.length > 0) return out;

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
  return out;
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

  if (row.action === "cancel" || row.action === "status_change") {
    const beforeStatus = beforeRec ? statusText(beforeRec.status) : "-";
    const afterStatus = afterRec ? statusText(afterRec.status) : "-";
    return `สถานะ: ${beforeStatus} → ${afterStatus}`;
  }
  if (row.action === "update") {
    return "แก้ไขข้อมูล";
  }
  return "-";
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
  const [action, setAction] = useState("");

  const baseParams = useMemo(() => {
    const params = new URLSearchParams();
    if (actorEmail.trim()) params.set("actorEmail", actorEmail.trim());
    if (action.trim()) params.set("action", action.trim());
    return params;
  }, [actorEmail, action]);

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
                <div className="text-sm text-gray-500">บันทึกการแก้ไข/ยกเลิก/เปลี่ยนสถานะโดยแอดมิน</div>
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

            <div className="shrink-0 border-b border-gray-200 bg-gray-50/30 px-6 py-3">
              <div className="flex flex-wrap items-center gap-3">
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
                  <option value="status_change">เปลี่ยนสถานะ</option>
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
              {error && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full w-full table-fixed">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 w-44 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">เวลา</th>
                      <th className="px-4 py-3 w-64 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">อีเมล</th>
                      <th className="px-4 py-3 w-36 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">การกระทำ</th>
                      <th className="px-4 py-3 w-24 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">รายการ</th>
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
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="truncate">{row.actor_email || "-"}</div>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${actionBadgeClass(row.action)}`}>
                            {actionText(row.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700">
                            #{row.visitor_id}
                          </span>
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
                                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                    เปลี่ยน {changes.length} รายการ
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="whitespace-pre-line">{summarize(row)}</div>
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

              <div className="mt-4 flex items-center justify-between gap-3">
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
