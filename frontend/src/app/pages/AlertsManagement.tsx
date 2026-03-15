import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Clock, RefreshCw, Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAlerts } from "../../hooks/useAlerts";
import { useServers } from "../../hooks/useServers";
import { format } from "date-fns";
import { getErrorMessage } from "../../services/api";

export function AlertsManagement() {
  const { 
    alerts, 
    activeAlerts, 
    thresholds, 
    loading, 
    fetchAlerts,
    fetchThresholds,
    acknowledgeAlert,
    resolveAlert,
    createThreshold,
    deleteThreshold 
  } = useAlerts(true);
  
  const { servers } = useServers(true);

  // Form states para nuevo threshold
  const [newThreshold, setNewThreshold] = useState({
    server_id: "",
    metric_type: "cpu" as "cpu" | "memory" | "disk",
    threshold_value: 80,
    severity: "warning" as "info" | "warning" | "critical",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Limpiar mensajes después de 3 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Función para crear threshold
  const handleCreateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newThreshold.server_id) {
      setError("Please select a server");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      await createThreshold(newThreshold);
      setSuccess("Threshold created successfully!");
      setNewThreshold({
        server_id: "",
        metric_type: "cpu",
        threshold_value: 80,
        severity: "warning",
      });
      fetchThresholds();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  // Función para eliminar threshold
  const handleDeleteThreshold = async (id: string) => {
    if (!confirm("Are you sure you want to delete this threshold?")) return;

    try {
      await deleteThreshold(id);
      setSuccess("Threshold deleted successfully!");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Función para acknowledge alert
  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      setSuccess("Alert acknowledged!");
      fetchAlerts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Función para resolver alert
  const handleResolve = async (id: string) => {
    try {
      await resolveAlert(id);
      setSuccess("Alert resolved!");
      fetchAlerts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-orange-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "cpu": return "CPU";
      case "memory": return "Memory";
      case "disk": return "Disk";
      default: return metric;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-gray-700">Alerts Management</h1>
        <Button
          onClick={() => {
            fetchAlerts();
            fetchThresholds();
          }}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="active">Active Alerts ({activeAlerts.length})</TabsTrigger>
              <TabsTrigger value="history">All Alerts ({alerts.length})</TabsTrigger>
              <TabsTrigger value="thresholds">Thresholds ({thresholds.length})</TabsTrigger>
            </TabsList>

            {/* Active Alerts Tab */}
            <TabsContent value="active" className="space-y-4">
              {loading && activeAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
                </div>
              ) : activeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className={`w-4 h-4 ${
                              alert.severity === 'critical' ? 'text-red-500' :
                              alert.severity === 'warning' ? 'text-orange-500' : 'text-blue-500'
                            }`} />
                            <span className="font-medium text-gray-700">{alert.message}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-4">
                            <span>Server: {alert.server_name || alert.server_id}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(alert.created_at), 'MMM dd, HH:mm:ss')}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs text-white ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No active alerts</p>
                </div>
              )}
            </TabsContent>

            {/* All Alerts Tab */}
            <TabsContent value="history">
              {loading && alerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
                </div>
              ) : alerts.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Server</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-700">{alert.message}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{alert.server_name || alert.server_id}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs text-white ${getSeverityColor(alert.severity)}`}>
                                {alert.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {format(new Date(alert.created_at), 'MMM dd, HH:mm')}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {alert.resolved ? (
                                <span className="text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Resolved
                                </span>
                              ) : alert.acknowledged ? (
                                <span className="text-blue-600">Acknowledged</span>
                              ) : (
                                <span className="text-orange-600">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No alerts history</p>
                </div>
              )}
            </TabsContent>

            {/* Thresholds Tab */}
            <TabsContent value="thresholds" className="space-y-6">
              {/* Create New Threshold Form */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Create New Threshold</h3>
                <form onSubmit={handleCreateThreshold} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Server
                      </label>
                      <select
                        value={newThreshold.server_id}
                        onChange={(e) => setNewThreshold({...newThreshold, server_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select server...</option>
                        {servers.map((server) => (
                          <option key={server.id} value={server.id}>{server.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metric
                      </label>
                      <select
                        value={newThreshold.metric_type}
                        onChange={(e) => setNewThreshold({...newThreshold, metric_type: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="cpu">CPU</option>
                        <option value="memory">Memory</option>
                        <option value="disk">Disk</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Threshold (%)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={newThreshold.threshold_value}
                        onChange={(e) => setNewThreshold({...newThreshold, threshold_value: parseInt(e.target.value)})}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Severity
                      </label>
                      <select
                        value={newThreshold.severity}
                        onChange={(e) => setNewThreshold({...newThreshold, severity: e.target.value as any})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={creating}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {creating ? 'Creating...' : 'Create Threshold'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Existing Thresholds */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Configured Thresholds</h3>
                {loading && thresholds.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
                  </div>
                ) : thresholds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {thresholds.map((threshold) => (
                      <div key={threshold.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-700">
                              {getMetricLabel(threshold.metric_type)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Server ID: {threshold.server_id}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteThreshold(threshold.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <div className="text-2xl font-semibold text-gray-700">
                              {threshold.threshold_value}%
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded text-xs text-white ${getSeverityColor(threshold.severity)}`}>
                            {threshold.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>No thresholds configured</p>
                    <p className="text-sm mt-2">Create your first threshold above</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
