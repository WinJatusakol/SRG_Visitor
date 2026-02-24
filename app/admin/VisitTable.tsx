"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
    CalendarClock,
    Building2,
    Users,
    CarFront,
    Utensils,
    Gift,
    Phone,
    Globe2,
    UserCircle2,
    X,
    MapPin,
    Briefcase,
    ChevronRight,
    MessageSquareText,
    AlertCircle
} from "lucide-react";

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
    hostName?: string | null;
    transportType?: string | null;
    carLicense?: string | null;
    carBrand?: string | null;
    meetingRoom?: boolean | null;
    foodRequired?: boolean | null;
    meals?: string | null;
    souvenir?: boolean | null;
    visitTopic?: string | null;
    visitDetail?: string | null;
    guests?: unknown[] | null;
    carCount?: number | null;
    cars?: unknown[] | null;
    meetingRoomSelection?: string | null;
    foodPreferences?: unknown | null;
    // ✨ เพิ่ม Type สำหรับของที่ระลึกแบบละเอียด (ตามหน้า page.tsx ของเพื่อน)
    souvenirPreferences?: unknown | null;
};

export default function VisitorTablePremium({ visits }: { visits: Visit[] }) {
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

    const sortedVisits = useMemo(() => {
        if (!visits) return [];
        return [...visits].sort((a, b) => {
            const dateA = new Date(a.visitDateTime || a.created_at || 0).getTime();
            const dateB = new Date(b.visitDateTime || b.created_at || 0).getTime();
            return dateA - dateB;
        });
    }, [visits]);

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
                return `- คันที่ ${index + 1}: ${brand} | ${license}`;
            })
            .join("\n");
    };

    const foodMenuText = (value: any) => {
        // ดึง data จาก foodPreferences ตามโครงสร้าง Table ที่คุณมี
        const data = value?.foodPreferences || value;
        if (!data || typeof data !== "object") return "-";

        const lines: string[] = [];

        // 1. มื้ออาหาร (Meals)
        if (Array.isArray(data.meals) && data.meals.length > 0) {
            lines.push(`🍴 มื้อที่รับ: ${data.meals.join(", ")}`);
        }

        // 2. รายละเอียดเมนู (Menus)
        if (data.menus) {
            lines.push("📋 รายละเอียดเมนู:");
            const m = data.menus;

            if (m.breakfast) {
                lines.push(`   • เช้า: ${m.breakfast}`);
            }
            if (m.lunch) {
                lines.push(`   • กลางวัน: ${m.lunch.main} (ของหวาน: ${m.lunch.dessert})`);
            }
            if (m.dinner) {
                lines.push(`   • เย็น: ${m.dinner.main} (ของหวาน: ${m.dinner.dessert})`);
            }
        }
        return lines.length > 0 ? lines.join("\n") : "-";
    };

    const specialDietText = (value: any) => {
        // เข้าถึงชั้น foodPreferences ก่อน
        const data = value?.foodPreferences || value;
        if (!data || typeof data !== "object") return "-";

        const sd = data.specialDiet;
        if (!sd || typeof sd !== "object") return "-";

        const halal = Number(sd.halalSets || 0);
        const vegan = Number(sd.veganSets || 0);

        if (halal <= 0 && vegan <= 0) return "-";

        const lines = [];
        if (halal > 0) lines.push(`• ฮาลาล ${halal} ชุด`);
        if (vegan > 0) lines.push(`• วีแกน ${vegan} ชุด`);

        return lines.join("\n"); // แยกบรรทัดเพื่อให้โชว์ในช่องแยกได้ชัดเจน
    };

    const allergyText = (value: any) => {
        const data = value?.foodPreferences || value;
        if (!data || typeof data !== "object") return "-";

        const a = data.allergies;
        if (!a || typeof a !== "object") return "-";

        const items = Array.isArray(a.items)
            ? a.items.filter((x: any) => typeof x === "string" && x.trim() && x !== "อื่นๆ")
            : [];
        const other = typeof a.other === "string" ? a.other.trim() : "";

        const parts: string[] = [];
        if (items.length > 0) parts.push(`• ${items.join(", ")}`);
        if (other) parts.push(`• อื่นๆ: ${other}`);

        return parts.length > 0 ? parts.join("\n") : "-";
    };

    // ✨ ฟังก์ชันใหม่สำหรับจัดการข้อมูลของที่ระลึก
    const souvenirText = (value: any) => {
        // ตรวจสอบว่ามีข้อมูลส่งมาไหม
        if (!value) return "-";

        // ดึง data ออกมาจาก souvenirPreferences (ตามที่เห็นในรูป Debug)
        // หากไม่มี ให้ลองใช้ค่า value ตรงๆ (เผื่อกรณีอื่น)
        const data = value.souvenirPreferences || value;

        // ตรวจสอบว่า data เป็น object ที่ดึงค่าต่อได้หรือไม่
        if (typeof data !== "object") return "-";

        const giftSet = typeof data.giftSet === "string" && data.giftSet ? data.giftSet : "-";
        const count = typeof data.count === "number" ? data.count : 0;
        const extra = typeof data.extra === "string" && data.extra.trim() ? data.extra : "-";

        // ถ้าไม่มีข้อมูลสำคัญเลย ให้ส่งคืนขีด
        if (giftSet === "-" && count === 0) return "-";

        const lines = [];
        lines.push(`• ประเภท: ${giftSet}`);
        lines.push(`• จำนวน: ${count} ชุด`);
        if (extra !== "-") lines.push(`• เพิ่มเติม: ${extra}`);

        return lines.join("\n");
    };

    return (
        <div className="p-2 md:p-4 space-y-6 bg-gray-50/50 min-h-screen rounded-3xl ">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                        Visitor Log
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">รายการแขกคนสำคัญและผู้มาเยือน</p>
                </div>
                <div className="flex items-center gap-2 bg-white py-2 px-4 rounded-2xl shadow-sm border border-gray-100/50">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-600">
                        ทั้งหมด: <span className="text-gray-900 font-bold">{sortedVisits.length}</span> รายการ
                    </span>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-lg shadow-xl shadow-gray-200/40 border border-white/60 overflow-hidden relative z-0">
                <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                <div className="overflow-x-auto p-2">
                    <table className="min-w-full w-full">
                        <thead>
                            <tr className="border-b border-gray-100/80">
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[28%]">วันและเวลา</th>
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[35%]">องค์กร / ผู้มาเยือน</th>
                                <th className="hidden md:table-cell px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[22%]">ผู้ติดต่อ (Host)</th>
                                <th className="hidden sm:table-cell px-6 py-5 text-center text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[15%]">จำนวนผู้เข้าพบ</th>
                                <th className="w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50/50">
                            {sortedVisits.map((visit, index) => {
                                const visitDate = new Date(visit.visitDateTime || visit.created_at || 0);
                                return (
                                    <tr
                                        key={visit.id}
                                        onClick={() => setSelectedVisit(visit)}
                                        // ✨ แก้ไขจาก hover:-translate-y- เป็น hover:-translate-y-1 
                                        className="group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-1 rounded-2xl cursor-pointer relative z-10"
                                    >
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-12 h-12 bg-blue-50/80 text-blue-600 rounded-xl flex flex-col items-center justify-center shadow-sm border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase leading-none">{visitDate.toLocaleDateString("en-US", { month: "short" })}</span>
                                                    <span className="text-lg font-extrabold leading-none mt-0.5">{visitDate.getDate()}</span>
                                                </div>
                                                <div className="flex flex-col pt-1">
                                                    <span className="gap-x-[5] flex text-sm font-bold text-gray-900 group-hover:bg-blue-50/80 group-hover:text-blue-600 transition-colors rounded-md w-fit">
                                                        <CalendarClock className="w-3.5 h-5" />
                                                        {visitDate.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                                                    </span>
                                                    <div className="flex items-center text-xs font-medium text-gray-500 gap-1.5 mt-1 bg-gray-100/70 px-2 py-0.5 rounded-md w-fit">
                                                        {visitDate.toLocaleDateString("th-TH", { weekday: 'long' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <CompanyAvatar name={visit.vipCompany} idx={index} />
                                                <div className="flex flex-col">
                                                    <span className="text-[0.95rem] font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">
                                                        {visit.vipCompany || "ไม่ระบุบริษัท"}
                                                    </span>
                                                    <span className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                                                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="line-clamp-1">{visit.visitTopic || "-"}</span>
                                                    </span>
                                                    <div className="sm:hidden mt-3">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                                            <Users className="w-3 h-3" />
                                                            {visit.guests?.length || 1}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="hidden md:table-cell px-6 py-5 align-top text-sm">
                                            <div className="flex items-center gap-2 pt-2">
                                                <div className="p-1.5 bg-gray-100 text-gray-400 rounded-full">
                                                    <UserCircle2 className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-gray-700">{visit.hostName || "-"}</span>
                                            </div>
                                        </td>

                                        <td className="hidden sm:table-cell px-6 py-5 align-middle text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                                                ${(visit.guests?.length || 0) >= 1
                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50 group-hover:bg-indigo-100'
                                                    : 'bg-gray-50 text-gray-500 border-gray-100/50 group-hover:bg-gray-100'
                                                }`}>
                                                <Users className="w-3.5 h-3.5" />
                                                {visit.guests?.length || 1} คน
                                            </span>
                                        </td>

                                        <td className="px-4 py-5 align-middle text-right opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <ChevronRight className="w-5 h-5 text-blue-500" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedVisit && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

                        <div className="relative px-6 pt-5 pb-10 border-b border-gray-100 overflow-hidden bg-linear-to-br from-blue-50 via-white to-white">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="absolute top-5 left-5 w-16 h-16 bg-indigo-50/60 rounded-full blur-xl pointer-events-none"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div className="flex gap-4">
                                    <CompanyAvatar name={selectedVisit.vipCompany} size="lg" />
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{selectedVisit.vipCompany || "ไม่ระบุบริษัท"}</h2>
                                        {/* ✨ เปลี่ยนจาก vipPosition เป็น วันและเวลาที่เข้าพบ */}
                                        <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5 mt-1">
                                            <CalendarClock className="w-4 h-4" />
                                            {selectedVisit.visitDateTime || selectedVisit.created_at
                                                ? new Date(selectedVisit.visitDateTime || selectedVisit.created_at || 0).toLocaleString('th-TH', {
                                                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) + ' น.'
                                                : 'ไม่ระบุเวลาเข้าพบ'}
                                        </p>

                                    </div>

                                </div>
                                <button
                                    onClick={() => setSelectedVisit(null)}
                                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-gray-50/30">
                            <div className="space-y-8">

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <MessageSquareText className="w-4 h-4 text-blue-500" /> ข้อมูลทั่วไปและการเข้าพบ
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* <PremiumDetailItem icon={<Building2 />} label="บริษัทลูกค้า" value={selectedVisit.clientCompany} /> */}
                                        <PremiumDetailItem icon={<Globe2 />} label="สัญชาติ" value={selectedVisit.nationality} />
                                        <PremiumDetailItem icon={<Phone />} label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} isPrimary />
                                        <PremiumDetailItem icon={<UserCircle2 />} label="บุคคลที่ลูกค้าต้องการเข้าพบ" value={selectedVisit.hostName} />

                                        <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <dt className="text-xs font-medium text-gray-400 mb-1">หัวข้อการเข้าพบ</dt>
                                            <dd className="text-sm font-bold text-gray-900 mb-3">{selectedVisit.visitTopic || "-"}</dd>

                                            <dt className="text-xs font-medium text-gray-400 mb-1">รายละเอียด</dt>
                                            <dd className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                                                {selectedVisit.visitDetail || "-"}
                                            </dd>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" /> รายชื่อผู้เข้าร่วม ({selectedVisit.guests?.length || 0} ท่าน)
                                    </h3>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <PremiumDetailItem
                                            label="รายละเอียดรายบุคคล"
                                            value={guestsText(selectedVisit.guests)}
                                            multiline
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <CarFront className="w-4 h-4 text-emerald-500" /> ข้อมูลการเดินทาง
                                    </h3>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                            <PremiumDetailItem label="ประเภท" value={selectedVisit.transportType === "personal" ? "รถส่วนตัว" : "รถสาธารณะ"} simple />
                                            <PremiumDetailItem label="จำนวนรถ" value={selectedVisit.transportType === "personal" ? (selectedVisit.cars?.length ?? "-") : "-"} simple />
                                        </div>

                                        {selectedVisit.transportType === "personal" && selectedVisit.cars && (
                                            <div className="pt-4 border-t border-gray-50">
                                                <PremiumDetailItem label="ข้อมูลรถเพิ่มเติม" value={carsText(selectedVisit.cars)} multiline />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Utensils className="w-4 h-4 text-orange-500" /> การรับรองและอาหาร
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* ห้องประชุม */}
                                        <div className={`p-4 rounded-2xl border ${!!selectedVisit.meetingRoomSelection ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-2 rounded-lg ${!!selectedVisit.meetingRoomSelection ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <dt className="text-xs text-gray-500 font-bold">ห้องประชุม</dt>
                                            </div>
                                            <dd className={`text-sm font-bold ${!!selectedVisit.meetingRoomSelection ? 'text-blue-700' : 'text-gray-400'}`}>
                                                {!!selectedVisit.meetingRoomSelection ? selectedVisit.meetingRoomSelection : "ไม่ต้องการ"}
                                            </dd>
                                        </div>

                                        {/* ของที่ระลึก */}
                                        <div className={`p-4 rounded-2xl border ${!!selectedVisit.souvenirPreferences ? 'bg-pink-50/50 border-pink-100' : 'bg-white border-gray-100'}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-2 rounded-lg ${!!selectedVisit.souvenirPreferences ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Gift className="w-5 h-5" />
                                                </div>
                                                <dt className="text-xs text-gray-500 font-bold">ของที่ระลึก</dt>
                                            </div>
                                            <dd className={`text-sm font-bold ${!!selectedVisit.souvenirPreferences ? 'text-pink-700' : 'text-gray-400'}`}>
                                                {!!selectedVisit.souvenirPreferences ? "เตรียมของที่ระลึก" : "ไม่ต้องการ"}
                                            </dd>
                                            {!!selectedVisit.souvenirPreferences ? (
                                                <div className="mt-3 bg-white p-3 rounded-xl border border-pink-100/50 text-sm text-pink-800 whitespace-pre-line leading-relaxed">
                                                    {souvenirText(selectedVisit.souvenirPreferences)}
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* อาหาร */}
                                        <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${!!selectedVisit.foodPreferences ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Utensils className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <dt className="text-xs text-gray-500 mb-1">อาหารและมื้อ</dt>
                                                    <dd className={`text-sm font-bold ${!!selectedVisit.foodPreferences ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {/* แก้ไขไม่ให้เรียกใช้ selectedVisit.meals ตรงๆ แล้ว */}
                                                        {!!selectedVisit.foodPreferences ? "ต้องการจัดเตรียมอาหาร" : "ไม่ต้องการอาหาร"}
                                                    </dd>

                                                    {!!selectedVisit.foodPreferences && (
                                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                                                                <span className="block text-xs text-orange-700 mb-2 font-bold">เมนูที่เลือก:</span>
                                                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{foodMenuText(selectedVisit.foodPreferences)}</div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="bg-green-50/50 p-3 rounded-xl border border-green-100/50">
                                                                    <span className="block text-xs text-green-700 mb-1 font-bold">อาหารพิเศษ:</span>
                                                                    {/* เพิ่ม whitespace-pre-line ตรงนี้ */}
                                                                    <div className="text-sm text-gray-700 whitespace-pre-line">
                                                                        {specialDietText(selectedVisit.foodPreferences)}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/50 flex items-start gap-2">
                                                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                                    <div>
                                                                        <span className="block text-xs text-red-700 mb-1 font-bold">แพ้อาหาร:</span>
                                                                        {/* เพิ่ม whitespace-pre-line ตรงนี้ */}
                                                                        <div className="text-sm text-gray-700 whitespace-pre-line">
                                                                            {allergyText(selectedVisit.foodPreferences)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Separator() {
    return <div className="h-px w-full bg-linear-to-r from-transparent via-gray-200 to-transparent my-2"></div>
}

function CompanyAvatar({ name, size = "md", idx = 0 }: { name?: string | null; size?: "md" | "lg"; idx?: number }) {
    const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : <Building2 className={size === "lg" ? "w-6 h-6" : "w-4 h-4"} />;

    const colorPalettes = [
        'from-blue-400 to-indigo-500 text-white shadow-blue-200/50',
        'from-purple-400 to-pink-500 text-white shadow-purple-200/50',
        'from-emerald-400 to-teal-500 text-white shadow-emerald-200/50',
        'from-orange-400 to-red-500 text-white shadow-orange-200/50',
    ];
    const colorClass = colorPalettes[(idx || (name?.length || 0)) % colorPalettes.length];

    const sizeClass = size === "lg" ? "w-14 h-14 text-xl rounded-2xl" : "w-10 h-10 text-sm rounded-xl";

    return (
        <div className={`shrink-0 ${sizeClass} flex items-center justify-center font-extrabold bg-linear-to-br shadow-lg ${colorClass}`}>
            {initial}
        </div>
    );
}

function PremiumDetailItem({
    label,
    value,
    icon,
    simple = false,
    isPrimary = false,
    multiline = false
}: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    simple?: boolean;
    isPrimary?: boolean;
    multiline?: boolean;
}) {
    const displayValue = value === null || value === undefined || value === "" ? "—" : value;

    if (simple) {
        return (
            <div>
                <dt className="text-xs text-gray-400 mb-1">{label}</dt>
                <dd className={`text-sm ${isPrimary ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} ${multiline ? 'whitespace-pre-line leading-relaxed' : ''}`}>
                    {displayValue}
                </dd>
            </div>
        );
    }

    return (
        <div className={`flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow group ${multiline ? 'w-full' : ''}`}>
            {icon && (
                <div className={`mt-1 p-2 rounded-xl shrink-0 ${isPrimary ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'} transition-colors`}>
                    <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>
                </div>
            )}
            <div className={`overflow-hidden ${multiline ? 'w-full' : ''}`}>
                <dt className="text-xs font-medium text-gray-400 mb-0.5">{label}</dt>
                <dd className={`text-sm ${isPrimary ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'} ${multiline ? 'whitespace-pre-line leading-relaxed mt-1' : 'truncate'}`}>
                    {displayValue}
                </dd>
            </div>
        </div>
    );
}