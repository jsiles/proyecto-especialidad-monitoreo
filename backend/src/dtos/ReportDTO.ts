/**
 * Report DTOs
 * Data Transfer Objects for report operations
 */

import { ReportType } from '../models/Report';

// Generate report request
export interface GenerateReportDTO {
  type: ReportType;
  from_date: string;
  to_date: string;
  servers?: string[];
  include_charts?: boolean;
  include_incidents?: boolean;
}

// Report response
export interface ReportResponseDTO {
  id: string;
  type: ReportType;
  period: string | null;
  file_path: string | null;
  generated_by_id: string | null;
  generated_by_name: string | null;
  created_at: string;
  download_url: string;
}

// Report list query params
export interface ReportQueryDTO {
  type?: ReportType;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// Report content (for ASFI compliance)
export interface AsfiReportContentDTO {
  report_id: string;
  period: {
    from: string;
    to: string;
  };
  executive_summary: {
    total_incidents: number;
    resolved_incidents: number;
    mean_time_to_repair: number; // in minutes
    overall_availability: number; // percentage
  };
  availability_by_service: Array<{
    service_name: string;
    service_type: string;
    availability_percentage: number;
    downtime_minutes: number;
    incidents_count: number;
  }>;
  incidents: Array<{
    id: string;
    service_name: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number;
    severity: string;
    description: string;
    root_cause: string | null;
    corrective_actions: string | null;
    status: 'resolved' | 'ongoing';
  }>;
  performance_metrics: {
    avg_response_time_ms: number;
    total_transactions: number;
    failed_transactions: number;
    error_rate: number;
  };
  sla_compliance: Array<{
    sla_name: string;
    target: number;
    actual: number;
    compliant: boolean;
  }>;
  recommendations: string[];
  generated_at: string;
}

// Validation
const VALID_REPORT_TYPES: ReportType[] = ['daily', 'weekly', 'monthly', 'asfi', 'custom'];

export function validateGenerateReportDTO(data: unknown): GenerateReportDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { type, from_date, to_date, servers, include_charts, include_incidents } = data as Record<string, unknown>;

  if (!type || !VALID_REPORT_TYPES.includes(type as ReportType)) {
    throw new Error(`Report type is required. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`);
  }

  if (!from_date || typeof from_date !== 'string') {
    throw new Error('From date is required (YYYY-MM-DD format)');
  }

  if (!to_date || typeof to_date !== 'string') {
    throw new Error('To date is required (YYYY-MM-DD format)');
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from_date)) {
    throw new Error('Invalid from_date format. Use YYYY-MM-DD');
  }
  if (!dateRegex.test(to_date)) {
    throw new Error('Invalid to_date format. Use YYYY-MM-DD');
  }

  // Validate date range
  if (new Date(from_date) > new Date(to_date)) {
    throw new Error('from_date must be before to_date');
  }

  return {
    type: type as ReportType,
    from_date,
    to_date,
    servers: Array.isArray(servers) ? servers.map(String) : undefined,
    include_charts: include_charts !== false,
    include_incidents: include_incidents !== false,
  };
}
