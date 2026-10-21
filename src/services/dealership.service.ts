import { api, toQuery, type Paginated } from "./api";
import type { Dealership, User } from "@/types";

export interface DealershipInput {
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  phone?: string;
  email?: string;
}

function toBody(input: DealershipInput) {
  return {
    name: input.name,
    code: input.code,
    address: input.address,
    city: input.city,
    // Backend schema rejects empty strings — omit optional fields when blank.
    ...(input.state ? { state: input.state } : {}),
    ...(input.phone ? { contactPhone: input.phone } : {}),
    ...(input.email ? { contactEmail: input.email } : {}),
  };
}

export const dealershipService = {
  /**
   * Admin: all dealerships. Accountant: automatically scoped to assigned
   * dealerships by the backend — same endpoint, same call.
   */
  async list(filters: { status?: string; search?: string } = {}): Promise<Dealership[]> {
    const res = await api.get<Paginated<Dealership>>(
      `/dealerships${toQuery({ pageSize: 100, status: filters.status, search: filters.search })}`
    );
    return res.items;
  },

  /** Accountant-scoped list — backend enforces the assignment scope. */
  async forAccountant(_userId: string): Promise<Dealership[]> {
    return this.list({ status: "active" });
  },

  async getById(id: string): Promise<Dealership> {
    return api.get<Dealership>(`/dealerships/${id}`);
  },

  async create(input: DealershipInput): Promise<Dealership> {
    return api.post<Dealership>("/dealerships", toBody(input));
  },

  async update(id: string, input: Partial<DealershipInput>): Promise<Dealership> {
    const body: Record<string, string | undefined> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.code !== undefined) body.code = input.code;
    if (input.address !== undefined) body.address = input.address;
    if (input.city !== undefined) body.city = input.city;
    // Backend schema rejects empty strings — omit optional fields when blank.
    if (input.state) body.state = input.state;
    if (input.phone) body.contactPhone = input.phone;
    if (input.email) body.contactEmail = input.email;
    return api.patch<Dealership>(`/dealerships/${id}`, body);
  },

  async setStatus(id: string, status: "active" | "inactive"): Promise<Dealership> {
    return api.patch<Dealership>(`/dealerships/${id}/status`, { isActive: status === "active" });
  },

  /** Permanent delete — backend rejects it while bills/schedules/budgets exist. */
  async remove(id: string): Promise<void> {
    await api.delete(`/dealerships/${id}`);
  },

  async accountantsFor(dealershipId: string): Promise<User[]> {
    return api.get<User[]>(`/dealerships/${dealershipId}/accountants`);
  },

  async assignAccountant(dealershipId: string, userId: string): Promise<void> {
    const { dealershipIds } = await api.get<{ dealershipIds: string[] }>(
      `/users/${userId}/assignments`
    );
    if (!dealershipIds.includes(dealershipId)) {
      await api.put(`/users/${userId}/assignments`, {
        dealershipIds: [...dealershipIds, dealershipId],
      });
    }
  },

  async unassignAccountant(dealershipId: string, userId: string): Promise<void> {
    const { dealershipIds } = await api.get<{ dealershipIds: string[] }>(
      `/users/${userId}/assignments`
    );
    await api.put(`/users/${userId}/assignments`, {
      dealershipIds: dealershipIds.filter((id) => id !== dealershipId),
    });
  },
};
