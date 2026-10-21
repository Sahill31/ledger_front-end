import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { scheduleService } from "@/services/schedule.service";
import { dealershipService } from "@/services/dealership.service";
import { categoryService } from "@/services/category.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDate, monthShort } from "@/lib/format";
import { SCHEDULE_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScheduleStatus, ScheduledTask } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { ScheduleStatusBadge, ReviewStatusBadge } from "@/components/shared/status-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_OPTIONS = Object.entries(SCHEDULE_STATUS_LABEL) as [ScheduleStatus, string][];

export default function AccountantTasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dealershipId, setDealershipId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<ScheduleStatus | "all">("all");
  const [month, setMonth] = useState("all");

  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user]
  );
  const categories = useAsyncData(() => categoryService.list(), []);
  const tasks = useAsyncData(
    () =>
      user
        ? scheduleService.forAccountant(user.id, {
            dealershipId,
            categoryId,
            status,
            month: month === "all" ? undefined : Number(month),
          })
        : Promise.resolve([]),
    [user, dealershipId, categoryId, status, month]
  );

  const categoryIcon = (id: string) =>
    categories.data?.find((c) => c.id === id)?.icon ?? "receipt";

  const columns: DataTableColumn<ScheduledTask>[] = [
    {
      key: "dealership",
      header: "Dealership",
      sortValue: (t) => t.dealershipName,
      cell: (t) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{t.dealershipName}</p>
          <p className="text-xs text-muted-foreground">{t.dealershipCode}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <CategoryIcon icon={categoryIcon(t.categoryId)} />
          <span className="truncate">{t.categoryName}</span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Billing period",
      cell: (t) => monthShort(t.billingPeriod.month, t.billingPeriod.year),
    },
    {
      key: "billDue",
      header: "Bill due",
      cell: (t) => formatDate(t.dueDate),
    },
    {
      key: "deadline",
      header: "Submission deadline",
      sortValue: (t) => t.submissionDeadline,
      cell: (t) => {
        const urgent = t.status === "overdue" || t.status === "missing";
        return (
          <span className={cn(urgent && "font-medium text-red-600")}>
            {formatDate(t.submissionDeadline)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <ScheduleStatusBadge status={t.status} />,
    },
    {
      key: "action",
      header: "",
      className: "text-right",
      cell: (t) =>
        t.status !== "submitted" ? (
          <Button
            size="sm"
            onClick={() => navigate("/accountant/upload-bill", { state: { scheduleId: t.id } })}
          >
            Submit bill
          </Button>
        ) : t.bill ? (
          <ReviewStatusBadge status={t.bill.status} />
        ) : (
          <span className="text-xs text-muted-foreground">Done</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Expected utility bill submissions for your assigned dealerships."
      />

      <DataTable
        columns={columns}
        data={tasks.data ?? []}
        loading={tasks.loading}
        rowKey={(t) => t.id}
        searchFn={(t) => `${t.dealershipName} ${t.dealershipCode} ${t.categoryName}`}
        searchPlaceholder="Search dealership or category…"
        emptyTitle="No tasks"
        emptyDescription="No scheduled bills match the current filters."
        emptyIcon={<CalendarClock className="h-5 w-5" />}
        toolbar={
          <>
            <Select value={dealershipId} onValueChange={setDealershipId}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue placeholder="Dealership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealerships</SelectItem>
                {(dealerships.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories.data ?? [])
                  .filter((c) => c.active)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ScheduleStatus | "all")}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTH_OPTIONS.map((label, i) => (
                  <SelectItem key={label} value={String(i + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  );
}
