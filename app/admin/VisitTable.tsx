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
    ChevronRight
} from "lucide-react";

// --- Types (เหมือนเดิม) ---
type Visit = {
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
    foodNote?: string | null;
    souvenir?: boolean | null;
};

export default function VisitorTablePremium({ visits }: { visits: Visit[] }) {
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

    const sortedVisits = useMemo(() => {
        if (!visits) return [];
        return [...visits].sort((b, a) => {
            const dateA = new Date(a.visitDateTime || a.created_at || 0).getTime();
            const dateB = new Date(b.visitDateTime || b.created_at || 0).getTime();
            return dateB - dateA; // Newest first
        });
    }, [visits]);

    return (
        <div className="p-2 md:p-4 space-y-6 bg-gray-50/50 min-h-screen rounded-3xl">
            {/* --- Header Section with Gradient Text --- */}
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

            {/* --- Premium Table Card --- */}
            {/* ใช้ backdrop-blur และ shadow ใหญ่ขึ้นเพื่อให้ดูลอยตัว */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[4xl] shadow-xl shadow-gray-200/40 border border-white/60 overflow-hidden relative z-0">
                {/* Decorative background blob */}
                <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

                <div className="overflow-x-auto p-2">
                    <table className="min-w-full w-full">
                        <thead>
                            <tr className="border-b border-gray-100/80">
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[28%]">วันและเวลา</th>
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[35%]">องค์กร / ผู้มาเยือน</th>
                                <th className="hidden md:table-cell px-6 py-5 text-left text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[22%]">ผู้ติดต่อ (Host)</th>
                                <th className="hidden sm:table-cell px-6 py-5 text-center text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider w-[15%]">ผู้ติดตาม</th>
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
                                        className="group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-[0.5] rounded-2xl cursor-pointer relative z-10"
                                    >
                                        <td className="px-6 py-5 align-top">
                                           <div className="flex items-start gap-3">
                                               <div className="shrink-0 w-12 h-12 bg-blue-50/80 text-blue-600 rounded-xl flex flex-col items-center justify-center shadow-sm border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase leading-none">{visitDate.toLocaleDateString("en-US", { month: "short" })}</span>
                                                    <span className="text-lg font-extrabold leading-none mt-0.5">{visitDate.getDate()}</span>
                                               </div>
                                                <div className="flex flex-col pt-1">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {visitDate.toLocaleDateString("th-TH", { weekday: 'long' })}
                                                    </span>
                                                    <div className="flex items-center text-xs font-medium text-gray-500 gap-1.5 mt-1 bg-gray-100/70 px-2 py-0.5 rounded-md w-fit group-hover:bg-blue-50/80 group-hover:text-blue-600 transition-colors">
                                                        <CalendarClock className="w-3.5 h-3.5" />
                                                        {visitDate.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
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
                                                        <span className="line-clamp-1">{visit.vipPosition || "-"}</span>
                                                    </span>
                                                    <div className="sm:hidden mt-3">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                                                            <Users className="w-3 h-3" />
                                                            {visit.totalGuests || 1} ท่าน
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
                                                ${(visit.totalGuests || 0) > 1
                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50 group-hover:bg-indigo-100'
                                                    : 'bg-gray-50 text-gray-500 border-gray-100/50 group-hover:bg-gray-100'
                                                }`}>
                                                <Users className="w-3.5 h-3.5" />
                                                {visit.totalGuests || 1}
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

            {/* --- Premium Modal --- */}
            {selectedVisit && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    {/* Modal Container: Slide-up on mobile, Fade-in scale-up on desktop */}
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

                        {/* Modal Header with subtle gradient pattern */}
                        <div className="relative px-6 py-5 border-b border-gray-100 overflow-hidden bg-linear-to-br from-blue-50 via-white to-white">
                             {/* Decorative Background Elements */}
                             <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl pointer-events-none"></div>
                             <div className="absolute top-5 left-5 w-16 h-16 bg-indigo-50/60 rounded-full blur-xl pointer-events-none"></div>

                            <div className="relative z-10 flex justify-between items-start">
                                <div className="flex gap-4">
                                    {/* Company Avatar big version */}
                                    <CompanyAvatar name={selectedVisit.vipCompany} size="lg" />
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 line-clamp-1">{selectedVisit.vipCompany || "ไม่ระบุบริษัท"}</h2>
                                        <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5 mt-1">
                                            <Briefcase className="w-4 h-4" />
                                            {selectedVisit.vipPosition || "ตำแหน่งไม่ระบุ"}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedVisit(null)}
                                    className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: ใช้ Grid ที่สะอาดตา และไอคอนนำทาง */}
                        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-gray-50/30">
                            <div className="space-y-8">

                                {/* Group 1: ข้อมูลพื้นฐาน */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <PremiumDetailItem icon={<Building2 />} label="ลูกค้าบริษัท" value={selectedVisit.clientCompany} />
                                    <PremiumDetailItem icon={<Globe2 />} label="สัญชาติ" value={selectedVisit.nationality} />
                                    <PremiumDetailItem icon={<Phone />} label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} isPrimary/>
                                    <PremiumDetailItem icon={<Users />} label="จำนวนผู้ติดตาม" value={selectedVisit.totalGuests ? `${selectedVisit.totalGuests} ท่าน` : null} />
                                </div>

                                <Separator />

                                {/* Group 2: การเดินทาง */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <CarFront className="w-4 h-4 text-indigo-500" /> ข้อมูลการเดินทาง
                                    </h3>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <PremiumDetailItem
                                            label="ประเภท"
                                            value={selectedVisit.transportType === "personal" ? "รถส่วนตัว" : (selectedVisit.transportType ? "รถสาธารณะ" : null)}
                                            simple
                                        />
                                        <PremiumDetailItem label="ทะเบียนรถ" value={selectedVisit.carLicense} simple isPrimary />
                                        <PremiumDetailItem label="ยี่ห้อรถ" value={selectedVisit.carBrand} simple />
                                    </div>
                                </div>

                                {/* Group 3: การรับรอง (ใช้ Card สีเด่นขึ้นถ้าต้องการ) */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Gift className="w-4 h-4 text-pink-500" /> การรับรอง
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Highlight Card ถ้าต้องการห้องประชุม */}
                                        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
                                            selectedVisit.meetingRoom
                                                ? 'bg-blue-50/50 border-blue-100'
                                                : 'bg-white border-gray-100'
                                        }`}>
                                            <div className={`p-2 rounded-lg ${selectedVisit.meetingRoom ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <dt className="text-xs text-gray-500 mb-1">ห้องประชุม</dt>
                                                <dd className={`text-sm font-bold ${selectedVisit.meetingRoom ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    {selectedVisit.meetingRoom ? "ต้องการใช้ห้องประชุม" : "ไม่ต้องการ"}
                                                </dd>
                                            </div>
                                        </div>

                                        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors ${
                                             selectedVisit.souvenir
                                                ? 'bg-pink-50/50 border-pink-100'
                                                : 'bg-white border-gray-100'
                                        }`}>
                                            <div className={`p-2 rounded-lg ${selectedVisit.souvenir ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <Gift className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <dt className="text-xs text-gray-500 mb-1">ของที่ระลึก</dt>
                                                <dd className={`text-sm font-bold ${selectedVisit.souvenir ? 'text-pink-700' : 'text-gray-400'}`}>
                                                    {selectedVisit.souvenir ? "เตรียมของที่ระลึก" : "ไม่ต้องการ"}
                                                </dd>
                                            </div>
                                        </div>

                                        {/* อาหาร */}
                                        <div className="sm:col-span-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`p-2 rounded-lg ${selectedVisit.foodRequired ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Utensils className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-gray-500 mb-1">อาหารและเครื่องดื่ม</dt>
                                                    <dd className={`text-sm font-bold ${selectedVisit.foodRequired ? 'text-gray-900' : 'text-gray-400'}`}>
                                                         {selectedVisit.foodRequired ? `ต้องการ (${selectedVisit.meals || "ไม่ระบุมื้อ"})` : "ไม่ต้องการ"}
                                                    </dd>
                                                </div>
                                            </div>
                                            {selectedVisit.foodNote && (
                                                 <div className="mt-3 pl-11 text-sm text-gray-600 bg-orange-50/50 p-3 rounded-lg border border-orange-100/50 font-medium">
                                                    <span className="block text-xs text-orange-700 mb-1 font-bold">Note:</span>
                                                    "{selectedVisit.foodNote}"
                                                 </div>
                                            )}
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

// --- Helper Components (เพื่อความสวยงาม) ---

// เส้นคั่นบางๆ
function Separator() {
    return <div className="h-px w-full bg-linear-to-r from-transparent via-gray-200 to-transparent my-2"></div>
}

// Avatar สร้างจากตัวอักษรแรกของชื่อบริษัท
function CompanyAvatar({ name, size = "md", idx = 0 }: { name?: string | null; size?: "md" | "lg"; idx?: number }) {
    const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : <Building2 className={size === "lg" ? "w-6 h-6" : "w-4 h-4"} />;

    // จานสีสำหรับสุ่มให้แต่ละบริษัทสีไม่เหมือนกัน
    const colorPalettes = [
        'from-blue-400 to-indigo-500 text-white shadow-blue-200/50',
        'from-purple-400 to-pink-500 text-white shadow-purple-200/50',
        'from-emerald-400 to-teal-500 text-white shadow-emerald-200/50',
        'from-orange-400 to-red-500 text-white shadow-orange-200/50',
    ];
    // เลือกสีตาม index หรือชื่อ (เพื่อให้บริษัทเดิมสีเดิมเสมอ)
    const colorClass = colorPalettes[(idx || (name?.length || 0)) % colorPalettes.length];

    const sizeClass = size === "lg" ? "w-14 h-14 text-xl rounded-2xl" : "w-10 h-10 text-sm rounded-xl";

    return (
        <div className={`shrink-0 ${sizeClass} flex items-center justify-center font-extrabold bg-linear-to-br shadow-lg ${colorClass}`}>
            {initial}
        </div>
    );
}

// Item แสดงข้อมูลใน Modal แบบใหม่
function PremiumDetailItem({ label, value, icon, simple = false, isPrimary = false }: { label: string; value: ReactNode; icon?: ReactNode; simple?: boolean; isPrimary?: boolean }) {
    const displayValue = value === null || value === undefined || value === "" ? "—" : value;

    if (simple) {
         return (
            <div>
                <dt className="text-xs text-gray-400 mb-1">{label}</dt>
                <dd className={`text-sm ${isPrimary ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{displayValue}</dd>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100/80 shadow-sm hover:shadow-md transition-shadow group">
            <div className={`mt-1 p-2 rounded-xl ${isPrimary ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'} transition-colors`}>
                {icon && <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
            </div>
            <div className="overflow-hidden">
                <dt className="text-xs font-medium text-gray-400 mb-0.5">{label}</dt>
                <dd className={`text-sm truncate ${isPrimary ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                    {displayValue}
                </dd>
            </div>
        </div>
    );
}