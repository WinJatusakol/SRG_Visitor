import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VisitorTable from "./VisitTable"; // 👈 import component ที่เราเพิ่งสร้าง

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: visits, error } = await supabase
    .from("vip_visitor")
    .select("*")
    .order("id", { ascending: false });

  console.log("Data from Supabase:", visits);
  console.log("Error:", error);

  if (error) return <div>Error loading data</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
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