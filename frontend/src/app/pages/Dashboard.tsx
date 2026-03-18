import { useEffect, useState } from "react";
import { Server, Activity, HardDrive, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMetrics } from "../../hooks/useMetrics";
import { useAlerts } from "../../hooks/useAlerts";
import { useServers } from "../../hooks/useServers";
import metricsService, { type ATCMetrics, type SPIMetrics } from "../../services/metricsService";
import { format } from "date-fns";

const grafanaBaseUrl = (import.meta.env.VITE_GRAFANA_URL || "/grafana").replace(/\/$/, "");
const GRAFANA_DASHBOARD_URL = `${grafanaBaseUrl}/d/main-monitoring?orgId=1&from=now-1h&to=now&theme=light&kiosk`;
const GRAFANA_HOME_URL = `${grafanaBaseUrl}/`;

export function Dashboard() {
  // Hooks con auto-refresh cada 10 segundos
  const { metrics, summary, loading: metricsLoading, fetchMetrics } = useMetrics(true, 10000);
  const { activeAlerts, loading: alertsLoading } = useAlerts(true, 10000);
  const { servers, loading: serversLoading } = useServers(true);

  // Estado para datos históricos
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [spiMetrics, setSpiMetrics] = useState<SPIMetrics | null>(null);
  const [atcMetrics, setAtcMetrics] = useState<ATCMetrics | null>(null);
  const [nationalSystemsLoading, setNationalSystemsLoading] = useState(false);

  // Calcular promedios de las métricas
  const avgCpu = summary?.average_cpu || 0;
  const avgMemory = summary?.average_memory || 0;
  const avgDisk = metrics.length > 0 
    ? metrics.reduce((acc, m) => acc + m.disk, 0) / metrics.length 
    : 0;
  
  // Calcular uptime (servidores online / total)
  const uptime = summary 
    ? summary.total_servers > 0 
      ? ((summary.servers_online / summary.total_servers) * 100).toFixed(1)
      : 100
    : 100;

  // Preparar datos para el gráfico (últimas 20 métricas)
  useEffect(() => {
    if (metrics.length > 0) {
      const chartData = metrics.slice(-20).map((m) => ({
        name: format(new Date(m.timestamp), 'HH:mm'),
        cpu: Math.round(m.cpu),
        memory: Math.round(m.memory),
        disk: Math.round(m.disk),
      }));
      setHistoricalData(chartData);
    }
  }, [metrics]);

  useEffect(() => {
    let active = true;

    const fetchNationalSystems = async () => {
      setNationalSystemsLoading(true);
      try {
        const [spi, atc] = await Promise.all([
          metricsService.getSPIMetrics(),
          metricsService.getATCMetrics(),
        ]);

        if (!active) {
          return;
        }

        setSpiMetrics(spi);
        setAtcMetrics(atc);
      } catch (error) {
        if (!active) {
          return;
        }

        console.error('Error fetching SPI/ATC metrics:', error);
      } finally {
        if (active) {
          setNationalSystemsLoading(false);
        }
      }
    };

    void fetchNationalSystems();

    const intervalId = setInterval(() => {
      void fetchNationalSystems();
    }, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  // Función para obtener color según severidad
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-orange-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const renderServerMetrics = (
    server: { type?: string },
    serverMetric?: { cpu: number; memory: number; disk: number }
  ) => {
    if (server.type === 'spi') {
      return spiMetrics ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500">TPS</div>
            <div className="font-medium">{spiMetrics.transactionsPerSecond.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Failed/s</div>
            <div className="font-medium">{spiMetrics.failedTransactionsPerSecond.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">P95</div>
            <div className="font-medium">{spiMetrics.p95Duration.toFixed(2)}s</div>
          </div>
        </div>
      ) : null;
    }

    if (server.type === 'atc') {
      return atcMetrics ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-gray-500">TPS</div>
            <div className="font-medium">{atcMetrics.transactionsPerSecond.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Auth</div>
            <div className="font-medium">{(atcMetrics.authorizationRate * 100).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-gray-500">State</div>
            <div className="font-medium">{atcMetrics.serviceUp === 1 ? 'UP' : 'DOWN'}</div>
          </div>
        </div>
      ) : null;
    }

    if (!serverMetric) {
      return null;
    }

    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-gray-500">CPU</div>
          <div className="font-medium">{Math.round(serverMetric.cpu)}%</div>
        </div>
        <div>
          <div className="text-gray-500">RAM</div>
          <div className="font-medium">{Math.round(serverMetric.memory)}%</div>
        </div>
        <div>
          <div className="text-gray-500">Disk</div>
          <div className="font-medium">{Math.round(serverMetric.disk)}%</div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title and Refresh Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-gray-700">Dashboard</h1>
        <button
          onClick={() => {
            fetchMetrics();
            void metricsService.getSPIMetrics().then(setSpiMetrics).catch((error) => {
              console.error('Error refreshing SPI metrics:', error);
            });
            void metricsService.getATCMetrics().then(setAtcMetrics).catch((error) => {
              console.error('Error refreshing ATC metrics:', error);
            });
          }}
          disabled={metricsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-md hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${metricsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {(metricsLoading && metrics.length === 0) ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6] mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Servers */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-gray-500" />
                <div className="text-sm text-gray-600">Total Servers</div>
              </div>
              <div className="flex items-end gap-2">
                <div className="text-3xl font-medium">{summary?.total_servers || 0}</div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {summary?.servers_online || 0} online, {summary?.servers_offline || 0} offline
              </div>
            </div>

            {/* CPU Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-red-500" />
                <div className="text-sm text-gray-600">CPU Average</div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-3xl font-medium">{Math.round(avgCpu)}</div>
                <div className="text-xl text-gray-600 mb-1">%</div>
              </div>
              <div className={`h-1 rounded-full ${avgCpu > 80 ? 'bg-red-500' : avgCpu > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                   style={{ width: `${Math.min(avgCpu, 100)}%` }}>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-blue-500" />
                <div className="text-sm text-gray-600">Memory Average</div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-3xl font-medium">{Math.round(avgMemory)}</div>
                <div className="text-xl text-gray-600 mb-1">%</div>
              </div>
              <div className={`h-1 rounded-full ${avgMemory > 85 ? 'bg-red-500' : avgMemory > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`} 
                   style={{ width: `${Math.min(avgMemory, 100)}%` }}>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-orange-500" />
                <div className="text-sm text-gray-600">Disk Average</div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-3xl font-medium">{Math.round(avgDisk)}</div>
                <div className="text-xl text-gray-600 mb-1">%</div>
              </div>
              <div className={`h-1 rounded-full ${avgDisk > 90 ? 'bg-red-500' : avgDisk > 75 ? 'bg-yellow-500' : 'bg-orange-500'}`} 
                   style={{ width: `${Math.min(avgDisk, 100)}%` }}>
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-500" />
                <div className="text-sm text-gray-600">Availability</div>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-3xl font-medium">{uptime}</div>
                <div className="text-xl text-gray-600 mb-1">%</div>
              </div>
              <div className="h-1 rounded-full bg-green-500" style={{ width: `${uptime}%` }}></div>
            </div>
          </div>

          {/* Main Content: Chart and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Metrics Chart */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-700 mb-4">System Metrics (Real-time)</h3>
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      domain={[0, 100]}
                      label={{ value: "%", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCpu)"
                      name="CPU %"
                    />
                    <Area
                      type="monotone"
                      dataKey="memory"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMemory)"
                      name="Memory %"
                    />
                    <Area
                      type="monotone"
                      dataKey="disk"
                      stroke="#f97316"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorDisk)"
                      name="Disk %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Waiting for metrics data...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Active Alerts */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Active Alerts</h3>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                  {activeAlerts.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {alertsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                  </div>
                ) : activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-start gap-2 mb-1">
                        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getSeverityTextColor(alert.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 font-medium mb-1 truncate">
                            {alert.message}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(alert.created_at), 'HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                      <div className="ml-6">
                        <span className={`inline-block px-2 py-1 rounded text-xs text-white ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No active alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">SPI Metrics</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${spiMetrics?.serviceUp === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {spiMetrics?.serviceUp === 1 ? 'UP' : 'DOWN'}
                </span>
              </div>
              {nationalSystemsLoading && !spiMetrics ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                </div>
              ) : spiMetrics ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-gray-500 mb-1">Transactions/sec</div>
                    <div className="text-2xl font-medium text-gray-800">{spiMetrics.transactionsPerSecond.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-gray-500 mb-1">Failed/sec</div>
                    <div className="text-2xl font-medium text-gray-800">{spiMetrics.failedTransactionsPerSecond.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 col-span-2">
                    <div className="text-gray-500 mb-1">P95 Duration</div>
                    <div className="text-2xl font-medium text-gray-800">{spiMetrics.p95Duration.toFixed(2)} s</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">SPI metrics unavailable</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">ATC Metrics</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${atcMetrics?.serviceUp === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {atcMetrics?.serviceUp === 1 ? 'UP' : 'DOWN'}
                </span>
              </div>
              {nationalSystemsLoading && !atcMetrics ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                </div>
              ) : atcMetrics ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-gray-500 mb-1">Transactions/sec</div>
                    <div className="text-2xl font-medium text-gray-800">{atcMetrics.transactionsPerSecond.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-gray-500 mb-1">Authorization Rate</div>
                    <div className="text-2xl font-medium text-gray-800">{(atcMetrics.authorizationRate * 100).toFixed(2)}%</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">ATC metrics unavailable</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-700">Grafana Dashboard</h3>
                <p className="text-sm text-gray-500">Visualización embebida desde Grafana con datos de Prometheus.</p>
              </div>
              <a
                href={GRAFANA_HOME_URL}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#2c3e50] text-white rounded-md hover:bg-[#34495e] transition-colors"
              >
                Open Grafana
              </a>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <iframe
                src={GRAFANA_DASHBOARD_URL}
                title="Grafana Monitoring Dashboard"
                className="w-full h-[520px] bg-white"
              />
            </div>
          </div>

          {/* Server List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Monitored Servers</h3>
            {serversLoading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
              </div>
            ) : servers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {servers.map((server) => {
                  const serverMetric = metrics.find(m => m.server_id === server.id);
                  const liveStatus = serverMetric?.status ?? server.status ?? 'unknown';
                  return (
                    <div key={server.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-[#3b82f6]" />
                          <span className="font-medium text-gray-700">{server.name}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full ${
                          liveStatus === 'online' ? 'bg-green-500' : 
                          liveStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">
                        {server.ip_address} • {server.type} • {liveStatus}
                      </div>
                      {renderServerMetrics(server, serverMetric)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Server className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No servers configured</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
