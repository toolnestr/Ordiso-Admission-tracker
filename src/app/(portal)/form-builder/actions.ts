"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";

export type FieldActionState = { error: string | null };

const FIELD_TYPES = [
  "short_text",
  "long_text",
  "dropdown",
  "radio",
  "checkbox",
  "date",
  "number",
  "email",
  "phone",
  "file",
] as const;
type FieldType = (typeof FIELD_TYPES)[number];

const OPTION_TYPES: FieldType[] = ["dropdown", "radio", "checkbox"];

async function requireAdmin() {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return null;
  return ctx;
}

export async function addField(
  _prev: FieldActionState,
  formData: FormData,
): Promise<FieldActionState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can edit the form." };

  const label = String(formData.get("field_label") || "").trim();
  const type = String(formData.get("field_type") || "") as FieldType;
  const required = formData.get("is_required") === "on";
  const optionsRaw = String(formData.get("options") || "").trim();

  if (!label) return { error: "Give the field a label." };
  if (!FIELD_TYPES.includes(type)) return { error: "Pick a valid field type." };

  const options = OPTION_TYPES.includes(type)
    ? optionsRaw
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  if (OPTION_TYPES.includes(type) && options.length === 0) {
    return { error: "Add at least one option (one per line)." };
  }

  const supabase = await createClient();

  // Append to the end of the field order.
  const { data: last } = await supabase
    .from("form_fields")
    .select("display_order")
    .eq("institute_id", ctx.institute.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (last?.display_order ?? -1) + 1;

  const { error } = await supabase.from("form_fields").insert({
    institute_id: ctx.institute.id,
    field_label: label,
    field_type: type,
    is_required: required,
    options,
    display_order: nextOrder,
    is_document_field: type === "file",
  });

  if (error) return { error: "Could not add the field. Please try again." };

  revalidatePath("/form-builder");
  return { error: null };
}

export async function deleteField(fieldId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return;
  const supabase = await createClient();
  await supabase.from("form_fields").delete().eq("id", fieldId);
  revalidatePath("/form-builder");
}

/** Swap display_order with the adjacent field in the given direction. */
export async function moveField(fieldId: string, dir: "up" | "down") {
  const ctx = await requireAdmin();
  if (!ctx) return;
  const supabase = await createClient();

  const { data: fields } = await supabase
    .from("form_fields")
    .select("id, display_order")
    .eq("institute_id", ctx.institute.id)
    .order("display_order", { ascending: true });

  if (!fields) return;
  const idx = fields.findIndex((f) => f.id === fieldId);
  if (idx === -1) return;
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= fields.length) return;

  const a = fields[idx];
  const b = fields[swapIdx];

  // Swap their display_order values.
  await supabase
    .from("form_fields")
    .update({ display_order: b.display_order })
    .eq("id", a.id);
  await supabase
    .from("form_fields")
    .update({ display_order: a.display_order })
    .eq("id", b.id);

  revalidatePath("/form-builder");
}
