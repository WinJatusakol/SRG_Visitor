// components/VisitorTable.tsx
"use client";

import { useState, type ReactNode } from "react";

export type Visit = {
    id: string | number;
    visitDateTime?: string | null;
    created_at?: string | null;
    clientCompany?: string | null;
    vipCompany?: string | null;
    vipPosition?: string | null;
    nationality?: string | null;
    contactPhone?: string | null;
    totalGuests?: number | null;
    guests?: unknown[] | null;
    visitTopic?: string | null;
    visitDetail?: string | null;
    hostName?: string | null;
    transportType?: string | null;
    carCount?: number | null;
    cars?: unknown[] | null;
    carLicense?: string | null;
    carBrand?: string | null;
    meetingRoom?: boolean | null;
    meetingRoomSelection?: string | null;
    foodRequired?: boolean | null;
    meals?: string | null;
    foodPreferences?: unknown | null;
    souvenir?: boolean | null;
};

export default function VisitorTable({ visits }: { visits: Visit[] }) {
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

    const guestsText = (value: unknown[] | null | undefined) => {
        if (!Array.isArray(value) || value.length === 0) return "-";
        return value
            .map((guest, index) => {
                const g = guest as Record<string, unknown>;
                const fullName = [g.firstName, g.middleName, g.lastName]
                    .filter((part) => typeof part === "string" && part.trim())
                    .join(" ");
                const position = typeof g.position === "string" ? g.position : "-";
                const nationality = typeof g.nationality === "string" ? g.nationality : "-";
                return `- คนที่ ${index + 1}: ${fullName || "-"} / ${position} / ${nationality}`;
            })
            .join("\n");
    };

    const carsText = (value: unknown[] | null | undefined) => {
        if (!Array.isArray(value) || value.length === 0) return "-";
        return value
            .map((car, index) => {
                const c = car as Record<string, unknown>;
                const brand = typeof c.brand === "string" ? c.brand : "-";
                const license = typeof c.license === "string" ? c.license : "-";
                return `- คันที่ ${index + 1}: ${brand} / ${license}`;
            })
            .join("\n");
    };

    const foodMenuText = (value: unknown) => {
        if (!value || typeof value !== "object") return "-";
        const v = value as Record<string, unknown>;
        const menus = (v.menus && typeof v.menus === "object") ? (v.menus as Record<string, unknown>) : null;
        if (!menus) return "-";

        const lines: string[] = [];
        const breakfast = typeof menus.breakfast === "string" ? menus.breakfast.trim() : "";
        if (breakfast) lines.push(`เช้า: ${breakfast}`);

        const lunch = menus.lunch && typeof menus.lunch === "object" ? (menus.lunch as Record<string, unknown>) : null;
        if (lunch) {
            const main = typeof lunch.main === "string" ? lunch.main.trim() : "";
            const dessert = typeof lunch.dessert === "string" ? lunch.dessert.trim() : "";
            if (main || dessert) lines.push(`กลางวัน: ${main || "-"} | ของหวาน: ${dessert || "-"}`);
        }

        const dinner = menus.dinner && typeof menus.dinner === "object" ? (menus.dinner as Record<string, unknown>) : null;
        if (dinner) {
            const main = typeof dinner.main === "string" ? dinner.main.trim() : "";
            const dessert = typeof dinner.dessert === "string" ? dinner.dessert.trim() : "";
            if (main || dessert) lines.push(`เย็น: ${main || "-"} | ของหวาน: ${dessert || "-"}`);
        }

        return lines.length > 0 ? lines.join("\n") : "-";
    };

    const specialDietText = (value: unknown) => {
        if (!value || typeof value !== "object") return "-";
        const v = value as Record<string, unknown>;
        const d = (v.specialDiet && typeof v.specialDiet === "object") ? (v.specialDiet as Record<string, unknown>) : null;
        if (!d) return "-";
        const halal = Number(d.halalSets ?? 0);
        const vegan = Number(d.veganSets ?? 0);
        if ((halal || 0) <= 0 && (vegan || 0) <= 0) return "-";
        return `ฮาลาล: ${halal > 0 ? halal : "-"} ชุด, วีแกน: ${vegan > 0 ? vegan : "-"} ชุด`;
    };

    const allergyText = (value: unknown) => {
        if (!value || typeof value !== "object") return "-";
        const v = value as Record<string, unknown>;
        const a = (v.allergies && typeof v.allergies === "object") ? (v.allergies as Record<string, unknown>) : null;
        if (!a) return "-";
        const items = Array.isArray(a.items) ? a.items.filter((x) => typeof x === "string" && x.trim()) as string[] : [];
        const other = typeof a.other === "string" ? a.other.trim() : "";
        const parts: string[] = [];
        if (items.length > 0) parts.push(items.join(", "));
        if (other) parts.push(`อื่นๆ: ${other}`);
        return parts.length > 0 ? parts.join(" | ") : "-";
    };

    return (
        <>
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                {/* ✅ เพิ่ม table-fixed : เพื่อบังคับให้ความกว้างเป็นไปตามที่เรากำหนดเป๊ะๆ ไม่ยืดตามใจชอบ 
        */}
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* กำหนดความกว้างตรงนี้ (รวมกันต้องได้ 100% หรือใกล้เคียง) 
              */}

                            {/* 1. วันที่: เอาไป 30% พอ (ข้อความสั้น) */}
                            <th className="w-[30%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                วันที่เข้าชม
                            </th>

                            {/* 2. บริษัท VIP: เป็นพระเอก เอาไปเยอะสุด 30% */}
                            <th className="w-[30%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                บริษัท VIP
                            </th>

                            {/* 3. ผู้ติดต่อ: เอาไป 25% (ซ่อนในมือถือ) */}
                            <th className="hidden md:table-cell w-[25%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                ผู้ติดต่อ (Host)
                            </th>

                            {/* 4. จำนวนคน: ตัวเลขสั้นๆ เอาไป 10% พอ (ซ่อนในมือถือ) */}
                            <th className="hidden md:table-cell w-[10%] px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                จำนวนคน
                            </th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {visits?.sort((a, b) => {
                            // ดึงค่าวันที่ออกมาเทียบกัน โดยใช้ logic เดียวกับที่แสดงผล (มี ||)
                            const dateA = new Date(a.visitDateTime || a.created_at || 0).getTime();
                            const dateB = new Date(b.visitDateTime || b.created_at || 0).getTime();

                            // เลือกรูปแบบการเรียง:
                            // return dateB - dateA; // เรียงจาก "ล่าสุด" ไป "เก่าสุด" (Newest First)
                            return dateA - dateB; // เรียงจาก "เก่าสุด" ไป "ล่าสุด" (Oldest First)
                        }).map((visit) => (
                            <tr
                                key={visit.id}
                                onClick={() => setSelectedVisit(visit)}
                                className="hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                            >
                                {/* --- ส่วนเนื้อหา (Body) ไม่ต้องแก้ width แล้ว มันจะตาม Header เอง --- */}

                                {/* วันที่ */}
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 align-top">
                                    <div className="flex flex-col leading-tight">
                                        <span className="font-semibold">
                                            {new Date(visit.visitDateTime || visit.created_at || 0).toLocaleDateString("th-TH", {
                                                day: "2-digit", month: "short", year: "2-digit"
                                            })}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {new Date(visit.visitDateTime || visit.created_at || 0).toLocaleTimeString("th-TH", {
                                                hour: '2-digit', minute: '2-digit'
                                            })} น.
                                        </span>
                                    </div>
                                </td>

                                {/* บริษัท */}
                                <td className="px-4 py-3 text-sm align-top"> {/* ลบ whitespace-nowrap ออกเพื่อให้ชื่อยาวๆ ตัดบรรทัดได้ */}
                                    <div className="font-medium text-gray-900 break-words">{visit.vipCompany}</div>
                                    <div className="text-gray-500 text-xs">{visit.vipPosition}</div>

                                    {/* Badge มือถือ */}
                                    <div className="md:hidden mt-1">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {visit.totalGuests || 1} คน
                                        </span>
                                    </div>
                                </td>

                                {/* Host */}
                                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 align-top">
                                    {visit.hostName}
                                </td>

                                {/* จำนวนคน */}
                                <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500 align-top">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                        {visit.totalGuests || "-"} คน
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- Modal (คงเดิม) --- */}
            {selectedVisit && (
                // ... (โค้ด Modal ส่วนเดิม ไม่ต้องแก้)
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
                            <h2 className="text-xl font-bold text-gray-900">รายละเอียด</h2>
                            <button onClick={() => setSelectedVisit(null)} className="text-2xl">&times;</button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"> {/* ลด gap-6 เป็น gap-4 */}
                            <DetailItem label="บริษัทลูกค้า" value={selectedVisit.clientCompany} />
                            <DetailItem label="ตำแหน่ง VIP" value={selectedVisit.vipPosition} />
                            <DetailItem label="สัญชาติ" value={selectedVisit.nationality} />
                            <DetailItem label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} />
                            <DetailItem label="เข้ามาพบ" value={selectedVisit.hostName} />
                            <DetailItem label="หัวข้อ" value={selectedVisit.visitTopic} />
                            <div className="col-span-1 md:col-span-2">
                                <DetailItem label="รายละเอียด" value={selectedVisit.visitDetail} />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <DetailItem
                                    label="รายชื่อผู้เข้าร่วม"
                                    value={<div className="whitespace-pre-line">{guestsText(selectedVisit.guests)}</div>}
                                />
                            </div>
                            <DetailItem label="การเดินทาง" value={selectedVisit.transportType === "personal" ? "รถส่วนตัว" : "รถสาธารณะ"} />
                            <DetailItem label="จำนวนรถ" value={selectedVisit.transportType === "personal" ? (selectedVisit.carCount ?? "-") : "-"} />
                            <div className="col-span-1 md:col-span-2">
                                <DetailItem
                                    label="ข้อมูลรถ"
                                    value={<div className="whitespace-pre-line">{carsText(selectedVisit.cars)}</div>}
                                />
                            </div>
                            <DetailItem label="ทะเบียนรถ" value={selectedVisit.carLicense} />
                            <DetailItem label="ยี่ห้อรถ" value={selectedVisit.carBrand} />
                            <DetailItem label="ห้องประชุม" value={selectedVisit.meetingRoom ? "ต้องการ" : "ไม่ต้องการ"} />
                            <DetailItem label="ห้องประชุมที่เลือก" value={selectedVisit.meetingRoom ? (selectedVisit.meetingRoomSelection ?? "-") : "-"} />
                            <DetailItem label="อาหาร/มื้อ" value={`${selectedVisit.foodRequired ? "ต้องการ" : "ไม่ต้องการ"} / ${selectedVisit.meals || "-"}`} />
                            <div className="col-span-1 md:col-span-2">
                                <DetailItem
                                    label="เมนูอาหาร"
                                    value={<div className="whitespace-pre-line">{foodMenuText(selectedVisit.foodPreferences)}</div>}
                                />
                            </div>
                            <DetailItem label="อาหารพิเศษ" value={specialDietText(selectedVisit.foodPreferences)} />
                            <div className="col-span-1 md:col-span-2">
                                <DetailItem label="แพ้อาหาร" value={allergyText(selectedVisit.foodPreferences)} />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <DetailItem label="ของที่ระลึก" value={selectedVisit.souvenir ? "ต้องการ" : "ไม่ต้องการ"} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
    const displayValue = value === null || value === undefined || value === "" ? "-" : value;
    return (
        <div className="mb-4">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-base text-gray-900 bg-gray-50 p-2 rounded">{displayValue}</dd>
        </div>
    );
}
