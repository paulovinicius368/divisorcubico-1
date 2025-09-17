
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Loader2,
  Save,
  X,
} from "lucide-react";

import type { AllocateHourlyVolumeOutput } from "@/ai/flows/allocate-hourly-volume";
import { allocateHourlyVolume } from "@/ai/flows/allocate-hourly-volume";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MonthlyData } from "./cube-splitter-app";
import { Skeleton } from "./ui/skeleton";
import type { UserRole } from "@/hooks/use-role";


const formSchema = z.object({
  hidrometroAnterior: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  hidrometroAtual: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  well: z.string({ required_error: "Por favor, selecione um poço." }).min(1, "Por favor, selecione um poço."),
}).refine((data) => {
    if (data.hidrometroAnterior > 0) {
      return data.hidrometroAtual >= data.hidrometroAnterior;
    }
    return true;
}, {
  message: "Hidrômetro atual deve ser maior ou igual ao anterior.",
  path: ["hidrometroAtual"],
});

type DailyAllocationProps = {
  onSave: (
    date: string,
    total: number,
    result: AllocateHourlyVolumeOutput,
    well: string,
    hidrometro: number,
    originalKey?: string | null
  ) => Promise<boolean>;
  monthlyData: MonthlyData;
  editKey: string | null;
  onClearEdit: () => void;
  onCancelEdit: () => void;
  isLoadingData: boolean;
  userRole: UserRole;
};

export default function DailyAllocation({ onSave, monthlyData, editKey, onClearEdit, onCancelEdit, isLoadingData, userRole }: DailyAllocationProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setAllocationResult] =
    useState<AllocateHourlyVolumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hidrometroAnterior: 0,
      hidrometroAtual: 0,
      well: undefined,
    },
  });

  const { watch, setValue, getValues, reset, control } = form;
  const hidrometroAtual = watch("hidrometroAtual");
  const hidrometroAnterior = watch("hidrometroAnterior");
  const currentWell = watch("well");

  const isEditing = !!editKey;
  // Allow editing date only for admins
  const canEditDate = isEditing && userRole === 'admin';

  useEffect(() => {
    if(!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate]);


  useEffect(() => {
    if (editKey && monthlyData[editKey]) {
      const editData = monthlyData[editKey];
      const entryDate = parseISO(editData.date);
      
      const allEntriesForWell = Object.values(monthlyData)
        .filter(d => d.well === editData.well && parseISO(d.date) < entryDate)
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      
      const previousDayData = allEntriesForWell[0];
      
      reset({
          well: editData.well,
          hidrometroAtual: editData.hidrometro,
          hidrometroAnterior: previousDayData?.hidrometro ?? (editData.hidrometro - editData.total),
      });
      setSelectedDate(entryDate);
    } else {
        const well = getValues('well');
        resetForm(well, new Date());
    }
  }, [editKey, monthlyData, reset, getValues]);


  useEffect(() => {
    if (isLoadingData || isEditing) return;

    if (selectedDate && currentWell) {
        const allEntriesForWell = Object.values(monthlyData)
            .filter(d => d.well === currentWell && parseISO(d.date) < startOfDay(selectedDate))
            .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
            
        const lastEntryForWell = allEntriesForWell[0];
        
        setValue("hidrometroAnterior", lastEntryForWell?.hidrometro ?? 0);
    } else {
        setValue("hidrometroAnterior", 0);
    }
  }, [selectedDate, currentWell, monthlyData, setValue, isLoadingData, isEditing]);


  useEffect(() => {
    const anterior = getValues("hidrometroAnterior");
    const atual = getValues("hidrometroAtual");
    
    if (anterior > 0 && atual > anterior) {
      setTotalVolume(atual - anterior);
    } else {
      setTotalVolume(0);
    }
  }, [hidrometroAtual, hidrometroAnterior, getValues]);

  const resetForm = (well?: string, date?: Date) => {
    reset({
      hidrometroAnterior: 0,
      hidrometroAtual: 0,
      well: well,
    });
    setTotalVolume(0);
    setSelectedDate(date || new Date());
    onClearEdit();
  };


  const handleSave = async (
    result: AllocateHourlyVolumeOutput,
    volume: number
  ) => {
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const currentWellValue = getValues("well");
      const currentHidrometroAtual = getValues("hidrometroAtual");

      const success = await onSave(
        dateString,
        volume,
        result,
        currentWellValue,
        currentHidrometroAtual,
        editKey
      );
      
      return success;
    }
    return false;
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setAllocationResult(null);
    setError(null);

    const calculatedVolume = values.hidrometroAnterior > 0 && values.hidrometroAtual > values.hidrometroAnterior
      ? values.hidrometroAtual - values.hidrometroAnterior
      : 0;
    
    try {
      let result : AllocateHourlyVolumeOutput;
      if (calculatedVolume <= 0) {
        result = { allocation: [] };
      } else {
        result = await allocateHourlyVolume({
          totalDailyVolume: calculatedVolume,
          well: values.well,
        });
      }

      setAllocationResult(result);
      const success = await handleSave(result, calculatedVolume);

      if (success) {
        if (isEditing) {
          // Parent component will switch tab
          return;
        }
        // Advance to next day on success if creating
        const nextDay = new Date(selectedDate!);
        nextDay.setDate(nextDay.getDate() + 1);
        setSelectedDate(nextDay);
        
        const currentHidroAtual = getValues('hidrometroAtual');
        reset({
          well: getValues('well'),
          hidrometroAnterior: currentHidroAtual,
          hidrometroAtual: 0,
        });
      }
      
    } catch (e: any) {
      if (e.message && e.message.includes('503')) {
        setError("O serviço de alocação está sobrecarregado. Por favor, tente novamente em alguns instantes.");
      } else {
        setError("Falha ao alocar volume. Por favor, tente novamente.");
      }
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleClearEdit = () => {
    resetForm(getValues('well'), new Date());
  };

  const editDate = isEditing && editKey ? monthlyData[editKey]?.date : null;

  if (isLoadingData) {
    return (
       <div className="grid grid-cols-1 gap-6 max-w-lg mx-auto">
         <Card>
           <CardHeader>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
           </CardHeader>
           <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
               <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
               <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
           </CardContent>
           <CardFooter>
              <Skeleton className="h-10 w-full" />
           </CardFooter>
         </Card>
       </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
           <div className="flex justify-between items-start">
            <div>
              <CardTitle>{isEditing ? 'Editar Lançamento' : 'Configurar Alocação'}</CardTitle>
              <CardDescription>
                {isEditing && editDate ? `Modificando dados de ${monthlyData[editKey!]?.well} do dia ${format(parseISO(editDate), 'dd/MM/yyyy', { locale: ptBR })}.` : 'Insira os dados para salvar o lançamento diário.'}
              </CardDescription>
            </div>
            {isEditing && (
              <Button variant="ghost" size="icon" onClick={handleClearEdit} className="-mt-2 -mr-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Limpar Edição</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <fieldset className="space-y-6" disabled={isSubmitting}>
                <FormField
                  control={control}
                  name="well"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poços de Captação</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isEditing && userRole !== 'admin'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um poço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MAAG">MAAG</SelectItem>
                          <SelectItem value="PECUÁRIA">PECUÁRIA</SelectItem>
                          <SelectItem value="TCHE">TCHÊ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Data da Alocação</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        disabled={!canEditDate && isEditing}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                           (!canEditDate && isEditing) && "disabled:cursor-not-allowed disabled:opacity-70"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) setSelectedDate(startOfDay(date));
                        }}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => {
                          const dateString = format(date, "yyyy-MM-dd");
                          const well = getValues("well");
                          const currentEditKey = `${dateString}-${well}`;
                          if (!well) return false;
                          // Allow selection if it's the item being edited
                          if (isEditing && editKey === currentEditKey) {
                            return false;
                          }
                          // Block if another entry already exists for that day and well
                          return !!monthlyData[currentEditKey];
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                   {isEditing && !canEditDate && (
                      <p className="text-xs text-muted-foreground">Apenas administradores podem alterar a data de um lançamento.</p>
                   )}
                </div>

                <FormField
                  control={control}
                  name="hidrometroAnterior"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hidrômetro Anterior</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Leitura anterior"
                          readOnly
                          disabled
                          {...field}
                          className="cursor-default bg-muted/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="hidrometroAtual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hidrômetro Atual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Leitura atual"
                          {...field}
                          onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? '' : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Volume Diário Total (m³)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      readOnly
                      disabled
                      value={totalVolume.toFixed(2)}
                      className="cursor-default bg-muted/50 font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </fieldset>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </CardContent>
            <CardFooter className={cn("flex gap-2", isEditing ? "flex-col-reverse" : "flex-col")}>
               <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Atualizando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Atualizar Lançamento' : 'Salvar e Avançar'}
                  </>
                )}
              </Button>
              {isEditing && (
                 <Button type="button" variant="outline" onClick={onCancelEdit} className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    Cancelar Edição
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
