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
    Tag,
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

// ปรับให้คืนค่า null ถ้าไม่มีไฟล์ เพื่อให้เอาไปใช้เป็นเงื่อนไขซ่อน/โชว์ได้
const renderFileList = (value: unknown) => {
    let fileData: unknown = value;
    if (Array.isArray(value) && value.length > 0 && isRecord(value[0]) && "registrationFile" in value[0]) {
        fileData = (value[0] as Record<string, unknown>).registrationFile;
    } else if (isRecord(value) && "registrationFile" in value) {
        fileData = (value as Record<string, unknown>).registrationFile;
    }

    if (!fileData || (Array.isArray(fileData) && fileData.length === 0)) {
        return null;
    }

    const filesArray = Array.isArray(fileData) ? fileData : [fileData];
    return (
        <div className="flex flex-wrap gap-2">
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
                        ? String(file.name ?? file.fileName ?? file.originalName)
                        : `ไฟล์เอกสาร ${idx + 1}`;
                if (!url) return null;

                return (
                    <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2CCA8] shadow-sm rounded-lg text-xs font-semibold text-[#788B64] hover:bg-[#FAEFCC] transition-all w-full sm:w-auto"
                    >
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="line-clamp-1 break-all">{name}</span>
                        <Download className="w-3.5 h-3.5 ml-auto sm:ml-1 text-[#788B64]/60 shrink-0" />
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
        if (status === 2) return { text: "เสร็จสิ้นแล้ว", className: "bg-zinc-100 text-zinc-700 border-zinc-200" };
        return { text: "ยังดำเนินการอยู่", className: "bg-[#788B64]/15 text-[#1b2a18] border-[#788B64]/30" };
    })();
    if (!selectedVisit) return null;

    const regFilesContent = renderFileList(selectedVisit.registrationFiles);

    return (
        <div
            className={`fixed inset-0 ${overlayZ} flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300`}
            onMouseDown={(e) => {
                if (e.currentTarget === e.target) onClose();
            }}
        >
            <div className="bg-[#fcfaf5] w-full max-w-5xl max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 border border-[#E2CCA8]/60">
                <div className="relative px-6 py-6 border-b border-[#E2CCA8]/60 overflow-hidden bg-white shrink-0 sm:rounded-t-3xl rounded-t-3xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FAEFCC] rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <CompanyAvatar name={selectedVisit.clientCompany} size="lg" />
                            <div>
                                <h2 className="text-2xl font-bold text-[#1b2a18] leading-tight">
                                    {selectedVisit.clientCompany || "ไม่ระบุบริษัท"}
                                </h2>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <p className="text-sm text-[#788B64] font-semibold flex items-center gap-1.5">
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
                            className="p-2 -mr-2 bg-[#FAEFCC]/50 text-[#788B64] hover:text-[#1b2a18] hover:bg-[#E2CCA8]/50 rounded-full transition-colors shadow-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
                    <div data-audit-section="overview" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden">
                        <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center gap-2">
                            <MessageSquareText className="w-5 h-5 text-[#788B64]" />
                            <h3 className="text-base font-bold text-[#1b2a18]">ข้อมูลผู้เข้าเยี่ยมชม</h3>
                        </div>
                        <div className="p-5 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                <InfoCard icon={<Globe2 className="w-4 h-4 text-[#788B64]" />} label="ประเทศ" value={selectedVisit.country} />
                                <InfoCard icon={<MapPin className="w-4 h-4 text-[#788B64]" />} label="ที่อยู่บริษัท" value={selectedVisit.companyAddress} />
                                <InfoCard icon={<Tag className="w-4 h-4 text-[#788B64]" />} label="ประเภทผู้เข้าเยี่ยมชม" value={(() => {
                                    const type = selectedVisit.visitorType;
                                    const other = selectedVisit.visitorTypeOther;
                                    if (type && other && type === "อื่นๆ") return `${type} - ${other}`;
                                    return type;
                                })()} />
                            </div>

                            {selectedVisit.purposeOfVisit && (
                                <div className="bg-zinc-50/80 rounded-xl p-5 border border-[#E2CCA8]/60">
                                    <div>
                                        <dt className="text-xs font-semibold text-[#788B64] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Briefcase className="w-3.5 h-3.5" /> วัตถุประสงค์ในการเข้าพบ
                                        </dt>
                                        <dd className="text-base font-bold text-[#1b2a18]">{selectedVisit.purposeOfVisit}</dd>
                                    </div>
                                </div>
                            )}
                            {selectedVisit.welcomeMessage && (
                                <div className="bg-zinc-50/80 rounded-xl p-5 border border-[#E2CCA8]/60 mt-4">
                                    <div>
                                        <dt className="text-xs font-semibold text-[#788B64] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <MessageSquareText className="w-3.5 h-3.5" /> ข้อความ Welcome board
                                        </dt>
                                        <dd className="text-base font-bold text-[#1b2a18]">{selectedVisit.welcomeMessage}</dd>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Guests (ลูกค้า) */}
                        <div data-audit-section="guests" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden flex flex-col">
                            <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#788B64]" />
                                    <h3 className="text-base font-bold text-[#1b2a18]">รายชื่อผู้เข้าเยี่ยมชม (ลูกค้า)</h3>
                                    <span className="text-xs font-bold text-[#788B64] bg-[#788B64]/10 px-2.5 py-1 rounded-md border border-[#788B64]/20">{selectedVisit.guests?.length || 0} ท่าน</span>
                                </div>
                                {/* แสดงไฟล์ PDF แนบรายชื่อตรงนี้ ถ้ามี */}
                                {regFilesContent !== null && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-zinc-500">ไฟล์แนบรายชื่อ:</span>
                                        {regFilesContent}
                                    </div>
                                )}
                            </div>
                            <div className="p-5 sm:p-6 flex-1 bg-white/50">
                                {selectedVisit.guests && selectedVisit.guests.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedVisit.guests.map((g: any, i: number) => (
                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-[#E2CCA8]/50 rounded-xl shadow-sm hover:border-[#788B64]/40 transition-colors">
                                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                    <div className="bg-[#FAEFCC]/80 p-2.5 rounded-full text-[#788B64] shrink-0">
                                                        <UserCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-[0.95rem] text-[#1b2a18] truncate">
                                                            {[g.prefix, g.firstName, g.middleName === "-" ? "" : g.middleName, g.lastName].filter(Boolean).join(" ") || "-"}
                                                        </div>
                                                        <div className="text-sm font-medium text-zinc-500 truncate mt-0.5">
                                                            {g.position || "ไม่ระบุตำแหน่ง"}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Badges พื้นที่อาหาร */}
                                                <div className="flex flex-wrap items-center gap-2 sm:justify-end mt-2 sm:mt-0 pl-14 sm:pl-0">
                                                    {g.halal && <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">ฮาลาล</span>}
                                                    {g.vegan && <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-md border border-green-200">มังสวิรัติ</span>}
                                                    {g.allergies?.length > 0 && (
                                                        <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-md border border-red-200">
                                                            แพ้อาหาร: {[...g.allergies.filter((x: string) => x && x !== "อื่นๆ"), g.allergyOther].filter(Boolean).join(", ")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-sm text-zinc-400 font-medium border-2 border-dashed border-[#E2CCA8]/60 rounded-xl">ไม่มีข้อมูลผู้เข้าร่วม</div>
                                )}
                            </div>
                        </div>

                        {/* Internal Attendees (EPAC) */}
                        <div data-audit-section="internal-attendees" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden flex flex-col">
                            <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#788B64]" />
                                    <h3 className="text-base font-bold text-[#1b2a18]">ผู้เข้าร่วมภายใน EPAC</h3>
                                </div>
                                <span className="text-xs font-bold text-[#788B64] bg-[#788B64]/10 px-2.5 py-1 rounded-md border border-[#788B64]/20">{selectedVisit.internalAttendees?.length || 0} ท่าน</span>
                            </div>
                            <div className="p-5 sm:p-6 flex-1 bg-white/50">
                                {selectedVisit.internalAttendees && selectedVisit.internalAttendees.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {selectedVisit.internalAttendees.map((g: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-3.5 bg-white border border-[#E2CCA8]/50 rounded-xl shadow-sm hover:border-[#788B64]/40 transition-colors">
                                                <div className="bg-[#FAEFCC]/80 p-2 rounded-full text-[#788B64] shrink-0">
                                                    <UserCircle2 className="w-4 h-4" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-sm text-[#1b2a18] truncate">
                                                        {[g.firstName, g.lastName].filter(Boolean).join(" ") || "-"}
                                                    </div>
                                                    <div className="text-xs font-medium text-zinc-500 truncate mt-0.5">
                                                        {g.position || "ไม่ระบุตำแหน่ง"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-sm text-zinc-400 font-medium border-2 border-dashed border-[#E2CCA8]/60 rounded-xl">ไม่มีข้อมูลผู้เข้าร่วมภายใน</div>
                                )}
                            </div>
                        </div>

                        {/* Transport */}
                        <div data-audit-section="transport" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden flex flex-col">
                            <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center gap-2">
                                <CarFront className="w-5 h-5 text-[#788B64]" />
                                <h3 className="text-base font-bold text-[#1b2a18]">ข้อมูลการเดินทาง</h3>
                            </div>
                            <div className="p-5 sm:p-6 flex-1 bg-white/50">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                                        selectedVisit.transportType === "personal"
                                          ? "bg-[#788B64]/15 text-[#1b2a18] border-[#788B64]/30"
                                          : selectedVisit.transportType === "shuttle"
                                            ? "bg-[#E2CCA8]/40 text-[#1b2a18] border-[#E2CCA8]"
                                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                      }`}>
                                        {selectedVisit.transportType === "personal"
                                          ? "🚗 เดินทางด้วยรถส่วนตัว"
                                          : selectedVisit.transportType === "shuttle"
                                            ? "🚌 รถรับ-ส่ง"
                                            : "-"}
                                    </div>
                                    {selectedVisit.transportType === "personal" && (
                                        <div className="text-sm font-semibold text-zinc-600">จำนวน: {selectedVisit.cars?.length || 0} คัน</div>
                                    )}
                                </div>

                                {selectedVisit.transportType === "personal" && selectedVisit.cars && selectedVisit.cars.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedVisit.cars.map((c: any, i: number) => (
                                            <div key={i} className="p-3 bg-white border border-[#E2CCA8]/50 rounded-xl shadow-sm hover:border-[#788B64]/40 transition-colors">
                                                <div className="text-xs text-zinc-500 font-semibold mb-1 truncate">{c.brand || "ไม่ระบุแบรนด์"}</div>
                                                <div className="font-bold text-sm text-[#1b2a18] flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[#788B64]"></div> {c.license || "ไม่ระบุทะเบียน"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : selectedVisit.transportType === "personal" ? (
                                    <div className="text-center py-6 text-sm text-zinc-400 font-medium border-2 border-dashed border-[#E2CCA8]/60 rounded-xl">ไม่มีการระบุข้อมูลรถยนต์</div>
                                ) : null}
                                {selectedVisit.transportType === "shuttle" && Array.isArray((selectedVisit as any).shuttleSchedules) && (
                                    <div className="mt-4">
                                        {(selectedVisit as any).shuttleSchedules.length > 0 ? (
                                            <div className="overflow-x-auto rounded-xl border border-[#E2CCA8]/60 bg-white shadow-sm">
                                                <table className="min-w-full text-sm text-left">
                                                    <thead className="bg-[#FAEFCC]/40 border-b border-[#E2CCA8]/60">
                                                        <tr>
                                                            <th className="px-4 py-3 font-bold text-[#788B64] whitespace-nowrap w-[40%]">วันและเวลา</th>
                                                            <th className="px-4 py-3 font-bold text-[#788B64] whitespace-nowrap w-[30%]">จุดรับ</th>
                                                            <th className="px-4 py-3 font-bold text-[#788B64] whitespace-nowrap w-[30%]">จุดส่ง (จุดหมาย)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#E2CCA8]/30">
                                                        {[...(selectedVisit as any).shuttleSchedules]
                                                            .sort((a: any, b: any) => {
                                                                const timeA = new Date(`${a.date || "1970-01-01"}T${a.time || "00:00"}`).getTime();
                                                                const timeB = new Date(`${b.date || "1970-01-01"}T${b.time || "00:00"}`).getTime();
                                                                return timeA - timeB;
                                                            })
                                                            .map((s: any, i: number) => {
                                                                let displayDate = s.date || "-";
                                                                if (s.date) {
                                                                    try {
                                                                        displayDate = new Intl.DateTimeFormat("th-TH", {
                                                                            year: "numeric",
                                                                            month: "short",
                                                                            day: "numeric"
                                                                        }).format(new Date(s.date));
                                                                    } catch (e) { }
                                                                }

                                                                return (
                                                                    <tr key={i} className="hover:bg-[#FAEFCC]/20 transition-colors">
                                                                        <td className="px-4 py-3 font-semibold text-[#1b2a18]">
                                                                            <div className="flex items-center gap-2">
                                                                                <CalendarClock className="w-4 h-4 text-[#788B64]" />
                                                                                {displayDate} <br></br> {s.time ? `${s.time} น.` : "-"}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 font-medium text-zinc-700">
                                                                            {s.pickup || "-"}
                                                                        </td>
                                                                        <td className="px-4 py-3 font-medium text-zinc-700">
                                                                            {s.destination || "-"}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-sm text-zinc-400 font-medium border-2 border-dashed border-[#E2CCA8]/60 rounded-xl">ไม่มีการระบุข้อมูลรถรับ-ส่ง</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Site Visit */}
                    {selectedVisit.siteVisit ? (() => {
                        const siteV = selectedVisit.siteVisit as any;
                        if (!siteV.areas || siteV.areas.length === 0) return null;
                        return (
                            <div data-audit-section="site-visit" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden">
                                <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-[#788B64]" />
                                    <h3 className="text-base font-bold text-[#1b2a18]">การเข้าชมพื้นที่ (Site Visit)</h3>
                                </div>
                                <div className="p-5 sm:p-6 bg-white/50">
                                    <div className="mb-5">
                                        <span className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">พื้นที่เข้าชม</span>
                                        <div className="flex flex-wrap gap-2">
                                            {siteV.areas.map((area: string, i: number) => (
                                                <span key={i} className="px-3 py-1.5 bg-[#FAEFCC] text-[#1b2a18] rounded-lg text-sm font-semibold border border-[#E2CCA8]/50">
                                                    {area}
                                                </span>
                                            ))}
                                        </div>
                                        {Array.isArray(siteV.affiliateCompanies) && siteV.affiliateCompanies.length > 0 && (
                                            <div className="mt-3 text-sm font-semibold text-[#788B64]">
                                                บริษัทในเครือ: {siteV.affiliateCompanies.join(", ")}
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white p-3.5 rounded-xl border border-[#E2CCA8]/60 shadow-sm flex items-center gap-3">
                                            <div className="overflow-hidden">
                                                <dt className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ชื่อ)</dt>
                                                <dd className="text-sm font-bold text-[#1b2a18] truncate">{siteV.approverName || "-"}</dd>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3.5 rounded-xl border border-[#E2CCA8]/60 shadow-sm flex items-center gap-3">
                                            <div className="overflow-hidden">
                                                <dt className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">ผู้อนุญาต (ตำแหน่ง)</dt>
                                                <dd className="text-sm font-bold text-[#1b2a18] truncate">{siteV.approverPosition || "-"}</dd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : null}

                    {/* Facilities & Extras */}
                    <div data-audit-section="facilities" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden">
                        <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[#788B64]" />
                            <h3 className="text-base font-bold text-[#1b2a18]">การอำนวยความสะดวก (Facilities & Extras)</h3>
                        </div>
                        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-white/50">
                            <div className="bg-white p-4 rounded-xl border border-[#E2CCA8]/60 shadow-sm">
                                <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-[#788B64]" /> ห้องประชุม</dt>
                                <dd className="text-sm font-bold text-[#1b2a18]">
                                    {selectedVisit.meetingRoomSelection ? (
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#788B64]" /> {selectedVisit.meetingRoomSelection}</span>
                                    ) : (
                                        <span className="text-zinc-400 font-medium">ไม่ต้องการห้องประชุม</span>
                                    )}
                                </dd>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-[#E2CCA8]/60 shadow-sm">
                                <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Gift className="w-4 h-4 text-[#788B64]" /> ของที่ระลึก</dt>
                                {(() => {
                                    const suv = souvenirData(selectedVisit.souvenirPreferences);
                                    if (suv) {
                                        return (
                                            <dd className="text-sm font-bold text-[#1b2a18] space-y-1">
                                                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#788B64]" /> {suv.giftSet || "-"}</div>
                                                {suv.count > 0 && <div className="text-xs font-semibold text-zinc-500">จำนวน {suv.count} ชุด</div>}
                                                {suv.extra && <div className="text-xs font-semibold text-zinc-500">พิเศษ: {suv.extra}</div>}
                                            </dd>
                                        );
                                    }
                                    return <dd className="text-sm font-bold text-zinc-400">ไม่รับของที่ระลึก</dd>;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Food */}
                    {(() => {
                        const foodValue = (selectedVisit.foodPreferences as any)?.foodPreferences ?? selectedVisit.foodPreferences;
                        const foodData = foodValue && typeof foodValue === "object" ? foodValue : null;
                        const meals = Array.isArray(foodData?.meals) ? foodData.meals : [];
                        const hasMeals = meals.length > 0;

                        // ถ้าไม่มีการเลือกรับอาหารมื้อไหนเลย ไม่ต้องแสดงกล่องนี้
                        if (!hasMeals) return null;

                        const hasBreakfast = meals.includes("เช้า");
                        const hasLunch = meals.includes("กลางวัน");
                        const hasDinner = meals.includes("เย็น");
                        const hasMorningSnack = meals.includes("อาหารว่างเช้า");
                        const hasAfternoonSnack = meals.includes("อาหารว่างบ่าย");

                        return (
                            <div data-audit-section="food" className="bg-white rounded-2xl shadow-sm border border-[#E2CCA8]/60 overflow-hidden flex flex-col">
                                <div className="bg-[#FAEFCC]/40 px-5 sm:px-6 py-4 border-b border-[#E2CCA8]/60 flex items-center gap-2">
                                    <Utensils className="w-5 h-5 text-[#788B64]" />
                                    <h3 className="text-base font-bold text-[#1b2a18]">ข้อมูลมื้ออาหารและเบรค</h3>
                                </div>

                                <div className="p-5 sm:p-6 bg-white/50 flex-1">
                                    <div className="space-y-4">
                                        {/* จัดเรียงการ์ดเฉพาะมื้อหลัก */}
                                        {(hasBreakfast || hasLunch || hasDinner) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                
                                                {/* มื้อเช้า */}
                                                {hasBreakfast && (
                                                    <div className="bg-white p-4 rounded-xl border border-[#E2CCA8]/50 shadow-sm flex flex-col">
                                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#788B64] mb-3 pb-2 border-b border-[#E2CCA8]/30">
                                                            <Coffee className="w-4 h-4" /> เมนูเช้า
                                                        </div>
                                                        <div className="flex flex-col gap-1 flex-1 justify-center">
                                                            <span className="block text-xs font-bold text-zinc-400 uppercase">อาหารคาว (Main)</span>
                                                            <span className="font-semibold text-[#1b2a18] whitespace-pre-line">
                                                                {foodData?.menus?.breakfastOther
                                                                    ? `${foodData?.menus?.breakfast} - ${foodData?.menus?.breakfastOther}`
                                                                    : (foodData?.menus?.breakfast || "-")}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* มื้อกลางวัน */}
                                                {hasLunch && (
                                                    <div className="bg-white p-4 rounded-xl border border-[#E2CCA8]/50 shadow-sm flex flex-col">
                                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#788B64] mb-3 pb-2 border-b border-[#E2CCA8]/30">
                                                            <Sun className="w-4 h-4" /> เมนูกลางวัน
                                                        </div>
                                                        <div className="flex flex-col gap-3 flex-1 justify-center">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="block text-xs font-bold text-zinc-400 uppercase">อาหารคาว (Main)</span>
                                                                <span className="font-semibold text-[#1b2a18]">
                                                                    {foodData?.menus?.lunch?.otherMain
                                                                        ? `${foodData?.menus?.lunch?.main} - ${foodData?.menus?.lunch?.otherMain}`
                                                                        : (foodData?.menus?.lunch?.main || "-")}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="block text-xs font-bold text-zinc-400 uppercase">ของหวาน (Dessert)</span>
                                                                <span className="font-semibold text-[#1b2a18]">
                                                                    {foodData?.menus?.lunch?.otherDessert
                                                                        ? `${foodData?.menus?.lunch?.dessert} - ${foodData?.menus?.lunch?.otherDessert}`
                                                                        : (foodData?.menus?.lunch?.dessert || "-")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* มื้อเย็น */}
                                                {hasDinner && (
                                                    <div className="bg-white p-4 rounded-xl border border-[#E2CCA8]/50 shadow-sm flex flex-col">
                                                        <div className="flex items-center gap-2 text-sm font-extrabold text-[#788B64] mb-3 pb-2 border-b border-[#E2CCA8]/30">
                                                            <Moon className="w-4 h-4" /> เมนูเย็น
                                                        </div>
                                                        <div className="flex flex-col gap-3 flex-1 justify-center">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="block text-xs font-bold text-zinc-400 uppercase">อาหารคาว (Main)</span>
                                                                <span className="font-semibold text-[#1b2a18]">
                                                                    {foodData?.menus?.dinner?.otherMain
                                                                        ? `${foodData?.menus?.dinner?.main} - ${foodData?.menus?.dinner?.otherMain}`
                                                                        : (foodData?.menus?.dinner?.main || "-")}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="block text-xs font-bold text-zinc-400 uppercase">ของหวาน (Dessert)</span>
                                                                <span className="font-semibold text-[#1b2a18]">
                                                                    {foodData?.menus?.dinner?.otherDessert
                                                                        ? `${foodData?.menus?.dinner?.dessert} - ${foodData?.menus?.dinner?.otherDessert}`
                                                                        : (foodData?.menus?.dinner?.dessert || "-")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* อาหารว่าง (โชว์ล่างสุด แยกเป็นการ์ดเด่นๆ) */}
                                        {(hasMorningSnack || hasAfternoonSnack) && (
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {hasMorningSnack && (
                                                    <div className="flex items-center gap-4 p-4 bg-[#788B64]/10 rounded-xl border border-[#788B64]/30 shadow-sm">
                                                        <div className="bg-white p-2.5 rounded-full text-[#788B64] shrink-0 shadow-sm border border-[#E2CCA8]/40">
                                                            <Coffee className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[0.95rem] font-bold text-[#1b2a18]">อาหารว่างเช้า (Morning Break)</div>
                                                            <div className="text-xs font-semibold text-[#788B64] mt-1">จัดเตรียมชุดเบรคช่วงเช้า</div>
                                                        </div>
                                                    </div>
                                                )}
                                                {hasAfternoonSnack && (
                                                    <div className="flex items-center gap-4 p-4 bg-[#788B64]/10 rounded-xl border border-[#788B64]/30 shadow-sm">
                                                        <div className="bg-white p-2.5 rounded-full text-[#788B64] shrink-0 shadow-sm border border-[#E2CCA8]/40">
                                                            <Coffee className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[0.95rem] font-bold text-[#1b2a18]">อาหารว่างบ่าย (Afternoon Break)</div>
                                                            <div className="text-xs font-semibold text-[#788B64] mt-1">จัดเตรียมชุดเบรคช่วงบ่าย</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Footer Modal */}
                <div data-audit-section="requester" className="shrink-0 border-t border-[#E2CCA8]/60 bg-white px-6 py-4 sm:rounded-b-3xl">
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
                        <div className="text-xs text-zinc-500 font-medium flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1.5">
                                <PenLine className="w-3.5 h-3.5" />
                                ผู้ยื่นคำร้อง: {(selectedVisit.submittedBy as any)?.name ? `${(selectedVisit.submittedBy as any).name} ${(selectedVisit.submittedBy as any).position ? `(${(selectedVisit.submittedBy as any).position})` : ""}` : "-"}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                เบอร์ติดต่อ: {(selectedVisit.submittedBy as any)?.phone || selectedVisit.contactPhone || "-"}
                            </span>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            {readOnly ? (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white border border-[#E2CCA8] text-[#1b2a18] rounded-lg text-sm font-semibold hover:bg-[#FAEFCC] transition-colors shadow-sm"
                                >
                                    ปิด
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onEdit?.()}
                                        disabled={updatingStatus || !canManage}
                                        className="px-4 py-2 bg-white border border-[#E2CCA8] text-[#1b2a18] rounded-lg text-sm font-semibold hover:bg-[#FAEFCC] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 transition-colors shadow-sm"
                                    >
                                        แก้ไข
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onCancel?.()}
                                        disabled={updatingStatus || !canManage}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300 transition-colors shadow-sm"
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
    );
}

export default function VisitorTablePremium({ visits }: { visits: Visit[] }) {
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [scrollTargetSection, setScrollTargetSection] = useState<string | null>(null);
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
    const [filterCompany, setFilterCompany] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const [exportFrom, setExportFrom] = useState("");
    const [exportTo, setExportTo] = useState("");
    const [exportStatus, setExportStatus] = useState<"active" | "canceled" | "completed" | "all">("active");
    const [exportCompany, setExportCompany] = useState("");
    const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");

    useEffect(() => {
        return () => {
            if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const onOpenVisit = (event: Event) => {
            const customEvent = event as CustomEvent<{ visitorId?: string; sectionId?: string }>;
            const visitorId = String(customEvent.detail?.visitorId ?? "").trim();
            const sectionId = String(customEvent.detail?.sectionId ?? "").trim();
            if (!visitorId) return;
            const foundVisit = visits.find((visit) => String(visit.id) === visitorId) ?? null;
            if (foundVisit) {
                setScrollTargetSection(sectionId || null);
                setSelectedVisit(foundVisit);
            }
        };

        window.addEventListener("audit-log:open-visit", onOpenVisit as EventListener);
        return () => {
            window.removeEventListener("audit-log:open-visit", onOpenVisit as EventListener);
        };
    }, [visits]);

    useEffect(() => {
        if (!selectedVisit || !scrollTargetSection) return;
        const timer = window.setTimeout(() => {
            const target = document.querySelector(`[data-audit-section="${scrollTargetSection}"]`);
            if (target instanceof HTMLElement) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 200);
        return () => window.clearTimeout(timer);
    }, [scrollTargetSection, selectedVisit]);

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

    const statusText = (status: unknown) => {
        const n = Number(status);
        if (n === 0) return "ยกเลิกแล้ว";
        if (n === 2) return "เสร็จสิ้นแล้ว";
        return "ยังดำเนินการอยู่";
    };

    const filteredVisits = useMemo(() => {
        const qCompany = filterCompany.trim().toLowerCase();
        return sortedVisits.filter((v) => {
            if (!isActiveStatus(v.status)) return false;

            const dateKey = toThaiDateKey(v.visitDateTime || v.created_at || null);
            if (filterDateFrom && dateKey && dateKey < filterDateFrom) return false;
            if (filterDateTo && dateKey && dateKey > filterDateTo) return false;
            if (filterDateFrom || filterDateTo) {
                if (!dateKey) return false;
            }

            if (qCompany) {
                const client = typeof v.clientCompany === "string" ? v.clientCompany.toLowerCase() : "";
                if (!client.includes(qCompany)) return false;
            }

            return true;
        });
    }, [filterCompany, filterDateFrom, filterDateTo, sortedVisits]);

    const exportableVisits = useMemo(() => {
        const qCompany = exportCompany.trim().toLowerCase();
        return sortedVisits.filter((v) => {
            const dateKey = toThaiDateKey(v.visitDateTime || v.created_at || null);
            if (exportFrom && dateKey && dateKey < exportFrom) return false;
            if (exportTo && dateKey && dateKey > exportTo) return false;
            if (exportFrom || exportTo) {
                if (!dateKey) return false;
            }

            if (exportStatus === "active" && !isActiveStatus(v.status)) return false;
            if (exportStatus === "canceled" && Number(v.status) !== 0) return false;
            if (exportStatus === "completed" && Number(v.status) !== 2) return false;

            if (qCompany) {
                const client = typeof v.clientCompany === "string" ? v.clientCompany.toLowerCase() : "";
                if (!client.includes(qCompany)) return false;
            }

            return true;
        });
    }, [exportCompany, exportFrom, exportStatus, exportTo, sortedVisits]);

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

    const downloadExcel = (rows: Array<Record<string, string>>, filename: string) => {
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        const escapeHtml = (text: string) =>
            String(text ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");

        const thead = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
        const tbody = rows
            .map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h] ?? "")}</td>`).join("")}</tr>`)
            .join("");

        const html =
            `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>` +
            `<table border="1">${thead}${tbody}</table>` +
            `</body></html>`;

        const bom = "\ufeff";
        const blob = new Blob([bom + html], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const formatExportDateTime = (value: string | null | undefined) => {
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

    const exportRows = useMemo(() => {
        return exportableVisits.map((v) => {
            const dt = v.visitDateTime || v.created_at || "";
            const submittedByRaw =
                isRecord(v.submittedBy) && "submittedBy" in v.submittedBy
                    ? (v.submittedBy as Record<string, unknown>).submittedBy
                    : v.submittedBy;
            const submittedBy = isRecord(submittedByRaw) ? submittedByRaw : null;
            return {
                id: String(v.id ?? ""),
                วันและเวลา: formatExportDateTime(dt),
                สถานะ: statusText(v.status),
                ชื่อบริษัทที่เชิญมา: typeof v.clientCompany === "string" ? v.clientCompany : "",
                ที่อยู่บริษัทที่เชิญมา: typeof v.companyAddress === "string" ? v.companyAddress : "",
                ประเทศของบริษัทที่เชิญมา: typeof v.country === "string" ? v.country : "",
                ประเภทผู้เข้าเยี่ยมชม: (() => {
                    const type = v.visitorType;
                    const other = v.visitorTypeOther;
                    if (type && other && type === "อื่นๆ") return `${type} - ${other}`;
                    return typeof type === "string" ? type : "";
                })(),
                วัตถุประสงค์: typeof v.purposeOfVisit === "string" ? v.purposeOfVisit : "",
                จำนวนผู้เข้าร่วม: String((v.guests?.length ?? v.totalGuests ?? 0) || 0),
                เบอร์ผู้ประสานงาน: typeof v.contactPhone === "string" ? v.contactPhone : "",
                ชื่อผู้กรอกข้อมูล: typeof submittedBy?.name === "string" ? submittedBy.name : "",
            };
        });
    }, [exportableVisits]);

    const exportFilenameBase = useMemo(() => {
        const parts = [
            "visitor-export",
            exportFrom ? `from-${exportFrom}` : "",
            exportTo ? `to-${exportTo}` : "",
            exportStatus ? `status-${exportStatus}` : "",
        ].filter(Boolean);
        return parts.join("_");
    }, [exportFrom, exportStatus, exportTo]);

    const runExport = () => {
        if (exportFormat === "csv") {
            downloadCsv(exportRows, `${exportFilenameBase}.csv`);
            return;
        }
        downloadExcel(exportRows, `${exportFilenameBase}.xls`);
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
        <div className="p-2 md:p-4 space-y-6 bg-transparent min-h-screen rounded-3xl">
            {/* Header Table */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <h2 className="text-2xl font-extrabold text-[#1b2a18]">
                        Visitor Log
                    </h2>
                    <p className="text-[#1b2a18]/70 text-sm mt-1">รายการแขกคนสำคัญและผู้มาเยือน</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md py-2 px-4 rounded-2xl shadow-sm border border-[#E2CCA8]/60">
                        <Users className="w-4 h-4 text-[#788B64]" />
                        <span className="text-sm font-medium text-[#1b2a18]">
                            กำลังดำเนินอยู่: <span className="text-[#788B64] font-extrabold">{filteredVisits.length}</span> รายการ
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setExportFrom(filterDateFrom);
                            setExportTo(filterDateTo);
                            setExportStatus("active");
                            setExportCompany(filterCompany);
                            setExportFormat("excel");
                            setExportOpen(true);
                        }}
                        className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md py-2 px-4 rounded-2xl shadow-sm border border-[#E2CCA8]/60 text-sm font-semibold text-[#1b2a18] hover:bg-[#FAEFCC]/80 transition-colors"
                    >
                        <Download className="w-4 h-4 text-[#788B64]" />
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-[#FAEFCC]/70 backdrop-blur-xl rounded-2xl shadow-sm border border-[#E2CCA8] p-5">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="flex flex-col gap-1 lg:col-span-1">
                        <label className="text-xs font-bold text-[#788B64] uppercase tracking-wider">จากวันที่</label>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-1">
                        <label className="text-xs font-bold text-[#788B64] uppercase tracking-wider">ถึงวันที่</label>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-xs font-bold text-[#788B64] uppercase tracking-wider">ชื่อบริษัทที่เชิญมา</label>
                        <input
                            value={filterCompany}
                            onChange={(e) => setFilterCompany(e.target.value)}
                            placeholder="พิมพ์ชื่อบริษัทที่เชิญมาเพื่อค้นหา"
                            className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                        />
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-medium text-[#1b2a18]/60">
                        ตัวกรองใช้วันที่ตามเวลาไทย (Asia/Bangkok)
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFilterDateFrom("");
                            setFilterDateTo("");
                            setFilterCompany("");
                        }}
                        className="rounded-lg border border-[#E2CCA8] bg-white px-4 py-2 text-sm font-semibold text-[#1b2a18] hover:bg-[#FAEFCC] transition-colors shadow-sm"
                    >
                        ล้างตัวกรอง
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-[#788B64]/10 border border-[#E2CCA8] overflow-hidden relative z-0">
                <div className="overflow-x-auto p-2">
                    <table className="min-w-full w-full">
                        <thead>
                            <tr className="border-b border-[#E2CCA8]/60">
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-[#788B64] uppercase tracking-wider w-[28%]">วันและเวลา</th>
                                <th className="px-6 py-5 text-left text-[0.7rem] font-bold text-[#788B64] uppercase tracking-wider w-[35%]">องค์กร / ผู้มาเยือน</th>
                                <th className="hidden sm:table-cell px-6 py-5 text-center text-[0.7rem] font-bold text-[#788B64] uppercase tracking-wider w-[15%]">จำนวนผู้เข้าพบ</th>
                                <th className="w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2CCA8]/40">
                            {filteredVisits.map((visit, index) => {
                                const visitDate = new Date(visit.visitDateTime || visit.created_at || 0);
                                const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone }).format(visitDate);
                                const dayNum = new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone }).format(visitDate);
                                const timeText = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone }).format(visitDate);
                                const weekdayText = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone }).format(visitDate);
                                return (
                                    <tr key={visit.id} onClick={() => { setScrollTargetSection(null); setSelectedVisit(visit); }} className="group transition-all duration-200 hover:bg-[#FAEFCC]/40 hover:shadow-md hover:shadow-[#788B64]/10 hover:-translate-y-1 rounded-2xl cursor-pointer relative z-10">
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 w-12 h-12 bg-[#FAEFCC] text-[#788B64] rounded-xl flex flex-col items-center justify-center shadow-sm border border-[#E2CCA8] group-hover:bg-[#788B64] group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase leading-none">{monthShort}</span>
                                                    <span className="text-lg font-extrabold leading-none mt-0.5">{dayNum}</span>
                                                </div>
                                                <div className="flex flex-col pt-1">
                                                    <span className="gap-x-1 flex text-sm font-bold text-[#1b2a18] group-hover:text-[#788B64] transition-colors w-fit">
                                                        <CalendarClock className="w-4 h-4 text-[#788B64]" />
                                                        {timeText} น.
                                                    </span>
                                                    <div className="flex items-center text-xs font-medium text-zinc-500 gap-1.5 mt-1 bg-white border border-[#E2CCA8]/50 px-2 py-0.5 rounded-md w-fit">
                                                        {weekdayText}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top">
                                            <div className="flex items-start gap-3">
                                                <CompanyAvatar name={visit.clientCompany} idx={index} />
                                                <div className="flex flex-col">
                                                    <span className="text-[0.95rem] font-bold text-[#1b2a18] line-clamp-1 group-hover:text-[#788B64] transition-colors">{visit.clientCompany || "ไม่ระบุบริษัท"}</span>
                                                    <span className="text-sm text-zinc-500 flex items-center gap-1.5 mt-1"><Briefcase className="w-3.5 h-3.5 text-zinc-400" /><span className="line-clamp-1">{(visit as any).purposeOfVisit || "-"}</span></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-5 align-middle text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${(visit.guests?.length || 0) >= 1 ? 'bg-[#788B64]/10 text-[#788B64] border-[#788B64]/20' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}><Users className="w-3.5 h-3.5" />{visit.guests?.length || 1} คน</span>
                                        </td>
                                        <td className="px-4 py-5 align-middle text-right opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <ChevronRight className="w-5 h-5 text-[#788B64]" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <VisitDetailsModal
                selectedVisit={selectedVisit}
                onClose={() => { setSelectedVisit(null); setScrollTargetSection(null); }}
                timeZone={timeZone}
                readOnly={false}
                updatingStatus={updatingStatus}
                onEdit={openEdit}
                onCancel={openCancelConfirm}
                zVariant="table"
            />

            {selectedVisit && cancelConfirmOpen && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onMouseDown={(e) => {
                        if (e.currentTarget === e.target && !updatingStatus) setCancelConfirmOpen(false);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-zinc-200">
                        <div className="px-6 py-5">
                            <div className="text-lg font-bold text-zinc-900">Cancel booking?</div>
                            <div className="mt-2 text-sm text-zinc-600">
                                ระบบจะเปลี่ยนสถานะเป็น “ยกเลิกแล้ว” และรายการจะหายจากหน้า Dashboard
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 bg-zinc-50/50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setCancelConfirmOpen(false)}
                                disabled={updatingStatus}
                                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={cancelBooking}
                                disabled={updatingStatus}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300 shadow-sm transition-colors"
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
                    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 py-6 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-700 border border-red-200">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <div className="text-base font-bold text-zinc-900">ยกเลิกการจองสำเร็จ</div>
                                <div className="mt-1 text-sm text-zinc-600">เปลี่ยนสถานะเป็นยกเลิกแล้ว</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {exportOpen && (
                <div
                    className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onMouseDown={(e) => {
                        if (e.currentTarget === e.target) setExportOpen(false);
                    }}
                >
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#FAEFCC] shadow-2xl border border-[#E2CCA8] animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-4 border-b border-[#E2CCA8]/60 bg-white/70 backdrop-blur px-6 py-4">
                            <div>
                                <div className="text-lg font-bold text-[#1b2a18]">Export Data</div>
                                <div className="text-sm font-medium text-[#788B64]">เลือกช่วงวันที่ สถานะ และบริษัท</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setExportOpen(false)}
                                className="rounded-md border border-[#E2CCA8] bg-white px-3 py-1.5 text-sm font-semibold text-[#1b2a18] hover:bg-[#FAEFCC] inline-flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <X className="w-4 h-4" />
                                ปิด
                            </button>
                        </div>

                        <div className="p-6 bg-white/50 backdrop-blur">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-[#1b2a18]">จากวันที่</label>
                                    <input
                                        type="date"
                                        value={exportFrom}
                                        onChange={(e) => setExportFrom(e.target.value)}
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-[#1b2a18]">ถึงวันที่</label>
                                    <input
                                        type="date"
                                        value={exportTo}
                                        onChange={(e) => setExportTo(e.target.value)}
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-[#1b2a18]">สถานะ</label>
                                    <select
                                        value={exportStatus}
                                        onChange={(e) => setExportStatus(e.target.value as typeof exportStatus)}
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                                    >
                                        <option value="active">ยังดำเนินการอยู่</option>
                                        <option value="canceled">ยกเลิกแล้ว</option>
                                        <option value="completed">เสร็จสิ้นแล้ว</option>
                                        <option value="all">ทั้งหมด</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-[#1b2a18]">ชื่อบริษัทที่เชิญมา</label>
                                    <input
                                        value={exportCompany}
                                        onChange={(e) => setExportCompany(e.target.value)}
                                        placeholder="เว้นว่างเพื่อเอาทั้งหมด"
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-sm font-semibold text-[#1b2a18]">รูปแบบไฟล์</label>
                                    <select
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-3 py-2 text-sm outline-none focus:border-[#788B64] focus:ring-2 focus:ring-[#788B64]/30 transition-all"
                                    >
                                        <option value="excel">Excel (.xls)</option>
                                        <option value="csv">CSV (.csv)</option>
                                    </select>
                                    <div className="mt-1 text-xs font-medium text-[#788B64]">วันที่/เวลาอ้างอิงเวลาไทย (Asia/Bangkok)</div>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E2CCA8]/60">
                                <div className="text-sm font-medium text-[#1b2a18]">
                                    จะ export ทั้งหมด <span className="font-extrabold text-[#788B64]">{exportRows.length}</span> รายการ
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setExportFrom("");
                                            setExportTo("");
                                            setExportStatus("all");
                                            setExportCompany("");
                                            setExportFormat("excel");
                                        }}
                                        className="rounded-lg border border-[#E2CCA8] bg-white px-4 py-2 text-sm font-semibold text-[#1b2a18] hover:bg-[#FAEFCC] transition-colors shadow-sm"
                                    >
                                        ล้างค่า
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            runExport();
                                            setExportOpen(false);
                                        }}
                                        className="rounded-lg bg-[#788B64] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6b7d58] shadow-sm transition-colors"
                                    >
                                        ดาวน์โหลด
                                    </button>
                                </div>
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
        <div className="bg-white p-3.5 rounded-xl border border-[#E2CCA8]/60 shadow-sm flex items-center gap-3">
            <div className="bg-[#FAEFCC]/60 p-2 rounded-lg shrink-0">
                {icon}
            </div>
            <div className="overflow-hidden">
                <dt className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{label}</dt>
                <dd className="text-sm font-bold text-[#1b2a18] truncate">
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
        'bg-gradient-to-br from-[#788B64] to-[#4A5D3B] text-white shadow-[#788B64]/30',
        'bg-gradient-to-br from-[#E2CCA8] to-[#C1A57B] text-[#1b2a18] shadow-[#E2CCA8]/40',
        'bg-gradient-to-br from-[#1b2a18] to-[#0d150c] text-white shadow-[#1b2a18]/30',
        'bg-gradient-to-br from-[#A3B18F] to-[#788B64] text-white shadow-[#788B64]/30',
    ];
    const colorClass = colorPalettes[(idx || (name?.length || 0)) % colorPalettes.length];
    const sizeClass = size === "lg" ? "w-16 h-16 text-2xl rounded-2xl" : "w-10 h-10 text-sm rounded-xl";

    return (
        <div className={`shrink-0 ${sizeClass} flex items-center justify-center font-extrabold shadow-lg ${colorClass}`}>
            {initial}
        </div>
    );
}
