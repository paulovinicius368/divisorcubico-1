"use client";
import { useState, useMemo } from "react";
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
import { Download, FileSpreadsheet, Pencil, Trash2, X, Calendar as CalendarIcon } from "lucide-react";
import type { MonthlyData } from "./cube-splitter-app";
import { format, parseISO, getYear, getMonth, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type MonthlyReportProps = {
  data: MonthlyData;
  onEdit: (key: string) => void;
  onDelete: (key: string) => void;
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function MonthlyReport({ data, onEdit, onDelete }: MonthlyReportProps) {
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [filterWell, setFilterWell] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();

  const sortedKeys = useMemo(() => Object.keys(data).sort(
    (a, b) => {
      const dateA = new Date(data[a].date);
      const dateB = new Date(data[b].date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return data[a].well.localeCompare(data[b].well);
    }
  ), [data]);

  const { filterOptions, filteredKeys } = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const wells = new Set<string>();

    sortedKeys.forEach(key => {
      const item = data[key];
      const itemDate = parseISO(item.date);
      years.add(getYear(itemDate).toString());
      months.add((getMonth(itemDate) + 1).toString().padStart(2, '0'));
      wells.add(item.well);
    });
    
    const fKeys = sortedKeys.filter(key => {
      const item = data[key];
      const itemDate = startOfDay(parseISO(item.date));
      const itemYear = getYear(itemDate).toString();
      const itemMonth = (getMonth(itemDate) + 1).toString().padStart(2, '0');

      const startDate = filterStartDate ? startOfDay(filterStartDate) : null;
      const endDate = filterEndDate ? startOfDay(filterEndDate) : null;

      return (
        (filterWell ? item.well === filterWell : true) &&
        (filterYear ? itemYear === filterYear : true) &&
        (filterMonth ? itemMonth === filterMonth : true) &&
        (startDate ? itemDate >= startDate : true) &&
        (endDate ? itemDate <= endDate : true)
      );
    });

    return {
      filterOptions: {
        years: Array.from(years).sort((a,b) => Number(b) - Number(a)),
        months: Array.from(months).sort((a,b) => Number(a) - Number(b)),
        wells: Array.from(wells).sort(),
      },
      filteredKeys: fKeys,
    };
  }, [sortedKeys, data, filterWell, filterYear, filterMonth, filterStartDate, filterEndDate]);
  
  const clearFilters = () => {
    setFilterWell("");
    setFilterYear("");
    setFilterMonth("");
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
  };

  const handleExport = (formatType: "csv" | "xlsx" | "pdf") => {
    if (typeof window === "undefined") return;
  
    const dataToExport = filteredKeys.length > 0 ? filteredKeys : sortedKeys;
  
    const dataByWell: Record<string, string[]> = {};
    for (const key of dataToExport) {
      const { well } = data[key];
      if (!dataByWell[well]) {
        dataByWell[well] = [];
      }
      dataByWell[well].push(key);
    }
  
    for (const well in dataByWell) {
      const headers = [
        "Data",
        "Poço",
        "Hora",
        "Volume (m³)",
        "Hidrômetro",
        "Diferença Diária (m³)",
      ];
  
      const wellSortedKeys = dataByWell[well].sort(
        (a, b) => new Date(data[a].date).getTime() - new Date(data[b].date).getTime()
      );
      
      const rows = wellSortedKeys
        .flatMap((key, dayIndex) => {
          const { allocation, total, hidrometro, date } = data[key];
          
          const prevDayKey = dayIndex > 0 ? wellSortedKeys[dayIndex - 1] : null;
          const prevDayHidrometro = prevDayKey ? data[prevDayKey].hidrometro : hidrometro - total;

          let runningHidrometro = prevDayHidrometro;
          
          const fullDayAllocation = Array.from({ length: 24 }, (_, i) => {
            const hourData = allocation.find(a => a.hour === i);
            return {
              hour: i,
              volume: hourData ? hourData.volume : 0,
            };
          });
          
          return fullDayAllocation.map((item, index) => {
            const isFirstRowOfDay = index === 0;
            runningHidrometro += item.volume;
            
            return [
              isFirstRowOfDay ? format(new Date(date + "T00:00:00"), "dd/MM/yyyy") : "",
              isFirstRowOfDay ? well : "",
              `${item.hour}:00`,
              item.volume.toFixed(2),
              runningHidrometro.toFixed(2),
              isFirstRowOfDay ? Number(total).toFixed(2) : "",
            ];
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

  const confirmDelete = () => {
    if (deleteCandidate) {
      onDelete(deleteCandidate);
      setDeleteCandidate(null);
    }
  };

  const getDetailedAllocation = (key: string) => {
    const { allocation, total, hidrometro } = data[key];
    const keyIndex = sortedKeys.findIndex(k => k === key);
    const prevDayKey = keyIndex > 0 ? sortedKeys[keyIndex - 1] : null;
    const prevDayHidrometro = prevDayKey ? data[prevDayKey].hidrometro : hidrometro - total;

    let runningHidrometro = prevDayHidrometro;

    return Array.from({ length: 24 }, (_, i) => {
      const hourData = allocation.find(a => a.hour === i);
      const volume = hourData ? hourData.volume : 0;
      runningHidrometro += volume;
      return {
        hour: i,
        volume: volume,
        hidrometroCalculado: runningHidrometro,
      };
    });
  };

  const deleteCandidateDate = deleteCandidate ? data[deleteCandidate]?.date : null;
  const hasFilters = filterWell || filterYear || filterMonth || filterStartDate || filterEndDate;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Relatório Mensal</CardTitle>
                <CardDescription>
                  Resumo das alocações diárias salvas. Filtre por poço, ano, mês ou período.
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={sortedKeys.length === 0} className="w-full sm:w-auto">
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
          </div>
        </CardHeader>
        <CardContent>
          {sortedKeys.length > 0 && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                <Select value={filterWell} onValueChange={setFilterWell}>
                  <SelectTrigger><SelectValue placeholder="Filtrar por poço" /></SelectTrigger>
                  <SelectContent>
                    {filterOptions.wells.map(well => <SelectItem key={well} value={well}>{well}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue placeholder="Filtrar por ano" /></SelectTrigger>
                  <SelectContent>
                    {filterOptions.years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger><SelectValue placeholder="Filtrar por mês" /></SelectTrigger>
                  <SelectContent>
                    {filterOptions.months.map(month => <SelectItem key={month} value={month}>{format(new Date(2000, Number(month) - 1), 'MMMM', {locale: ptBR})}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filterStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterStartDate ? format(filterStartDate, "dd/MM/yy") : <span>Data de Início</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterStartDate}
                      onSelect={setFilterStartDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filterEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterEndDate ? format(filterEndDate, "dd/MM/yy") : <span>Data de Fim</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterEndDate}
                      onSelect={setFilterEndDate}
                      disabled={{ before: filterStartDate }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" onClick={clearFilters} disabled={!hasFilters} className="md:col-span-3">
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
            </div>
          )}

          {sortedKeys.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum dado no relatório
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Gere e salve uma alocação diária para vê-la aqui.
              </p>
            </div>
          ) : filteredKeys.length === 0 ? (
             <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  Nenhum resultado encontrado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente ajustar ou limpar os filtros para ver os resultados.
                </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredKeys.map((key) => {
                const { total, well, hidrometro, date } = data[key];
                const formattedDate = format(
                  parseISO(date),
                  "EEEE, dd 'de' MMMM 'de' yyyy",
                  { locale: ptBR }
                );
                const detailedAllocation = getDetailedAllocation(key);
                return (
                  <AccordionItem value={key} key={key}>
                     <div className="flex w-full items-center justify-between border-b">
                        <AccordionTrigger className="flex-1 border-b-0 py-4 pr-0 text-left hover:no-underline">
                          <div className="flex flex-col items-start">
                            <span>{formattedDate}</span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span>Poço: {well}</span>
                              <span>Hidrômetro: {hidrometro}</span>
                              <span>Total: {total.toFixed(2)} m³</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 pl-4 pr-4">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(key)}>
                            <Pencil className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteCandidate(key)}>
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
              lançamento do dia {deleteCandidateDate && format(parseISO(deleteCandidateDate), "dd/MM/yyyy", { locale: ptBR })}.
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
