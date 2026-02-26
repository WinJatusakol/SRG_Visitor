"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import EditBookingModal from "./EditBookingModal";
import type { Visit } from "./visitTypes";
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
    Download,
    Coffee,
    Sun,
    Moon,
    CheckCircle2,
    XCircle,
    MapPin,
    UserCheck,
    PenLine
} from "lucide-react";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

const specialDietText = (value: unknown) => {
    const data = isRecord(value) && isRecord(value.foodPreferences) ? value.foodPreferences : value;
    if (!isRecord(data)) return "-";
    const sd = data.specialDiet;
    if (!isRecord(sd)) return "-";

    const halal = Number(sd.halalSets ?? 0);
    const vegan = Number(sd.veganSets ?? 0);
    if (halal <= 0 && vegan <= 0) return "-";

    const lines: string[] = [];
    if (halal > 0) lines.push(`• ฮาลาล ${halal} ชุด`);
    if (vegan > 0) lines.push(`• วีแกน ${vegan} ชุด`);
    return lines.join("\n");
};

const allergyText = (value: unknown) => {
    const data = isRecord(value) && isRecord(value.foodPreferences) ? value.foodPreferences : value;
    if (!isRecord(data)) return "-";
    const a = data.allergies;
    if (!isRecord(a)) return "-";

    const itemsRaw = a.items;
    const items = Array.isArray(itemsRaw)
        ? itemsRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0 && x !== "อื่นๆ")
        : [];
    const other = typeof a.other === "string" ? a.other.trim() : "";

    const parts: string[] = [];
    if (items.length > 0) parts.push(`• ${items.join(", ")}`);
    if (other) parts.push(`• อื่นๆ: ${other}`);
    return parts.length > 0 ? parts.join("\n") : "-";
};

const souvenirData = (value: unknown) => {
    if (!value) return null;
    const data = isRecord(value) && isRecord(value.souvenirPreferences) ? value.souvenirPreferences : value;
    if (!isRecord(data)) return null;

    const giftSet = typeof data.giftSet === "string" && data.giftSet && data.giftSet !== "-" ? data.giftSet : null;
    const count = Number.isFinite(Number(data.count)) ? Number(data.count) : 0;
    const extra = typeof data.extra === "string" && data.extra.trim() && data.extra !== "-" ? data.extra : null;

    if (!giftSet && count === 0 && !extra) return null;
    return { giftSet, count, extra };
};

const renderPresentationFiles = (value: unknown) => {
    let fileData: unknown = value;
    if (Array.isArray(value) && value.length > 0 && isRecord(value[0]) && "presentationFile" in value[0]) {
        fileData = (value[0] as Record<string, unknown>).presentationFile;
    } else if (isRecord(value) && "presentationFile" in value) {
        fileData = value.presentationFile;
    }

    if (!fileData || (Array.isArray(fileData) && fileData.length === 0)) {
        return <span className="text-sm font-bold text-gray-400">ไม่มีไฟล์แนบ</span>;
    }

    const filesArray = Array.isArray(fileData) ? fileData : [fileData];
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {filesArray.map((file, idx) => {
                if (!file) return null;
                const url =
                    typeof file === "string"
                        ? file
                        : isRecord(file)
                            ? String(file.url ?? file.publicUrl ?? file.path ?? "")
                            : "";
                const name =
                    isRecord(file) && (typeof file.name === "string" || typeof file.fileName === "string")
                        ? String(file.name ?? file.fileName)
                        : `ไฟล์เอกสาร ${idx + 1}`;
                if (!url) return null;

                return (
                    <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all w-full sm:w-auto"
                    >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="font-semibold line-clamp-1 break-all">{name}</span>
                        <Download className="w-3.5 h-3.5 ml-auto sm:ml-1 text-gray-400 shrink-0" />
                    </a>
                );
            })}
        </div>
    );
};

export function VisitDetailsModal({
    selectedVisit,
    onClose,
    timeZone,
    readOnly = false,
    updatingStatus = false,
    onEdit,
    onCancel,
    zVariant = "table",
}: {
    selectedVisit: Visit | null;
    onClose: () => void;
    timeZone: string;
    readOnly?: boolean;
    updatingStatus?: boolean;
    onEdit?: () => void;
    onCancel?: () => void;
    zVariant?: "table" | "history";
}) {
    const overlayZ = zVariant === "history" ? "z-[70]" : "z-50";
    const canManage = selectedVisit ? selectedVisit.status == null || selectedVisit.status === 1 : false;
    const statusMeta = (() => {
        const status = selectedVisit?.status;
        if (status === 0) return { text: "ยกเลิกแล้ว", className: "bg-red-50 text-red-700 border-red-200" };
        if (status === 2) return { text: "เสร็จสิ้นแล้ว", className: "bg-gray-50 text-gray-700 border-gray-200" };
        return { text: "ยังดำเนินการอยู่", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    })();
    if (!selectedVisit) return null;

    return (
        <>
        <div
            className={`fixed inset-0 ${overlayZ} flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300`}
            onMouseDown={(e) => {
                if (e.currentTarget === e.target) onClose();
            }}
        >
            <div className="bg-gray-50 w-full max-w-5xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                <div className="relative px-6 py-6 border-b border-gray-200/60 overflow-hidden bg-white shrink-0 sm:rounded-t-3xl rounded-t-3xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <CompanyAvatar name={selectedVisit.vipCompany} size="lg" />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                                    {selectedVisit.vipCompany || "ไม่ระบุบริษัท"}
                                </h2>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <p className="text-sm text-blue-600 font-semibold flex items-center gap-1.5">
                                        <CalendarClock className="w-4 h-4" />
                                        {selectedVisit.visitDateTime || selectedVisit.created_at
                                            ? new Intl.DateTimeFormat("th-TH", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                timeZone,
                                            }).format(new Date(selectedVisit.visitDateTime || selectedVisit.created_at || 0)) + " น."
                                            : "ไม่ระบุเวลาเข้าพบ"}
                                    </p>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                                        {statusMeta.text}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 -mr-2 bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors shadow-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                        <div className="bg-blue-50/50 px-5 sm:px-6 py-4 border-b border-blue-100 flex items-center gap-2">
                            <MessageSquareText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-base font-bold text-blue-900">ข้อมูลทั่วไปและการเข้าพบ</h3>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <InfoCard icon={<Phone className="w-4 h-4 text-blue-500" />} label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} />
                                <InfoCard icon={<Globe2 className="w-4 h-4 text-blue-500" />} label="สัญชาติ" value={selectedVisit.nationality} />
                                <InfoCard icon={<UserCircle2 className="w-4 h-4 text-blue-500" />} label="บุคคลที่ลูกค้าขอเข้าพบ (Host)" value={selectedVisit.hostName} />
                                <InfoCard icon={<UserCheck className="w-4 h-4 text-blue-500" />} label="ผู้ดูแล ต้อนรับแขก" value={(selectedVisit.executiveHost as unknown as { name?: string })?.name || "-"} />
                            </div>

                            {(selectedVisit.visitTopic || selectedVisit.visitDetail) && (
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100/80">
                                    {selectedVisit.visitTopic && (
                                        <div className="mb-4">
                                            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Briefcase className="w-3.5 h-3.5" /> หัวข้อการเข้าพบ
                                            </dt>
                                            <dd className="text-base font-bold text-gray-900">{selectedVisit.visitTopic}</dd>
                                        </div>
                                    )}
                                    {selectedVisit.visitDetail && (
                                        <div>
                                            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5" /> รายละเอียดเพิ่มเติม
                                            </dt>
                                            <dd className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selectedVisit.visitDetail}</dd>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden h-full flex flex-col">
                            <div className="bg-indigo-50/50 px-5 sm:px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <h3 className="text-base font-bold text-indigo-900">รายชื่อผู้เข้าร่วม</h3>
                                </div>
                                <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-md">{selectedVisit.guests?.length || 0} ท่าน</span>
                            </div>
                            <div className="p-5 sm:p-6 flex-1 bg-gray-50/30">
                                {selectedVisit.guests && selectedVisit.guests.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedVisit.guests.map((g: any, i: number) => (
                                            <div key={i} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-500 shrink-0">
                                                    <UserCircle2 className="w-5 h-5" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-sm text-gray-900 truncate">
                                                        {g.firstName || "-"} {g.middleName === "-" ? "" : g.middleName || ""}{" "}{g.lastName || ""}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate mt-0.5">
                                                        {g.position || "ไม่ระบุตำแหน่ง"} • {g.nationality || "ไม่ระบุสัญชาติ"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-sm text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">ไม่มีข้อมูลผู้เข้าร่วม</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden h-full flex flex-col">
                            <div className="bg-emerald-50/50 px-5 sm:px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                                <CarFront className="w-5 h-5 text-emerald-600" />
                                <h3 className="text-base font-bold text-emerald-900">ข้อมูลการเดินทาง</h3>
                            </div>
                            <div className="p-5 sm:p-6 flex-1 bg-gray-50/30">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${selectedVisit.transportType === "personal" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                        {selectedVisit.transportType === "personal" ? "🚗 เดินทางด้วยรถส่วนตัว" : "🚌 เดินทางด้วยรถสาธารณะ"}
                                    </div>
                                    {selectedVisit.transportType === "personal" && (
                                        <div className="text-sm font-semibold text-gray-600">จำนวน: {selectedVisit.cars?.length || 0} คัน</div>
                                    )}
                                </div>

                                {selectedVisit.transportType === "personal" && selectedVisit.cars && selectedVisit.cars.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedVisit.cars.map((c: any, i: number) => (
                                            <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
                                                <div className="text-xs text-gray-400 font-semibold mb-1 truncate">{c.brand || "ไม่ระบุแบรนด์"}</div>
                                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div> {c.license || "ไม่ระบุทะเบียน"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : selectedVisit.transportType === "personal" ? (
                                    <div className="text-center py-6 text-sm text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">ไม่มีการระบุข้อมูลรถยนต์</div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {selectedVisit.siteVisit ? (() => {
                        const siteV = selectedVisit.siteVisit as any;
                        if (!siteV.areas || siteV.areas.length === 0) return null;
                        return (
                            <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
                                <div className="bg-violet-50/50 px-5 sm:px-6 py-4 border-b border-violet-100 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-violet-600" />
                                    <h3 className="text-base font-bold text-violet-900">การเข้าชมพื้นที่ (Site Visit)</h3>
                                </div>
                                <div className="p-5 sm:p-6 bg-gray-50/30">
                                    <div className="mb-5">
                                        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">พื้นที่เข้าชม</span>
                                        <div className="flex flex-wrap gap-2">
                                            {siteV.areas.map((area: string, i: number) => (
                                                <span key={i} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold border border-violet-100">
                                                    {area}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                            <div className="overflow-hidden">
                                                <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ชื่อ)</dt>
                                                <dd className="text-sm font-bold text-gray-900 truncate">{siteV.approverName || "-"}</dd>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                            <div className="overflow-hidden">
                                                <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ตำแหน่ง)</dt>
                                                <dd className="text-sm font-bold text-gray-900 truncate">{siteV.approverPosition || "-"}</dd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : null}

                    <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
                        <div className="bg-cyan-50/50 px-5 sm:px-6 py-4 border-b border-cyan-100 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-cyan-600" />
                            <h3 className="text-base font-bold text-cyan-900">การอำนวยความสะดวก (Facilities & Extras)</h3>
                        </div>
                        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 bg-gray-50/30">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-cyan-500" /> ห้องประชุม</dt>
                                <dd className="text-sm font-bold text-gray-900">
                                    {selectedVisit.meetingRoomSelection ? (
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {selectedVisit.meetingRoomSelection}</span>
                                    ) : (
                                        <span className="text-gray-400 font-medium">ไม่ต้องการห้องประชุม</span>
                                    )}
                                </dd>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Gift className="w-4 h-4 text-pink-500" /> ของที่ระลึก</dt>
                                {(() => {
                                    const suv = souvenirData(selectedVisit.souvenirPreferences);
                                    if (suv) {
                                        return (
                                            <dd className="text-sm font-bold text-gray-900 space-y-1">
                                                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {suv.giftSet || "-"}</div>
                                                {suv.count > 0 && <div className="text-xs font-semibold text-gray-500">จำนวน {suv.count} ชุด</div>}
                                                {suv.extra && <div className="text-xs font-semibold text-gray-500">พิเศษ: {suv.extra}</div>}
                                            </dd>
                                        );
                                    }
                                    return <dd className="text-sm font-bold text-gray-400">ไม่รับของที่ระลึก</dd>;
                                })()}
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-blue-500" /> ไฟล์แนบ</dt>
                                <dd className="text-sm">{renderPresentationFiles(selectedVisit.presentationFiles)}</dd>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const foodValue = (selectedVisit.foodPreferences as any)?.foodPreferences ?? selectedVisit.foodPreferences;
                        const foodData = foodValue && typeof foodValue === "object" ? foodValue : null;
                        const meals = Array.isArray(foodData?.meals) ? foodData.meals : [];
                        const hasMeals = meals.length > 0;
                        const sdText = specialDietText(foodData);
                        const alText = allergyText(foodData);
                        const hasSpecialDiet = sdText !== "-";
                        const hasAllergies = alText !== "-";

                        if (!hasMeals && !hasSpecialDiet && !hasAllergies) return null;

                        const mealIcon = (meal: string) => {
                            if (meal === "เช้า") return <Coffee className="w-4 h-4 text-yellow-600" />;
                            if (meal === "กลางวัน") return <Sun className="w-4 h-4 text-orange-600" />;
                            if (meal === "เย็น") return <Moon className="w-4 h-4 text-indigo-600" />;
                            return <Utensils className="w-4 h-4 text-gray-600" />;
                        };

                        return (
                            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
                                <div className="bg-amber-50/50 px-5 sm:px-6 py-4 border-b border-amber-100 flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-amber-600" />
                                    <h3 className="text-base font-bold text-amber-900">อาหารและข้อจำกัด</h3>
                                </div>

                                <div className="p-5 sm:p-6 bg-gray-50/30">
                                    {hasMeals ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-2">
                                                {meals.map((m: string, i: number) => (
                                                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-amber-100 text-sm font-bold text-gray-800 shadow-sm">
                                                        {mealIcon(m)} {m}
                                                    </span>
                                                ))}
                                            </div>

                                            {foodData?.menus && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {foodData?.menus?.breakfast && (
                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-2 text-sm font-extrabold text-yellow-700 mb-3">
                                                                <Coffee className="w-4 h-4" /> เมนูเช้า
                                                            </div>
                                                            <div className="text-sm font-semibold text-gray-900 whitespace-pre-line">{foodData?.menus?.breakfast || "-"}</div>
                                                        </div>
                                                    )}
                                                    {foodData?.menus?.lunch && (
                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-2 text-sm font-extrabold text-orange-700 mb-3">
                                                                <Sun className="w-4 h-4" /> เมนูกลางวัน
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">อาหารคาว (Main)</span>
                                                                    <span className="font-semibold text-gray-900">{foodData?.menus?.lunch?.main || "-"}</span>
                                                                </div>
                                                                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">ของหวาน (Dessert)</span>
                                                                    <span className="font-semibold text-gray-900">{foodData?.menus?.lunch?.dessert || "-"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {foodData?.menus?.dinner && (
                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-700 mb-3">
                                                                <Moon className="w-4 h-4" /> เมนูเย็น
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">อาหารคาว (Main)</span>
                                                                    <span className="font-semibold text-gray-900">{foodData?.menus?.dinner?.main || "-"}</span>
                                                                </div>
                                                                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">ของหวาน (Dessert)</span>
                                                                    <span className="font-semibold text-gray-900">{foodData?.menus?.dinner?.dessert || "-"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(hasSpecialDiet || hasAllergies) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                    {hasSpecialDiet && (
                                                        <div className="p-4 bg-green-50/50 rounded-xl border border-green-200 shadow-sm">
                                                            <span className="block text-xs font-extrabold text-green-700 uppercase mb-3">อาหารพิเศษ (Special Diet)</span>
                                                            <div className="text-sm text-gray-800 font-semibold whitespace-pre-line leading-relaxed">
                                                                {sdText}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasAllergies && (
                                                        <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 shadow-sm">
                                                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-red-700 uppercase mb-3">
                                                                <AlertCircle className="w-4 h-4" /> ข้อมูลการแพ้อาหาร
                                                            </span>
                                                            <div className="text-sm text-red-900 font-semibold whitespace-pre-line leading-relaxed">
                                                                {alText}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {(hasSpecialDiet || hasAllergies) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {hasSpecialDiet && (
                                                        <div className="p-4 bg-green-50/50 rounded-xl border border-green-200 shadow-sm">
                                                            <span className="block text-xs font-extrabold text-green-700 uppercase mb-3">อาหารพิเศษ (Special Diet)</span>
                                                            <div className="text-sm text-gray-800 font-semibold whitespace-pre-line leading-relaxed">
                                                                {sdText}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasAllergies && (
                                                        <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 shadow-sm">
                                                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-red-700 uppercase mb-3">
                                                                <AlertCircle className="w-4 h-4" /> ข้อมูลการแพ้อาหาร
                                                            </span>
                                                            <div className="text-sm text-red-900 font-semibold whitespace-pre-line leading-relaxed">
                                                                {alText}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                </div>

                <div className="shrink-0 border-t border-gray-200/60 bg-white px-6 py-4 sm:rounded-b-3xl">
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                            <PenLine className="w-3.5 h-3.5" />
                            ผู้ยื่นคำร้อง: {(selectedVisit.submittedBy as any)?.name ? `${(selectedVisit.submittedBy as any).name} ${(selectedVisit.submittedBy as any).position ? `(${(selectedVisit.submittedBy as any).position})` : ""}` : "-"}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            {readOnly ? (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    ปิด
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onEdit?.()}
                                        disabled={updatingStatus || !canManage}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onCancel?.()}
                                        disabled={updatingStatus || !canManage}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors shadow-sm"
                                    >
                                        ยกเลิกการจอง
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

export default function VisitorTablePremium({ visits }: { visits: Visit[] }) {
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [resultPopup, setResultPopup] = useState<{ open: boolean; kind: "bookingCanceled" }>({
        open: false,
        kind: "bookingCanceled",
    });
    const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();
    const timeZone = "Asia/Bangkok";
    const [editVisit, setEditVisit] = useState<Visit | null>(null);
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterHost, setFilterHost] = useState("");
    const [filterCompany, setFilterCompany] = useState("");

    useEffect(() => {
        return () => {
            if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        };
    }, []);

    const finishResult = () => {
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
        setResultPopup((prev) => ({ ...prev, open: false }));
        setSelectedVisit(null);
        router.refresh();
    };

    const showResult = (kind: "bookingCanceled") => {
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
        setResultPopup({ open: true, kind });
        resultTimeoutRef.current = setTimeout(() => finishResult(), 1500);
    };

    const sortedVisits = useMemo(() => {
        if (!visits) return [];
        return [...visits].sort((a, b) => {
            const dateA = new Date(a.visitDateTime || a.created_at || 0).getTime();
            const dateB = new Date(b.visitDateTime || b.created_at || 0).getTime();
            return dateA - dateB;
        });
    }, [visits]);

    const hostOptions = useMemo(() => {
        const set = new Set<string>();
        for (const v of sortedVisits) {
            const name = typeof v.hostName === "string" ? v.hostName.trim() : "";
            if (name) set.add(name);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
    }, [sortedVisits]);

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

    const statusText = (status: unknown) => {
        const n = Number(status);
        if (n === 0) return "ยกเลิกแล้ว";
        if (n === 2) return "เสร็จสิ้นแล้ว";
        return "ยังดำเนินการอยู่";
    };

    const filteredVisits = useMemo(() => {
        const qCompany = filterCompany.trim().toLowerCase();
        return sortedVisits.filter((v) => {
            const dateKey = toThaiDateKey(v.visitDateTime || v.created_at || null);
            if (filterDateFrom && dateKey && dateKey < filterDateFrom) return false;
            if (filterDateTo && dateKey && dateKey > filterDateTo) return false;
            if (filterDateFrom || filterDateTo) {
                if (!dateKey) return false;
            }

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
    }, [filterCompany, filterDateFrom, filterDateTo, filterHost, sortedVisits]);

    const downloadCsv = (rows: Array<Record<string, string>>, filename: string) => {
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = [
            headers.map(esc).join(","),
            ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(",")),
        ];
        const bom = "\ufeff";
        const csv = bom + lines.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const exportFiltered = () => {
        const formatDateTime = (value: string | null | undefined) => {
            if (!value) return "";
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return "";
            return new Intl.DateTimeFormat("th-TH", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                timeZone,
            }).format(d);
        };
        const rows = filteredVisits.map((v) => {
            const dt = v.visitDateTime || v.created_at || "";
            return {
                id: String(v.id ?? ""),
                วันและเวลา: formatDateTime(dt),
                สถานะ: statusText(v.status),
                บริษัทลูกค้า: typeof v.clientCompany === "string" ? v.clientCompany : "",
                บริษัทแขกVIP: typeof v.vipCompany === "string" ? v.vipCompany : "",
                Host: typeof v.hostName === "string" ? v.hostName : "",
                หัวข้อ: typeof v.visitTopic === "string" ? v.visitTopic : "",
                จำนวนผู้เข้าร่วม: String((v.guests?.length ?? v.totalGuests ?? 0) || 0),
                เบอร์โทรศัพท์: typeof v.contactPhone === "string" ? v.contactPhone : "",
                สัญชาติ: typeof v.nationality === "string" ? v.nationality : "",
            };
        });
        const nameParts = [
            "visitor-export",
            filterDateFrom ? `from-${filterDateFrom}` : "",
            filterDateTo ? `to-${filterDateTo}` : "",
        ].filter(Boolean);
        downloadCsv(rows, `${nameParts.join("_")}.csv`);
    };

    const cancelBooking = async () => {
        if (!selectedVisit) return;
        if (selectedVisit.status !== 1 && selectedVisit.status != null) return;
        setCancelConfirmOpen(false);

        setUpdatingStatus(true);
        try {
            const response = await fetch("/api/admin/visitor-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedVisit.id, status: 0 }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result?.success === false) {
                throw new Error(result?.error ?? `Request failed: ${response.status}`);
            }
            showResult("bookingCanceled");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            window.alert(message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const openCancelConfirm = () => {
        if (!selectedVisit) return;
        if (selectedVisit.status !== 1 && selectedVisit.status != null) return;
        setCancelConfirmOpen(true);
    };

    const openEdit = () => {
        if (!selectedVisit) return;
        if (selectedVisit.status !== 1 && selectedVisit.status != null) return;
        setEditVisit(selectedVisit);
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
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white py-2 px-4 rounded-2xl shadow-sm border border-gray-100/50">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-600">
                            การจองทั้งหมด: <span className="text-gray-900 font-bold">{sortedVisits.length}</span> รายการ
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={exportFiltered}
                        className="inline-flex items-center gap-2 bg-white py-2 px-4 rounded-2xl shadow-sm border border-gray-100/50 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV/Excel
                    </button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-500">
                        ตัวกรองใช้วันที่ตามเวลาไทย (Asia/Bangkok)
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFilterDateFrom("");
                            setFilterDateTo("");
                            setFilterHost("");
                            setFilterCompany("");
                        }}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        ล้างตัวกรอง
                    </button>
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
                            {filteredVisits.map((visit, index) => {
                                const visitDate = new Date(visit.visitDateTime || visit.created_at || 0);
                                const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(visitDate);
                                const dayNum = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone }).format(visitDate);
                                const timeText = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone }).format(visitDate);
                                const weekdayText = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone }).format(visitDate);
                                return (
                                    <tr key={visit.id} onClick={() => setSelectedVisit(visit)} className="group transition-all duration-200 hover:bg-white hover:shadow-md hover:shadow-blue-100/50 hover:-translate-y-1 rounded-2xl cursor-pointer relative z-10">
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-12 h-12 bg-blue-50/80 text-blue-600 rounded-xl flex flex-col items-center justify-center shadow-sm border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase leading-none">{monthShort}</span>
                                                    <span className="text-lg font-extrabold leading-none mt-0.5">{dayNum}</span>
                                                </div>
                                                <div className="flex flex-col pt-1">
                                                    <span className="gap-x-1 flex text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors w-fit">
                                                        <CalendarClock className="w-4 h-4 text-blue-500" />
                                                        {timeText} น.
                                                    </span>
                                                    <div className="flex items-center text-xs font-medium text-gray-500 gap-1.5 mt-1 bg-gray-100/70 px-2 py-0.5 rounded-md w-fit">
                                                        {weekdayText}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <CompanyAvatar name={visit.vipCompany} idx={index} />
                                                <div className="flex flex-col">
                                                    <span className="text-[0.95rem] font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">{visit.vipCompany || "ไม่ระบุบริษัท"}</span>
                                                    <span className="text-sm text-gray-500 flex items-center gap-1.5 mt-1"><Briefcase className="w-3.5 h-3.5 text-gray-400" /><span className="line-clamp-1">{visit.visitTopic || "-"}</span></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-5 align-top text-sm">
                                            <div className="flex items-center gap-2 pt-2"><div className="p-1.5 bg-gray-100 text-gray-400 rounded-full"><UserCircle2 className="w-4 h-4" /></div><span className="font-medium text-gray-700">{visit.hostName || "-"}</span></div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-5 align-middle text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${(visit.guests?.length || 0) >= 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-100/50' : 'bg-gray-50 text-gray-500 border-gray-100/50'}`}><Users className="w-3.5 h-3.5" />{visit.guests?.length || 1} คน</span>
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

            {selectedVisit ? (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-gray-50 w-full max-w-5xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">

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
                                                ? new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(selectedVisit.visitDateTime || selectedVisit.created_at || 0)) + " น."
                                                : 'ไม่ระบุเวลาเข้าพบ'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedVisit(null)} className="p-2 -mr-2 bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors shadow-sm"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">

                            {/* Section 1: ข้อมูลทั่วไป */}
                            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                                <div className="bg-blue-50/50 px-5 sm:px-6 py-4 border-b border-blue-100 flex items-center gap-2">
                                    <MessageSquareText className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-base font-bold text-blue-900">ข้อมูลทั่วไปและการเข้าพบ</h3>
                                </div>
                                <div className="p-5 sm:p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                        <InfoCard icon={<Phone className="w-4 h-4 text-blue-500" />} label="เบอร์โทรศัพท์" value={selectedVisit.contactPhone} />
                                        <InfoCard icon={<Globe2 className="w-4 h-4 text-blue-500" />} label="สัญชาติ" value={selectedVisit.nationality} />
                                        <InfoCard icon={<UserCircle2 className="w-4 h-4 text-blue-500" />} label="บุคคลที่ลูกค้าขอเข้าพบ (Host)" value={selectedVisit.hostName} />
                                        
                                        {/* ข้อมูล Executive Host & Submitted By */}
                                        <InfoCard 
                                            icon={<UserCheck className="w-4 h-4 text-blue-500" />} 
                                            label="ผู้ดูแล ต้อนรับแขก" 
                                            value={(selectedVisit.executiveHost as any)?.name || "-"} 
                                        />
                                    </div>

                                    {(selectedVisit.visitTopic || selectedVisit.visitDetail) && (
                                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100/80">
                                            {selectedVisit.visitTopic && (
                                                <div className="mb-4">
                                                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> หัวข้อการเข้าพบ</dt>
                                                    <dd className="text-base font-bold text-gray-900">{selectedVisit.visitTopic}</dd>
                                                </div>
                                            )}
                                            {selectedVisit.visitDetail && (
                                                <div>
                                                    <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> รายละเอียดเพิ่มเติม</dt>
                                                    <dd className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{selectedVisit.visitDetail}</dd>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: ผู้เข้าร่วม & การเดินทาง */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* ผู้เข้าร่วม */}
                                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden h-full flex flex-col">
                                    <div className="bg-indigo-50/50 px-5 sm:px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-5 h-5 text-indigo-600" />
                                            <h3 className="text-base font-bold text-indigo-900">รายชื่อผู้เข้าร่วม</h3>
                                        </div>
                                        <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-md">{selectedVisit.guests?.length || 0} ท่าน</span>
                                    </div>
                                    <div className="p-5 sm:p-6 flex-1 bg-gray-50/30">
                                        {selectedVisit.guests && selectedVisit.guests.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {selectedVisit.guests.map((g: any, i) => (
                                                    <div key={i} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                                                        <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-500 shrink-0">
                                                            <UserCircle2 className="w-5 h-5" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold text-sm text-gray-900 truncate">
                                                                {g.firstName || "-"} {g.middleName === "-" ? "" : g.middleName || ""}{" "} {g.lastName || ""}
                                                            </div>
                                                            <div className="text-xs text-gray-500 truncate mt-0.5">
                                                                {g.position || "ไม่ระบุตำแหน่ง"} • {g.nationality || "ไม่ระบุสัญชาติ"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-sm text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">ไม่มีข้อมูลผู้เข้าร่วม</div>
                                        )}
                                    </div>
                                </div>

                                {/* การเดินทาง */}
                                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden h-full flex flex-col">
                                    <div className="bg-emerald-50/50 px-5 sm:px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                                        <CarFront className="w-5 h-5 text-emerald-600" />
                                        <h3 className="text-base font-bold text-emerald-900">ข้อมูลการเดินทาง</h3>
                                    </div>
                                    <div className="p-5 sm:p-6 flex-1 bg-gray-50/30">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${selectedVisit.transportType === "personal" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                {selectedVisit.transportType === "personal" ? "🚗 เดินทางด้วยรถส่วนตัว" : "🚌 เดินทางด้วยรถสาธารณะ"}
                                            </div>
                                            {selectedVisit.transportType === "personal" && (
                                                <div className="text-sm font-semibold text-gray-600">จำนวน: {selectedVisit.cars?.length || 0} คัน</div>
                                            )}
                                        </div>

                                        {selectedVisit.transportType === "personal" && selectedVisit.cars && selectedVisit.cars.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {selectedVisit.cars.map((c: any, i) => (
                                                    <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-emerald-200 transition-colors">
                                                        <div className="text-xs text-gray-400 font-semibold mb-1 truncate">{c.brand || "ไม่ระบุแบรนด์"}</div>
                                                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div> {c.license || "ไม่ระบุทะเบียน"}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : selectedVisit.transportType === "personal" ? (
                                            <div className="text-center py-6 text-sm text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">ไม่มีการระบุข้อมูลรถยนต์</div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Section: การเข้าชมพื้นที่ (Site Visit) */}
                            {selectedVisit.siteVisit ? (() => {
                                const siteV = selectedVisit.siteVisit as any;
                                if (!siteV.areas || siteV.areas.length === 0) return null;
                                return (
                                    <div className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
                                        <div className="bg-violet-50/50 px-5 sm:px-6 py-4 border-b border-violet-100 flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-violet-600" />
                                            <h3 className="text-base font-bold text-violet-900">การเข้าชมพื้นที่ (Site Visit)</h3>
                                        </div>
                                        <div className="p-5 sm:p-6 bg-gray-50/30">
                                            <div className="mb-5">
                                                <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">พื้นที่เข้าชม</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {siteV.areas.map((area: string, i: number) => (
                                                        <span key={i} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-sm font-semibold border border-violet-100">
                                                            {area}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                                    <div className="overflow-hidden">
                                                        <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ชื่อ)</dt>
                                                        <dd className="text-sm font-bold text-gray-900 truncate">{siteV.approverName || "-"}</dd>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                                    <div className="overflow-hidden">
                                                        <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ตำแหน่ง)</dt>
                                                        <dd className="text-sm font-bold text-gray-900 truncate">{siteV.approverPosition || "-"}</dd>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })() : null}

                            {/* Section 3: การอำนวยความสะดวก */}
                            <div className="bg-white rounded-2xl shadow-sm border border-cyan-100 overflow-hidden">
                                <div className="bg-cyan-50/50 px-5 sm:px-6 py-4 border-b border-cyan-100 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-cyan-600" />
                                    <h3 className="text-base font-bold text-cyan-900">การอำนวยความสะดวก (Facilities & Extras)</h3>
                                </div>
                                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 bg-gray-50/30">

                                    {/* ห้องประชุม */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-cyan-500" /> ห้องประชุม</dt>
                                        <dd className="text-sm font-bold text-gray-900">
                                            {selectedVisit.meetingRoomSelection ? (
                                                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> {selectedVisit.meetingRoomSelection}</span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">ไม่ต้องการห้องประชุม</span>
                                            )}
                                        </dd>
                                    </div>

                                    {/* ของที่ระลึก */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Gift className="w-4 h-4 text-pink-500" /> ของที่ระลึก</dt>
                                        {(() => {
                                            const suv = souvenirData(selectedVisit.souvenirPreferences);
                                            if (suv) {
                                                return (
                                                    <div className="space-y-1.5 text-sm">
                                                        {suv.giftSet && <p className="font-bold text-gray-900 truncate">{suv.giftSet}</p>}
                                                        <p className="text-gray-600 font-medium">จำนวน: <span className="text-pink-600 font-bold">{suv.count} ชุด</span></p>
                                                        {suv.extra && <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-1.5 rounded border border-gray-100 leading-relaxed">{suv.extra}</p>}
                                                    </div>
                                                )
                                            }
                                            return <span className="text-sm text-gray-400 font-medium">ไม่ต้องการของที่ระลึก</span>;
                                        })()}
                                    </div>

                                    {/* ไฟล์นำเสนอ */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-purple-500" /> ไฟล์นำเสนอ</dt>
                                        <dd>{renderPresentationFiles(selectedVisit.presentationFiles)}</dd>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: การรับรองและจัดเลี้ยงอาหาร */}
                            {selectedVisit.foodPreferences ? (() => {
                                const foodData = (selectedVisit.foodPreferences as any)?.foodPreferences || selectedVisit.foodPreferences;
                                // เช็คว่ามีข้อมูลมื้อไหนบ้างเพื่อซ่อน/แสดง
                                const hasBreakfast = foodData?.meals?.includes('เช้า') || (foodData?.menus?.breakfast && foodData.menus.breakfast.trim() !== "");
                                const hasLunch = foodData?.meals?.includes('กลางวัน') || (foodData?.menus?.lunch?.main && foodData.menus.lunch.main.trim() !== "");
                                const hasDinner = foodData?.meals?.includes('เย็น') || (foodData?.menus?.dinner?.main && foodData.menus.dinner.main.trim() !== "");

                                // เช็คว่ามีข้อมูลแพ้อาหารหรืออาหารพิเศษไหม
                                const sdText = specialDietText(foodData);
                                const hasSpecialDiet = sdText !== "-";
                                const alText = allergyText(foodData);
                                const hasAllergies = alText !== "-";

                                return (
                                    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                                        <div className="bg-orange-50/50 px-5 sm:px-6 py-4 border-b border-orange-100 flex items-center gap-2">
                                            <Utensils className="w-5 h-5 text-orange-600" />
                                            <h3 className="text-base font-bold text-orange-900">การรับรองและจัดเลี้ยงอาหาร</h3>
                                        </div>
                                        <div className="p-5 sm:p-6 flex flex-col gap-5 bg-gray-50/30">
                                            {/* แถวบน: รายการมื้ออาหารหลัก (เต็มความกว้าง) - แสดงเฉพาะมื้อที่มี */}
                                            {(hasBreakfast || hasLunch || hasDinner) ? (
                                                <div className="w-full">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                                        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-600 uppercase">
                                                            <Info className="w-4 h-4 text-gray-400" /> รายการมื้ออาหารที่รับ
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row gap-4">
                                                        {hasBreakfast && (
                                                            <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-orange-200 transition-all">
                                                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                                                    <div className="flex items-center gap-2 text-orange-600 font-bold"><Coffee className="w-4 h-4" /> มื้อเช้า</div>
                                                                </div>
                                                                <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">อาหารคาว (Main)</span>
                                                                    <span className="font-semibold text-gray-900">{foodData?.menus?.breakfast || "จัดเตรียมมื้อเช้าตามความเหมาะสม"}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        {hasLunch && (
                                                            <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-orange-200 transition-all">
                                                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                                                    <div className="flex items-center gap-2 text-orange-600 font-bold"><Sun className="w-4 h-4" /> มื้อกลางวัน</div>
                                                                </div>
                                                                <div className="space-y-3 text-sm text-gray-700">
                                                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">อาหารคาว (Main)</span>
                                                                        <span className="font-semibold text-gray-900">{foodData?.menus?.lunch?.main || "-"}</span>
                                                                    </div>
                                                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">ของหวาน (Dessert)</span>
                                                                        <span className="font-semibold text-gray-900">{foodData?.menus?.lunch?.dessert || "-"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {hasDinner && (
                                                            <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-orange-200 transition-all">
                                                                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                                                    <div className="flex items-center gap-2 text-orange-600 font-bold"><Moon className="w-4 h-4" /> มื้อเย็น</div>
                                                                </div>
                                                                <div className="space-y-3 text-sm text-gray-700">
                                                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">อาหารคาว (Main)</span>
                                                                        <span className="font-semibold text-gray-900">{foodData?.menus?.dinner?.main || "-"}</span>
                                                                    </div>
                                                                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                                        <span className="block text-xs font-bold text-gray-400 uppercase mb-0.5">ของหวาน (Dessert)</span>
                                                                        <span className="font-semibold text-gray-900">{foodData?.menus?.dinner?.dessert || "-"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-400 font-medium italic py-4 text-center border-2 border-dashed border-gray-100 rounded-xl bg-white">
                                                    ไม่ได้ระบุมื้ออาหารหลัก
                                                </div>
                                            )}
                                            {/* แถวล่าง: อาหารพิเศษ และ แพ้อาหาร (ซ่อนถ้าไม่มีข้อมูลทั้งคู่) */}
                                            {(hasSpecialDiet || hasAllergies) && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                    {/* อาหารพิเศษ (ซ่อนถ้าไม่มี) */}
                                                    {hasSpecialDiet && (
                                                        <div className="p-4 bg-green-50/50 rounded-xl border border-green-200 shadow-sm">
                                                            <span className="block text-xs font-extrabold text-green-700 uppercase mb-3">อาหารพิเศษ (Special Diet)</span>
                                                            <div className="text-sm text-gray-800 font-semibold whitespace-pre-line leading-relaxed">
                                                                {sdText}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* แพ้อาหาร (ซ่อนถ้าไม่มี) */}
                                                    {hasAllergies && (
                                                        <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 shadow-sm">
                                                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-red-700 uppercase mb-3">
                                                                <AlertCircle className="w-4 h-4" /> ข้อมูลการแพ้อาหาร
                                                            </span>
                                                            <div className="text-sm text-red-900 font-semibold whitespace-pre-line leading-relaxed">
                                                                {alText}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : null}
                        </div>

                        <div className="shrink-0 border-t border-gray-200/60 bg-white px-6 py-4 sm:rounded-b-3xl">
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                                {/* ✨ ส่วนที่เพิ่มใหม่: โชว์ชื่อผู้กรอกเล็กๆ จางๆ ฝั่งซ้าย */}
                                <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                    <PenLine className="w-3.5 h-3.5" />
                                    ผู้ยื่นคำร้อง: {(selectedVisit.submittedBy as any)?.name ? `${(selectedVisit.submittedBy as any).name} ${(selectedVisit.submittedBy as any).position ? `(${(selectedVisit.submittedBy as any).position})` : ''}` : "-"}
                                </div>
                                
                                {/* ฝั่งขวา: ปุ่ม Action */}
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={openEdit}
                                        disabled={updatingStatus || (selectedVisit.status != null && selectedVisit.status !== 1)}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openCancelConfirm}
                                        disabled={updatingStatus || (selectedVisit.status != null && selectedVisit.status !== 1)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors shadow-sm"
                                    >
                                        ยกเลิกการจอง
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            ) : null}

            {selectedVisit && cancelConfirmOpen && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onMouseDown={(e) => {
                        if (e.currentTarget === e.target && !updatingStatus) setCancelConfirmOpen(false);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
                        <div className="px-6 py-5">
                            <div className="text-lg font-bold text-gray-900">Cancel booking?</div>
                            <div className="mt-2 text-sm text-gray-600">
                                ระบบจะเปลี่ยนสถานะเป็น “ยกเลิกแล้ว” และรายการจะหายจากหน้า Dashboard
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setCancelConfirmOpen(false)}
                                disabled={updatingStatus}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={cancelBooking}
                                disabled={updatingStatus}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                                {updatingStatus ? "Cancelling..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resultPopup.open && (
                <div
                    className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onMouseDown={(e) => {
                        if (e.currentTarget === e.target) finishResult();
                    }}
                >
                    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-700 border border-red-200">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-base font-bold text-gray-900">ยกเลิกการจองสำเร็จ</div>
                                <div className="mt-1 text-sm text-gray-600">เปลี่ยนสถานะเป็นยกเลิกแล้ว</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <EditBookingModal
                visit={editVisit}
                onClose={() => setEditVisit(null)}
                onSaved={() => {
                    setEditVisit(null);
                    setSelectedVisit(null);
                    router.refresh();
                }}
            />
        </div>
    );
}

// Component ย่อยสำหรับข้อมูลทั่วไป
function InfoCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    const displayValue = value === null || value === undefined || value === "" ? "-" : value;
    return (
        <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="bg-gray-50 p-2 rounded-lg shrink-0">
                {icon}
            </div>
            <div className="overflow-hidden">
                <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
                <dd className="text-sm font-bold text-gray-900 truncate">
                    {displayValue}
                </dd>
            </div>
        </div>
    );
}

// Component โลโก้บริษัท
function CompanyAvatar({ name, size = "md", idx = 0 }: { name?: string | null; size?: "md" | "lg"; idx?: number }) {
    const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : <Building2 className={size === "lg" ? "w-6 h-6" : "w-4 h-4"} />;

    const colorPalettes = [
        'from-blue-500 to-indigo-600 shadow-blue-200/50',
        'from-purple-500 to-pink-600 shadow-purple-200/50',
        'from-emerald-400 to-teal-600 shadow-emerald-200/50',
        'from-orange-400 to-red-500 shadow-orange-200/50',
    ];
    const colorClass = colorPalettes[(idx || (name?.length || 0)) % colorPalettes.length];
    const sizeClass = size === "lg" ? "w-16 h-16 text-2xl rounded-2xl" : "w-10 h-10 text-sm rounded-xl";

    return (
        <div className={`shrink-0 ${sizeClass} text-white flex items-center justify-center font-extrabold bg-linear-to-br shadow-lg ${colorClass}`}>
            {initial}
        </div>
    );
}
