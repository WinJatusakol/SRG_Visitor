"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type TableKey =
  | "hosts"
  | "executive_hosts"
  | "meeting_rooms"
  | "site_visit_areas"
  | "souvenir_gift_sets"
  | "food_menu_options"
  | "allergy_options";

type BaseRow = {
  id: number;
  sort_index?: number | null;
  active?: boolean | null;
};

type RefRow = BaseRow & {
  value: string;
  label_th: string | null;
  label_en: string | null;
};

type MeetingRoomRow = BaseRow & {
  code: string;
  name_th: string | null;
  name_en: string | null;
  location_th: string | null;
  location_en: string | null;
  capacity: number | null;
};

type FoodMenuRow = RefRow & {
  group_key: string;
};

type AnyRow = RefRow | MeetingRoomRow | FoodMenuRow;

const tableLabels: Record<TableKey, string> = {
  hosts: "Hosts",
  executive_hosts: "Executive Hosts",
  meeting_rooms: "Meeting Rooms",
  site_visit_areas: "Site Visit Areas",
  souvenir_gift_sets: "Souvenir Gift Sets",
  food_menu_options: "Food Menu Options",
  allergy_options: "Allergy Options",
};

// Mapping ชื่อ Label ให้เฉพาะเจาะจงตามหมวดหมู่
const inputLabels: Record<TableKey, { th: string; en: string }> = {
  hosts: { th: "ชื่อผู้ติดต่อ (TH)", en: "ชื่อผู้ติดต่อ (EN)" },
  executive_hosts: { th: "ชื่อผู้บริหาร (TH)", en: "ชื่อผู้บริหาร (EN)" },
  meeting_rooms: { th: "ชื่อห้องประชุม (TH)", en: "ชื่อห้องประชุม (EN)" },
  site_visit_areas: { th: "ชื่อพื้นที่เข้าชม (TH)", en: "ชื่อพื้นที่เข้าชม (EN)" },
  souvenir_gift_sets: { th: "ชื่อของที่ระลึก (TH)", en: "ชื่อของที่ระลึก (EN)" },
  food_menu_options: { th: "ชื่อเมนูอาหาร (TH) / Value", en: "ชื่อเมนูอาหาร (EN)" },
  allergy_options: { th: "รายการแพ้อาหาร (TH) / Value", en: "รายการแพ้อาหาร (EN)" },
};

const foodGroups = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch_main", label: "Lunch (Main)" },
  { value: "lunch_dessert", label: "Lunch (Dessert)" },
  { value: "dinner_main", label: "Dinner (Main)" },
  { value: "dinner_dessert", label: "Dinner (Dessert)" },
];

const isMeetingRoomTable = (table: TableKey) => table === "meeting_rooms";
const isFoodMenuTable = (table: TableKey) => table === "food_menu_options";

const normalizeNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export default function RefDataManager() {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState<TableKey>("hosts");
  const [items, setItems] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [resultPopup, setResultPopup] = useState<{ open: boolean; kind: "success" | "error"; message: string }>({
    open: false,
    kind: "success",
    message: "",
  });
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");

  const [code, setCode] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [locationTh, setLocationTh] = useState("");
  const [locationEn, setLocationEn] = useState("");
  const [capacity, setCapacity] = useState("0");

  const [groupKey, setGroupKey] = useState(foodGroups[0]?.value ?? "breakfast");

  // คอลัมน์สำหรับตาราง (นำ active ออกแล้ว)
  const columns = useMemo(() => {
    if (isMeetingRoomTable(table)) {
      return [
        { key: "code", label: "Code" },
        { key: "name_th", label: inputLabels[table].th },
        { key: "name_en", label: inputLabels[table].en },
        { key: "location_th", label: "Location (TH)" },
        { key: "location_en", label: "Location (EN)" },
        { key: "capacity", label: "Capacity" },
      ];
    }
    if (isFoodMenuTable(table)) {
      return [
        { key: "group_key", label: "Group" },
        { key: "label_th", label: inputLabels[table].th },
        { key: "label_en", label: inputLabels[table].en },
      ];
    }
    return [
      { key: "label_th", label: inputLabels[table].th },
      { key: "label_en", label: inputLabels[table].en },
    ];
  }, [table]);

  const resetForm = useCallback(() => {
    setLabelTh("");
    setLabelEn("");
    setCode("");
    setNameTh("");
    setNameEn("");
    setLocationTh("");
    setLocationEn("");
    setCapacity("0");
    setGroupKey(foodGroups[0]?.value ?? "breakfast");
  }, []);

  const showResult = (kind: "success" | "error", message: string) => {
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    setResultPopup({ open: true, kind, message });
    resultTimeoutRef.current = setTimeout(() => {
      setResultPopup((prev) => ({ ...prev, open: false }));
    }, 2000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/data?table=${encodeURIComponent(table)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }

      let fetchedItems = Array.isArray(result.items) ? (result.items as AnyRow[]) : [];

      // ดักกรอง "อื่นๆ" หรือ "other"
      if (isFoodMenuTable(table) || table === "allergy_options") {
        fetchedItems = fetchedItems.filter((row) => {
          const r = row as RefRow;
          const val = String(r.value || "").trim().toLowerCase();
          const lblTh = String(r.label_th || "").trim();
          
          return val !== "อื่นๆ" && val !== "other" && lblTh !== "อื่นๆ";
        });
      }

      setItems(fetchedItems);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    void refresh();
    resetForm();
  }, [refresh, resetForm]);

  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let payload: Record<string, unknown> = {
        active: true, // ตั้งค่าให้เป็น Active เสมอตอนสร้างใหม่
      };

      if (isMeetingRoomTable(table)) {
        payload = {
          ...payload,
          code: code.trim(),
          name_th: nameTh.trim(),
          name_en: nameEn.trim(),
          location_th: locationTh.trim(),
          location_en: locationEn.trim(),
          capacity: normalizeNumber(capacity) ?? 0,
        };
      } else if (isFoodMenuTable(table)) {
        payload = {
          ...payload,
          group_key: groupKey,
          label_th: labelTh.trim(),
          label_en: labelEn.trim(),
        };
      } else {
        payload = {
          ...payload,
          label_th: labelTh.trim(),
          label_en: labelEn.trim(),
        };
      }

      const response = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, data: payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }
      await refresh();
      resetForm();
      showResult("success", "เพิ่มข้อมูลสำเร็จ");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      showResult("error", `บันทึกข้อมูลไม่สำเร็จ: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId === null) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id: deleteConfirmId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }
      await refresh();
      showResult("success", "ลบข้อมูลสำเร็จ");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      showResult("error", `ลบข้อมูลไม่สำเร็จ: ${message}`);
    } finally {
      setSaving(false);
      setDeleteConfirmId(null);
    }
  };

  const canSubmit = useMemo(() => {
    if (isMeetingRoomTable(table)) {
      return (
        code.trim() &&
        nameTh.trim() &&
        nameEn.trim() &&
        locationTh.trim() &&
        locationEn.trim()
      );
    }
    if (isFoodMenuTable(table)) {
      return groupKey.trim() && labelTh.trim() && labelEn.trim();
    }
    return labelTh.trim() && labelEn.trim();
  }, [table, code, nameTh, nameEn, locationTh, locationEn, groupKey, labelTh, labelEn]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="px-4 py-2 bg-[#788B64] text-sm font-medium text-white rounded-md hover:bg-[#6b7d58] focus:ring-2 focus:ring-offset-2 focus:ring-[#788B64] transition shadow-sm"
      >
        จัดการข้อมูลในระบบ
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target && !saving && deleteConfirmId === null) setOpen(false);
          }}
        >
          <div className="w-full max-w-[96vw] h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-[#FAEFCC]/60 px-6 py-4 shrink-0">
              <div>
                <div className="text-lg font-semibold text-gray-900">จัดการข้อมูลตัวเลือกในระบบ (Reference Data)</div>
                <div className="text-sm text-gray-500">
                  เพิ่ม/ลบข้อมูลสำหรับ dropdown ในหน้าแบบฟอร์ม
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>

            <div className="border-b border-gray-200 bg-white px-6 py-4 shrink-0">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(tableLabels) as TableKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTable(key)}
                    className={
                      key === table
                        ? "rounded-full bg-[#788B64] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                        : "rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    }
                  >
                    {tableLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                {/* ฝั่งซ้าย: ฟอร์มเพิ่มข้อมูล */}
                <div className="self-start sticky top-0">
                    <form
                    onSubmit={handleCreate}
                    className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                    <div className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">เพิ่มรายการใหม่</div>

                    {isMeetingRoomTable(table) ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">รหัสห้อง (Code)</label>
                            <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">ความจุ (Capacity)</label>
                            <input
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            inputMode="numeric"
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">ชื่อห้อง (TH)</label>
                            <input
                            value={nameTh}
                            onChange={(e) => setNameTh(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">ชื่อห้อง (EN)</label>
                            <input
                            value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">สถานที่ (TH)</label>
                            <input
                            value={locationTh}
                            onChange={(e) => setLocationTh(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">สถานที่ (EN)</label>
                            <input
                            value={locationEn}
                            onChange={(e) => setLocationEn(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                        {isFoodMenuTable(table) && (
                            <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-gray-600">หมวดหมู่อาหาร (Group)</label>
                            <select
                                value={groupKey}
                                onChange={(e) => setGroupKey(e.target.value)}
                                className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            >
                                {foodGroups.map((g) => (
                                <option key={g.value} value={g.value}>
                                    {g.label}
                                </option>
                                ))}
                            </select>
                            </div>
                        )}
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-gray-600">{inputLabels[table]?.th || "Label (TH)"}</label>
                            <input
                            value={labelTh}
                            onChange={(e) => setLabelTh(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-gray-600">{inputLabels[table]?.en || "Label (EN)"}</label>
                            <input
                            value={labelEn}
                            onChange={(e) => setLabelEn(e.target.value)}
                            className="rounded-md border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:bg-white transition-colors"
                            />
                        </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end pt-2">
                        <button
                        type="submit"
                        disabled={saving || loading || !canSubmit}
                        className="rounded-md bg-[#788B64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6b7d58] disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors shadow-sm"
                        >
                        {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                        {error}
                        </div>
                    )}
                    </form>
                </div>

                {/* ฝั่งขวา: ตารางแสดงข้อมูล */}
                <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-[calc(92vh-180px)]">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100 bg-gray-50/30 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-gray-900">รายการทั้งหมดในระบบ</div>
                      <div className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{items.length} รายการ</div>
                    </div>
                    <button
                      type="button"
                      onClick={refresh}
                      disabled={loading || saving}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="min-w-max w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                          <tr>
                            {columns.map((col) => (
                              <th
                                key={col.key}
                                className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                              >
                                {col.label}
                              </th>
                            ))}
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {items.map((row, index) => (
                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                              {columns.map((col) => {
                                const raw = (row as Record<string, unknown>)[col.key];
                                const isGroupCol = col.key === "group_key";
                                
                                let content: React.ReactNode = "";

                                if (isGroupCol) {
                                    content = <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{String(raw)}</span>
                                } else {
                                    content = raw === null || raw === undefined ? "-" : String(raw);
                                }

                                return (
                                  <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                    {content}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-right w-[10%]">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(row.id)}
                                  disabled={saving}
                                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                  ลบ
                                </button>
                              </td>
                            </tr>
                          ))}
                          {items.length === 0 && !loading && (
                            <tr>
                              <td
                                colSpan={columns.length + 1}
                                className="px-4 py-12 text-center text-sm font-medium text-gray-500 border-2 border-dashed border-gray-100 rounded-lg"
                              >
                                ไม่มีข้อมูลในหมวดหมู่นี้
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🛑 Modal ยืนยันการลบ */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">ยืนยันการลบข้อมูล</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 ml-13">
              คุณต้องการลบรายการนี้ใช่หรือไม่? <br/>การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400 transition-colors shadow-sm"
              >
                {saving ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ Popup แสดงผลสำเร็จ/ผิดพลาด */}
      {resultPopup.open && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-transparent p-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-xl pointer-events-auto mt-20">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  resultPopup.kind === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {resultPopup.kind === "success" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div>
                <div className="text-base font-bold text-gray-900">
                  {resultPopup.kind === "success" ? "ดำเนินการสำเร็จ" : "เกิดข้อผิดพลาด"}
                </div>
                <div className="text-sm font-medium text-gray-500 leading-relaxed">{resultPopup.message}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}