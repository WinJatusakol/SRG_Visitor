import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VisitorTable, { type Visit } from "./VisitTable"; // 👈 import component ที่เราเพิ่งสร้าง

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

const { data: visits, error } = await supabase
    .from("vip_visitor")
    .select(`
      *,
      guests:vip_visitor_guests(*),
      cars:vip_visitor_cars(*),
      foodPreferences:vip_visitor_food(foodPreferences),
      souvenirPreferences:vip_visitor_souvenir(souvenirPreferences),
      presentationFiles:vip_visitor_presentation_file(presentationFile)
    `)
    .order("id", { ascending: false });

  const fallbackResult =
    joinedResult.error
      ? await supabase
          .from("vip_visitor")
          .select("*")
          .order("id", { ascending: false })
      : null;

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

    const guestRows = Array.isArray(guestRowsRaw) ? (guestRowsRaw as GuestRow[]) : null;
    const carRows = Array.isArray(carRowsRaw) ? (carRowsRaw as CarRow[]) : null;
    const foodRow = Array.isArray(foodRowsRaw) ? (foodRowsRaw[0] as FoodRow) : null;
    const siteVisitRow = Array.isArray(siteVisitRowsRaw)
      ? (siteVisitRowsRaw[0] as SiteVisitRow)
      : null;
    const souvenirRow = Array.isArray(souvenirRowsRaw) ? (souvenirRowsRaw[0] as SouvenirRow) : null;
    const presentationFileRow = Array.isArray(presentationFileRowsRaw)
      ? (presentationFileRowsRaw[0] as PresentationFileRow)
      : null;

    const normalizedGuests = guestRows
      ? [...guestRows]
          .sort(
            (a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0)
          )
          .map((g) => ({
            firstName: g?.firstName ?? "",
            middleName: g?.middleName ?? "",
            lastName: g?.lastName ?? "",
            position: g?.position ?? "",
            nationality: g?.nationality ?? "",
          }))
      : record.guests;

    const normalizedCars = carRows
      ? [...carRows]
          .sort(
            (a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0)
          )
          .map((c) => ({
            brand: c?.brand ?? "",
            license: c?.license ?? "",
          }))
      : record.cars;

    const normalized: Record<string, unknown> = {
      ...record,
      id: normalizedId,
      guests: normalizedGuests,
      cars: normalizedCars,
      foodPreferences: foodRow?.foodPreferences ?? record.foodPreferences,
      siteVisit: siteVisitRow?.siteVisit ?? record.siteVisit,
      souvenirPreferences:
        souvenirRow?.souvenirPreferences ?? record.souvenirPreferences,
      presentationFile: presentationFileRow?.presentationFile ?? record.presentationFile,
    };

    delete normalized.vip_visitor_guests;
    delete normalized.vip_visitor_cars;
    delete normalized.vip_visitor_food;
    delete normalized.vip_visitor_site_visit;
    delete normalized.vip_visitor_souvenir;
    delete normalized.vip_visitor_presentation_file;

    return normalized as unknown as Visit;
  });

  const error =
    joinedResult.error && !fallbackResult ? joinedResult.error : fallbackResult?.error;

  console.log("Data from Supabase:", visits);
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

        {/* เรียกใช้ Client Component */}
        <VisitorTable visits={visits} />
      </div>
    </div>
  );
}
