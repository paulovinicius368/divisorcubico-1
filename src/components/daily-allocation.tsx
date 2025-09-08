"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Loader2,
  BarChart2,
  Save,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import { ChartContainer, ChartTooltipContent } from "./ui/chart";
import type { MonthlyData } from "./cube-splitter-app";

const formSchema = z.object({
  hidrometroAnterior: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  hidrometroAtual: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .min(0, "O hidrômetro deve ser um número positivo."),
  well: z.string({ required_error: "Por favor, selecione um poço." }),
}).refine(data => {
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
    allocation: AllocateHourlyVolumeOutput,
    well: string,
    hidrometro: number
  ) => void;
  monthlyData: MonthlyData;
};

export default function DailyAllocation({ onSave, monthlyData }: DailyAllocationProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [allocationResult, setAllocationResult] =
    useState<AllocateHourlyVolumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hidrometroAnterior: 0,
      hidrometroAtual: 0,
    },
  });

  const { watch, setValue, getValues, reset } = form;
  const hidrometroAnterior = watch("hidrometroAnterior");
  const hidrometroAtual = watch("hidrometroAtual");

  useEffect(() => {
    if (selectedDate) {
      const previousDay = subDays(selectedDate, 1);
      const previousDayString = format(previousDay, "yyyy-MM-dd");
      const previousDayData = monthlyData[previousDayString];
      
      const previousOdometer = previousDayData?.hidrometro ?? 0;
      setValue("hidrometroAnterior", previousOdometer, { shouldValidate: true });
    }
  }, [selectedDate, monthlyData, setValue]);

  useEffect(() => {
    const vol = (hidrometroAnterior > 0 && hidrometroAtual > hidrometroAnterior) 
      ? hidrometroAtual - hidrometroAnterior
      : 0;
    setTotalVolume(vol);
  }, [hidrometroAnterior, hidrometroAtual]);


  const handleSaveAndAdvance = (
    allocation: AllocateHourlyVolumeOutput,
    volume: number
  ) => {
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const currentWell = getValues("well");
      const currentHidrometroAtual = getValues("hidrometroAtual");

      onSave(
        dateString,
        volume,
        allocation,
        currentWell,
        currentHidrometroAtual
      );
      
      setAllocationResult(null);
      reset({
        well: currentWell,
        hidrometroAnterior: 0, 
        hidrometroAtual: 0,
      });

      // Advance date to next day
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay);
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setAllocationResult(null);
    setError(null);

    const calculatedVolume = totalVolume;

    if (calculatedVolume <= 0) {
      // If volume is zero or less, just save the odometer reading and advance.
      handleSaveAndAdvance([], 0);
      setIsLoading(false);
      return;
    }

    try {
      const result = await allocateHourlyVolume({
        totalDailyVolume: calculatedVolume,
        well: values.well,
      });
      setAllocationResult(result);
      // Automatically save after generating allocation
      handleSaveAndAdvance(result, calculatedVolume);
    } catch (e: any) {
      if (e.message && e.message.includes('503')) {
        setError("O serviço de alocação está sobrecarregado. Por favor, tente novamente em alguns instantes.");
      } else {
        setError("Falha ao alocar volume. Por favor, tente novamente.");
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const chartConfig = {
    volume: {
      label: "Volume (m³)",
      color: "hsl(var(--primary))",
    },
  };
  
  const isMaagWell = form.getValues("well") === "MAAG";
  const displayAllocation =
    allocationResult && isMaagWell
      ? allocationResult.filter((item) => item.volume > 0)
      : allocationResult;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Configurar Alocação</CardTitle>
          <CardDescription>
            Insira os dados para gerar a alocação horária.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
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
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <FormField
                control={form.control}
                name="well"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poços de Captação</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
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

              <FormField
                control={form.control}
                name="hidrometroAnterior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hidrômetro Anterior</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                control={form.control}
                name="hidrometroAtual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hidrômetro Atual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Leitura atual"
                        {...field}
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

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Lançamento
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Resultado da Alocação</CardTitle>
          <CardDescription>
            Visualização do volume distribuído por hora. Os resultados são salvos e atualizados no relatório mensal automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-[250px] w-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {!isLoading && !displayAllocation && !error && (
            <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
              <p className="text-muted-foreground">
                Os resultados da alocação aparecerão aqui após o salvamento.
              </p>
            </div>
          )}
          {displayAllocation && (
            <div className="space-y-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={displayAllocation} accessibilityLayer>
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent))" }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="volume"
                    fill="hsl(var(--primary))"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Volume (m³)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayAllocation.map(({ hour, volume }) => (
                    <TableRow key={hour}>
                      <TableCell>{`${hour}:00 - ${hour + 1}:00`}</TableCell>
                      <TableCell className="text-right">
                        {volume.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
