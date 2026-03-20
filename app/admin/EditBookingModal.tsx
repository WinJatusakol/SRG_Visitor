"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, Download, FileText, XCircle } from "lucide-react";
import type { Visit } from "./visitTypes";

type EditableGuest = {
  firstName: string;
  middleName: string;
  lastName: string;
  company: string;
  position: string;
  nationality: string;
};

type EditableCar = {
  brand: string;
  license: string;
};

type YesNo = "yes" | "no";

type RefOptionRow = {
  value: string;
  label_th: string | null;
  label_en: string | null;
  sort_index?: number | null;
  active?: boolean | null;
};

type MeetingRoomRow = {
  code: string;
  name_th: string | null;
  name_en: string | null;
  location_th: string | null;
  location_en: string | null;
  capacity: number | null;
  sort_index?: number | null;
  active?: boolean | null;
};

type FoodMenuOptionRow = RefOptionRow & {
  group_key: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const unwrapKey = (value: unknown, key: string) => {
  const rec = asRecord(value);
  return rec && key in rec ? rec[key] : value;
};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
};

const optionLabelTh = (option: RefOptionRow) => option.label_th ?? option.value;

const meetingRoomLabelTh = (room: MeetingRoomRow) => {
  const capacity = Number(room.capacity ?? 0);
  const displayName = (room.name_th ?? room.code ?? "").trim();
  const displayLocation = (room.location_th ?? "").trim();
  const parts = [room.code, displayName, displayLocation].filter(Boolean);
  const base = parts.join(" ").trim();
  return `${base} (ความจุ ${capacity} คน)`;
};

const toIsoDateInput = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toIsoTimeInput = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const buildIsoUtc = (date: string, time: string) => {
  const d = date.trim();
  const t = time.trim();
  if (!d || !t) return "";
  return `${d}T${t}:00.000Z`;
};

const normalizeEditableGuests = (value: unknown) => {
  const arr = Array.isArray(value) ? value : [];
  return arr.map((g) => ({
    firstName: typeof g?.firstName === "string" ? g.firstName : "",
    middleName: typeof g?.middleName === "string" ? g.middleName : "",
    lastName: typeof g?.lastName === "string" ? g.lastName : "",
    company: typeof g?.company === "string" ? g.company : "",
    position: typeof g?.position === "string" ? g.position : "",
    nationality: typeof g?.nationality === "string" ? g.nationality : "",
  })) as EditableGuest[];
};

const normalizeEditableCars = (value: unknown) => {
  const arr = Array.isArray(value) ? value : [];
  return arr.map((c) => ({
    brand: typeof c?.brand === "string" ? c.brand : "",
    license: typeof c?.license === "string" ? c.license : "",
  })) as EditableCar[];
};

const timeSlots: string[] = [];
for (let hour = 6; hour <= 21; hour += 1) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
}

const renderPresentationFiles = (value: unknown) => {
  let fileData = value;
  if (Array.isArray(value) && value.length > 0) {
    const first = asRecord(value[0]);
    if (first && "presentationFile" in first) fileData = first.presentationFile;
  } else {
    const rec = asRecord(value);
    if (rec && "presentationFile" in rec) fileData = rec.presentationFile;
  }

  if (!fileData || (Array.isArray(fileData) && fileData.length === 0)) {
    return <span className="text-sm font-bold text-gray-400">ไม่มีไฟล์แนบ</span>;
  }

  const filesArray = Array.isArray(fileData) ? fileData : [fileData];
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {filesArray.map((file, idx) => {
        if (!file) return null;
        if (typeof file === "string") {
          return (
            <a
              key={idx}
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="font-semibold line-clamp-1 break-all">{`ไฟล์เอกสาร ${idx + 1}`}</span>
              <Download className="w-3.5 h-3.5 ml-auto sm:ml-1 text-gray-400 shrink-0" />
            </a>
          );
        }

        const rec = asRecord(file);
        const url = asString(rec?.url ?? rec?.publicUrl ?? rec?.path);
        const name = asString(rec?.name ?? rec?.fileName) || `ไฟล์เอกสาร ${idx + 1}`;
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

export default function EditBookingModal({
  visit,
  onClose,
  onSaved,
}: {
  visit: Visit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultPopup, setResultPopup] = useState<{ open: boolean; kind: "saved" | "canceled" }>({
    open: false,
    kind: "saved",
  });
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultActionRef = useRef<null | "saved" | "canceled">(null);

  const [hostOptions, setHostOptions] = useState<RefOptionRow[]>([]);
  const [executiveHostOptions, setExecutiveHostOptions] = useState<RefOptionRow[]>([]);
  const [meetingRoomOptions, setMeetingRoomOptions] = useState<MeetingRoomRow[]>([]);
  const [siteVisitAreaOptions, setSiteVisitAreaOptions] = useState<RefOptionRow[]>([]);
  const [souvenirGiftSetOptions, setSouvenirGiftSetOptions] = useState<RefOptionRow[]>([]);
  const [breakfastMenuOptions, setBreakfastMenuOptions] = useState<RefOptionRow[]>([]);
  const [lunchMenuOptions, setLunchMenuOptions] = useState<RefOptionRow[]>([]);
  const [lunchDessertOptions, setLunchDessertOptions] = useState<RefOptionRow[]>([]);
  const [dinnerMenuOptions, setDinnerMenuOptions] = useState<RefOptionRow[]>([]);
  const [dinnerDessertOptions, setDinnerDessertOptions] = useState<RefOptionRow[]>([]);
  const [allergyOptions, setAllergyOptions] = useState<RefOptionRow[]>([]);

  const [clientCompany, setClientCompany] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [country, setCountry] = useState("");
  const [visitorType, setVisitorType] = useState("");
  const [visitorTypeOther, setVisitorTypeOther] = useState("");
  const [submittedByPhone, setSubmittedByPhone] = useState("");
  const [hostName, setHostName] = useState("");
  const [executiveHostChoice, setExecutiveHostChoice] = useState("");
  const [submittedByName, setSubmittedByName] = useState("");
  const [submittedByPosition, setSubmittedByPosition] = useState("");
  const [purposeOfVisit, setPurposeOfVisit] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [meetingRoom, setMeetingRoom] = useState<YesNo | "">("");
  const [meetingRoomSelection, setMeetingRoomSelection] = useState("");
  const [transportType, setTransportType] = useState<"" | "personal" | "public">("");
  const [guests, setGuests] = useState<EditableGuest[]>([]);
  const [cars, setCars] = useState<EditableCar[]>([]);

  const [siteVisitAreas, setSiteVisitAreas] = useState<string[]>([]);
  const [siteVisitApproverName, setSiteVisitApproverName] = useState("");
  const [siteVisitApproverPosition, setSiteVisitApproverPosition] = useState("");

  const [foodRequired, setFoodRequired] = useState<YesNo | "">("");
  const [meals, setMeals] = useState<string[]>([]);
  const [breakfastMenu, setBreakfastMenu] = useState("");
  const [breakfastMenuOther, setBreakfastMenuOther] = useState("");
  const [lunchMenu, setLunchMenu] = useState("");
  const [lunchMenuOther, setLunchMenuOther] = useState("");
  const [lunchDessert, setLunchDessert] = useState("");
  const [lunchDessertOther, setLunchDessertOther] = useState("");
  const [dinnerMenu, setDinnerMenu] = useState("");
  const [dinnerMenuOther, setDinnerMenuOther] = useState("");
  const [dinnerDessert, setDinnerDessert] = useState("");
  const [dinnerDessertOther, setDinnerDessertOther] = useState("");
  const [halalEnabled, setHalalEnabled] = useState(false);
  const [halalCount, setHalalCount] = useState("");
  const [veganEnabled, setVeganEnabled] = useState(false);
  const [veganCount, setVeganCount] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyOther, setAllergyOther] = useState("");

  const [souvenir, setSouvenir] = useState<YesNo | "">("");
  const [souvenirGiftSet, setSouvenirGiftSet] = useState("");
  const [souvenirGiftSetCount, setSouvenirGiftSetCount] = useState("");
  const [souvenirExtra, setSouvenirExtra] = useState("");

  const [presentationFile, setPresentationFile] = useState<File | null>(null);
  const [removePresentation, setRemovePresentation] = useState(false);

  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visit) {
      setConfirmOpen(false);
      setResultPopup({ open: false, kind: "saved" });
      resultActionRef.current = null;
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, [visit]);

  const finishResult = () => {
    const action = resultActionRef.current;
    resultActionRef.current = null;
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    resultTimeoutRef.current = null;
    setResultPopup((prev) => ({ ...prev, open: false }));
    if (action === "saved") {
      onSaved();
      router.refresh();
      return;
    }
    if (action === "canceled") {
      onClose();
    }
  };

  const showResult = (kind: "saved" | "canceled") => {
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    resultTimeoutRef.current = null;
    resultActionRef.current = kind;
    setResultPopup({ open: true, kind });
    const durationMs = kind === "saved" ? 1800 : 1100;
    resultTimeoutRef.current = setTimeout(() => finishResult(), durationMs);
  };

  useEffect(() => {
    const load = async () => {
      const [hosts, executives, rooms, areas, giftSets, foodMenus, allergiesRes] = await Promise.all([
        supabase
          .from("hosts")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("executive_hosts")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("meeting_rooms")
          .select("code,name_th,name_en,location_th,location_en,capacity,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("code", { ascending: true }),
        supabase
          .from("site_visit_areas")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("souvenir_gift_sets")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("food_menu_options")
          .select("group_key,value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("group_key", { ascending: true })
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
        supabase
          .from("allergy_options")
          .select("value,label_th,label_en,sort_index,active")
          .eq("active", true)
          .order("sort_index", { ascending: true })
          .order("value", { ascending: true }),
      ]);

      setHostOptions(!hosts.error && Array.isArray(hosts.data) ? (hosts.data as RefOptionRow[]) : []);
      setExecutiveHostOptions(!executives.error && Array.isArray(executives.data) ? (executives.data as RefOptionRow[]) : []);
      setMeetingRoomOptions(!rooms.error && Array.isArray(rooms.data) ? (rooms.data as MeetingRoomRow[]) : []);
      setSiteVisitAreaOptions(!areas.error && Array.isArray(areas.data) ? (areas.data as RefOptionRow[]) : []);
      setSouvenirGiftSetOptions(!giftSets.error && Array.isArray(giftSets.data) ? (giftSets.data as RefOptionRow[]) : []);

      const foodMenuRows =
        !foodMenus.error && Array.isArray(foodMenus.data) ? (foodMenus.data as FoodMenuOptionRow[]) : [];
      const sortOtherLast = (items: RefOptionRow[]) => {
        const otherWords = new Set(["อื่นๆ", "other"]);
        return [...items].sort((a, b) => {
          const av = String(a.value ?? "").trim();
          const bv = String(b.value ?? "").trim();
          const al = String(a.label_th ?? "").trim();
          const bl = String(b.label_th ?? "").trim();
          const aIsOther = otherWords.has(av) || otherWords.has(al);
          const bIsOther = otherWords.has(bv) || otherWords.has(bl);
          if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
          const asi = Number(a.sort_index ?? 0);
          const bsi = Number(b.sort_index ?? 0);
          if (asi !== bsi) return asi - bsi;
          return av.localeCompare(bv, "th");
        });
      };
      const ensureOtherOption = (items: RefOptionRow[]) => {
        const hasOther = items.some((x) => {
          const v = String(x.value ?? "").trim();
          const th = String(x.label_th ?? "").trim();
          return v === "อื่นๆ" || v.toLowerCase() === "other" || th === "อื่นๆ";
        });
        if (hasOther) return items;
        return [
          ...items,
          { value: "อื่นๆ", label_th: "อื่นๆ", label_en: "Other", sort_index: 999999, active: true },
        ];
      };
      const readFoodGroup = (key: string) =>
        sortOtherLast(
          ensureOtherOption(
          foodMenuRows
          .filter((row) => String(row.group_key ?? "") === key)
          .map((row) => ({
            value: String(row.value ?? "").trim(),
            label_th: row.label_th ?? null,
            label_en: row.label_en ?? null,
            sort_index: row.sort_index ?? null,
            active: row.active ?? null,
          }))
          .filter((row) => row.value)
          )
        );

      setBreakfastMenuOptions(readFoodGroup("breakfast"));
      setLunchMenuOptions(readFoodGroup("lunch_main"));
      setLunchDessertOptions(readFoodGroup("lunch_dessert"));
      setDinnerMenuOptions(readFoodGroup("dinner_main"));
      setDinnerDessertOptions(readFoodGroup("dinner_dessert"));

      setAllergyOptions(
        !allergiesRes.error && Array.isArray(allergiesRes.data)
          ? (allergiesRes.data as RefOptionRow[])
              .map((row) => ({
                value: String(row.value ?? "").trim(),
                label_th: row.label_th ?? null,
                label_en: row.label_en ?? null,
                sort_index: row.sort_index ?? null,
                active: row.active ?? null,
              }))
              .filter((row) => row.value)
          : []
      );
    };

    void load();
  }, [supabase]);

  useEffect(() => {
    if (!visit) return;

    setErrorMessage("");
    setConfirmOpen(false);
    setPresentationFile(null);
    setRemovePresentation(false);

    setLoading(true);

    const visitRecord = asRecord(visit);
    setClientCompany(visit.clientCompany || "");
    setCompanyAddress(asString(visitRecord?.companyAddress));
    setCountry(asString(visitRecord?.country));
    setVisitorType(asString(visitRecord?.visitorType));
    setVisitorTypeOther(asString(visitRecord?.visitorTypeOther));
    setHostName(visit.hostName || "");
    setPurposeOfVisit(asString(visitRecord?.purposeOfVisit));

    const baseIso = visit.visitDateTime || visit.created_at || "";
    setVisitDate(toIsoDateInput(baseIso));
    setVisitTime(toIsoTimeInput(baseIso));

    const meetingSel = visit.meetingRoomSelection || "";
    setMeetingRoom(meetingSel ? "yes" : "no");
    setMeetingRoomSelection(meetingSel);

    setTransportType(visit.transportType === "personal" || visit.transportType === "public" ? visit.transportType : "");

    const sub = asRecord(unwrapKey(visit.submittedBy, "submittedBy"));
    setSubmittedByName(asString(sub?.name));
    setSubmittedByPosition(asString(sub?.position));
    setSubmittedByPhone(asString(sub?.phone) || visit.contactPhone || "");

    const ex = asRecord(unwrapKey(visit.executiveHost, "executiveHost"));
    setExecutiveHostChoice(asString(ex?.name));

    const sv = asRecord(unwrapKey(visit.siteVisit, "siteVisit"));
    const svAreas = asStringArray(sv?.areas);
    setSiteVisitAreas(svAreas);
    setSiteVisitApproverName(asString(sv?.approverName));
    setSiteVisitApproverPosition(asString(sv?.approverPosition));

    const fp = asRecord(unwrapKey(visit.foodPreferences, "foodPreferences"));
    const hasFood = !!fp;
    setFoodRequired(hasFood ? "yes" : "no");
    const fpMeals = asStringArray(fp?.meals);
    setMeals(fpMeals);
    const menus = asRecord(fp?.menus);
    const lunch = asRecord(menus?.lunch);
    const dinner = asRecord(menus?.dinner);
    setBreakfastMenu(asString(menus?.breakfast));
    setBreakfastMenuOther(asString(menus?.breakfastOther));
    setLunchMenu(asString(lunch?.main));
    setLunchMenuOther(asString(lunch?.otherMain));
    setLunchDessert(asString(lunch?.dessert));
    setLunchDessertOther(asString(lunch?.otherDessert));
    setDinnerMenu(asString(dinner?.main));
    setDinnerMenuOther(asString(dinner?.otherMain));
    setDinnerDessert(asString(dinner?.dessert));
    setDinnerDessertOther(asString(dinner?.otherDessert));
    const specialDiet = asRecord(fp?.specialDiet);
    const halalSets = hasFood ? asNumber(specialDiet?.halalSets) : 0;
    const veganSets = hasFood ? asNumber(specialDiet?.veganSets) : 0;
    setHalalEnabled(Number.isFinite(halalSets) && halalSets > 0);
    setHalalCount(Number.isFinite(halalSets) && halalSets > 0 ? String(halalSets) : "");
    setVeganEnabled(Number.isFinite(veganSets) && veganSets > 0);
    setVeganCount(Number.isFinite(veganSets) && veganSets > 0 ? String(veganSets) : "");
    const allergyRec = asRecord(fp?.allergies);
    const allergyItems = asStringArray(allergyRec?.items);
    setAllergies(allergyItems);
    setAllergyOther(asString(allergyRec?.other));

    const sp = asRecord(unwrapKey(visit.souvenirPreferences, "souvenirPreferences"));
    const hasSouvenir = !!sp;
    setSouvenir(hasSouvenir ? "yes" : "no");
    setSouvenirGiftSet(asString(sp?.giftSet));
    const spCount = hasSouvenir ? asNumber(sp?.count) : 0;
    setSouvenirGiftSetCount(Number.isFinite(spCount) && spCount > 0 ? String(spCount) : "");
    setSouvenirExtra(asString(sp?.extra));

    setGuests(normalizeEditableGuests(visit.guests));
    setCars(normalizeEditableCars(visit.cars));

    const visitorId = visit.id;
    void (async () => {
      try {
        const [guestsRes, carsRes, foodRes, siteRes, souvenirRes] = await Promise.all([
          supabase
            .from("vip_visitor_guests")
            .select("firstName,middleName,lastName,company,position,nationality,sortIndex")
            .eq("visitorId", visitorId)
            .order("sortIndex", { ascending: true }),
          supabase
            .from("vip_visitor_cars")
            .select("brand,license,sortIndex")
            .eq("visitorId", visitorId)
            .order("sortIndex", { ascending: true }),
          supabase.from("vip_visitor_food").select("foodPreferences").eq("visitorId", visitorId).maybeSingle(),
          supabase.from("vip_visitor_site_visit").select("siteVisit").eq("visitorId", visitorId).maybeSingle(),
          supabase.from("vip_visitor_souvenir").select("souvenirPreferences").eq("visitorId", visitorId).maybeSingle(),
        ]);

        if (!guestsRes.error && Array.isArray(guestsRes.data)) {
          setGuests(
            guestsRes.data.map((g) => ({
              firstName: typeof g?.firstName === "string" ? g.firstName : "",
              middleName: typeof g?.middleName === "string" ? g.middleName : "",
              lastName: typeof g?.lastName === "string" ? g.lastName : "",
              company: typeof g?.company === "string" ? g.company : "",
              position: typeof g?.position === "string" ? g.position : "",
              nationality: typeof g?.nationality === "string" ? g.nationality : "",
            }))
          );
        }

        if (!carsRes.error && Array.isArray(carsRes.data)) {
          setCars(
            carsRes.data.map((c) => ({
              brand: typeof c?.brand === "string" ? c.brand : "",
              license: typeof c?.license === "string" ? c.license : "",
            }))
          );
        }

        if (!foodRes.error) {
          const fpDb = asRecord(foodRes.data)?.foodPreferences;
          const fpRec = asRecord(fpDb);
          const hasFoodDb = !!fpRec;
          setFoodRequired(hasFoodDb ? "yes" : "no");
          const fpMealsDb = asStringArray(fpRec?.meals);
          setMeals(fpMealsDb);
          const menusDb = asRecord(fpRec?.menus);
          const lunchDb = asRecord(menusDb?.lunch);
          const dinnerDb = asRecord(menusDb?.dinner);
          setBreakfastMenu(asString(menusDb?.breakfast));
          setBreakfastMenuOther(asString(menusDb?.breakfastOther));
          setLunchMenu(asString(lunchDb?.main));
          setLunchMenuOther(asString(lunchDb?.otherMain));
          setLunchDessert(asString(lunchDb?.dessert));
          setLunchDessertOther(asString(lunchDb?.otherDessert));
          setDinnerMenu(asString(dinnerDb?.main));
          setDinnerMenuOther(asString(dinnerDb?.otherMain));
          setDinnerDessert(asString(dinnerDb?.dessert));
          setDinnerDessertOther(asString(dinnerDb?.otherDessert));
          const sdDb = asRecord(fpRec?.specialDiet);
          const halalSetsDb = hasFoodDb ? asNumber(sdDb?.halalSets) : 0;
          const veganSetsDb = hasFoodDb ? asNumber(sdDb?.veganSets) : 0;
          setHalalEnabled(Number.isFinite(halalSetsDb) && halalSetsDb > 0);
          setHalalCount(Number.isFinite(halalSetsDb) && halalSetsDb > 0 ? String(halalSetsDb) : "");
          setVeganEnabled(Number.isFinite(veganSetsDb) && veganSetsDb > 0);
          setVeganCount(Number.isFinite(veganSetsDb) && veganSetsDb > 0 ? String(veganSetsDb) : "");
          const allergyDb = asRecord(fpRec?.allergies);
          const allergyItemsDb = asStringArray(allergyDb?.items);
          setAllergies(allergyItemsDb);
          setAllergyOther(asString(allergyDb?.other));
        }

        if (!siteRes.error) {
          const svDb = asRecord(siteRes.data)?.siteVisit;
          const svRec = asRecord(svDb);
          const svAreasDb = asStringArray(svRec?.areas);
          setSiteVisitAreas(svAreasDb);
          setSiteVisitApproverName(asString(svRec?.approverName));
          setSiteVisitApproverPosition(asString(svRec?.approverPosition));
        }

        if (!souvenirRes.error) {
          const spDb = asRecord(souvenirRes.data)?.souvenirPreferences;
          const spRec = asRecord(spDb);
          const hasSouvenirDb = !!spRec;
          setSouvenir(hasSouvenirDb ? "yes" : "no");
          setSouvenirGiftSet(asString(spRec?.giftSet));
          const spCountDb = hasSouvenirDb ? asNumber(spRec?.count) : 0;
          setSouvenirGiftSetCount(Number.isFinite(spCountDb) && spCountDb > 0 ? String(spCountDb) : "");
          setSouvenirExtra(asString(spRec?.extra));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, visit]);

  const close = () => {
    if (saving) return;
    setConfirmOpen(false);
    setErrorMessage("");
    showResult("canceled");
  };

  const validateBeforeSave = () => {
    if (!visitDate.trim() || !visitTime.trim()) {
      setErrorMessage("กรุณาเลือกวันและเวลา");
      return false;
    }
    if (!clientCompany.trim() || !companyAddress.trim() || !country.trim()) {
      setErrorMessage("กรุณากรอกข้อมูลบริษัทที่เชิญมาให้ครบ (ชื่อบริษัท/ที่อยู่/ประเทศ)");
      return false;
    }
    if (!visitorType.trim() || (visitorType === "อื่นๆ" && !visitorTypeOther.trim())) {
      setErrorMessage("กรุณาเลือกประเภทผู้เข้าเยี่ยมชม");
      return false;
    }
    if (!hostName.trim() || !executiveHostChoice.trim() || !submittedByName.trim() || !submittedByPosition.trim() || !submittedByPhone.trim()) {
      setErrorMessage("กรุณากรอกข้อมูลผู้ดูแลภายในองค์กรให้ครบ");
      return false;
    }
    if (!purposeOfVisit.trim()) {
      setErrorMessage("กรุณากรอกวัตถุประสงค์ในการเข้าพบ");
      return false;
    }
    if (!meetingRoom) {
      setErrorMessage("กรุณาระบุว่าต้องการห้องประชุมหรือไม่");
      return false;
    }
    if (meetingRoom === "yes" && !meetingRoomSelection.trim()) {
      setErrorMessage("กรุณาเลือกห้องประชุม");
      return false;
    }
    if (guests.length === 0) {
      setErrorMessage("กรุณาเพิ่มรายชื่อผู้เข้าร่วมอย่างน้อย 1 คน");
      return false;
    }
    for (let index = 0; index < guests.length; index += 1) {
      const g = guests[index];
      if (!g.firstName.trim() || !g.lastName.trim() || !g.company.trim() || !g.position.trim() || !g.nationality.trim()) {
        setErrorMessage(`กรุณากรอกข้อมูลผู้เข้าร่วมคนที่ ${index + 1} ให้ครบ`);
        return false;
      }
    }
    if (siteVisitAreas.length > 0 && (!siteVisitApproverName.trim() || !siteVisitApproverPosition.trim())) {
      setErrorMessage("กรุณากรอกข้อมูลผู้อนุญาตให้เข้าชม");
      return false;
    }
    if (!transportType) {
      setErrorMessage("กรุณาเลือกประเภทรถ");
      return false;
    }
    if (transportType === "personal" && cars.length === 0) {
      setErrorMessage("กรุณาเพิ่มข้อมูลรถอย่างน้อย 1 คัน");
      return false;
    }
    if (!foodRequired) {
      setErrorMessage("กรุณาระบุว่าจะรับอาหารหรือไม่");
      return false;
    }
    if (foodRequired === "yes") {
      if (meals.length === 0) {
        setErrorMessage("กรุณาเลือกมื้ออาหารที่ต้องการ");
        return false;
      }
      if (meals.includes("เช้า") && !breakfastMenu.trim()) {
        setErrorMessage("กรุณาเลือกเมนูอาหารเช้า");
        return false;
      }
      if (meals.includes("เช้า") && isOtherMenuValue(breakfastMenu) && !breakfastMenuOther.trim()) {
        setErrorMessage("กรุณาระบุเมนูอาหารเช้า (อื่นๆ)");
        return false;
      }
      if (meals.includes("กลางวัน") && (!lunchMenu.trim() || !lunchDessert.trim())) {
        setErrorMessage("กรุณาเลือกเมนูอาหารกลางวันและของหวาน");
        return false;
      }
      if (meals.includes("กลางวัน") && isOtherMenuValue(lunchMenu) && !lunchMenuOther.trim()) {
        setErrorMessage("กรุณาระบุเมนูอาหารกลางวัน (อื่นๆ)");
        return false;
      }
      if (meals.includes("กลางวัน") && isOtherMenuValue(lunchDessert) && !lunchDessertOther.trim()) {
        setErrorMessage("กรุณาระบุของหวาน (กลางวัน) (อื่นๆ)");
        return false;
      }
      if (meals.includes("เย็น") && (!dinnerMenu.trim() || !dinnerDessert.trim())) {
        setErrorMessage("กรุณาเลือกเมนูอาหารเย็นและของหวาน");
        return false;
      }
      if (meals.includes("เย็น") && isOtherMenuValue(dinnerMenu) && !dinnerMenuOther.trim()) {
        setErrorMessage("กรุณาระบุเมนูอาหารเย็น (อื่นๆ)");
        return false;
      }
      if (meals.includes("เย็น") && isOtherMenuValue(dinnerDessert) && !dinnerDessertOther.trim()) {
        setErrorMessage("กรุณาระบุของหวาน (เย็น) (อื่นๆ)");
        return false;
      }
      if (halalEnabled && Number(halalCount || 0) <= 0) {
        setErrorMessage("กรุณาระบุจำนวนชุดอาหารฮาลาล");
        return false;
      }
      if (veganEnabled && Number(veganCount || 0) <= 0) {
        setErrorMessage("กรุณาระบุจำนวนชุดอาหารวีแกน");
        return false;
      }
      if (allergies.includes("อื่นๆ") && !allergyOther.trim()) {
        setErrorMessage("กรุณาระบุรายการแพ้อาหาร (อื่นๆ)");
        return false;
      }
    }
    if (!souvenir) {
      setErrorMessage("กรุณาระบุว่าจะรับของที่ระลึกหรือไม่");
      return false;
    }
    if (souvenir === "yes") {
      if (!souvenirGiftSet.trim()) {
        setErrorMessage("กรุณาเลือกประเภทของที่ระลึก");
        return false;
      }
      if (Number(souvenirGiftSetCount || 0) <= 0) {
        setErrorMessage("กรุณาระบุจำนวนชุดของที่ระลึก");
        return false;
      }
    }
    setErrorMessage("");
    return true;
  };

  const save = async () => {
    if (!visit) return;
    if (!validateBeforeSave()) return;

    setSaving(true);
    try {
      const visitDateTime = buildIsoUtc(visitDate, visitTime);

      const carsPayload = transportType === "personal" ? cars : [];
      const siteVisitPayload =
        siteVisitAreas.length > 0
          ? { areas: siteVisitAreas, approverName: siteVisitApproverName, approverPosition: siteVisitApproverPosition }
          : null;

      const foodPreferencesPayload =
        foodRequired === "yes"
          ? {
              meals,
              menus: {
                breakfast: meals.includes("เช้า") ? breakfastMenu : "",
                breakfastOther: meals.includes("เช้า") && isOtherMenuValue(breakfastMenu) ? breakfastMenuOther : "",
                lunch: meals.includes("กลางวัน")
                  ? {
                      main: lunchMenu,
                      dessert: lunchDessert,
                      otherMain: isOtherMenuValue(lunchMenu) ? lunchMenuOther : "",
                      otherDessert: isOtherMenuValue(lunchDessert) ? lunchDessertOther : "",
                    }
                  : { main: "", dessert: "", otherMain: "", otherDessert: "" },
                dinner: meals.includes("เย็น")
                  ? {
                      main: dinnerMenu,
                      dessert: dinnerDessert,
                      otherMain: isOtherMenuValue(dinnerMenu) ? dinnerMenuOther : "",
                      otherDessert: isOtherMenuValue(dinnerDessert) ? dinnerDessertOther : "",
                    }
                  : { main: "", dessert: "", otherMain: "", otherDessert: "" },
              },
              specialDiet: {
                halalSets: halalEnabled ? Number(halalCount || 0) : 0,
                veganSets: veganEnabled ? Number(veganCount || 0) : 0,
              },
              allergies: {
                items: allergies,
                other: allergyOther,
              },
            }
          : null;

      const souvenirPreferencesPayload =
        souvenir === "yes"
          ? { giftSet: souvenirGiftSet, count: Number(souvenirGiftSetCount || 0), extra: souvenirExtra }
          : null;

      const executiveHostPayload = { type: "preset", name: executiveHostChoice };
      const submittedByPayload = { name: submittedByName, position: submittedByPosition, phone: submittedByPhone };
      const meetingRoomSelectionPayload = meetingRoom === "yes" ? meetingRoomSelection : "";

      const response = await fetch("/api/admin/visitor-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: visit.id,
          data: {
            clientCompany,
            companyAddress,
            country,
            visitorType,
            visitorTypeOther: visitorType === "อื่นๆ" ? visitorTypeOther : "",
            contactPhone: submittedByPhone,
            purposeOfVisit,
            hostName,
            visitDateTime,
            meetingRoomSelection: meetingRoomSelectionPayload,
            transportType,
            executiveHost: executiveHostPayload,
            submittedBy: submittedByPayload,
          },
          guests,
          cars: carsPayload,
          siteVisit: siteVisitPayload,
          foodPreferences: foodPreferencesPayload,
          souvenirPreferences: souvenirPreferencesPayload,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? `Request failed: ${response.status}`);
      }

      if (removePresentation) {
        const fd = new FormData();
        fd.append("id", String(visit.id));
        fd.append("remove", "true");
        const pr = await fetch("/api/admin/visitor-presentation", { method: "POST", body: fd });
        const r = await pr.json().catch(() => ({}));
        if (!pr.ok || r?.success === false) throw new Error(r?.error ?? `Request failed: ${pr.status}`);
      } else if (presentationFile) {
        const fd = new FormData();
        fd.append("id", String(visit.id));
        fd.append("presentationFile", presentationFile);
        const pr = await fetch("/api/admin/visitor-presentation", { method: "POST", body: fd });
        const r = await pr.json().catch(() => ({}));
        if (!pr.ok || r?.success === false) throw new Error(r?.error ?? `Request failed: ${pr.status}`);
      }

      setConfirmOpen(false);
      showResult("saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const cardClass = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";
  const labelClass = "text-sm font-semibold text-gray-700";
  const controlClass =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-200";
  const controlDisabledClass = `${controlClass} disabled:bg-gray-100`;
  const smallBtnClass =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50";
  const dangerBtnClass =
    "rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50";

  const isOtherMenuValue = (value: string) => {
    const v = String(value ?? "").trim();
    return v === "อื่นๆ" || v.toLowerCase() === "other";
  };

  const guestTitle = (g: EditableGuest) => {
    const fullName = [g.firstName, g.middleName, g.lastName].map((x) => x.trim()).filter(Boolean).join(" ");
    return fullName || "ผู้เข้าร่วม";
  };

  const carTitle = (c: EditableCar) => {
    const brand = c.brand.trim();
    const license = c.license.trim();
    const text = [brand, license].filter(Boolean).join(" / ");
    return text || "รถยนต์";
  };

  if (!visit) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onMouseDown={(e) => {
          if (e.currentTarget === e.target) close();
        }}
      >
        <div className="w-full max-w-7xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <div className="text-lg font-bold text-gray-900">แก้ไขการจอง</div>
              <div className="text-sm text-gray-500">Edit booking details</div>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              ปิด
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-6 bg-gray-50/30">
            <div className="grid gap-5">
              <div className="space-y-5">
                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">ข้อมูลพื้นฐาน</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>วันที่</label>
                      <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={controlClass} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>เวลา</label>
                      <select value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className={controlClass}>
                        <option value="">เลือกเวลา</option>
                        {timeSlots.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ชื่อบริษัทที่เชิญมา</label>
                      <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className={controlClass} placeholder="เช่น ABC" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ที่อยู่บริษัทที่เชิญมา</label>
                      <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className={controlClass} placeholder="เช่น 123 ถนนสุขุมวิท" />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ประเทศของบริษัทที่เชิญมา</label>
                      <input value={country} onChange={(e) => setCountry(e.target.value)} className={controlClass} placeholder="เช่น ไทย" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ประเภทผู้เข้าเยี่ยมชม</label>
                      <select value={visitorType} onChange={(e) => {
                        const v = e.target.value;
                        setVisitorType(v);
                        if (v !== "อื่นๆ") setVisitorTypeOther("");
                      }} className={controlClass}>
                        <option value="">เลือกประเภท</option>
                        <option value="ลูกค้า">ลูกค้า</option>
                        <option value="หน่วยงานราชการ">หน่วยงานราชการ</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                      {visitorType === "อื่นๆ" && (
                        <input value={visitorTypeOther} onChange={(e) => setVisitorTypeOther(e.target.value)} className={controlClass} placeholder="ระบุประเภทอื่นๆ" />
                      )}
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">ผู้ติดต่อ</div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ผู้ติดต่อ (Host)</label>
                      <select value={hostName} onChange={(e) => setHostName(e.target.value)} className={controlClass}>
                        <option value="">เลือก Host</option>
                        {hostOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {optionLabelTh(o)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Executive Host</label>
                      <select value={executiveHostChoice} onChange={(e) => setExecutiveHostChoice(e.target.value)} className={controlClass}>
                        <option value="">เลือก Executive Host</option>
                        {executiveHostOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {optionLabelTh(o)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">ผู้กรอก</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ชื่อ</label>
                      <input value={submittedByName} onChange={(e) => setSubmittedByName(e.target.value)} className={controlClass} placeholder="ชื่อผู้กรอก" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ตำแหน่ง</label>
                      <input
                        value={submittedByPosition}
                        onChange={(e) => setSubmittedByPosition(e.target.value)}
                        className={controlClass}
                        placeholder="ตำแหน่งผู้กรอก"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>เบอร์ผู้ประสานงาน</label>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={submittedByPhone}
                        onChange={(e) => setSubmittedByPhone(e.target.value)}
                        className={controlClass}
                        placeholder="0XXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">วัตถุประสงค์ในการเข้าพบ</div>
                  <div className="mt-4 grid gap-3">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>วัตถุประสงค์</label>
                      <input value={purposeOfVisit} onChange={(e) => setPurposeOfVisit(e.target.value)} className={controlClass} placeholder="เช่น ประชุม ติดตามงาน" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">การเดินทางและห้องประชุม</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>การเดินทาง</label>
                      <select
                        value={transportType}
                        onChange={(e) => setTransportType(e.target.value as "" | "personal" | "public")}
                        className={controlClass}
                      >
                        <option value="">เลือก</option>
                        <option value="public">รถสาธารณะ</option>
                        <option value="personal">รถส่วนตัว</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>ต้องการห้องประชุม</label>
                      <select
                        value={meetingRoom}
                        onChange={(e) => {
                          const next = e.target.value as YesNo | "";
                          setMeetingRoom(next);
                          if (next !== "yes") setMeetingRoomSelection("");
                        }}
                        className={controlClass}
                      >
                        <option value="">เลือก</option>
                        <option value="yes">ต้องการ</option>
                        <option value="no">ไม่ต้องการ</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-1">
                    <label className={labelClass}>เลือกห้องประชุม</label>
                    <select
                      value={meetingRoomSelection}
                      onChange={(e) => setMeetingRoomSelection(e.target.value)}
                      disabled={meetingRoom !== "yes"}
                      className={controlDisabledClass}
                    >
                      <option value="">เลือกห้องประชุม</option>
                      {meetingRoomOptions.map((r) => (
                        <option key={r.code} value={meetingRoomLabelTh(r)}>
                          {meetingRoomLabelTh(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={cardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900">รายชื่อผู้เข้าร่วม</div>
                      <div className="mt-1 text-xs text-gray-500">กรอกอย่างน้อย 1 คน</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setGuests((prev) => [
                          ...prev,
                          { firstName: "", middleName: "", lastName: "", company: "", position: "", nationality: "" },
                        ])
                      }
                      className={smallBtnClass}
                    >
                      เพิ่มแขก
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {guests.length === 0 && <div className="text-sm text-gray-500">ไม่มีรายชื่อผู้เข้าร่วม</div>}
                    {guests.map((g, index) => (
                      <details key={index} className="rounded-xl border border-gray-200 bg-white p-3 group">
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700">
                                  {index + 1}
                                </span>
                                <div className="text-sm font-semibold text-gray-900 truncate">{guestTitle(g)}</div>
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {[g.company, g.position, g.nationality].map((x) => x.trim()).filter(Boolean).join(" • ") || "กดเพื่อกรอกข้อมูลเพิ่มเติม"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setGuests((prev) => prev.filter((_, i) => i !== index));
                              }}
                              className={dangerBtnClass}
                            >
                              ลบ
                            </button>
                          </div>
                        </summary>

                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <input
                            value={g.firstName}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, firstName: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="ชื่อ"
                          />
                          <input
                            value={g.middleName}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, middleName: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="ชื่อกลาง"
                          />
                          <input
                            value={g.lastName}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, lastName: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="นามสกุล"
                          />
                          <input
                            value={g.company}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, company: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="บริษัท"
                          />
                          <input
                            value={g.position}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, position: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="ตำแหน่ง"
                          />
                          <input
                            value={g.nationality}
                            onChange={(e) =>
                              setGuests((prev) => prev.map((x, i) => (i === index ? { ...x, nationality: e.target.value } : x)))
                            }
                            className={controlClass}
                            placeholder="สัญชาติ"
                          />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>

                {transportType === "personal" && (
                  <div className={cardClass}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900">ข้อมูลรถ</div>
                      <button
                        type="button"
                        onClick={() => setCars((prev) => [...prev, { brand: "", license: "" }])}
                        className={smallBtnClass}
                      >
                        เพิ่มรถ
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      {cars.map((c, index) => (
                        <details key={index} className="rounded-xl border border-gray-200 bg-white p-3 group">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700">
                                    {index + 1}
                                  </span>
                                  <div className="text-sm font-semibold text-gray-900 truncate">{carTitle(c)}</div>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">กดเพื่อแก้ไขข้อมูลรถ</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCars((prev) => prev.filter((_, i) => i !== index));
                                }}
                                className={dangerBtnClass}
                              >
                                ลบ
                              </button>
                            </div>
                          </summary>
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            <input
                              value={c.brand}
                              onChange={(e) =>
                                setCars((prev) => prev.map((x, i) => (i === index ? { ...x, brand: e.target.value } : x)))
                              }
                              className={controlClass}
                              placeholder="ยี่ห้อ"
                            />
                            <input
                              value={c.license}
                              onChange={(e) =>
                                setCars((prev) => prev.map((x, i) => (i === index ? { ...x, license: e.target.value } : x)))
                              }
                              className={controlClass}
                              placeholder="ทะเบียน"
                            />
                          </div>
                        </details>
                      ))}
                      {cars.length === 0 && <div className="text-sm text-gray-500">ไม่มีข้อมูลรถ</div>}
                    </div>
                  </div>
                )}

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">การเข้าชมพื้นที่</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {siteVisitAreaOptions.map((o) => {
                      const checked = siteVisitAreas.includes(o.value);
                      return (
                        <label key={o.value} className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSiteVisitAreas((prev) => (checked ? prev.filter((x) => x !== o.value) : [...prev, o.value]))
                            }
                          />
                          {optionLabelTh(o)}
                        </label>
                      );
                    })}
                  </div>
                  {siteVisitAreas.length > 0 && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className={labelClass}>ผู้อนุญาต (ชื่อ)</label>
                        <input
                          value={siteVisitApproverName}
                          onChange={(e) => setSiteVisitApproverName(e.target.value)}
                          className={controlClass}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={labelClass}>ผู้อนุญาต (ตำแหน่ง)</label>
                        <input
                          value={siteVisitApproverPosition}
                          onChange={(e) => setSiteVisitApproverPosition(e.target.value)}
                          className={controlClass}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">อาหาร</div>
                  <div className="mt-3 flex flex-col gap-1">
                    <label className={labelClass}>รับอาหาร</label>
                    <select
                      value={foodRequired}
                      onChange={(e) => {
                        const next = e.target.value as YesNo | "";
                        setFoodRequired(next);
                        if (next !== "yes") {
                          setMeals([]);
                          setBreakfastMenu("");
                          setBreakfastMenuOther("");
                          setLunchMenu("");
                          setLunchMenuOther("");
                          setLunchDessert("");
                          setLunchDessertOther("");
                          setDinnerMenu("");
                          setDinnerMenuOther("");
                          setDinnerDessert("");
                          setDinnerDessertOther("");
                          setHalalEnabled(false);
                          setHalalCount("");
                          setVeganEnabled(false);
                          setVeganCount("");
                          setAllergies([]);
                          setAllergyOther("");
                        }
                      }}
                      className={controlClass}
                    >
                      <option value="">เลือก</option>
                      <option value="yes">รับ</option>
                      <option value="no">ไม่รับ</option>
                    </select>
                  </div>

                  {foodRequired === "yes" && (
                    <div className="mt-3 space-y-4">
                      <div className="grid gap-2 md:grid-cols-3">
                        {["เช้า", "กลางวัน", "อาหารว่างบ่าย", "เย็น", "อาหารว่างเช้า"].map((meal) => {
                          const checked = meals.includes(meal);
                          return (
                            <label key={meal} className="flex items-center gap-2 text-sm text-gray-800">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setMeals((prev) => (checked ? prev.filter((x) => x !== meal) : [...prev, meal]))}
                              />
                              {meal}
                            </label>
                          );
                        })}
                      </div>

                      {meals.includes("เช้า") && (
                        <div className="flex flex-col gap-1">
                          <label className={labelClass}>เมนูอาหารเช้า</label>
                          <select
                            value={breakfastMenu}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBreakfastMenu(v);
                              if (!isOtherMenuValue(v)) setBreakfastMenuOther("");
                            }}
                            className={controlClass}
                          >
                            <option value="">เลือกเมนู</option>
                            {breakfastMenuOptions.map((o) => (
                              <option key={o.value} value={o.value}>
                                {optionLabelTh(o)}
                              </option>
                            ))}
                          </select>
                          {isOtherMenuValue(breakfastMenu) && (
                            <input
                              value={breakfastMenuOther}
                              onChange={(e) => setBreakfastMenuOther(e.target.value)}
                              className={controlClass}
                              placeholder="ระบุเมนูอื่นๆ (เช้า)"
                            />
                          )}
                        </div>
                      )}

                      {meals.includes("กลางวัน") && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className={labelClass}>เมนูอาหารกลางวัน</label>
                            <select
                              value={lunchMenu}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLunchMenu(v);
                                if (!isOtherMenuValue(v)) setLunchMenuOther("");
                              }}
                              className={controlClass}
                            >
                              <option value="">เลือกเมนู</option>
                              {lunchMenuOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {optionLabelTh(o)}
                                </option>
                              ))}
                            </select>
                            {isOtherMenuValue(lunchMenu) && (
                              <input
                                value={lunchMenuOther}
                                onChange={(e) => setLunchMenuOther(e.target.value)}
                                className={controlClass}
                                placeholder="ระบุเมนูอื่นๆ (กลางวัน)"
                              />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelClass}>ของหวาน (กลางวัน)</label>
                            <select
                              value={lunchDessert}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLunchDessert(v);
                                if (!isOtherMenuValue(v)) setLunchDessertOther("");
                              }}
                              className={controlClass}
                            >
                              <option value="">เลือกเมนู</option>
                              {lunchDessertOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {optionLabelTh(o)}
                                </option>
                              ))}
                            </select>
                            {isOtherMenuValue(lunchDessert) && (
                              <input
                                value={lunchDessertOther}
                                onChange={(e) => setLunchDessertOther(e.target.value)}
                                className={controlClass}
                                placeholder="ระบุของหวานอื่นๆ (กลางวัน)"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {meals.includes("เย็น") && (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex flex-col gap-1">
                            <label className={labelClass}>เมนูอาหารเย็น</label>
                            <select
                              value={dinnerMenu}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDinnerMenu(v);
                                if (!isOtherMenuValue(v)) setDinnerMenuOther("");
                              }}
                              className={controlClass}
                            >
                              <option value="">เลือกเมนู</option>
                              {dinnerMenuOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {optionLabelTh(o)}
                                </option>
                              ))}
                            </select>
                            {isOtherMenuValue(dinnerMenu) && (
                              <input
                                value={dinnerMenuOther}
                                onChange={(e) => setDinnerMenuOther(e.target.value)}
                                className={controlClass}
                                placeholder="ระบุเมนูอื่นๆ (เย็น)"
                              />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className={labelClass}>ของหวาน (เย็น)</label>
                            <select
                              value={dinnerDessert}
                              onChange={(e) => {
                                const v = e.target.value;
                                setDinnerDessert(v);
                                if (!isOtherMenuValue(v)) setDinnerDessertOther("");
                              }}
                              className={controlClass}
                            >
                              <option value="">เลือกเมนู</option>
                              {dinnerDessertOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {optionLabelTh(o)}
                                </option>
                              ))}
                            </select>
                            {isOtherMenuValue(dinnerDessert) && (
                              <input
                                value={dinnerDessertOther}
                                onChange={(e) => setDinnerDessertOther(e.target.value)}
                                className={controlClass}
                                placeholder="ระบุของหวานอื่นๆ (เย็น)"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input type="checkbox" checked={halalEnabled} onChange={(e) => setHalalEnabled(e.target.checked)} />
                          ฮาลาล
                        </label>
                        <input
                          value={halalCount}
                          onChange={(e) => setHalalCount(e.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                          className={controlDisabledClass}
                          placeholder="จำนวนชุดฮาลาล"
                          disabled={!halalEnabled}
                        />
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input type="checkbox" checked={veganEnabled} onChange={(e) => setVeganEnabled(e.target.checked)} />
                          วีแกน
                        </label>
                        <input
                          value={veganCount}
                          onChange={(e) => setVeganCount(e.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                          className={controlDisabledClass}
                          placeholder="จำนวนชุดวีแกน"
                          disabled={!veganEnabled}
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-gray-700">แพ้อาหาร</div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {allergyOptions.map((o) => {
                            const checked = allergies.includes(o.value);
                            return (
                              <label key={o.value} className="flex items-center gap-2 text-sm text-gray-800">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setAllergies((prev) => (checked ? prev.filter((x) => x !== o.value) : [...prev, o.value]))}
                                />
                                {optionLabelTh(o)}
                              </label>
                            );
                          })}
                        </div>
                        {allergies.includes("อื่นๆ") && (
                          <div className="mt-2">
                            <input
                              value={allergyOther}
                              onChange={(e) => setAllergyOther(e.target.value)}
                              className={`w-full ${controlClass}`}
                              placeholder="ระบุแพ้อาหารอื่นๆ"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">ของที่ระลึก</div>
                  <div className="mt-3 flex flex-col gap-1">
                    <label className={labelClass}>รับของที่ระลึก</label>
                    <select
                      value={souvenir}
                      onChange={(e) => {
                        const next = e.target.value as YesNo | "";
                        setSouvenir(next);
                        if (next !== "yes") {
                          setSouvenirGiftSet("");
                          setSouvenirGiftSetCount("");
                          setSouvenirExtra("");
                        }
                      }}
                      className={controlClass}
                    >
                      <option value="">เลือก</option>
                      <option value="yes">รับ</option>
                      <option value="no">ไม่รับ</option>
                    </select>
                  </div>
                  {souvenir === "yes" && (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className={labelClass}>ประเภทของที่ระลึก</label>
                        <select
                          value={souvenirGiftSet}
                          onChange={(e) => setSouvenirGiftSet(e.target.value)}
                          className={controlClass}
                        >
                          <option value="">เลือก</option>
                          {souvenirGiftSetOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {optionLabelTh(o)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className={labelClass}>จำนวนชุด</label>
                          <input
                            value={souvenirGiftSetCount}
                            onChange={(e) => setSouvenirGiftSetCount(e.target.value.replace(/[^\d]/g, ""))}
                            inputMode="numeric"
                            className={controlClass}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className={labelClass}>เพิ่มเติม</label>
                          <input
                            value={souvenirExtra}
                            onChange={(e) => setSouvenirExtra(e.target.value)}
                            className={controlClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={cardClass}>
                  <div className="text-sm font-bold text-gray-900">ไฟล์นำเสนอ</div>
                  <div className="mt-3 space-y-3">
                    <div className="text-sm text-gray-700">{renderPresentationFiles(visit.presentationFiles)}</div>
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={removePresentation}
                        onChange={(e) => {
                          setRemovePresentation(e.target.checked);
                          if (e.target.checked) setPresentationFile(null);
                        }}
                      />
                      ลบไฟล์เดิม
                    </label>
                    <input
                      id="edit-presentation-file"
                      type="file"
                      disabled={removePresentation || loading || saving}
                      onChange={(e) => setPresentationFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="edit-presentation-file"
                        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                          removePresentation || loading || saving
                            ? "bg-gray-300 cursor-not-allowed"
                            : "bg-[#1b2a18] hover:bg-black cursor-pointer"
                        }`}
                      >
                        Choose file
                      </label>
                      <div className="text-sm text-gray-700">{presentationFile ? presentationFile.name : "No file chosen"}</div>
                    </div>
                    {presentationFile && <div className="text-xs text-gray-500">เลือกไฟล์: {presentationFile.name}</div>}
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 border border-red-200">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={close}
              disabled={saving || loading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={saving || loading}
              className="rounded-md bg-[#1b2a18] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? "Loading..." : saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target && !saving) setConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="px-6 py-5">
              <div className="text-lg font-bold text-gray-900">Confirm save changes?</div>
              <div className="mt-2 text-sm text-gray-600">ต้องการบันทึกการแก้ไขรายการนี้ใช่หรือไม่</div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmOpen(false);
                  await save();
                }}
                disabled={saving}
                className="rounded-md bg-[#1b2a18] px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {resultPopup.open && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) finishResult();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${resultPopup.kind === "saved"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
                  }`}
              >
                {resultPopup.kind === "saved" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-gray-900">
                  {resultPopup.kind === "saved" ? "แก้ไขสำเร็จ" : "ยกเลิกสำเร็จ"}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {resultPopup.kind === "saved" ? "บันทึกการแก้ไขเรียบร้อย" : "ยกเลิกการแก้ไขเรียบร้อย"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
