import { api } from "./api";
import type { BillScan } from "@/types";

/**
 * Document scanning — uploads a bill file for extraction. Processing is
 * synchronous on the backend; the returned scan contains extracted fields,
 * per-field confidence and warnings. Scans belong to the uploader and expire
 * after SCAN_RETENTION_HOURS on the server.
 */
export const documentService = {
  scan(
    file: File,
    hints: { dealershipId?: string; categoryId?: string; scheduleId?: string } = {}
  ): Promise<BillScan> {
    const form = new FormData();
    form.append("document", file, file.name);
    if (hints.dealershipId) form.append("dealershipId", hints.dealershipId);
    if (hints.categoryId) form.append("categoryId", hints.categoryId);
    if (hints.scheduleId) form.append("scheduleId", hints.scheduleId);
    return api.postForm<BillScan>("/documents/scan", form);
  },

  getScan(id: string): Promise<BillScan> {
    return api.get<BillScan>(`/documents/scans/${id}`);
  },

  /** Signed preview URL for the uploaded (private) scan document. */
  async documentUrl(id: string): Promise<string> {
    const res = await api.get<{ url: string; expiresInSeconds: number }>(
      `/documents/scans/${id}/document-url`
    );
    return res.url;
  },
};
