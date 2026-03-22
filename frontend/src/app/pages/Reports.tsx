import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Calendar, Download, RefreshCw, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { reportsService, type Report, type GenerateReportData } from "../../services/reportsService";
import { useServers } from "../../hooks/useServers";
import { getErrorMessage } from "../../services/api";
import {
  formatLaPazShortDate,
  formatLaPazShortDateTime,
  getLaPazDateInputValue,
} from "../../utils/dateTime";

export function Reports() {
  const { servers } = useServers(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fromDate, setFromDate] = useState(() => {
    return getLaPazDateInputValue(-7);
  });
  
  const [toDate, setToDate] = useState(() => {
    return getLaPazDateInputValue();
  });

  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "asfi">("weekly");
  const [selectedServers, setSelectedServers] = useState<string[]>([]);

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportsService.getAll();
      setReports(data.reports);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!fromDate || !toDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError("Start date must be before end date");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const reportData: GenerateReportData = {
        type: reportType,
        from: fromDate,
        to: toDate,
        servers: selectedServers.length > 0 ? selectedServers : undefined,
      };

      const newReport = await reportsService.generate(reportData);
      setSuccess(`Report generated successfully!`);
      setReports((prev) => [newReport, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAsfiReport = async () => {
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const reportData = {
        from: fromDate,
        to: toDate,
      };

      const newReport = await reportsService.generateAsfi(reportData);
      setSuccess("ASFI Compliance Report generated successfully!");
      setReports((prev) => [newReport, ...prev]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      await reportsService.downloadWithFilename(report.id, report);
      setSuccess(`Report downloaded successfully!`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const toggleServerSelection = (serverId: string) => {
    setSelectedServers((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    );
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: "Daily Report",
      weekly: "Weekly Report",
      monthly: "Monthly Report",
      asfi: "ASFI Compliance",
    };
    return labels[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-gray-700">Reports</h1>
        <Button
          onClick={fetchReports}
          disabled={loading}
          variant="outline"
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

      {/* Generate Report Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* ASFI Quick Report */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-700 mb-2">ASFI Compliance Report</h3>
              <p className="text-sm text-gray-600 mb-4">
                Generate a compliance report according to ASFI Resolution N° 362/2021
              </p>
            </div>
            <Button
              onClick={handleGenerateAsfiReport}
              disabled={generating}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate ASFI Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Custom Report Generation */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-700">Generate Custom Report</h2>
          
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-4 py-2 rounded border transition-colors ${
                    reportType === type
                      ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {getReportTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <div className="relative">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Server Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servers (optional - leave empty for all)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {servers.map((server) => (
                <label
                  key={server.id}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedServers.includes(server.id)}
                    onChange={() => toggleServerSelection(server.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{server.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateReport}
              disabled={generating}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Generated Reports List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-700 mb-4">Generated Reports</h2>
        
        {loading && reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#3b82f6]"></div>
          </div>
        ) : reports.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-700">
                          {getReportTypeLabel(report.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.from_date && report.to_date ? (
                          <>
                            {formatLaPazShortDate(report.from_date)} - {formatLaPazShortDate(report.to_date)}
                          </>
                        ) : report.period_start && report.period_end ? (
                          <>
                            {formatLaPazShortDate(report.period_start)} - {formatLaPazShortDate(report.period_end)}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatLaPazShortDateTime(report.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.file_path ? report.file_path.split('/').pop() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          onClick={() => handleDownload(report)}
                          size="sm"
                          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white flex items-center gap-2"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-2">Generate your first report above</p>
          </div>
        )}
      </div>
    </div>
  );
}
