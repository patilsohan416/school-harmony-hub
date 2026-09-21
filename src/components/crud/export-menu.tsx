import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/exports";

interface Props {
  filename: string;
  title: string;
  columns: { key: string; label: string }[];
  rows: Array<Record<string, unknown>>;
  disabled?: boolean;
}

export function ExportMenu({ filename, title, columns, rows, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          {t("export.label")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToPDF(title, columns, rows)}>
          <FileText className="mr-2 h-4 w-4" /> {t("export.pdf")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToExcel(filename, columns, rows)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> {t("export.excel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToCSV(filename, columns, rows)}>
          <FileText className="mr-2 h-4 w-4" /> {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> {t("export.print")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
