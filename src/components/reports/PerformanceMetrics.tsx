import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PerformanceMetrics as IPerformanceMetrics, TimeSeriesData, UserPerformance } from '@/types/reports';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface PerformanceMetricsProps {
  metrics: IPerformanceMetrics;
  timeSeriesData: TimeSeriesData[];
  userPerformance: UserPerformance[];
}

export function PerformanceMetrics({ metrics, timeSeriesData, userPerformance }: PerformanceMetricsProps) {
  const metricCards = [
    {
      title: "Total Resolved",
      value: metrics.totalTicketsResolved,
      icon: TrendingUp,
      className: "bg-success text-success-foreground"
    },
    {
      title: "Avg Resolution Time",
      value: `${metrics.avgResolutionTimeHours.toFixed(1)}h`,
      icon: Clock,
      className: "bg-info text-info-foreground"
    },
    {
      title: "First Response Time",
      value: `${metrics.firstResponseTimeHours.toFixed(1)}h`,
      icon: Clock,
      className: "bg-warning text-warning-foreground"
    },
    {
      title: "Overdue Tickets",
      value: metrics.overdueTicketsCount,
      icon: AlertTriangle,
      className: "bg-destructive text-destructive-foreground"
    }
  ];

  const todayStats = [
    { label: "Created Today", value: metrics.ticketsCreatedToday, color: "bg-blue-500" },
    { label: "Resolved Today", value: metrics.ticketsResolvedToday, color: "bg-green-500" },
    { label: "Currently Open", value: metrics.openTicketsCount, color: "bg-yellow-500" }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${metric.className}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Today's Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {todayStats.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <span className="text-lg font-semibold">{stat.value}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                  <Progress value={Math.random() * 100} className="flex-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="resolved" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Resolved"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPerformance.map((user) => (
              <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{user.displayName}</div>
                  <div className="text-sm text-muted-foreground">{user.department}</div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-sm font-medium">{user.ticketsHandled}</div>
                    <div className="text-xs text-muted-foreground">Tickets</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{user.avgResolutionTime.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">Avg Time</div>
                  </div>
                  {user.customerRating && (
                    <div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ⭐ {user.customerRating.toFixed(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ticketsHandled" fill="#8884d8" name="Tickets Handled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}