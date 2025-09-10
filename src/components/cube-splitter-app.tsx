
"use client";

import { useState, useEffect, useCallback }from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";

import type { AllocateHourlyVolumeOutput } from "@/ai/flows/allocate-hourly-volume";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cuboid, LogOut } from "lucide-react";
import DailyAllocation from "@/components/daily-allocation";
import MonthlyReport from "@/components/monthly-report";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

export type MonthlyData = Record<
  string, // Unique key, e.g., "YYYY-MM-DD-WELLNAME"
  {
    total: number;
    allocation: AllocateHourlyVolumeOutput['allocation'];
    well: string;
    hidrometro: number;
    date: string; // The date part of the key, e.g., "YYYY-MM-DD"
    overflowWarning?: string;
  }
>;

export default function CubeSplitterApp() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("daily");
  const [editKey, setEditKey] = useState<string | null>(null);
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const router = useRouter();


  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "allocations"), orderBy("date", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data: MonthlyData = {};
      querySnapshot.forEach((doc) => {
        data[doc.id] = doc.data() as MonthlyData[string];
      });
      setMonthlyData(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching allocations: ", error);
      toast({
        title: "Erro ao buscar dados",
        description: "Não foi possível carregar os lançamentos. O app pode funcionar em modo offline se os dados já foram carregados.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, [toast]);


  const handleSaveDay = async (
    date: string,
    total: number,
    result: AllocateHourlyVolumeOutput,
    well: string,
    hidrometro: number
  ) => {
    const key = `${date}-${well}`;
    try {
      const newEntry: MonthlyData[string] = { 
        total, 
        allocation: result.allocation, 
        well, 
        hidrometro, 
        date,
      };

      if (result.overflowWarning) {
        newEntry.overflowWarning = result.overflowWarning;
      }
      
      await setDoc(doc(db, "allocations", key), newEntry, { merge: true });

      toast({
        title: "Salvo com sucesso!",
        description: `Os dados de ${well} para ${date} foram salvos.`,
      });
      setEditKey(null);
      return true;
    } catch (error) {
      console.error("Error saving allocation: ", error);
       toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Verifique suas permissões e tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteDay = async (key: string) => {
    const entryDate = monthlyData[key]?.date;
    try {
      await deleteDoc(doc(db, "allocations", key));
      toast({
        title: "Excluído com sucesso!",
        description: `Os dados de ${entryDate} foram removidos.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error("Error deleting allocation: ", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover o lançamento.",
        variant: "destructive",
      });
    }
  };

  const handleEditDay = (key: string) => {
    setEditKey(key);
    setActiveTab("daily");
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };
  
  const renderLoadingSkeleton = () => (
    <div className="pt-6">
        <div className="space-y-4 max-w-lg mx-auto">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
    </div>
  );


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 self-start">
          <Cuboid className="h-10 w-10 text-primary" />
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary md:text-4xl">
              DivisorCubico
            </h1>
            <p className="text-muted-foreground">Divisor de Volume Hídrico</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-right flex-grow">
              <p className="text-sm font-medium">Olá, {user.displayName || user.email}</p>
               <p className="text-xs text-muted-foreground">Usuário</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        )}
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
            editKey={editKey}
            onClearEdit={() => setEditKey(null)}
            isLoadingData={isLoading}
          />
        </TabsContent>
        <TabsContent value="monthly" className="pt-6">
          {isLoading ? renderLoadingSkeleton() : (
            <MonthlyReport 
              data={monthlyData} 
              onEdit={handleEditDay}
              onDelete={handleDeleteDay}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
