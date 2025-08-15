import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useReports } from '@/hooks/useReports';
import { useDepartments } from '@/hooks/useDepartments';
import { TicketAnalytics } from './TicketAnalytics';
import { PerformanceMetrics } from './PerformanceMetrics';
import { DepartmentReports } from './DepartmentReports';
import { ReportFilters } from '@/types/reports';
import { Ticket } from '@/types/ticket';
import { BarChart3, Calendar as CalendarIcon, Download, Filter, RefreshCw, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { stringify } from 'csv-stringify/browser/esm/sync';

interface ReportsDashboardProps {
  tickets: Ticket[];
}

export function ReportsDashboard({ tickets }: ReportsDashboardProps) {
  const { reportsData, isLoading, generateReports } = useReports();
  const { departments, fetchDepartments } = useDepartments();
  
  const [filters, setFilters] = useState<ReportFilters>({});
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  useEffect(() => {
    fetchDepartments();
    // Generate initial reports
    generateReports(tickets);
  }, []);

  const handleGenerateReports = () => {
    const reportFilters: ReportFilters = {
      startDate,
      endDate,
      department: selectedDepartment || undefined,
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined
    };
    
    setFilters(reportFilters);
    generateReports(tickets, reportFilters);
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedDepartment('');
    setSelectedStatus('');
    setSelectedPriority('');
    setFilters({});
    generateReports(tickets);
  };

  const handleExportPDF = () => {
    if (!reportsData) return;

    const doc = new jsPDF();
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    // Title
    doc.setFontSize(20);
    doc.text('Helpdesk Reports', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 20, 45);
    
    let yPosition = 65;
    
    // Ticket Summary
    doc.setFontSize(16);
    doc.text('Ticket Summary', 20, yPosition);
    yPosition += 15;
    
    const ticketData = [
      ['Total Tickets', reportsData.ticketReport.total.toString()],
      ['Open', reportsData.ticketReport.byStatus.open?.toString() || '0'],
      ['In Progress', reportsData.ticketReport.byStatus['in-progress']?.toString() || '0'],
      ['Resolved', reportsData.ticketReport.byStatus.resolved?.toString() || '0'],
      ['Closed', reportsData.ticketReport.byStatus.closed?.toString() || '0']
    ];
    
    (doc as any).autoTable({
      head: [['Metric', 'Count']],
      body: ticketData,
      startY: yPosition,
      margin: { left: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Performance Metrics
    doc.setFontSize(16);
    doc.text('Performance Metrics', 20, yPosition);
    yPosition += 15;
    
    const performanceData = [
      ['Total Resolved', reportsData.performanceMetrics.totalTicketsResolved.toString()],
      ['Avg Resolution Time (hrs)', reportsData.performanceMetrics.avgResolutionTimeHours.toFixed(2)],
      ['First Response Time (hrs)', reportsData.performanceMetrics.firstResponseTimeHours.toFixed(2)],
      ['Tickets Created Today', reportsData.performanceMetrics.ticketsCreatedToday.toString()],
      ['Tickets Resolved Today', reportsData.performanceMetrics.ticketsResolvedToday.toString()],
      ['Open Tickets', reportsData.performanceMetrics.openTicketsCount.toString()],
      ['Overdue Tickets', reportsData.performanceMetrics.overdueTicketsCount.toString()]
    ];
    
    (doc as any).autoTable({
      head: [['Metric', 'Value']],
      body: performanceData,
      startY: yPosition,
      margin: { left: 20 }
    });
    
    // Save PDF
    doc.save(`helpdesk-reports-${dateStr}.pdf`);
  };

  const handleExportCSV = () => {
    if (!reportsData) return;

    const csvData = [
      ['Report Type', 'Metric', 'Value'],
      ['Ticket Summary', 'Total Tickets', reportsData.ticketReport.total],
      ['Ticket Summary', 'Open', reportsData.ticketReport.byStatus.open || 0],
      ['Ticket Summary', 'In Progress', reportsData.ticketReport.byStatus['in-progress'] || 0],
      ['Ticket Summary', 'Resolved', reportsData.ticketReport.byStatus.resolved || 0],
      ['Ticket Summary', 'Closed', reportsData.ticketReport.byStatus.closed || 0],
      ['Performance', 'Total Resolved', reportsData.performanceMetrics.totalTicketsResolved],
      ['Performance', 'Avg Resolution Time (hrs)', reportsData.performanceMetrics.avgResolutionTimeHours.toFixed(2)],
      ['Performance', 'First Response Time (hrs)', reportsData.performanceMetrics.firstResponseTimeHours.toFixed(2)],
      ['Performance', 'Tickets Created Today', reportsData.performanceMetrics.ticketsCreatedToday],
      ['Performance', 'Tickets Resolved Today', reportsData.performanceMetrics.ticketsResolvedToday],
      ['Performance', 'Open Tickets', reportsData.performanceMetrics.openTicketsCount],
      ['Performance', 'Overdue Tickets', reportsData.performanceMetrics.overdueTicketsCount],
    ];

    // Add department data
    reportsData.departmentStats.forEach(dept => {
      csvData.push(['Department', `${dept.departmentName} - Total Tickets`, dept.totalTickets]);
      csvData.push(['Department', `${dept.departmentName} - Resolved Tickets`, dept.resolvedTickets]);
      csvData.push(['Department', `${dept.departmentName} - Avg Resolution Time`, dept.avgResolutionTime.toFixed(2)]);
    });

    const csvString = stringify(csvData);
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `helpdesk-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into helpdesk performance and metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={!reportsData}>
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={!reportsData}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleGenerateReports} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Generating...' : 'Refresh Reports'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleGenerateReports} disabled={isLoading}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Content */}
      {reportsData ? (
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">Ticket Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <TicketAnalytics report={reportsData.ticketReport} />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformanceMetrics 
              metrics={reportsData.performanceMetrics}
              timeSeriesData={reportsData.timeSeriesData}
              userPerformance={reportsData.userPerformance}
            />
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            <DepartmentReports departments={reportsData.departmentStats} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Generate reports to view analytics and insights</p>
              <Button className="mt-4" onClick={handleGenerateReports} disabled={isLoading}>
                {isLoading ? 'Generating Reports...' : 'Generate Reports'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}