import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketStats } from "@/types/ticket";
import { Ticket, Users, Clock, CheckCircle } from "lucide-react";

interface DashboardStatsProps {
  stats: TicketStats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: "Total Tickets",
      value: stats.total,
      icon: Ticket,
      className: "bg-gradient-primary text-white"
    },
    {
      title: "Open Tickets",
      value: stats.open,
      icon: Users,
      className: "bg-info text-info-foreground"
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: Clock,
      className: "bg-warning text-warning-foreground"
    },
    {
      title: "Resolved",
      value: stats.resolved,
      icon: CheckCircle,
      className: "bg-success text-success-foreground"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="animate-fade-in shadow-soft hover:shadow-medium transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.className}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}