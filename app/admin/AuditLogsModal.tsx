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

  const formatValue = (field: string, value: unknown) => {
    if (value == null || value === "") return "-";
    if (field === "status") return statusText(value);
    if (field === "visitDateTime" && typeof value === "string") return formatDateTime(value);
    if (typeof value === "boolean") return value ? "ใช่" : "ไม่";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    try {
      const text = JSON.stringify(value);
      return text.length > 160 ? `${text.slice(0, 160)}…` : text;
    } catch {
      return String(value);
    }
  };

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
                <table className="min-w-full w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">เวลา</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">อีเมล</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">การกระทำ</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">รายการ</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((row, idx) => (
                      <tr key={String(row.id ?? idx)} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{row.actor_email || "-"}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{actionText(row.action)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">#{row.visitor_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="whitespace-pre-line">{summarize(row)}</div>
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
    </>
  );
}
