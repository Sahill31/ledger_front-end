import { api, toQuery, type Paginated } from "./api";
import type { BudgetRow, SessionUser } from "@/types";

/**
 * ADMIN ONLY — must never be imported by accountant pages or shared code
 * used on the accountant side. Budget amounts, remaining and utilization
 * are confidential financial data.
 */

export interface BudgetFilters {
  dealershipId?: string;
  categoryId?: string;
  month?: number;
  year?: number;
}

export interface BudgetUpsertInput {
  dealershipId: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number;
}

export const budgetService = {
  async list(filters: BudgetFilters = {}): Promise<BudgetRow[]> {
    const res = await api.get<Paginated<BudgetRow>>(
      `/budgets${toQuery({
        pageSize: 100,
        dealershipId: filters.dealershipId,
        categoryId: filters.categoryId,
        month: filters.month,
        year: filters.year,
      })}`
    );
    return res.items;
  },

  /**
   * Creates or updates the monthly budget for a dealership+category.
   * The backend keeps immutable history entries for every amount change.
   */
  async upsert(input: BudgetUpsertInput, _admin: SessionUser): Promise<BudgetRow> {
    const existing = await api.get<Paginated<BudgetRow>>(
      `/budgets${toQuery({
        dealershipId: input.dealershipId,
        categoryId: input.categoryId,
        month: input.month,
        year: input.year,
      })}`
    );
    const row = existing.items[0];
    if (row) {
      return api.patch<BudgetRow>(`/budgets/${row.id}`, { monthlyAmount: input.amount });
    }
    return api.post<BudgetRow>("/budgets", {
      dealershipId: input.dealershipId,
      categoryId: input.categoryId,
      month: input.month,
      year: input.year,
      monthlyAmount: input.amount,
    });
  },

  /** Permanent delete — the budget's change history is removed with it. */
  async remove(id: string): Promise<void> {
    await api.delete(`/budgets/${id}`);
  },
};
