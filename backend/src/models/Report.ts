/**
 * Report Model
 * Entity representing generated reports
 */

export interface Report {
  id: string;
  type: ReportType;
  period: string | null;
  file_path: string | null;
  generated_by: string | null;
  created_at: string;
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'asfi' | 'custom';

export interface ReportWithUser extends Report {
  generated_by_username: string | null;
}

// Type for creating a new report
export interface CreateReportInput {
  type: ReportType;
  period?: string;
  generated_by?: string;
}

// Type for report generation options
export interface ReportGenerationOptions {
  type: ReportType;
  from_date: string;
  to_date: string;
  include_charts?: boolean;
  include_incidents?: boolean;
  servers?: string[];
}

export default Report;
