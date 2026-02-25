import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VisitorTable from "./VisitTable";
import type { Visit } from "./visitTypes";
import DataManager from "./DataManager";
import BookingHistoryModal from "./BookingHistoryModal";

type GuestRow = {
  sortIndex?: number | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  position?: string | null;
  nationality?: string | null;
};

type CarRow = {
  sortIndex?: number | null;
  brand?: string | null;
  license?: string | null;
};

type FoodRow = { foodPreferences?: unknown | null };
type SiteVisitRow = { siteVisit?: unknown | null };
type SouvenirRow = { souvenirPreferences?: unknown | null };
type PresentationFileRow = { presentationFile?: unknown | null };

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowThai = new Date();
  nowThai.setHours(nowThai.getHours() + 7);
  const todayThai = nowThai.toISOString().slice(0, 10);
  const midnightThaiIso = new Date(`${todayThai}T00:00:00+07:00`).toISOString();
  try {
    const adminSupabase = createServiceClient();
    await adminSupabase
      .from("vip_visitor")
      .update({ status: 2 })
      .eq("status", 1)
      .lt("visitDateTime", midnightThaiIso);
    await adminSupabase
      .from("vip_visitor")
      .update({ status: 2 })
      .is("status", null)
      .lt("visitDateTime", midnightThaiIso);
  } catch {}

  // ใช้ Query จากตัวที่ Pull มา เพื่อดึง Table เข้ามาทั้งหมด
  const joinedSelect = `
    *,
    vip_visitor_guests(*),
    vip_visitor_cars(*),
    vip_visitor_food(*),
    vip_visitor_site_visit(*),
    vip_visitor_souvenir(*),
    vip_visitor_presentation_file(*)
  `;

  const joinedResult = await supabase
    .from("vip_visitor")
    .select(joinedSelect)
    .order("id", { ascending: false });

  // จัดการ Fallback หาก Join Query มีปัญหา
  let fallbackResult = null;
  if (joinedResult.error) {
    fallbackResult = await supabase
      .from("vip_visitor")
      .select("*")
      .order("id", { ascending: false });
  }

  const rawVisits = (joinedResult.data ?? fallbackResult?.data ?? []) as unknown[];

  const visits: Visit[] = rawVisits.map((visit) => {
    const record = visit as Record<string, unknown>;
    const normalizedId =
      typeof record.id === "number" || typeof record.id === "string"
        ? record.id
        : 0;
    
    const guestRowsRaw = record.vip_visitor_guests;
    const carRowsRaw = record.vip_visitor_cars;
    const foodRowsRaw = record.vip_visitor_food;
    const siteVisitRowsRaw = record.vip_visitor_site_visit;
    const souvenirRowsRaw = record.vip_visitor_souvenir;
    const presentationFileRowsRaw = record.vip_visitor_presentation_file;

    // แขกและรถ เป็นความสัมพันธ์แบบ 1:Many (Supabase จะส่งมาเป็น Array แน่นอน)
    const guestRows = Array.isArray(guestRowsRaw) ? (guestRowsRaw as GuestRow[]) : null;
    const carRows = Array.isArray(carRowsRaw) ? (carRowsRaw as CarRow[]) : null;

    // 🌟 ส่วนที่แก้ไข 🌟
    // อาหาร, สถานที่, ของที่ระลึก, ไฟล์แนบ เป็น 1:1 (Supabase มักจะส่งมาเป็น Object) 
    // เราจึงปรับให้ดึงค่าได้ถูกต้องไม่ว่ามันจะส่งมาเป็น Array หรือ Object
    const foodRow = (Array.isArray(foodRowsRaw) ? foodRowsRaw[0] : foodRowsRaw) as FoodRow | null;
    const siteVisitRow = (Array.isArray(siteVisitRowsRaw) ? siteVisitRowsRaw[0] : siteVisitRowsRaw) as SiteVisitRow | null;
    const souvenirRow = (Array.isArray(souvenirRowsRaw) ? souvenirRowsRaw[0] : souvenirRowsRaw) as SouvenirRow | null;
    const presentationFileRow = (Array.isArray(presentationFileRowsRaw) ? presentationFileRowsRaw[0] : presentationFileRowsRaw) as PresentationFileRow | null;

    // ทำการจัดเรียง Guest ตาม sortIndex
    const normalizedGuests = guestRows
      ? [...guestRows]
          .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
          .map((g) => ({
            firstName: g?.firstName ?? "",
            middleName: g?.middleName ?? "",
            lastName: g?.lastName ?? "",
            position: g?.position ?? "",
            nationality: g?.nationality ?? "",
          }))
      : record.guests;

    // ทำการจัดเรียง Car ตาม sortIndex
    const normalizedCars = carRows
      ? [...carRows]
          .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
          .map((c) => ({
            brand: c?.brand ?? "",
            license: c?.license ?? "",
          }))
      : record.cars;

    // รวบรวมข้อมูลให้อยู่ในรูปแบบที่ VisitTable ต้องการ
    const normalized: Record<string, unknown> = {
      ...record,
      id: normalizedId,
      guests: normalizedGuests,
      cars: normalizedCars,
      foodPreferences: foodRow?.foodPreferences ?? record.foodPreferences,
      siteVisit: siteVisitRow?.siteVisit ?? record.siteVisit,
      souvenirPreferences: souvenirRow?.souvenirPreferences ?? record.souvenirPreferences,
      presentationFiles: presentationFileRow?.presentationFile ?? record.presentationFile,
    };

    // ลบ Key ที่เป็น Table เก่าทิ้ง
    delete normalized.vip_visitor_guests;
    delete normalized.vip_visitor_cars;
    delete normalized.vip_visitor_food;
    delete normalized.vip_visitor_site_visit;
    delete normalized.vip_visitor_souvenir;
    delete normalized.vip_visitor_presentation_file;

    return normalized as unknown as Visit;
  });

  const activeVisits = visits.filter((visit) => {
    const v = visit as unknown as Record<string, unknown>;
    return v.status === 1;
  });

  const error = joinedResult.error && !fallbackResult ? joinedResult.error : fallbackResult?.error;

  console.log("Error:", error);

  if (error) return <div>Error loading data</div>;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#faefcc] via-[#e2cca8] to-[#788b64] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">รายการแขก VIP และผู้เข้าเยี่ยมชมทั้งหมด</p>
          </div>
          
          <div className="flex items-center gap-3">
            <DataManager />
            <BookingHistoryModal visits={visits as unknown as Array<Visit & { status?: number | null }>} />
            <form action={async () => {
              "use server";
              const sb = await createClient();
              await sb.auth.signOut();
              redirect("/login");
            }}>
              <button className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-sm font-medium text-red-600 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition">
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* เรียกใช้ Client Component */}
        <VisitorTable visits={activeVisits} />
      </div>
    </div>
  );
}
