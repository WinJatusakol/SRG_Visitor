// components/VisitorTable.tsx
"use client";

import { useState } from "react";

export default function VisitorTable({ visits }: { visits: any[] }) {
    const [selectedVisit, setSelectedVisit] = useState<any>(null);

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
                            const dateA = new Date(a.visitDateTime || a.created_at).getTime();
                            const dateB = new Date(b.visitDateTime || b.created_at).getTime();

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
                                            {new Date(visit.visitDateTime || visit.created_at).toLocaleDateString("th-TH", {
                                                day: "2-digit", month: "short", year: "2-digit"
                                            })}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {new Date(visit.visitDateTime || visit.created_at).toLocaleTimeString("th-TH", {
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
                            <DetailItem label="การเดินทาง" value={selectedVisit.transportType === "personal" ? "รถส่วนตัว" : "รถสาธารณะ"} />
                            <DetailItem label="ทะเบียนรถ" value={selectedVisit.carLicense} />
                            <DetailItem label="ยี่ห้อรถ" value={selectedVisit.carBrand} />
                            <DetailItem label="ห้องประชุม" value={selectedVisit.meetingRoom ? "ต้องการ" : "ไม่ต้องการ"} />
                            <DetailItem label="อาหาร/มื้อ" value={`${selectedVisit.foodRequired ? "ต้องการ" : "ไม่ต้องการ"} / ${selectedVisit.meals || "-"}`} />

                            <div className="col-span-1 md:col-span-2">
                                <DetailItem label="ข้อมูลอาหารเพิ่มเติม" value={selectedVisit.foodNote} />
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

function DetailItem({ label, value }: { label: string; value: any }) {
    return (
        <div className="mb-4">
            <dt className="text-sm text-gray-500">{label}</dt>
            <dd className="text-base text-gray-900 bg-gray-50 p-2 rounded">{value || "-"}</dd>
        </div>
    );
}