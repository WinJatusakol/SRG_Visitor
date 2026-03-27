import { createClient } from "@/lib/supabase/server";

const normalizeList = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const getAdminAccess = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, allowed: false, reason: "unauthorized" };
  }

  const adminEmails = normalizeList(process.env.ADMIN_EMAILS);
  const adminDomains = normalizeList(process.env.ADMIN_EMAIL_DOMAINS).map((domain) =>
    domain.replace(/^@/, "")
  );
  const email = String(user.email ?? "").trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@").pop() ?? "" : "";
  const allowed =
    adminEmails.length === 0 && adminDomains.length === 0
      ? true
      : adminEmails.includes(email) || (domain && adminDomains.includes(domain));

  return {
    supabase,
    user,
    allowed,
    reason: allowed ? null : "forbidden",
  };
};

export const requireAdminUser = async () => {
  const access = await getAdminAccess();
  return access.allowed ? access.user : null;
};
