import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/Icon';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/telemetria')({
  component: TelemetriaPage,
});

function TelemetriaPage() {
  const [search, setSearch] = useState('');
  const [filterOk, setFilterOk] = useState<'all' | 'success' | 'fail'>('all');

  const { data: logs, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['system-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_job_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const detailStr = JSON.stringify(log.detalhe).toLowerCase();
      const matchesSearch = log.job.toLowerCase().includes(search.toLowerCase()) || 
                          detailStr.includes(search.toLowerCase());
      const matchesFilter = filterOk === 'all' ? true : (filterOk === 'success' ? log.ok : !log.ok);
      return matchesSearch && matchesFilter;
    });
  }, [logs, search, filterOk]);

  const failedRoutesSummary = useMemo(() => {
    if (!logs) return [];
    const failures = logs.filter(l => !l.ok);
    const grouped = failures.reduce((acc, curr) => {
      const detail = curr.detalhe as any;
      const route = detail?.input?.surface || detail?.message || curr.job;
      if (!acc[route]) acc[route] = { count: 0, last: curr.started_at };
      acc[route].count++;
      if (new Date(curr.started_at) > new Date(acc[route].last)) acc[route].last = curr.started_at;
      return acc;
    }, {} as Record<string, { count: number; last: string }>);

    return Object.entries(grouped)
      .map(([route, data]) => ({ route, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  const exportCSV = () => {
    const headers = ['Evento', 'Status', 'Data', 'Detalhes'];
    const rows = filteredLogs.map(log => [
      log.job,
      log.ok ? 'Sucesso' : 'Falha',
      new Date(log.started_at).toISOString(),
      JSON.stringify(log.detalhe).replace(/"/g, '""')
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `telemetria_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso");
  };

  const exportPDF = () => {
    toast.info("Geração de PDF iniciada (simulação via print)");
    window.print();
  };

  return (
    <div className="container mx-auto py-10 px-4 print:p-0">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Telemetria do Sistema</h1>
            <p className="text-muted-foreground mt-2">Monitoramento de eventos, falhas e integridade da plataforma.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Icon name="download" className="mr-2" size={16} /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Icon name="picture_as_pdf" className="mr-2" size={16} /> PDF
            </Button>
          </div>
        </div>

        {isError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-8 panel p-6 border-rose-500/30 bg-rose-500/5"
          >
            <h3 className="text-sm font-semibold text-rose-600 flex items-center gap-2">
              <Icon name="error" size={16} /> Não foi possível carregar a telemetria
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {(error as Error)?.message ?? 'Erro inesperado ao ler os registros.'} Isto não
              significa que não há eventos: a leitura falhou.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Tentando novamente…' : 'Tentar novamente'}
            </Button>
          </div>
        )}

        {!isError && failedRoutesSummary.length > 0 && (
          <div className="mb-8 grid gap-4 md:grid-cols-1 print:hidden">
            <div className="panel p-6 border-rose-500/20 bg-rose-500/5">
              <h3 className="text-sm font-semibold text-rose-600 mb-4 flex items-center gap-2">
                <Icon name="warning" size={16} /> Resumo de Falhas Recentes
              </h3>
              <div className="space-y-3">
                {failedRoutesSummary.map(f => (
                  <div key={f.route} className="flex justify-between items-center text-xs">
                    <span className="font-mono text-muted-foreground">{f.route}</span>
                    <div className="flex gap-4">
                      <span className="text-rose-600 font-bold">{f.count} falhas</span>
                      <span className="text-muted-foreground">Última: {new Date(f.last).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-6 print:hidden">
          <Input 
            placeholder="Buscar nos logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
          />
          <div className="flex gap-2">
            {(['all', 'success', 'fail'] as const).map((f) => (
              <Button 
                key={f}
                variant={filterOk === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterOk(f)}
              >
                {f === 'all' ? 'Tudo' : f === 'success' ? 'Sucesso' : 'Falhas'}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Evento</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground" role="status" aria-live="polite">Carregando logs...</td></tr>
              ) : isError ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Leitura indisponível — use “Tentar novamente”.</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Nenhum evento encontrado.</td></tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{log.job}</td>
                  <td className="px-6 py-4">
                    <Badge variant={log.ok ? "default" : "destructive"}>
                      {log.ok ? "Sucesso" : "Falha"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(log.started_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] max-w-md break-all">
                    {JSON.stringify(log.detalhe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}