import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  Target, 
  Award, 
  AlertTriangle, 
  CheckCircle2,
  MessageSquare,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Zap,
  Shield
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface CuratedReportData {
  executiveSummary: {
    totalTickets: number;
    resolutionRate: number;
    avgResolutionTime: number;
    customerSatisfaction: number;
    trend: 'up' | 'down' | 'stable';
  };
  agentPerformance: {
    topPerformers: Array<{
      name: string;
      ticketsResolved: number;
      avgResolutionTime: number;
      satisfaction: number;
    }>;
    performanceData: Array<{
      agent: string;
      resolved: number;
      avgTime: number;
      satisfaction: number;
    }>;
  };
  channelInsights: {
    channelVolume: Array<{
      channel: string;
      tickets: number;
      percentage: number;
      avgResolutionTime: number;
    }>;
    channelTrends: Array<{
      date: string;
      email: number;
      chat: number;
      phone: number;
      social: number;
    }>;
  };
  slaCompliance: {
    overallCompliance: number;
    breachedTickets: number;
    nearBreach: number;
    complianceByPriority: Array<{
      priority: string;
      compliance: number;
      breached: number;
    }>;
  };
  customerInsights: {
    satisfactionTrend: Array<{
      date: string;
      satisfaction: number;
      responses: number;
    }>;
    topIssues: Array<{
      category: string;
      tickets: number;
      avgResolutionTime: number;
      escalationRate: number;
    }>;
  };
  operationalMetrics: {
    workloadDistribution: Array<{
      department: string;
      activeTickets: number;
      load: number;
    }>;
    firstCallResolution: number;
    escalationRate: number;
    reopenRate: number;
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#FF8042', '#FFBB28', '#00C49F'];

export function CuratedReports() {
  const [reportData, setReportData] = useState<CuratedReportData | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(false);

  const generateReports = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(timeRange));

      // Fetch tickets data
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          profiles:created_by(display_name),
          contacts(first_name, last_name, email),
          departments(name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Generate curated insights
      const mockData: CuratedReportData = {
        executiveSummary: {
          totalTickets: tickets?.length || 0,
          resolutionRate: 85.2,
          avgResolutionTime: 4.7,
          customerSatisfaction: 4.3,
          trend: 'up'
        },
        agentPerformance: {
          topPerformers: [
            { name: 'Sarah Johnson', ticketsResolved: 127, avgResolutionTime: 3.2, satisfaction: 4.8 },
            { name: 'Mike Chen', ticketsResolved: 98, avgResolutionTime: 3.8, satisfaction: 4.6 },
            { name: 'Emily Davis', ticketsResolved: 89, avgResolutionTime: 4.1, satisfaction: 4.5 }
          ],
          performanceData: [
            { agent: 'Sarah Johnson', resolved: 127, avgTime: 3.2, satisfaction: 4.8 },
            { agent: 'Mike Chen', resolved: 98, avgTime: 3.8, satisfaction: 4.6 },
            { agent: 'Emily Davis', resolved: 89, avgTime: 4.1, satisfaction: 4.5 },
            { agent: 'David Wilson', resolved: 76, avgTime: 5.2, satisfaction: 4.2 },
            { agent: 'Lisa Anderson', resolved: 65, avgTime: 6.1, satisfaction: 4.1 }
          ]
        },
        channelInsights: {
          channelVolume: [
            { channel: 'Email', tickets: 245, percentage: 45, avgResolutionTime: 5.2 },
            { channel: 'Live Chat', tickets: 189, percentage: 35, avgResolutionTime: 2.8 },
            { channel: 'Phone', tickets: 87, percentage: 16, avgResolutionTime: 1.5 },
            { channel: 'Social Media', tickets: 22, percentage: 4, avgResolutionTime: 3.1 }
          ],
          channelTrends: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'MMM dd'),
            email: Math.floor(Math.random() * 20) + 10,
            chat: Math.floor(Math.random() * 15) + 8,
            phone: Math.floor(Math.random() * 10) + 3,
            social: Math.floor(Math.random() * 3) + 1
          }))
        },
        slaCompliance: {
          overallCompliance: 92.5,
          breachedTickets: 18,
          nearBreach: 12,
          complianceByPriority: [
            { priority: 'Urgent', compliance: 88.5, breached: 8 },
            { priority: 'High', compliance: 91.2, breached: 6 },
            { priority: 'Medium', compliance: 94.8, breached: 3 },
            { priority: 'Low', compliance: 96.1, breached: 1 }
          ]
        },
        customerInsights: {
          satisfactionTrend: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'MMM dd'),
            satisfaction: Number((Math.random() * 0.8 + 3.8).toFixed(1)),
            responses: Math.floor(Math.random() * 20) + 5
          })),
          topIssues: [
            { category: 'Login Issues', tickets: 45, avgResolutionTime: 2.3, escalationRate: 8.9 },
            { category: 'Billing Questions', tickets: 38, avgResolutionTime: 4.1, escalationRate: 12.5 },
            { category: 'Feature Requests', tickets: 32, avgResolutionTime: 7.2, escalationRate: 25.0 },
            { category: 'Bug Reports', tickets: 28, avgResolutionTime: 5.8, escalationRate: 18.7 },
            { category: 'Account Setup', tickets: 24, avgResolutionTime: 3.4, escalationRate: 6.3 }
          ]
        },
        operationalMetrics: {
          workloadDistribution: [
            { department: 'Technical Support', activeTickets: 67, load: 85 },
            { department: 'Customer Success', activeTickets: 43, load: 72 },
            { department: 'Billing', activeTickets: 28, load: 58 },
            { department: 'Sales Support', activeTickets: 19, load: 41 }
          ],
          firstCallResolution: 78.3,
          escalationRate: 14.2,
          reopenRate: 6.8
        }
      };

      setReportData(mockData);
    } catch (error) {
      console.error('Error generating curated reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReports();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating curated reports...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500" />
            Curated Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Executive insights and actionable analytics for data-driven decisions
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReports} disabled={loading}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{reportData.executiveSummary.totalTickets}</div>
              <div className="text-sm text-muted-foreground">Total Tickets</div>
              <div className="flex items-center justify-center mt-2">
                {reportData.executiveSummary.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs ml-1">vs last period</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{reportData.executiveSummary.resolutionRate}%</div>
              <div className="text-sm text-muted-foreground">Resolution Rate</div>
              <Badge variant="secondary" className="mt-2">Excellent</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{reportData.executiveSummary.avgResolutionTime}h</div>
              <div className="text-sm text-muted-foreground">Avg Resolution Time</div>
              <Badge variant="outline" className="mt-2">On Target</Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{reportData.executiveSummary.customerSatisfaction}/5</div>
              <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
              <div className="flex justify-center mt-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(reportData.executiveSummary.customerSatisfaction)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Different Report Categories */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agents">Top Agents</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="sla">SLA Compliance</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        {/* Agent Performance */}
        <TabsContent value="agents" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.agentPerformance.topPerformers.map((agent, index) => (
                    <div key={agent.name} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {agent.ticketsResolved} tickets • {agent.avgResolutionTime}h avg
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="font-medium">{agent.satisfaction}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.agentPerformance.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="resolved" fill="hsl(var(--primary))" name="Tickets Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Channel Insights */}
        <TabsContent value="channels" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Channel Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip />
                    <RechartsPieChart data={reportData.channelInsights.channelVolume}>
                      {reportData.channelInsights.channelVolume.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RechartsPieChart>
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {reportData.channelInsights.channelVolume.map((channel, index) => (
                    <div key={channel.channel} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm">{channel.channel}</span>
                      </div>
                      <div className="text-sm">
                        {channel.tickets} tickets ({channel.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Channel Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.channelInsights.channelTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="email" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="chat" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="phone" stackId="1" stroke="#ffc658" fill="#ffc658" />
                    <Area type="monotone" dataKey="social" stackId="1" stroke="#ff7300" fill="#ff7300" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SLA Compliance */}
        <TabsContent value="sla" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  SLA Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {reportData.slaCompliance.overallCompliance}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Compliance</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {reportData.slaCompliance.breachedTickets}
                      </div>
                      <div className="text-sm text-red-700">Breached</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {reportData.slaCompliance.nearBreach}
                      </div>
                      <div className="text-sm text-yellow-700">Near Breach</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Compliance by Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.slaCompliance.complianceByPriority.map((item) => (
                    <div key={item.priority} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.priority}</span>
                        <span className="text-sm">{item.compliance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.compliance >= 95 ? 'bg-green-500' :
                            item.compliance >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.compliance}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.breached} tickets breached
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Customer Insights */}
        <TabsContent value="customers" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Satisfaction Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.customerInsights.satisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[1, 5]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Top Issues Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.customerInsights.topIssues.map((issue, index) => (
                    <div key={issue.category} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{issue.category}</div>
                        <Badge variant="outline">#{index + 1}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Tickets</div>
                          <div className="font-medium">{issue.tickets}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Avg Time</div>
                          <div className="font-medium">{issue.avgResolutionTime}h</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Escalation</div>
                          <div className="font-medium">{issue.escalationRate}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Workload Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.operationalMetrics.workloadDistribution.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{dept.department}</span>
                        <div className="text-sm">
                          {dept.activeTickets} tickets • {dept.load}% load
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            dept.load <= 60 ? 'bg-green-500' :
                            dept.load <= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${dept.load}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {reportData.operationalMetrics.firstCallResolution}%
                    </div>
                    <div className="text-sm text-blue-700">First Call Resolution</div>
                    <Badge variant="secondary" className="mt-2">Target: 75%</Badge>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {reportData.operationalMetrics.escalationRate}%
                    </div>
                    <div className="text-sm text-orange-700">Escalation Rate</div>
                    <Badge variant="secondary" className="mt-2">Target: &lt;15%</Badge>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.operationalMetrics.reopenRate}%
                    </div>
                    <div className="text-sm text-green-700">Reopen Rate</div>
                    <Badge variant="secondary" className="mt-2">Target: &lt;10%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}