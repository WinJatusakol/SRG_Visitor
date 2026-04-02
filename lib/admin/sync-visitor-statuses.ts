import { createServiceClient } from "@/lib/supabase/server";
import { toBangkokDateInput } from "@/lib/thai-date-time";

const buildBangkokMidnightIso = (date = new Date()) => {
  const bangkokDate = toBangkokDateInput(date);
  return new Date(`${bangkokDate}T00:00:00+07:00`).toISOString();
};

export const syncVisitorStatuses = async () => {
  const supabase = createServiceClient();
  const midnightThaiIso = buildBangkokMidnightIso();

  const finishActive = await supabase
    .from("vip_visitor")
    .update({ status: 2 })
    .eq("status", 1)
    .lt("visitDateTime", midnightThaiIso)
    .select("id");

  if (finishActive.error) {
    throw new Error(finishActive.error.message);
  }

  const finishUnknown = await supabase
    .from("vip_visitor")
    .update({ status: 2 })
    .is("status", null)
    .lt("visitDateTime", midnightThaiIso)
    .select("id");

  if (finishUnknown.error) {
    throw new Error(finishUnknown.error.message);
  }

  return {
    updatedCount: (finishActive.data?.length ?? 0) + (finishUnknown.data?.length ?? 0),
    midnightThaiIso,
  };
};
