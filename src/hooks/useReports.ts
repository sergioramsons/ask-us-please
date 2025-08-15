import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ReportsData, ReportFilters, TicketReport, PerformanceMetrics, DepartmentStats, TimeSeriesData, UserPerformance } from '@/types/reports';
import { Ticket } from '@/types/ticket';

export function useReports() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const { toast } = useToast();

  const generateMockTimeSeriesData = (): TimeSeriesData[] => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        tickets: Math.floor(Math.random() * 20) + 5,
        resolved: Math.floor(Math.random() * 15) + 3,
        created: Math.floor(Math.random() * 25) + 2
      });
    }
    
    return data;
  };

  const calculateTicketReport = (tickets: Ticket[]): TicketReport => {
    const report: TicketReport = {
      total: tickets.length,
      byStatus: {},
      byPriority: {},
      byCategory: {},
      byDepartment: {}
    };

    tickets.forEach(ticket => {
      // Count by status
      report.byStatus[ticket.status] = (report.byStatus[ticket.status] || 0) + 1;
      
      // Count by priority
      report.byPriority[ticket.priority] = (report.byPriority[ticket.priority] || 0) + 1;
      
      // Count by category
      report.byCategory[ticket.category] = (report.byCategory[ticket.category] || 0) + 1;
      
      // Count by department (if available)
      const department = 'Support'; // Default for now
      report.byDepartment[department] = (report.byDepartment[department] || 0) + 1;
    });

    // Calculate average resolution time for resolved tickets
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    if (resolvedTickets.length > 0) {
      const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt);
        const updated = new Date(ticket.updatedAt);
        return sum + (updated.getTime() - created.getTime());
      }, 0);
      
      report.avgResolutionTime = totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
    }

    return report;
  };

  const calculatePerformanceMetrics = (tickets: Ticket[]): PerformanceMetrics => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
    const todayTickets = tickets.filter(t => 
      t.createdAt.toISOString().split('T')[0] === todayString
    );
    const todayResolved = resolvedTickets.filter(t => 
      t.updatedAt.toISOString().split('T')[0] === todayString
    );

    let avgResolutionTime = 0;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt);
        const resolved = new Date(ticket.updatedAt);
        return sum + (resolved.getTime() - created.getTime());
      }, 0);
      avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Hours
    }

    return {
      totalTicketsResolved: resolvedTickets.length,
      avgResolutionTimeHours: avgResolutionTime,
      firstResponseTimeHours: 2.5, // Mock data
      ticketsCreatedToday: todayTickets.length,
      ticketsResolvedToday: todayResolved.length,
      openTicketsCount: tickets.filter(t => t.status === 'open').length,
      overdueTicketsCount: tickets.filter(t => {
        const daysDiff = (today.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return t.status === 'open' && daysDiff > 7;
      }).length
    };
  };

  const fetchDepartmentStats = useCallback(async (): Promise<DepartmentStats[]> => {
    try {
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*');

      if (deptError) throw deptError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, department_id, departments(name)');

      if (profilesError) throw profilesError;

      return (departments || []).map(dept => {
        const deptUsers = profiles?.filter(p => p.department_id === dept.id) || [];
        
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalTickets: Math.floor(Math.random() * 50) + 10, // Mock data
          resolvedTickets: Math.floor(Math.random() * 40) + 5, // Mock data
          avgResolutionTime: Math.random() * 24 + 4, // Mock data (hours)
          userCount: deptUsers.length,
          activeUsers: Math.floor(deptUsers.length * 0.8)
        };
      });
    } catch (error) {
      console.error('Error fetching department stats:', error);
      return [];
    }
  }, []);

  const generateUserPerformance = (): UserPerformance[] => {
    // Mock user performance data
    return [
      {
        userId: '1',
        displayName: 'John Doe',
        department: 'Support',
        ticketsHandled: 45,
        avgResolutionTime: 4.2,
        customerRating: 4.8
      },
      {
        userId: '2',
        displayName: 'Jane Smith',
        department: 'Engineering',
        ticketsHandled: 32,
        avgResolutionTime: 6.1,
        customerRating: 4.5
      },
      {
        userId: '3',
        displayName: 'Mike Johnson',
        department: 'Support',
        ticketsHandled: 38,
        avgResolutionTime: 3.8,
        customerRating: 4.9
      }
    ];
  };

  const generateReports = useCallback(async (tickets: Ticket[], filters?: ReportFilters) => {
    setIsLoading(true);
    try {
      let filteredTickets = tickets;

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          filteredTickets = filteredTickets.filter(t => 
            new Date(t.createdAt) >= filters.startDate!
          );
        }
        if (filters.endDate) {
          filteredTickets = filteredTickets.filter(t => 
            new Date(t.createdAt) <= filters.endDate!
          );
        }
        if (filters.status) {
          filteredTickets = filteredTickets.filter(t => t.status === filters.status);
        }
        if (filters.priority) {
          filteredTickets = filteredTickets.filter(t => t.priority === filters.priority);
        }
      }

      const ticketReport = calculateTicketReport(filteredTickets);
      const performanceMetrics = calculatePerformanceMetrics(filteredTickets);
      const departmentStats = await fetchDepartmentStats();
      const timeSeriesData = generateMockTimeSeriesData();
      const userPerformance = generateUserPerformance();

      const reportsData: ReportsData = {
        ticketReport,
        performanceMetrics,
        departmentStats,
        timeSeriesData,
        userPerformance
      };

      setReportsData(reportsData);
      
      toast({
        title: "Reports Generated",
        description: "Successfully generated reports with current data",
      });

    } catch (error) {
      console.error('Error generating reports:', error);
      toast({
        title: "Error",
        description: "Failed to generate reports",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchDepartmentStats, toast]);

  return {
    reportsData,
    isLoading,
    generateReports
  };
}