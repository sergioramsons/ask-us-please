import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DepartmentStats } from '@/types/reports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Users, Clock, TrendingUp } from 'lucide-react';

interface DepartmentReportsProps {
  departments: DepartmentStats[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#ffb347'];

export function DepartmentReports({ departments }: DepartmentReportsProps) {
  // Calculate total metrics
  const totalTickets = departments.reduce((sum, dept) => sum + dept.totalTickets, 0);
  const totalUsers = departments.reduce((sum, dept) => sum + dept.userCount, 0);
  const avgResolutionTime = departments.reduce((sum, dept) => sum + dept.avgResolutionTime, 0) / departments.length;

  // Prepare data for charts
  const workloadData = departments.map(dept => ({
    name: dept.departmentName,
    tickets: dept.totalTickets,
    resolved: dept.resolvedTickets,
    users: dept.userCount,
    avgTime: dept.avgResolutionTime
  }));

  const efficiencyData = departments.map(dept => ({
    name: dept.departmentName,
    efficiency: dept.totalTickets > 0 ? (dept.resolvedTickets / dept.totalTickets * 100) : 0,
    ticketsPerUser: dept.userCount > 0 ? (dept.totalTickets / dept.userCount) : 0
  }));

  const userDistributionData = departments.map(dept => ({
    name: dept.departmentName,
    value: dept.userCount
  }));

  return (
    <div className="space-y-6">
      {/* Department Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Resolution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResolutionTime.toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departments.map((dept) => {
              const resolutionRate = dept.totalTickets > 0 ? (dept.resolvedTickets / dept.totalTickets * 100) : 0;
              const ticketsPerUser = dept.userCount > 0 ? (dept.totalTickets / dept.userCount) : 0;
              
              return (
                <div key={dept.departmentId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{dept.departmentName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dept.userCount} users • {dept.activeUsers} active
                      </p>
                    </div>
                    <Badge variant={resolutionRate >= 80 ? "default" : resolutionRate >= 60 ? "secondary" : "destructive"}>
                      {resolutionRate.toFixed(1)}% Resolved
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Tickets</div>
                      <div className="text-xl font-bold">{dept.totalTickets}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Resolved</div>
                      <div className="text-xl font-bold text-green-600">{dept.resolvedTickets}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Resolution</div>
                      <div className="text-xl font-bold">{dept.avgResolutionTime.toFixed(1)}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tickets per User</div>
                      <div className="text-xl font-bold">{ticketsPerUser.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Resolution Progress</span>
                      <span>{resolutionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={resolutionRate} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tickets" fill="#8884d8" name="Total Tickets" />
                  <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle>Department Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="efficiency" fill="#ffc658" name="Resolution Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Average Resolution Time */}
        <Card>
          <CardHeader>
            <CardTitle>Average Resolution Time by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} hours`, 'Avg Resolution Time']} />
                  <Bar dataKey="avgTime" fill="#ff7c7c" name="Avg Resolution Time (hours)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}