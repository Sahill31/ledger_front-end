import { api, toQuery, type Paginated } from "./api";
import type { NotificationItem, SessionUser } from "@/types";

interface NotificationDTO {
  id: string;
  type: NotificationItem["type"];
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

function linkFor(user: SessionUser, dto: NotificationDTO): string | undefined {
  const admin = user.role === "admin";
  switch (dto.relatedEntityType) {
    case "bill":
      return admin ? "/admin/bills" : "/accountant/submissions";
    case "schedule":
      return admin ? "/admin/schedules" : "/accountant/tasks";
    default:
      return undefined;
  }
}

function toItem(user: SessionUser, dto: NotificationDTO): NotificationItem {
  return {
    id: dto.id,
    audience: user.role,
    userId: user.id,
    type: dto.type,
    title: dto.title,
    message: dto.message,
    link: linkFor(user, dto),
    read: dto.read,
    createdAt: dto.createdAt,
  };
}

export const notificationService = {
  /** Notifications for the signed-in user — the backend scopes by owner. */
  async listFor(user: SessionUser): Promise<NotificationItem[]> {
    const res = await api.get<Paginated<NotificationDTO>>(
      `/notifications${toQuery({ pageSize: 100 })}`
    );
    return res.items.map((n) => toItem(user, n));
  },

  async unreadCount(): Promise<number> {
    const res = await api.get<{ count: number }>("/notifications/unread-count");
    return res.count;
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllRead(_user: SessionUser): Promise<void> {
    await api.post("/notifications/read-all");
  },
};
