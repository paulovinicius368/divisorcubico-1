"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const formSchema = z.object({
  totalVolume: z.coerce
    .number({ invalid_type_error: "Por favor, insira um número." })
    .positive("O volume deve ser um número positivo."),
});

type DailyAllocationProps = {
  onSave: (
    date: string,
    total: number,
    allocation: AllocateHourlyVolumeOutput
  ) => void;
};

export default function DailyAllocation({ onSave }: DailyAllocationProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [allocationResult, setAllocationResult] =
    useState<AllocateHourlyVolumeOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      totalVolume: 1000,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setAllocationResult(null);
    setError(null);
    try {
      const result = await allocateHourlyVolume({
        totalDailyVolume: values.totalVolume,
      });
      setAllocationResult(result);
    } catch (e) {
      setError("Falha ao alocar volume. Por favor, tente novamente.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSave() {
    if (selectedDate && allocationResult) {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      onSave(
        dateString,
        form.getValues("totalVolume"),
        allocationResult
      );
      setAllocationResult(null);
    }
  }

  const chartConfig = {
    volume: {
      label: "Volume (m³)",
      color: "hsl(var(--primary))",
    },
  };
  
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Configurar Alocação</CardTitle>
          <CardDescription>
            Insira o volume total e a data para gerar a alocação horária.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Data da Alocação</Label>
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
                name="totalVolume"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume Diário Total (m³)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 1000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Gerar Alocação
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
            Visualização do volume distribuído por hora.
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
          {!isLoading && !allocationResult && !error && (
            <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed">
              <p className="text-muted-foreground">
                Os resultados aparecerão aqui.
              </p>
            </div>
          )}
          {allocationResult && (
            <div className="space-y-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={allocationResult} accessibilityLayer>
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
                  <Bar dataKey="volume" fill="hsl(var(--primary))" radius={4} />
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
                  {allocationResult.map(({ hour, volume }) => (
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
        {allocationResult && (
          <CardFooter>
            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Salvar no Relatório Mensal
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
