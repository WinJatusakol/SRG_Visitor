export const fetchAdminData = async <T>(table: string): Promise<T[]> => {
  const response = await fetch(`/api/admin/data?table=${encodeURIComponent(table)}`);
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error ?? `Request failed: ${response.status}`);
  }

  return Array.isArray(result.items) ? (result.items as T[]) : [];
};

export const createAdminData = async (table: string, data: Record<string, unknown>) => {
  const response = await fetch("/api/admin/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, data }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error ?? `Request failed: ${response.status}`);
  }

  return result;
};

export const deleteAdminData = async (table: string, id: number) => {
  const response = await fetch("/api/admin/data", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, id }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result?.success === false) {
    throw new Error(result?.error ?? `Request failed: ${response.status}`);
  }

  return result;
};

