import { Server, User, Download, Bell, Minus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const metricsData = [
  { name: "23 11M", cpu: 25, memory: 20 },
  { name: "", cpu: 30, memory: 22 },
  { name: "", cpu: 28, memory: 25 },
  { name: "", cpu: 35, memory: 23 },
  { name: "", cpu: 40, memory: 28 },
  { name: "", cpu: 45, memory: 26 },
  { name: "", cpu: 42, memory: 30 },
  { name: "9 AM", cpu: 48, memory: 28 },
  { name: "", cpu: 45, memory: 32 },
  { name: "", cpu: 50, memory: 30 },
  { name: "", cpu: 48, memory: 35 },
  { name: "12 AM", cpu: 52, memory: 33 },
  { name: "", cpu: 50, memory: 36 },
  { name: "", cpu: 48, memory: 34 },
  { name: "", cpu: 45, memory: 38 },
  { name: "5 AM", cpu: 50, memory: 36 },
  { name: "", cpu: 52, memory: 40 },
  { name: "", cpu: 55, memory: 38 },
  { name: "", cpu: 53, memory: 42 },
  { name: "10 HM", cpu: 58, memory: 40 },
];

const alerts = [
  {
    id: 1,
    title: "High CPU Usage - Server01",
    time: "08 31 AM",
    severity: "Critical",
    color: "red",
  },
  {
    id: 2,
    title: "Low Disk Space - Server02",
    time: "08 31 AM",
    severity: "Critical",
    color: "orange",
  },
  {
    id: 3,
    title: "Service Down - Server03",
    time: "08 31 AM",
    severity: "Warning",
    color: "orange",
  },
];

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl text-gray-700">Dashboard</h1>
      </div>

      {/* Server Monitoring Panel */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Panel Header */}

        {/* Metrics Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* CPU Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">CPU Usage</div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-4xl font-medium">65</div>
                <div className="text-2xl text-gray-600 mb-1">%</div>
              </div>
              <div className="h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradCpu" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.5 }} />
                      <stop offset="100%" style={{ stopColor: "#10b981", stopOpacity: 0.1 }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,30 L10,28 L20,25 L30,27 L40,24 L50,22 L60,20 L70,18 L80,15 L90,17 L100,12 L100,40 L0,40 Z"
                    fill="url(#gradCpu)"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Memory Usage</div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-4xl font-medium">72</div>
                <div className="text-2xl text-gray-600 mb-1">%</div>
              </div>
              <div className="h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradMem" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#3b82f6", stopOpacity: 0.5 }} />
                      <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.1 }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,25 L10,24 L20,22 L30,23 L40,20 L50,19 L60,17 L70,16 L80,14 L90,15 L100,10 L100,40 L0,40 Z"
                    fill="url(#gradMem)"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Disk Usage */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Disk Usage</div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-4xl font-medium">58</div>
                <div className="text-2xl text-gray-600 mb-1">%</div>
              </div>
              <div className="h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradDisk" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#ef4444", stopOpacity: 0.5 }} />
                      <stop offset="100%" style={{ stopColor: "#ef4444", stopOpacity: 0.1 }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,28 L10,27 L20,29 L30,26 L40,28 L50,25 L60,27 L70,24 L80,26 L90,23 L100,20 L100,40 L0,40 Z"
                    fill="url(#gradDisk)"
                    stroke="#ef4444"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Uptime */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Uptime</div>
              <div className="flex items-end gap-2 mb-3">
                <div className="text-4xl font-medium">99.9</div>
                <div className="text-2xl text-gray-600 mb-1">%</div>
              </div>
              <div className="h-16 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradUp" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#10b981", stopOpacity: 0.5 }} />
                      <stop offset="100%" style={{ stopColor: "#10b981", stopOpacity: 0.1 }} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,8 L10,7 L20,9 L30,6 L40,8 L50,5 L60,7 L70,4 L80,6 L90,3 L100,2 L100,40 L0,40 Z"
                    fill="url(#gradUp)"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* System Metrics and Active Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Metrics Chart */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-medium text-gray-700 mb-4">System Metrics</h3>
              <div className="text-sm text-gray-600 mb-4">CPU Usage</div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={metricsData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                    ticks={[20, 40, 50, 60]}
                    domain={[0, 60]}
                    label={{ value: "", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMemory)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Active Alerts */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Active Alerts</h3>
                <button className="text-sm text-[#3b82f6] hover:underline">View All</button>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          alert.color === "red" ? "bg-red-500" : "bg-orange-500"
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-700 font-medium mb-1">
                          {alert.title}
                        </div>
                        <div className="text-xs text-gray-500">{alert.time}</div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs text-white ${
                          alert.severity === "Critical" ? "bg-red-500" : "bg-orange-500"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
