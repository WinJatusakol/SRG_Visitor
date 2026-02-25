import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const requireAdmin = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
};

const toSafeFilename = (value) =>
  String(value || "")
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(request) {
  try {
    const user = await requireAdmin();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const id = formData.get("id");
    const remove = String(formData.get("remove") ?? "") === "true";
    const file = formData.get("presentationFile");

    if (!Number.isFinite(Number(id)) && typeof id !== "string") {
      return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const visitorId = id;

    if (remove) {
      const { error } = await supabase.from("vip_visitor_presentation_file").delete().eq("visitorId", visitorId);
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing file" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "ไฟล์แนบใหญ่เกินไป (สูงสุด 10MB)" }, { status: 400 });
    }

    const bucketName = process.env.SUPABASE_PRESENTATION_BUCKET || "vip_visitor_attachments";
    const originalName = toSafeFilename(file.name);
    const fileExt = originalName.includes(".") ? originalName.split(".").pop() : "";
    const datedPrefix = new Date().toISOString().slice(0, 10);
    const objectPath = `${datedPrefix}/${randomUUID()}${fileExt ? `.${fileExt}` : ""}`;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const uploadOnce = async () =>
      supabase.storage.from(bucketName).upload(objectPath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    let uploadResult = await uploadOnce();
    if (uploadResult.error) {
      const msg = String(uploadResult.error.message ?? "");
      const isBucketNotFound =
        msg.toLowerCase().includes("bucket not found") || msg.toLowerCase().includes("no such bucket");

      if (isBucketNotFound) {
        const createBucketResult = await supabase.storage.createBucket(bucketName, { public: true });
        if (createBucketResult.error) {
          const createMsg = String(createBucketResult.error.message ?? "");
          const alreadyExists =
            createMsg.toLowerCase().includes("already exists") || createMsg.toLowerCase().includes("duplicate");
          if (!alreadyExists) {
            return NextResponse.json(
              { success: false, error: `สร้าง bucket ไม่สำเร็จ: ${createBucketResult.error.message}` },
              { status: 500 }
            );
          }
        }
        uploadResult = await uploadOnce();
      }
    }

    if (uploadResult.error) {
      return NextResponse.json({ success: false, error: uploadResult.error.message }, { status: 500 });
    }

    const publicUrlResult = supabase.storage.from(bucketName).getPublicUrl(objectPath);
    const presentationFile = {
      bucket: bucketName,
      path: objectPath,
      originalName,
      mimeType: file.type || "",
      size: file.size,
      publicUrl: publicUrlResult?.data?.publicUrl ?? "",
    };

    await supabase.from("vip_visitor_presentation_file").delete().eq("visitorId", visitorId);
    const { error: insertError } = await supabase
      .from("vip_visitor_presentation_file")
      .insert([{ visitorId, presentationFile }]);
    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, presentationFile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

