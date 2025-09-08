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
    hidrometro: number;
    date: string;
  }
>;

export default function CubeSplitterApp() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [activeTab, setActiveTab] = useState("daily");
  const [editDate, setEditDate] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSaveDay = (
    date: string,
    total: number,
    allocation: AllocateHourlyVolumeOutput,
    well: string,
    hidrometro: number
  ) => {
    setMonthlyData((prev) => ({
      ...prev,
      [date]: { total, allocation, well, hidrometro, date },
    }));
    toast({
      title: "Salvo com sucesso!",
      description: `Os dados de ${date} foram adicionados ao relatório mensal.`,
    });
    setEditDate(null);
  };

  const handleDeleteDay = (date: string) => {
    setMonthlyData(prev => {
      const newData = { ...prev };
      delete newData[date];
      return newData;
    });
    toast({
      title: "Excluído com sucesso!",
      description: `Os dados de ${date} foram removidos.`,
      variant: "destructive"
    });
  };

  const handleEditDay = (date: string) => {
    setEditDate(date);
    setActiveTab("daily");
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8 flex items-center gap-3">
        <Cuboid className="h-10 w-10 text-primary" />
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary md:text-4xl">
            POÇOS DE CAPTAÇÃO
          </h1>
          <p className="text-muted-foreground">Divisor de Volume Hídrico</p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="daily">Alocação Diária</TabsTrigger>
          <TabsTrigger value="monthly">Relatório Mensal</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="pt-6">
          <DailyAllocation 
            onSave={handleSaveDay} 
            monthlyData={monthlyData} 
            editDate={editDate}
            onClearEdit={() => setEditDate(null)}
          />
        </TabsContent>
        <TabsContent value="monthly" className="pt-6">
          <MonthlyReport 
            data={monthlyData} 
            onEdit={handleEditDay}
            onDelete={handleDeleteDay}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
