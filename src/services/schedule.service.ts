import { api, toQuery, type Paginated } from "./api";
import type { ReviewStatus, ScheduledTask, ScheduleStatus, SessionUser } from "@/types";

export interface ScheduleFilters {
  dealershipId?: string;
  categoryId?: string;
  status?: ScheduleStatus | "all";
  month?: number;
  year?: number;
  dueWithinDays?: number;
  search?: string;
}

export interface ScheduleUpsertInput {
  id?: string;
  dealershipId: string;
  categoryId: string;
  billingPeriod: { month: number; year: number };
  dueDate: string;
  submissionDeadline: string;
  recurring: boolean;
  notes?: string;
}

interface ScheduleDTO extends Omit<ScheduledTask, "bill"> {
  billId?: string;
  /** Uppercase backend enum (e.g. "SUBMITTED") — mapped to lowercase here. */
  billStatus?: string;
  billAmount?: number;
}

function toTask(dto: ScheduleDTO): ScheduledTask {
  const { billId, billStatus, billAmount, ...rest } = dto;
  return {
    ...rest,
    bill:
      billId && billStatus
        ? {
            id: billId,
            status: billStatus.toLowerCase() as ReviewStatus,
            amount: billAmount ?? 0,
          }
        : undefined,
  };
}

function buildQuery(filters: ScheduleFilters): string {
  return toQuery({
    pageSize: 100,
    dealershipId: filters.dealershipId,
    categoryId: filters.categoryId,
    status: filters.status,
    month: filters.month,
    year: filters.year,
    dueWithinDays: filters.dueWithinDays,
    search: filters.search,
  });
}

export const scheduleService = {
  async list(filters: ScheduleFilters = {}): Promise<ScheduledTask[]> {
    const res = await api.get<Paginated<ScheduleDTO>>(`/schedules${buildQuery(filters)}`);
    return res.items.map(toTask);
  },

  /** Accountant-scoped — the backend restricts results to assigned dealerships. */
  async forAccountant(_userId: string, filters: ScheduleFilters = {}): Promise<ScheduledTask[]> {
    return this.list(filters);
  },

  /**
   * Creates a schedule, or updates the mutable fields of an existing one.
   * If dealership/category/billing period changed on an existing schedule,
   * the old schedule is cancelled and a replacement is created (the backend
   * treats those keys as immutable identity).
   */
  async upsert(input: ScheduleUpsertInput, _admin?: SessionUser): Promise<ScheduledTask> {
    if (!input.id) {
      const dto = await api.post<ScheduleDTO>("/schedules", {
        dealershipId: input.dealershipId,
        categoryId: input.categoryId,
        billingPeriod: input.billingPeriod,
        dueDate: input.dueDate,
        submissionDeadline: input.submissionDeadline,
        recurring: input.recurring,
        instructions: input.notes,
      });
      return toTask(dto);
    }

    const current = await api.get<ScheduleDTO>(`/schedules/${input.id}`);
    const identityChanged =
      current.dealershipId !== input.dealershipId ||
      current.categoryId !== input.categoryId ||
      current.billingPeriod.month !== input.billingPeriod.month ||
      current.billingPeriod.year !== input.billingPeriod.year;

    if (identityChanged) {
      // Replace: cancel the old schedule and create a new one.
      await api.post<ScheduleDTO>(`/schedules/${input.id}/cancel`, {
        reason: "Schedule reconfigured by administrator",
      });
      return this.upsert({ ...input, id: undefined });
    }

    const dto = await api.patch<ScheduleDTO>(`/schedules/${input.id}`, {
      dueDate: input.dueDate,
      submissionDeadline: input.submissionDeadline,
      recurring: input.recurring,
      instructions: input.notes ?? null,
    });
    return toTask(dto);
  },

  /** Soft-delete — the schedule is marked cancelled and keeps its history. */
  async cancel(id: string): Promise<void> {
    await api.post(`/schedules/${id}/cancel`, { reason: "Cancelled by administrator" });
  },

  /** Permanent delete — backend rejects it while any bill references it. */
  async remove(id: string): Promise<void> {
    await api.delete(`/schedules/${id}`);
  },
};
