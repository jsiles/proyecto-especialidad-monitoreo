import { useState } from "react";
import { Server, Clock, User, Download, Bell, Minus, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const alertHistory = [
  {
    id: 1,
    date: "2024-04-20",
    server: "Server01",
    metric: "CPU Usage",
    severity: "Critical",
    status: "Triggered",
    expanded: false,
  },
  {
    id: 2,
    date: "2024-04-20",
    server: "Server01",
    metric: "Disk Space",
    severity: "Warning",
    status: "Resolved",
    expanded: false,
  },
  {
    id: 3,
    date: "2024-04-20",
    server: "Server02",
    metric: "Disk Space",
    severity: "Critical",
    status: "Triggered",
    expanded: false,
  },
];

export function AlertsManagement() {
  const [cpuThreshold, setCpuThreshold] = useState("75");
  const [ramThreshold, setRamThreshold] = useState("80");
  const [diskThreshold, setDiskThreshold] = useState("90");
  const [alerts, setAlerts] = useState(alertHistory);

  const toggleAlert = (id: number) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, expanded: !alert.expanded } : alert
      )
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-500";
      case "Warning":
        return "bg-orange-500";
      default:
        return "bg-green-500";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl text-gray-700">Alerts Management</h1>
      </div>

      {/* Alert Thresholds Panel */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        

        {/* Tabs Content */}
        <div className="p-6">
          <Tabs defaultValue="thresholds" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
              <TabsTrigger value="history">Alert History</TabsTrigger>
            </TabsList>

            {/* Alert Thresholds Tab */}
            <TabsContent value="thresholds" className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* CPU Threshold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      CPU Threshold:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={cpuThreshold}
                        onChange={(e) => setCpuThreshold(e.target.value)}
                        className="w-24 text-center"
                      />
                      <span className="text-lg font-medium text-gray-700">%</span>
                    </div>
                  </div>

                  {/* RAM Threshold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      RAM Threshold:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={ramThreshold}
                        onChange={(e) => setRamThreshold(e.target.value)}
                        className="w-24 text-center"
                      />
                      <span className="text-lg font-medium text-gray-700">%</span>
                    </div>
                  </div>

                  {/* Disk Threshold */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Disk Threshold:
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={diskThreshold}
                        onChange={(e) => setDiskThreshold(e.target.value)}
                        className="w-24 text-center"
                      />
                      <span className="text-lg font-medium text-gray-700">%</span>
                    </div>
                  </div>
                </div>

                {/* Update Button */}
                <div className="flex justify-center">
                  <Button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-8">
                    Update Thresholds
                  </Button>
                </div>
              </div>

              {/* Alert History Section */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Alert History</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-6 gap-4 px-6 py-3">
                      <div className="text-sm font-medium text-gray-600">Date</div>
                      <div className="text-sm font-medium text-gray-600">Server</div>
                      <div className="text-sm font-medium text-gray-600">Metric</div>
                      <div className="text-sm font-medium text-gray-600">Severity</div>
                      <div className="text-sm font-medium text-gray-600">Status</div>
                      <div className="text-sm font-medium text-gray-600"></div>
                    </div>
                  </div>

                  {/* Table Rows */}
                  <div>
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <div className="grid grid-cols-6 gap-4 px-6 py-4 items-center">
                          <div className="text-sm text-gray-700">{alert.date}</div>
                          <div className="text-sm text-gray-700">{alert.server}</div>
                          <div className="text-sm text-gray-700">{alert.metric}</div>
                          <div>
                            <span
                              className={`inline-block px-3 py-1 rounded text-xs text-white ${getSeverityColor(
                                alert.severity
                              )}`}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">{alert.status}</div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => toggleAlert(alert.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <ChevronDown
                                className={`w-5 h-5 text-gray-500 transition-transform ${
                                  alert.expanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Alert History Tab */}
            <TabsContent value="history">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-6 gap-4 px-6 py-3">
                    <div className="text-sm font-medium text-gray-600">Date</div>
                    <div className="text-sm font-medium text-gray-600">Server</div>
                    <div className="text-sm font-medium text-gray-600">Metric</div>
                    <div className="text-sm font-medium text-gray-600">Severity</div>
                    <div className="text-sm font-medium text-gray-600">Status</div>
                    <div className="text-sm font-medium text-gray-600"></div>
                  </div>
                </div>

                {/* Table Rows */}
                <div>
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <div className="grid grid-cols-6 gap-4 px-6 py-4 items-center">
                        <div className="text-sm text-gray-700">{alert.date}</div>
                        <div className="text-sm text-gray-700">{alert.server}</div>
                        <div className="text-sm text-gray-700">{alert.metric}</div>
                        <div>
                          <span
                            className={`inline-block px-3 py-1 rounded text-xs text-white ${getSeverityColor(
                              alert.severity
                            )}`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">{alert.status}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => toggleAlert(alert.id)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            <ChevronDown
                              className={`w-5 h-5 text-gray-500 transition-transform ${
                                alert.expanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
