import { api, toQuery, type Paginated } from "./api";
import type { User, UserStatus } from "@/types";

export interface CreateAccountantInput {
  name: string;
  email: string;
  password: string;
  title?: string;
  dealershipIds: string[];
}

export interface ProfileUpdate {
  name?: string;
  phone?: string;
  title?: string;
}

/** Account management — admin endpoints plus the self-service profile route. */
export const accountService = {
  /** The authenticated user's own account record. */
  async me(): Promise<User> {
    return api.get<User>("/auth/me");
  },

  /** ADMIN only — lists accountant users. */
  async listAccountants(): Promise<User[]> {
    const res = await api.get<Paginated<User>>(
      `/users${toQuery({ role: "ACCOUNTANT", pageSize: 100 })}`
    );
    return res.items;
  },

  /** ADMIN only. */
  async createAccountant(input: CreateAccountantInput): Promise<User> {
    return api.post<User>("/users", {
      fullName: input.name,
      email: input.email,
      password: input.password,
      role: "ACCOUNTANT",
      title: input.title,
      dealershipIds: input.dealershipIds,
    });
  },

  /** ADMIN only — activates or deactivates a user account. */
  async setStatus(userId: string, status: UserStatus): Promise<void> {
    await api.patch(`/users/${userId}/status`, { isActive: status === "active" });
  },

  /**
   * ADMIN only — permanent delete. The backend rejects it for accounts with
   * a financial footprint (bills, reviews, created records) — deactivate
   * those instead.
   */
  async remove(userId: string): Promise<void> {
    await api.delete(`/users/${userId}`);
  },

  /** ADMIN only — replaces a user's dealership assignments. */
  async setDealerships(userId: string, dealershipIds: string[]): Promise<void> {
    await api.put(`/users/${userId}/assignments`, { dealershipIds });
  },

  /**
   * Self-service profile update (any role). The backend ignores role/status
   * fields — users cannot elevate or deactivate themselves.
   */
  async updateProfile(_userId: string, patch: ProfileUpdate): Promise<void> {
    await api.patch("/users/me/profile", {
      fullName: patch.name,
      phone: patch.phone,
      title: patch.title,
    });
  },
};
