"use client";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileSpreadsheet } from "lucide-react";
import type { MonthlyData } from "./cube-splitter-app";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type MonthlyReportProps = {
  data: MonthlyData;
};

export default function MonthlyReport({ data }: MonthlyReportProps) {
  const handleExport = () => {
    if (typeof window === "undefined") return;

    const dataByWell: Record<string, typeof data> = {};
    for (const date in data) {
      const { well } = data[date];
      if (!dataByWell[well]) {
        dataByWell[well] = {};
      }
      dataByWell[well][date] = data[date];
    }

    for (const well in dataByWell) {
      const headers = ["Data", "Poço", "Hora", "Volume (m³)"];
      const rows = [headers];

      Object.entries(dataByWell[well])
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .forEach(([date, { allocation }]) => {
          allocation.forEach(({ hour, volume }) => {
            rows.push([date, well, hour.toString(), volume.toFixed(2)]);
          });
        });

      const csvContent = rows.map((e) => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `relatorio_${well}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const sortedDays = Object.keys(data).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Relatório Mensal</CardTitle>
          <CardDescription>
            Resumo das alocações diárias salvas.
          </CardDescription>
        </div>
        <Button onClick={handleExport} disabled={sortedDays.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
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
              const { total, allocation, well } = data[day];
              const formattedDate = format(new Date(day + 'T00:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
              return (
                <AccordionItem value={day} key={day}>
                  <AccordionTrigger>
                    <div className="flex w-full items-center justify-between pr-4">
                      <span>{formattedDate}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-muted-foreground">
                          Poço: {well}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          Total: {total} m³
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead className="text-right">
                            Volume (m³)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allocation.map(({ hour, volume }) => (
                          <TableRow key={hour}>
                            <TableCell>{`${hour}:00 - ${hour + 1}:00`}</TableCell>
                            <TableCell className="text-right font-mono">
                              {volume.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
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
  );
}
