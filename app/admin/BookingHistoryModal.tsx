"use client";

import { useMemo, useState } from "react";
import type { Visit } from "./visitTypes";
import { VisitDetailsModal } from "./VisitTable";

type VisitWithStatus = Visit & {
  status?: number | null;
};

const statusLabel = (status: number | null | undefined) => {
  if (status === 0) return { text: "ยกเลิกแล้ว", className: "bg-red-50 text-red-700 border-red-200" };
  if (status === 2) return { text: "เสร็จสิ้นแล้ว", className: "bg-gray-50 text-gray-700 border-gray-200" };
  return { text: "ยังดำเนินการอยู่", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const date = new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "2-digit", timeZone: "Asia/Bangkok" }).format(d);
  const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(d);
  return `${date} ${time} น.`;
};

export default function BookingHistoryModal({ visits }: { visits: VisitWithStatus[] }) {
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitWithStatus | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"active" | "canceled" | "completed" | "all">("all");
  const [filterHost, setFilterHost] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  const sorted = useMemo(() => {
    const items = Array.isArray(visits) ? [...visits] : [];
    items.sort((a, b) => {
      const da = new Date(a.visitDateTime || a.created_at || 0).getTime();
      const db = new Date(b.visitDateTime || b.created_at || 0).getTime();
      return db - da;
    });
    return items;
  }, [visits]);

  const hostOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of sorted) {
      const name = typeof v.hostName === "string" ? v.hostName.trim() : "";
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [sorted]);

  const timeZone = "Asia/Bangkok";

  const toThaiDateKey = (value: string | null | undefined) => {
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

  const isActiveStatus = (status: unknown) => status == null || Number(status) === 1;

  const filtered = useMemo(() => {
    const qCompany = filterCompany.trim().toLowerCase();
    return sorted.filter((v) => {
      const dateKey = toThaiDateKey(v.visitDateTime || v.created_at || null);
      if (filterDateFrom && dateKey && dateKey < filterDateFrom) return false;
      if (filterDateTo && dateKey && dateKey > filterDateTo) return false;
      if (filterDateFrom || filterDateTo) {
        if (!dateKey) return false;
      }

      if (filterStatus === "active" && !isActiveStatus(v.status)) return false;
      if (filterStatus === "canceled" && Number(v.status) !== 0) return false;
      if (filterStatus === "completed" && Number(v.status) !== 2) return false;

      if (filterHost.trim()) {
        const hn = typeof v.hostName === "string" ? v.hostName.trim() : "";
        if (hn !== filterHost.trim()) return false;
      }

      if (qCompany) {
        const vip = typeof v.vipCompany === "string" ? v.vipCompany.toLowerCase() : "";
        const client = typeof v.clientCompany === "string" ? v.clientCompany.toLowerCase() : "";
        if (!vip.includes(qCompany) && !client.includes(qCompany)) return false;
      }

      return true;
    });
  }, [filterCompany, filterDateFrom, filterDateTo, filterHost, filterStatus, sorted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition"
      >
        ประวัติการจองทั้งหมด
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) {
              setSelectedVisit(null);
              setOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[96vw] h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-[#FAEFCC]/60 px-6 py-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">ประวัติการจองทั้งหมด</div>
                <div className="text-sm text-gray-500">ค้นหา/คัดกรองตามวัน สถานะ Host และบริษัท</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVisit(null);
                  setOpen(false);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>

            <div className="h-[calc(92vh-72px)] overflow-auto p-6">
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">
                    แสดง <span className="text-gray-500">({filtered.length}/{sorted.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDateFrom("");
                      setFilterDateTo("");
                      setFilterStatus("all");
                      setFilterHost("");
                      setFilterCompany("");
                    }}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ล้างตัวกรอง
                  </button>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200 p-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
                    <div className="flex flex-col gap-1 lg:col-span-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">จากวันที่</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ถึงวันที่</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">สถานะ</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="active">ยังดำเนินการอยู่</option>
                        <option value="completed">เสร็จสิ้นแล้ว</option>
                        <option value="canceled">ยกเลิกแล้ว</option>
                        <option value="all">ทั้งหมด</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Host</label>
                      <select
                        value={filterHost}
                        onChange={(e) => setFilterHost(e.target.value)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">ทุกคน</option>
                        {hostOptions.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">บริษัท (ลูกค้า/แขก VIP)</label>
                      <input
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        placeholder="พิมพ์ชื่อบริษัทเพื่อค้นหา"
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">ตัวกรองใช้วันที่ตามเวลาไทย (Asia/Bangkok)</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="max-h-[72vh] overflow-auto">
                  <table className="min-w-max w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          วันและเวลา
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          บริษัทแขก VIP
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          ผู้ถูกเข้าพบ
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          หัวข้อ
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                          สถานะ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filtered.map((visit, index) => {
                        const label = statusLabel(visit.status);
                        return (
                          <tr
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/40"} cursor-pointer hover:bg-blue-50/30`}
                          >
                            <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                              {formatDateTime(visit.visitDateTime || visit.created_at || null)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                              {visit.vipCompany || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                              {visit.hostName || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                              {visit.visitTopic || "-"}
                            </td>
                            <td className="px-3 py-2 text-sm whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${label.className}`}>
                                {label.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500">
                            ไม่มีข้อมูล
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <VisitDetailsModal
              selectedVisit={selectedVisit}
              onClose={() => setSelectedVisit(null)}
              timeZone={timeZone}
              readOnly
              zVariant="history"
            />
          </div>
        </div>
      )}
    </>
  );
}
