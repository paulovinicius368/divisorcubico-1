"use client";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import type { MonthlyData } from "./cube-splitter-app";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

type MonthlyReportProps = {
  data: MonthlyData;
  onEdit: (date: string) => void;
  onDelete: (date: string) => void;
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function MonthlyReport({ data, onEdit, onDelete }: MonthlyReportProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);

  const handleExport = (formatType: "csv" | "xlsx" | "pdf") => {
    if (typeof window === "undefined") return;

    const dataByWell: Record<string, typeof data> = {};
    for (const date in data) {
      const { well } = data[date];
      if (!dataByWell[well]) {
        dataByWell[well] = {};
      }
      dataByWell[well][date] = data[date];
    }

    const allSortedDays = Object.keys(data).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    for (const well in dataByWell) {
      const headers = [
        "Data",
        "Poço",
        "Hora",
        "Volume (m³)",
        "Hidrômetro",
        "Diferença Diária (m³)",
      ];

      const wellSortedDays = allSortedDays.filter(date => data[date].well === well);
      
      const rows = wellSortedDays
        .flatMap((date) => {
          const { allocation, total, hidrometro } = data[date];

          const filteredAllocation = allocation.filter(item => item.volume > 0);

          if (filteredAllocation.length === 0) {
            return [[
                format(new Date(date + "T00:00:00"), "dd/MM/yyyy"),
                well,
                "N/A",
                "0.00",
                Number(hidrometro).toFixed(2),
                Number(total).toFixed(2),
            ]];
          }
          
          let runningHidrometro = hidrometro - total;
          let lastVolume = -1; // Use -1 para garantir que a primeira iteração sempre some

          return filteredAllocation
            .map(({ hour, volume }, index) => {
              const isFirstRowOfDay = index === 0;

              if (isFirstRowOfDay) {
                 runningHidrometro += volume;
              } else {
                if (volume !== lastVolume) {
                  runningHidrometro += volume;
                }
              }
              
              const rowData = [
                isFirstRowOfDay ? format(new Date(date + "T00:00:00"), "dd/MM/yyyy") : "",
                well,
                `${hour}:00`,
                volume.toFixed(2),
                runningHidrometro.toFixed(2),
                isFirstRowOfDay ? Number(total).toFixed(2) : "",
              ];
              
              lastVolume = volume;
              return rowData;
            });
        });

      const today = new Date().toISOString().slice(0, 10);
      const filename = `relatorio_${well}_${today}`;

      if (formatType === "csv") {
        const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${filename}.csv`);
      } else if (formatType === "xlsx") {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
        const xlsxBuffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });
        const blob = new Blob([xlsxBuffer], {
          type: "application/octet-stream",
        });
        downloadBlob(blob, `${filename}.xlsx`);
      } else if (formatType === "pdf") {
        const doc = new jsPDF({ orientation: "landscape" }) as jsPDFWithAutoTable;
        doc.autoTable({
          head: [headers],
          body: rows,
          didDrawPage: (data) => {
            doc.text(`Relatório Poço: ${well}`, data.settings.margin.left, 15);
          }
        });
        doc.save(`${filename}.pdf`);
      }
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sortedDays = Object.keys(data).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const confirmDelete = () => {
    if (deleteCandidate) {
      onDelete(deleteCandidate);
      setDeleteCandidate(null);
    }
  };

  const getDetailedAllocation = (date: string) => {
    const { allocation, total, hidrometro } = data[date];
    const detailed = [];
    
    const filteredAllocation = allocation.filter(item => item.volume > 0);
    
    if (filteredAllocation.length === 0) {
        return [];
    }
    
    let runningHidrometro = hidrometro - total;
    let lastVolume = -1;

    for (const item of filteredAllocation) {
      if (detailed.length === 0) {
        runningHidrometro += item.volume;
      } else {
        if (item.volume !== lastVolume) {
          runningHidrometro += item.volume;
        }
      }
      detailed.push({ ...item, hidrometroCalculado: runningHidrometro });
      lastVolume = item.volume;
    }
    
    return detailed;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Relatório Mensal</CardTitle>
            <CardDescription>
              Resumo das alocações diárias salvas.
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={sortedDays.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Relatório
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => handleExport("csv")}>
                Exportar como CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport("xlsx")}>
                Exportar como XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleExport("pdf")}>
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {sortedDays.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum dado no relatório
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Gere e salve uma alocação diária para vê-la aqui.
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {sortedDays.map((day) => {
                const { total, well, hidrometro, date } = data[day];
                const formattedDate = format(
                  new Date(date + "T00:00:00"),
                  "EEEE, dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                );
                const detailedAllocation = getDetailedAllocation(day);
                return (
                  <AccordionItem value={day} key={day}>
                     <div className="flex w-full items-center justify-between border-b">
                        <AccordionTrigger className="flex-1 border-b-0 py-4 pr-0 text-left hover:no-underline">
                          <div className="flex flex-col items-start">
                            <span>{formattedDate}</span>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Poço: {well}</span>
                              <span>Hidrômetro: {hidrometro}</span>
                              <span>Total: {total.toFixed(2)} m³</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pl-4 pr-4">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(day)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteCandidate(day)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hora</TableHead>
                            <TableHead>Volume (m³)</TableHead>
                            <TableHead className="text-right">Hidrômetro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedAllocation.length > 0 ? (
                             detailedAllocation.map(({ hour, volume, hidrometroCalculado }) => (
                              <TableRow key={hour}>
                                <TableCell>{`${hour}:00 - ${
                                  hour + 1
                                }:00`}</TableCell>
                                <TableCell>{volume.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {hidrometroCalculado.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                             <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    Nenhuma vazão registrada neste dia.
                                </TableCell>
                             </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              lançamento do dia {deleteCandidate && format(new Date(deleteCandidate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteCandidate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
