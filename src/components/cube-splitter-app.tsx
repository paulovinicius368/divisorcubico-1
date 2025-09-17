
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { db, auth } from "@/lib/firebase";

import type { AllocateHourlyVolumeOutput } from "@/ai/flows/allocate-hourly-volume";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DailyAllocation from "@/components/daily-allocation";
import MonthlyReport from "@/components/monthly-report";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import type { UserRole } from "@/hooks/use-role";

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

type CubeSplitterAppProps = {
  userRole: UserRole;
}

export default function CubeSplitterApp({ userRole }: CubeSplitterAppProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("daily");
  const [editKey, setEditKey] = useState<string | null>(null);
  const { toast } = useToast();
  const [user] = useAuthState(auth);


  useEffect(() => {
    if (!user) return;
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
  }, [toast, user]);


  const handleSaveDay = async (
    date: string,
    total: number,
    result: AllocateHourlyVolumeOutput,
    well: string,
    hidrometro: number,
    originalKey?: string | null
  ) => {
    const newKey = `${date}-${well}`;

    try {
      const batch = writeBatch(db);

      // If it's an edit and the key has changed (date or well), delete the old document
      if (originalKey && originalKey !== newKey) {
        // Only admins can change the key (date or well) which requires a delete operation
        if (userRole !== 'admin') {
           toast({
            title: "Permissão Negada",
            description: "Você não tem permissão para alterar a data ou o poço de um lançamento existente.",
            variant: "destructive",
          });
          return false;
        }
        const oldDocRef = doc(db, "allocations", originalKey);
        batch.delete(oldDocRef);
      }

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
      
      const newDocRef = doc(db, "allocations", newKey);
      batch.set(newDocRef, newEntry, { merge: true });

      await batch.commit();

      toast({
        title: "Salvo com sucesso!",
        description: `Os dados de ${well} para ${date} foram salvos.`,
      });
      
      if (originalKey) { // If it was an edit
        setActiveTab("monthly");
      }
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
    if (userRole !== 'admin') {
      toast({
        title: "Permissão Negada",
        description: "Você não tem permissão para excluir lançamentos.",
        variant: "destructive",
      });
      return;
    }

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

  const handleBulkDelete = async (keys: string[]) => {
     if (userRole !== 'admin') {
      toast({
        title: "Permissão Negada",
        description: "Você não tem permissão para excluir lançamentos.",
        variant: "destructive",
      });
      return;
    }
    try {
      const batch = writeBatch(db);
      keys.forEach(key => {
        const docRef = doc(db, "allocations", key);
        batch.delete(docRef);
      });
      await batch.commit();

      toast({
        title: "Exclusão em Massa Concluída",
        description: `${keys.length} lançamento(s) foram removidos.`,
        variant: "destructive",
      });
    } catch (error) {
       console.error("Error bulk deleting allocations: ", error);
       toast({
        title: "Erro na Exclusão em Massa",
        description: "Não foi possível remover os lançamentos selecionados.",
        variant: "destructive",
      });
    }
  }

  const handleEditDay = (key: string) => {
    setEditKey(key);
    setActiveTab("daily");
  };

  const handleCancelEdit = () => {
    setEditKey(null);
    setActiveTab("monthly");
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

  if (!user) {
    return null;
  }

  return (
    <>
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
            onCancelEdit={handleCancelEdit}
            isLoadingData={isLoading}
            userRole={userRole}
          />
        </TabsContent>
        <TabsContent value="monthly" className="pt-6">
          {isLoading ? renderLoadingSkeleton() : (
            <MonthlyReport 
              data={monthlyData} 
              onEdit={handleEditDay}
              onDelete={handleDeleteDay}
              onBulkDelete={handleBulkDelete}
              userRole={userRole}
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
