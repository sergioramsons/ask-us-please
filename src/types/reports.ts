export interface TicketReport {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  avgResolutionTime?: number;
  avgResponseTime?: number;
}

export interface PerformanceMetrics {
  totalTicketsResolved: number;
  avgResolutionTimeHours: number;
  customerSatisfactionScore?: number;
  firstResponseTimeHours: number;
  ticketsCreatedToday: number;
  ticketsResolvedToday: number;
  openTicketsCount: number;
  overdueTicketsCount: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  userCount: number;
  activeUsers: number;
}

export interface TimeSeriesData {
  date: string;
  tickets: number;
  resolved: number;
  created: number;
}

export interface UserPerformance {
  userId: string;
  displayName: string;
  department: string;
  ticketsHandled: number;
  avgResolutionTime: number;
  customerRating?: number;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  department?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}

export interface ReportsData {
  ticketReport: TicketReport;
  performanceMetrics: PerformanceMetrics;
  departmentStats: DepartmentStats[];
  timeSeriesData: TimeSeriesData[];
  userPerformance: UserPerformance[];
}