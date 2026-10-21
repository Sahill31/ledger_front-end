import * as React from "react";
import { FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fileSize } from "@/lib/format";
import { ACCEPTED_FILE_EXTENSIONS, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_KB } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  name: string;
  type: "pdf" | "jpg" | "png";
  sizeKb: number;
  previewUrl?: string;
  /** The underlying File — needed to actually upload it to the backend. */
  file?: File;
}

interface FileUploadProps {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  disabled?: boolean;
}

function extToType(name: string): UploadedFile["type"] | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "png") return "png";
  return null;
}

export function FileUpload({ value, onChange, disabled }: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const accept = (file: File) => {
    const type = extToType(file.name);
    if (!type || !ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Please upload a PDF, JPG or PNG.");
      return;
    }
    const sizeKb = file.size / 1024;
    if (sizeKb > MAX_FILE_SIZE_KB) {
      toast.error(`File is too large. Maximum size is ${fileSize(MAX_FILE_SIZE_KB)}.`);
      return;
    }
    const previewUrl = type === "pdf" ? undefined : URL.createObjectURL(file);
    onChange({ name: file.name, type, sizeKb: Math.round(sizeKb), previewUrl, file });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) accept(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) accept(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border bg-white p-3">
          {value.previewUrl ? (
            <img src={value.previewUrl} alt="Bill preview" className="h-12 w-12 rounded-md object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-red-50 text-red-600">
              {value.type === "pdf" ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {value.type.toUpperCase()} · {fileSize(value.sizeKb)}
            </p>
          </div>
          {!disabled && (
            <Button variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Remove file">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed bg-white px-4 py-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-slate-300 hover:border-slate-400",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-foreground">
            Drop the bill document here, or <span className="text-primary underline">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">PDF, JPG or PNG up to {fileSize(MAX_FILE_SIZE_KB)}</p>
        </button>
      )}
    </div>
  );
}
