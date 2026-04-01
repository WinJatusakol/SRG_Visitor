import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import VisitorTable from "./VisitTable";
import type { Visit } from "./visitTypes";
import DataManager from "./DataManager";
import BookingHistoryModal from "./BookingHistoryModal";
import AuditLogsModal from "./AuditLogsModal";

type GuestRow = {
  sortIndex?: number | null;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  position?: string | null;
  nationality?: string | null;
  halal?: boolean | null;
  vegan?: boolean | null;
  allergies?: string[] | null;
  allergyOther?: string | null;
};

type CarRow = {
  sortIndex?: number | null;
  brand?: string | null;
  license?: string | null;
};

type FoodRow = { foodPreferences?: unknown | null };
type SiteVisitRow = { siteVisit?: unknown | null };
type SouvenirRow = { souvenirPreferences?: unknown | null };
type ShuttleRow = { schedules?: unknown | null };
type RegistrationFileRow = { registrationFile?: unknown | null };
type InternalAttendeeRow = {
  sortIndex?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access.user || !access.allowed) redirect("/login");
  const supabase = access.supabase ?? (await createClient());

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

  const joinedSelect = `
    *,
    vip_visitor_guests(*),
    vip_visitor_internal_attendees(*),
    vip_visitor_cars(*),
    vip_visitor_shuttle(*),
    vip_visitor_food(*),
    vip_visitor_site_visit(*),
    vip_visitor_souvenir(*),
    vip_visitor_registration_file(*)
  `;

  const joinedResult = await supabase
    .from("vip_visitor")
    .select(joinedSelect)
    .order("id", { ascending: false });

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
      typeof record.id === "number" || typeof record.id === "string" ? record.id : 0;

    const guestRowsRaw = record.vip_visitor_guests;
    const internalRowsRaw = record.vip_visitor_internal_attendees;
    const carRowsRaw = record.vip_visitor_cars;
    const shuttleRowsRaw = record.vip_visitor_shuttle;
    const foodRowsRaw = record.vip_visitor_food;
    const siteVisitRowsRaw = record.vip_visitor_site_visit;
    const souvenirRowsRaw = record.vip_visitor_souvenir;
    const registrationFileRowsRaw = record.vip_visitor_registration_file;

    const guestRows = Array.isArray(guestRowsRaw) ? (guestRowsRaw as GuestRow[]) : null;
    const internalRows = Array.isArray(internalRowsRaw)
      ? (internalRowsRaw as InternalAttendeeRow[])
      : null;
    const carRows = Array.isArray(carRowsRaw) ? (carRowsRaw as CarRow[]) : null;

    const foodRow = (Array.isArray(foodRowsRaw) ? foodRowsRaw[0] : foodRowsRaw) as FoodRow | null;
    const siteVisitRow = (Array.isArray(siteVisitRowsRaw) ? siteVisitRowsRaw[0] : siteVisitRowsRaw) as SiteVisitRow | null;
    const souvenirRow = (Array.isArray(souvenirRowsRaw) ? souvenirRowsRaw[0] : souvenirRowsRaw) as SouvenirRow | null;
    const shuttleRow = (Array.isArray(shuttleRowsRaw) ? shuttleRowsRaw[0] : shuttleRowsRaw) as ShuttleRow | null;
    const registrationFileRow = (Array.isArray(registrationFileRowsRaw) ? registrationFileRowsRaw[0] : registrationFileRowsRaw) as RegistrationFileRow | null;

    const normalizedGuests = guestRows
      ? [...guestRows]
          .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
          .map((g) => ({
            prefix: g?.prefix ?? "",
            firstName: g?.firstName ?? "",
            middleName: g?.middleName ?? "",
            lastName: g?.lastName ?? "",
            position: g?.position ?? "",
            nationality: g?.nationality ?? "",
            halal: !!g?.halal,
            vegan: !!g?.vegan,
            allergies: Array.isArray(g?.allergies) ? g?.allergies : [],
            allergyOther: g?.allergyOther ?? "",
          }))
      : record.guests;

    const normalizedCars = carRows
      ? [...carRows]
          .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
          .map((c) => ({
            brand: c?.brand ?? "",
            license: c?.license ?? "",
          }))
      : record.cars;

    const normalizedInternalAttendees = internalRows
      ? [...internalRows]
          .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
          .map((a) => ({
            firstName: a?.firstName ?? "",
            lastName: a?.lastName ?? "",
            position: a?.position ?? "",
          }))
      : record.internalAttendees;

    const normalized: Record<string, unknown> = {
      ...record,
      id: normalizedId,
      guests: normalizedGuests,
      internalAttendees: normalizedInternalAttendees,
      cars: normalizedCars,
      shuttleSchedules: shuttleRow?.schedules ?? record.shuttleSchedules,
      foodPreferences: foodRow?.foodPreferences ?? record.foodPreferences,
      siteVisit: siteVisitRow?.siteVisit ?? record.siteVisit,
      souvenirPreferences: souvenirRow?.souvenirPreferences ?? record.souvenirPreferences,
      registrationFiles: registrationFileRow
        ? { registrationFile: registrationFileRow.registrationFile ?? null }
        : record.registrationFile,
    };

    delete normalized.vip_visitor_guests;
    delete normalized.vip_visitor_internal_attendees;
    delete normalized.vip_visitor_cars;
    delete normalized.vip_visitor_food;
    delete normalized.vip_visitor_site_visit;
    delete normalized.vip_visitor_souvenir;
    delete normalized.vip_visitor_registration_file;

    return normalized as unknown as Visit;
  });

  const error = joinedResult.error && !fallbackResult ? joinedResult.error : fallbackResult?.error;
  if (error) return <div>Error loading data</div>;

  return (
    <div className="min-h-screen bg-linear-to-br from-[#faefcc] via-[#e2cca8] to-[#788b64] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">แดชบอร์ดผู้ดูแลระบบ</h1>
            <p className="mt-1 text-gray-500">รายการแขก VIP และผู้เข้าเยี่ยมชมทั้งหมด</p>
          </div>

          <div className="flex items-center gap-3">
            <DataManager />
            <AuditLogsModal />
            <BookingHistoryModal visits={visits as Array<Visit & { status?: number | null }>} />
            <form
              action={async () => {
                "use server";
                const sb = await createClient();
                await sb.auth.signOut();
                redirect("/login");
              }}
            >
              <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>

        <VisitorTable visits={visits} />
      </div>
    </div>
  );
}
