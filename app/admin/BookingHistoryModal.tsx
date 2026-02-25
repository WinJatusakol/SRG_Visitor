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
  const date = new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }).format(d);
  const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d);
  return `${date} ${time} น.`;
};

export default function BookingHistoryModal({ visits }: { visits: VisitWithStatus[] }) {
  const [open, setOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitWithStatus | null>(null);

  const sorted = useMemo(() => {
    const items = Array.isArray(visits) ? [...visits] : [];
    items.sort((a, b) => {
      const da = new Date(a.visitDateTime || a.created_at || 0).getTime();
      const db = new Date(b.visitDateTime || b.created_at || 0).getTime();
      return db - da;
    });
    return items;
  }, [visits]);

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
                <div className="text-sm text-gray-500">แสดงรายการทั้งหมด (ดำเนินการ/เสร็จสิ้น/ยกเลิก)</div>
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
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  รายการทั้งหมด <span className="text-gray-500">({sorted.length})</span>
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
                      {sorted.map((visit, index) => {
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
                      {sorted.length === 0 && (
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
              timeZone="UTC"
              readOnly
              zVariant="history"
            />
          </div>
        </div>
      )}
    </>
  );
}
