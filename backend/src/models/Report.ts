/**
 * Report Model
 * Entity representing generated reports
 */

export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  period_start: string;
  period_end: string;
  file_path: string | null;
  file_size: number | null;
  generated_by: string | null;
  generated_by_username?: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'asfi' | 'custom';
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportWithUser extends Report {
  generated_by_username: string | null;
}

// Type for creating a new report
export interface CreateReportInput {
  type: ReportType;
  period_start: string;
  period_end: string;
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
