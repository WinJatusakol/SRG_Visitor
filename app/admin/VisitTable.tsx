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
    Briefcase,
    ChevronRight,
    MessageSquareText,
    AlertCircle,
    Info,
    FileText,
    Download
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
    // 👇 แก้ไข Type เป็น any | null ตามที่ต้องการ
    foodPreferences?: any | null;
    souvenirPreferences?: any | null;
    // 👇 เพิ่ม Type สำหรับไฟล์นำเสนอ
    presentationFiles?: any | null; 
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
                return `${index + 1}. ${fullName || "-"} (${position}) - ${nationality}`;
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
                return `${index + 1}. ${brand} | ทะเบียน: ${license}`;
            })
            .join("\n");
    };

    const foodMenuText = (value: any) => {
        const data = value?.foodPreferences || value;
        if (!data || typeof data !== "object") return "-";

        const lines: string[] = [];
        if (Array.isArray(data.meals) && data.meals.length > 0) {
            lines.push(`มื้อที่รับ: ${data.meals.join(", ")}`);
        }
        if (data.menus) {
            const m = data.menus;
            if (m.breakfast) lines.push(`• เช้า: ${m.breakfast}`);
            if (m.lunch) lines.push(`• กลางวัน: ${m.lunch.main} (ของหวาน: ${m.lunch.dessert})`);
            if (m.dinner) lines.push(`• เย็น: ${m.dinner.main} (ของหวาน: ${m.dinner.dessert})`);
        }
        return lines.length > 0 ? lines.join("\n") : "-";
    };

    const specialDietText = (value: any) => {
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
        return lines.join("\n");
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

    const souvenirText = (value: any) => {
        if (!value) return "-";
        const data = value.souvenirPreferences || value;
        if (typeof data !== "object") return "-";

        const giftSet = typeof data.giftSet === "string" && data.giftSet ? data.giftSet : "-";
        const count = typeof data.count === "number" ? data.count : 0;
        const extra = typeof data.extra === "string" && data.extra.trim() ? data.extra : "-";

        if (giftSet === "-" && count === 0) return "-";
        const lines = [];
        lines.push(`• ประเภท: ${giftSet}`);
        lines.push(`• จำนวน: ${count} ชุด`);
        if (extra !== "-") lines.push(`• เพิ่มเติม: ${extra}`);
        return lines.join("\n");
    };

    // 👇 ฟังก์ชันใหม่สำหรับ Render ไฟล์แนบจาก JSONB
    const renderPresentationFiles = (value: any) => {
        if (!value) return <span className="text-sm font-bold text-gray-400">ไม่มีไฟล์แนบ</span>;
        
        // เข้าถึงข้อมูล เนื่องจาก Supabase อาจจะส่งมาเป็น Array จากการ Join table หรือเป็น Object
        let fileData = value;
        if (Array.isArray(value) && value.length > 0 && value[0].presentationFile) {
            fileData = value[0].presentationFile;
        } else if (value.presentationFile) {
            fileData = value.presentationFile;
        }

        if (!fileData) return <span className="text-sm font-bold text-gray-400">ไม่มีไฟล์แนบ</span>;

        // ทำให้เป็น Array เสมอเพื่อ Loop ง่ายๆ
        const filesArray = Array.isArray(fileData) ? fileData : [fileData];

        return (
            <div className="flex flex-wrap gap-2 mt-2">
                {filesArray.map((file, idx) => {
                    if (!file) return null;
                    // รองรับโครงสร้าง URL หลายรูปแบบที่มักจะเก็บใน JSONB
                    const url = typeof file === 'string' ? file : file.url || file.publicUrl || file.path;
                    const name = file.name || file.fileName || `ไฟล์เอกสาร ${idx + 1}`;

                    if (!url) return null;

                    return (
                        <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="font-semibold line-clamp-1 max-w-37.5">{name}</span>
                            <Download className="w-3.5 h-3.5 ml-1 text-gray-400" />
                        </a>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="p-2 md:p-4 space-y-6 bg-gray-50/50 min-h-screen rounded-3xl">
            {/* Header Table */}
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

            {/* Table Section */}
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
                                        className="group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-1 rounded-2xl cursor-pointer relative z-10"
                                    >
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-12 h-12 bg-blue-50/80 text-blue-600 rounded-xl flex flex-col items-center justify-center shadow-sm border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase leading-none">{visitDate.toLocaleDateString("en-US", { month: "short" })}</span>
                                                    <span className="text-lg font-extrabold leading-none mt-0.5">{visitDate.getDate()}</span>
                                                </div>
                                                <div className="flex flex-col pt-1">
                                                    <span className="gap-x-1 flex text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors w-fit">
                                                        <CalendarClock className="w-4 h-4 text-blue-500" />
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
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${(visit.guests?.length || 0) >= 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' : 'bg-gray-50 text-gray-500 border-gray-100/50'}`}>
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

            {/* ✨ Modal View ปรับปรุงใหม่ ✨ */}
            {selectedVisit && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-gray-50 w-full max-w-4xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

                        {/* Modal Header */}
                        <div className="relative px-6 py-6 border-b border-gray-200/60 overflow-hidden bg-white shrink-0 sm:rounded-t-3xl rounded-t-3xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <CompanyAvatar name={selectedVisit.vipCompany} size="lg" />
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                                            {selectedVisit.vipCompany || "ไม่ระบุบริษัท"}
                                        </h2>
                                        <p className="text-sm text-blue-600 font-semibold flex items-center gap-1.5 mt-1.5">
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
                                    className="p-2 -mr-2 bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors shadow-sm"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">

                            {/* Section 1: ข้อมูลทั่วไป */}
                            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
                                <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <MessageSquareText className="w-5 h-5 text-blue-500" /> 
                                    ข้อมูลทั่วไปและการเข้าพบ
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <InfoItem icon={<Phone />} label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} />
                                    <InfoItem icon={<Globe2 />} label="สัญชาติ" value={selectedVisit.nationality} />
                                    <InfoItem icon={<UserCircle2 />} label="ผู้ติดต่อ (Host)" value={selectedVisit.hostName} />
                                    
                                    <div className="sm:col-span-2 lg:col-span-3 bg-gray-50 rounded-xl p-4 border border-gray-100/80">
                                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">หัวข้อการเข้าพบ</dt>
                                        <dd className="text-base font-bold text-gray-900 mb-4">{selectedVisit.visitTopic || "-"}</dd>

                                        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">รายละเอียดเพิ่มเติม</dt>
                                        <dd className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                            {selectedVisit.visitDetail || "-"}
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: ผู้เข้าร่วม & การเดินทาง */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* ผู้เข้าร่วม */}
                                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 h-full">
                                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <Users className="w-5 h-5 text-indigo-500" /> 
                                        รายชื่อผู้เข้าร่วม <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{selectedVisit.guests?.length || 0} ท่าน</span>
                                    </h3>
                                    <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-indigo-50/30 p-4 rounded-xl border border-indigo-50">
                                        {guestsText(selectedVisit.guests)}
                                    </div>
                                </div>

                                {/* การเดินทาง */}
                                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 h-full">
                                    <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                                        <CarFront className="w-5 h-5 text-emerald-500" /> 
                                        ข้อมูลการเดินทาง
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-50">
                                            <span className="block text-xs text-gray-500 mb-1">ประเภทการเดินทาง</span>
                                            <span className="font-semibold text-gray-900">{selectedVisit.transportType === "personal" ? "รถส่วนตัว" : "รถสาธารณะ"}</span>
                                        </div>
                                        <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-50">
                                            <span className="block text-xs text-gray-500 mb-1">จำนวนรถ</span>
                                            <span className="font-semibold text-gray-900">{selectedVisit.transportType === "personal" ? (selectedVisit.cars?.length ?? "-") : "-"} คัน</span>
                                        </div>
                                    </div>
                                    {selectedVisit.transportType === "personal" && selectedVisit.cars && (
                                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                            <span className="block text-xs font-semibold text-gray-500 mb-2">รายละเอียดรถยนต์</span>
                                            {carsText(selectedVisit.cars)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 👇 Section 3: การอำนวยความสะดวก (ห้องประชุม & ของที่ระลึก & ไฟล์แนบ) [แยกออกมาแล้ว] */}
                            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
                                <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                                    <Building2 className="w-5 h-5 text-cyan-500" /> 
                                    การอำนวยความสะดวก (Facilities & Extras)
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* ห้องประชุม */}
                                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 flex flex-col justify-start">
                                        <dt className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-blue-500" /> ห้องประชุม
                                        </dt>
                                        <dd className="text-sm font-bold text-gray-900">
                                            {selectedVisit.meetingRoomSelection ? selectedVisit.meetingRoomSelection : "ไม่ต้องการห้องประชุม"}
                                        </dd>
                                    </div>

                                    {/* ของที่ระลึก */}
                                    <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/30 flex flex-col justify-start">
                                        <dt className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                                            <Gift className="w-4 h-4 text-pink-500" /> ของที่ระลึก
                                        </dt>
                                        {selectedVisit.souvenirPreferences ? (
                                            <dd className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                                                {souvenirText(selectedVisit.souvenirPreferences)}
                                            </dd>
                                        ) : (
                                            <dd className="text-sm font-bold text-gray-400">ไม่ต้องการ</dd>
                                        )}
                                    </div>

                                    {/* ไฟล์นำเสนอ */}
                                    <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 flex flex-col justify-start">
                                        <dt className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                                            <FileText className="w-4 h-4 text-purple-500" /> ไฟล์นำเสนอ
                                        </dt>
                                        <dd>
                                            {renderPresentationFiles(selectedVisit.presentationFiles)}
                                        </dd>
                                    </div>
                                </div>
                            </div>

                            {/* 👇 Section 4: การรับรองและจัดเลี้ยงอาหาร [แยกเป็นกล่องเฉพาะเรื่องอาหาร] */}
                            {selectedVisit.foodPreferences && (
                                <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                                    <div className="bg-orange-50/50 px-5 sm:px-6 py-4 border-b border-orange-100 flex items-center gap-2">
                                        <Utensils className="w-5 h-5 text-orange-600" />
                                        <h3 className="text-base font-bold text-orange-900">การรับรองและจัดเลี้ยงอาหาร</h3>
                                    </div>
                                    <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* เมนูหลัก */}
                                        <div className="lg:col-span-1 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase mb-3">
                                                <Info className="w-4 h-4" /> รายการมื้ออาหาร
                                            </span>
                                            <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                                {foodMenuText(selectedVisit.foodPreferences)}
                                            </div>
                                        </div>

                                        {/* อาหารพิเศษ */}
                                        <div className="lg:col-span-1 p-4 bg-green-50/30 rounded-xl border border-green-100">
                                            <span className="block text-xs font-bold text-green-700 uppercase mb-3">อาหารพิเศษ (Special Diet)</span>
                                            <div className="text-sm text-gray-700 whitespace-pre-line">
                                                {specialDietText(selectedVisit.foodPreferences)}
                                            </div>
                                        </div>

                                        {/* แพ้อาหาร */}
                                        <div className="lg:col-span-1 p-4 bg-red-50/30 rounded-xl border border-red-100">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase mb-3">
                                                <AlertCircle className="w-4 h-4" /> แพ้อาหาร
                                            </span>
                                            <div className="text-sm text-gray-700 whitespace-pre-line">
                                                {allergyText(selectedVisit.foodPreferences)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Component ย่อยสำหรับการแสดงผลข้อมูลใน Grid
function InfoItem({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    const displayValue = value === null || value === undefined || value === "" ? "-" : value;
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-gray-400">
                <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
            </div>
            <div>
                <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
                <dd className="text-sm font-semibold text-gray-900 truncate">
                    {displayValue}
                </dd>
            </div>
        </div>
    );
}

function CompanyAvatar({ name, size = "md", idx = 0 }: { name?: string | null; size?: "md" | "lg"; idx?: number }) {
    const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : <Building2 className={size === "lg" ? "w-6 h-6" : "w-4 h-4"} />;

    const colorPalettes = [
        'from-blue-500 to-indigo-600 text-white shadow-blue-200/50',
        'from-purple-500 to-pink-600 text-white shadow-purple-200/50',
        'from-emerald-400 to-teal-600 text-white shadow-emerald-200/50',
        'from-orange-400 to-red-500 text-white shadow-orange-200/50',
    ];
    const colorClass = colorPalettes[(idx || (name?.length || 0)) % colorPalettes.length];
    const sizeClass = size === "lg" ? "w-16 h-16 text-2xl rounded-2xl" : "w-10 h-10 text-sm rounded-xl";

    return (
        <div className={`shrink-0 ${sizeClass} flex items-center justify-center font-extrabold bg-linear-to-br shadow-lg ${colorClass}`}>
            {initial}
        </div>
    );
}