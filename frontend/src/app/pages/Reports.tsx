import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Calendar } from "lucide-react";

const generatedReports = [
  {
    id: 1,
    date: "2024-04-20",
    reportType: "ASFI Compliance",
    format: "PDF",
  },
  {
    id: 2,
    date: "2024-04-20",
    reportType: "",
    format: "",
  },
];

export function Reports() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("2022-07-31");

  const handleGenerateAsfiReport = () => {
    console.log("Generating ASFI Report");
  };

  const handleGenerateReport = () => {
    console.log("Generating Report with dates:", fromDate, toDate);
  };

  const handleDownload = (id: number) => {
    console.log("Downloading report:", id);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl text-gray-700">Reports</h1>
      </div>

      {/* Reports Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-8">
        {/* Generate ASFI Report Section */}
        <div className="space-y-4">
          <Button
            onClick={handleGenerateAsfiReport}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6"
          >
            Generate ASFI Report
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Select Date Range Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-700">Select Date Range</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm text-gray-600">From</label>
              <div className="relative">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pr-10"
                  placeholder="From"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center px-2 pb-2">
              <span className="text-gray-600">To</span>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm text-gray-600">&nbsp;</label>
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

            <div className="pb-2">
              <Button
                onClick={handleGenerateReport}
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6"
              >
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Generated Reports Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-700">Generated Reports</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-4 gap-4 px-6 py-3">
                <div className="text-sm font-medium text-gray-600">Date</div>
                <div className="text-sm font-medium text-gray-600">Report Type</div>
                <div className="text-sm font-medium text-gray-600"></div>
                <div className="text-sm font-medium text-gray-600">Download</div>
              </div>
            </div>

            {/* Table Rows */}
            <div>
              {generatedReports.map((report) => (
                <div
                  key={report.id}
                  className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-4 gap-4 px-6 py-4 items-center">
                    <div className="text-sm text-gray-700">{report.date}</div>
                    <div className="text-sm text-gray-700">{report.reportType}</div>
                    <div className="text-sm text-gray-700">{report.format}</div>
                    <div>
                      <Button
                        onClick={() => handleDownload(report.id)}
                        className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2"
                        size="sm"
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
