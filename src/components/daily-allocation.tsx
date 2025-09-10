"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Loader2,
  Save,
  X,
  ShieldAlert,
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
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";


const formSchema = z.object({
  hidrometroAnterior: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  hidrometroAtual: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  well: z.string({ required_error: "Por favor, selecione um poço." }),
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
    hidrometro: number
  ) => Promise<boolean>;
  monthlyData: MonthlyData;
  editKey: string | null;
  onClearEdit: () => void;
  isLoadingData: boolean;
  isAdmin: boolean;
  isClaimsLoading: boolean;
};

export default function DailyAllocation({ onSave, monthlyData, editKey, onClearEdit, isLoadingData, isAdmin, isClaimsLoading }: DailyAllocationProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    undefined
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

  useEffect(() => {
    if(!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate]);


  useEffect(() => {
    if (editKey && monthlyData[editKey] && !isLoadingData) {
      const editData = monthlyData[editKey];
      const entryDate = parseISO(editData.date);
      const previousDayDate = subDays(entryDate, 1);
      const previousDayKey = `${format(previousDayDate, "yyyy-MM-dd")}-${editData.well}`;
      const previousDayData = monthlyData[previousDayKey];
      
      reset({
          well: editData.well,
          hidrometroAtual: editData.hidrometro,
          hidrometroAnterior: previousDayData?.hidrometro ?? 0,
      });
      setSelectedDate(entryDate);
    } else if (!isEditing) {
        const well = getValues('well');
        resetForm(well, selectedDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKey, monthlyData, isLoadingData]);


  useEffect(() => {
    if (isEditing || isLoadingData) return;

    if (selectedDate && currentWell) {
        const lastEntryForWell = Object.values(monthlyData)
            .filter(d => d.well === currentWell && new Date(d.date) < selectedDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            [0];
        
        setValue("hidrometroAnterior", lastEntryForWell?.hidrometro ?? 0);
    } else {
        setValue("hidrometroAnterior", 0);
    }
  }, [selectedDate, currentWell, monthlyData, setValue, isEditing, isLoadingData]);


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


  const handleSaveAndAdvance = async (
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
        currentHidrometroAtual
      );
      
      if (!success) return;

      setAllocationResult(null);

      if (isEditing) {
        resetForm(getValues('well'));
      } else {
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setSelectedDate(nextDay);
        
        const currentHidroAtual = getValues('hidrometroAtual');
        reset({
          well: getValues('well'),
          hidrometroAnterior: currentHidroAtual,
          hidrometroAtual: 0,
        });
      }
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setAllocationResult(null);
    setError(null);

    const calculatedVolume = values.hidrometroAnterior > 0 && values.hidrometroAtual > values.hidrometroAnterior
      ? values.hidrometroAtual - values.hidrometroAnterior
      : 0;

    if (calculatedVolume <= 0 && values.hidrometroAnterior > 0) {
      await handleSaveAndAdvance({ allocation: [] }, calculatedVolume);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await allocateHourlyVolume({
        totalDailyVolume: calculatedVolume,
        well: values.well,
      });
      setAllocationResult(result);
      await handleSaveAndAdvance(result, calculatedVolume);
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
  const canInteract = isAdmin && !isClaimsLoading;

  if (isLoadingData || isClaimsLoading) {
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
           <div className="flex justify-between items-center">
            <div>
              <CardTitle>{isEditing ? 'Editar Lançamento' : 'Configurar Alocação'}</CardTitle>
              <CardDescription>
                {isEditing && editDate ? `Modificando dados do dia ${format(parseISO(editDate), 'dd/MM/yyyy', { locale: ptBR })}.` : 'Insira os dados para salvar o lançamento diário.'}
              </CardDescription>
            </div>
            {isEditing && (
              <Button variant="ghost" size="icon" onClick={handleClearEdit} disabled={!canInteract}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
               {!canInteract && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Modo Somente Leitura</AlertTitle>
                  <AlertDescription>
                    Você não tem permissão para criar ou editar lançamentos. Contate um administrador.
                  </AlertDescription>
                </Alert>
              )}
              <fieldset disabled={!canInteract} className="space-y-6">
                <FormField
                  control={control}
                  name="well"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poços de Captação</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (!isEditing) {
                              field.onChange(value);
                          }
                        }}
                        value={field.value}
                        disabled={isEditing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um poço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MAAG">MAAG</SelectItem>
                          <SelectItem value="PECUÁRIA">PECUÁRIA</SelectItem>
                          <SelectItem value="TCHE">TCHE</SelectItem>
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
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                        disabled={isEditing}
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
                          if (!isEditing && date) setSelectedDate(startOfDay(date));
                        }}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => {
                          if (isEditing) return true;
                          const dateString = format(date, "yyyy-MM-dd");
                          const well = getValues("well");
                          if (!well) return false;
                          const key = `${dateString}-${well}`;
                          return !!monthlyData[key];
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || !canInteract} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Atualizar Lançamento' : 'Salvar e Avançar'}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
