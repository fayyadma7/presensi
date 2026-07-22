"use client";

import { useState, useRef } from "react";
import { Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportSectionProps {
  title: string;
  description?: string;
  templateColumns: string[];
  onImport: (data: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>;
  templateFilename: string;
}

export default function ImportSection({
  title,
  description,
  templateColumns,
  onImport,
  templateFilename,
}: ImportSectionProps) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([templateColumns]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, templateFilename);
    toast.success("Template berhasil diunduh");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      if (json.length === 0) {
        toast.error("File Excel kosong");
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const result = await onImport(json);
      if (result.errors.length === 0) {
        toast.success(`${result.success} data berhasil diimpor`);
      } else {
        toast.info(`${result.success} berhasil, ${result.errors.length} gagal`);
        result.errors.forEach((err) => toast.error(err));
      }
    } catch {
      toast.error("Gagal membaca file Excel");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="clay-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="h-5 w-5 text-primary" />
        <h3 className="font-heading font-bold text-foreground">{title}</h3>
        {description && (
          <span className="text-xs text-muted-foreground">— {description}</span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={downloadTemplate}
          className="clay-button-accent px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2 justify-center"
        >
          <Download className="h-4 w-4" />
          Download Format
        </button>
        <label className="clay-button px-4 py-2.5 text-white text-sm font-bold rounded-xl cursor-pointer flex items-center gap-2 justify-center clay-transition">
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importing ? "Mengimpor..." : "Import Excel"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
