"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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

  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [active, setActive] = useState(true);

  const [code, setCode] = useState("");
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [locationTh, setLocationTh] = useState("");
  const [locationEn, setLocationEn] = useState("");
  const [capacity, setCapacity] = useState("0");

  const [groupKey, setGroupKey] = useState(foodGroups[0]?.value ?? "breakfast");

  const columns = useMemo(() => {
    if (isMeetingRoomTable(table)) {
      return [
        { key: "code", label: "Code" },
        { key: "name_th", label: "Name (TH)" },
        { key: "name_en", label: "Name (EN)" },
        { key: "location_th", label: "Location (TH)" },
        { key: "location_en", label: "Location (EN)" },
        { key: "capacity", label: "Capacity" },
        { key: "active", label: "Active" },
      ];
    }
    if (isFoodMenuTable(table)) {
      return [
        { key: "group_key", label: "Group" },
        { key: "label_th", label: "Label (TH)" },
        { key: "label_en", label: "Label (EN)" },
        { key: "active", label: "Active" },
      ];
    }
    return [
      { key: "label_th", label: "Label (TH)" },
      { key: "label_en", label: "Label (EN)" },
      { key: "active", label: "Active" },
    ];
  }, [table]);

  const resetForm = useCallback(() => {
    setLabelTh("");
    setLabelEn("");
    setActive(true);
    setCode("");
    setNameTh("");
    setNameEn("");
    setLocationTh("");
    setLocationEn("");
    setCapacity("0");
    setGroupKey(foodGroups[0]?.value ?? "breakfast");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ref-data?table=${encodeURIComponent(table)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }
      setItems(Array.isArray(result.items) ? (result.items as AnyRow[]) : []);
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

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      let payload: Record<string, unknown> = {
        active,
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

      const response = await fetch("/api/admin/ref-data", {
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
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ref-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
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
        เพิ่มข้อมูล
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[96vw] h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-[#FAEFCC]/60 px-6 py-4">
              <div>
                <div className="text-lg font-semibold text-gray-900">เพิ่มข้อมูลในระบบ</div>
                <div className="text-sm text-gray-500">
                  เพิ่ม/ลบข้อมูลสำหรับ dropdown ในหน้าแบบฟอร์ม
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>

            <div className="border-b border-gray-200 bg-white px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(tableLabels) as TableKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTable(key)}
                    className={
                      key === table
                        ? "rounded-full bg-[#788B64] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                        : "rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    }
                  >
                    {tableLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[calc(92vh-132px)] overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form
                  onSubmit={handleCreate}
                  className="space-y-4 rounded-xl border border-gray-200 bg-[#FAEFCC]/40 p-5"
                >
                  <div className="text-sm font-semibold text-gray-900">เพิ่มรายการ</div>

                  {isMeetingRoomTable(table) ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Code</label>
                        <input
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Capacity</label>
                        <input
                          value={capacity}
                          onChange={(e) => setCapacity(e.target.value)}
                          inputMode="numeric"
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Name (TH)</label>
                        <input
                          value={nameTh}
                          onChange={(e) => setNameTh(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Name (EN)</label>
                        <input
                          value={nameEn}
                          onChange={(e) => setNameEn(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Location (TH)</label>
                        <input
                          value={locationTh}
                          onChange={(e) => setLocationTh(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Location (EN)</label>
                        <input
                          value={locationEn}
                          onChange={(e) => setLocationEn(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {isFoodMenuTable(table) && (
                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label className="text-xs font-semibold text-gray-600">Group</label>
                          <select
                            value={groupKey}
                            onChange={(e) => setGroupKey(e.target.value)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                          >
                            {foodGroups.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Label (TH)</label>
                        <input
                          value={labelTh}
                          onChange={(e) => setLabelTh(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-600">Label (EN)</label>
                        <input
                          value={labelEn}
                          onChange={(e) => setLabelEn(e.target.value)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                      />
                      Active
                    </label>
                    <button
                      type="submit"
                      disabled={saving || loading || !canSubmit}
                      className="rounded-md bg-[#788B64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6b7d58] disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                </form>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-gray-900">รายการ</div>
                      <div className="text-xs text-gray-500">({items.length})</div>
                    </div>
                    <button
                      type="button"
                      onClick={refresh}
                      disabled={loading || saving}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "กำลังโหลด..." : "รีเฟรช"}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="max-h-[65vh] overflow-auto">
                      <table className="min-w-max w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {columns.map((col) => (
                              <th
                                key={col.key}
                                className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap"
                              >
                                {col.label}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {items.map((row, index) => (
                            <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                              {columns.map((col) => {
                                const raw = (row as Record<string, unknown>)[col.key];
                                const text =
                                  typeof raw === "boolean"
                                    ? raw
                                      ? "true"
                                      : "false"
                                    : raw === null || raw === undefined
                                      ? ""
                                      : String(raw);
                                return (
                                  <td key={col.key} className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                                    {text}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row.id)}
                                  disabled={saving}
                                  className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed"
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
                                className="px-3 py-6 text-center text-sm text-gray-500"
                              >
                                ไม่มีข้อมูล
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
        </div>
      )}
    </>
  );
}
