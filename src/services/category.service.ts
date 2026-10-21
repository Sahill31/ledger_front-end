import { api } from "./api";
import type { Category } from "@/types";

export const categoryService = {
  async list(): Promise<Category[]> {
    // Backend returns every category (incl. inactive) to all authenticated users.
    return api.get<Category[]>("/categories");
  },

  async create(input: { name: string; description?: string; icon?: string }): Promise<Category> {
    return api.post<Category>("/categories", input);
  },

  async update(
    id: string,
    input: { name?: string; description?: string | null; icon?: string; active?: boolean }
  ): Promise<Category> {
    const { active, ...fields } = input;
    let category: Category | undefined;
    if (Object.values(fields).some((v) => v !== undefined)) {
      category = await api.patch<Category>(`/categories/${id}`, fields);
    }
    if (active !== undefined) {
      category = await api.patch<Category>(`/categories/${id}/status`, { isActive: active });
    }
    return category ?? api.get<Category>(`/categories/${id}`);
  },

  /** Permanent delete — backend rejects it while bills/schedules/budgets reference it. */
  async remove(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
