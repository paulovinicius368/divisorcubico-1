"use client";

import { useState } from "react";
import type { AllocateHourlyVolumeOutput } from "@/ai/flows/allocate-hourly-volume";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cuboid } from "@/components/icons";
import DailyAllocation from "@/components/daily-allocation";
import MonthlyReport from "@/components/monthly-report";
import { useToast } from "@/hooks/use-toast";

export type MonthlyData = Record<
  string,
  {
    total: number;
    allocation: AllocateHourlyVolumeOutput;
    well: string;
    hodometro: number;
    date: string;
  }
>;

export default function CubeSplitterApp() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const { toast } = useToast();

  const handleSaveDay = (
    date: string,
    total: number,
    allocation: AllocateHourlyVolumeOutput,
    well: string,
    hodometro: number
  ) => {
    setMonthlyData((prev) => ({
      ...prev,
      [date]: { total, allocation, well, hodometro, date },
    }));
    toast({
      title: "Salvo com sucesso!",
      description: `Os dados de ${date} foram adicionados ao relatório mensal.`,
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8 flex items-center gap-3">
        <Cuboid className="h-10 w-10 text-primary" />
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary md:text-4xl">
            Cube Splitter
          </h1>
          <p className="text-muted-foreground">Divisor de Volume Hídrico</p>
        </div>
      </header>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="daily">Alocação Diária</TabsTrigger>
          <TabsTrigger value="monthly">Relatório Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="pt-6">
          <DailyAllocation onSave={handleSaveDay} monthlyData={monthlyData} />
        </TabsContent>
        <TabsContent value="monthly" className="pt-6">
          <MonthlyReport data={monthlyData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
