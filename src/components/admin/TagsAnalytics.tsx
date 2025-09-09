import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tag, TrendingUp, Users, Ticket, BookOpen } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface TagAnalytics {
  tag: string;
  ticketCount: number;
  contactCount: number;
  articleCount: number;
  totalUsage: number;
  lastUsed: string;
}

export function TagsAnalytics() {
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { organization } = useOrganization();

  useEffect(() => {
    loadTagAnalytics();
  }, [organization?.id, selectedTimeRange]);

  const loadTagAnalytics = async () => {
    // Mock data for demonstration
    const mockTagAnalytics: TagAnalytics[] = [
      {
        tag: 'login',
        ticketCount: 45,
        contactCount: 23,
        articleCount: 3,
        totalUsage: 71,
        lastUsed: '2024-01-09'
      },
      {
        tag: 'billing',
        ticketCount: 32,
        contactCount: 18,
        articleCount: 5,
        totalUsage: 55,
        lastUsed: '2024-01-08'
      },
      {
        tag: 'technical',
        ticketCount: 28,
        contactCount: 12,
        articleCount: 8,
        totalUsage: 48,
        lastUsed: '2024-01-09'
      },
      {
        tag: 'urgent',
        ticketCount: 34,
        contactCount: 0,
        articleCount: 1,
        totalUsage: 35,
        lastUsed: '2024-01-09'
      },
      {
        tag: 'password',
        ticketCount: 22,
        contactCount: 8,
        articleCount: 4,
        totalUsage: 34,
        lastUsed: '2024-01-07'
      },
      {
        tag: 'integration',
        ticketCount: 15,
        contactCount: 5,
        articleCount: 12,
        totalUsage: 32,
        lastUsed: '2024-01-06'
      },
      {
        tag: 'mobile',
        ticketCount: 18,
        contactCount: 7,
        articleCount: 2,
        totalUsage: 27,
        lastUsed: '2024-01-05'
      },
      {
        tag: 'api',
        ticketCount: 12,
        contactCount: 3,
        articleCount: 6,
        totalUsage: 21,
        lastUsed: '2024-01-08'
      }
    ];

    setTagAnalytics(mockTagAnalytics);
  };

  const filteredTags = tagAnalytics.filter(item => {
    const matchesSearch = item.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'tickets' && item.ticketCount > 0) ||
      (selectedCategory === 'contacts' && item.contactCount > 0) ||
      (selectedCategory === 'articles' && item.articleCount > 0);
    
    return matchesSearch && matchesCategory;
  });

  const topTagsData = tagAnalytics.slice(0, 8).map(item => ({
    name: item.tag,
    tickets: item.ticketCount,
    contacts: item.contactCount,
    articles: item.articleCount,
    total: item.totalUsage
  }));

  const getTagColor = (usage: number) => {
    if (usage >= 50) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (usage >= 25) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (usage >= 10) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const totalTags = tagAnalytics.length;
  const totalUsage = tagAnalytics.reduce((sum, item) => sum + item.totalUsage, 0);
  const avgUsagePerTag = totalTags > 0 ? Math.round(totalUsage / totalTags) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tags Analytics</h2>
          <p className="text-muted-foreground">Analyze tag usage across tickets, contacts, and articles</p>
        </div>
        
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Usage/Tag</p>
                <p className="text-2xl font-bold">{avgUsagePerTag}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Most Used</p>
                <p className="text-lg font-bold">{tagAnalytics[0]?.tag || 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Tag Details</TabsTrigger>
          <TabsTrigger value="trends">Usage Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tag Usage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTagsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" name="Tickets" />
                  <Bar dataKey="contacts" fill="hsl(var(--secondary))" name="Contacts" />
                  <Bar dataKey="articles" fill="hsl(var(--accent))" name="Articles" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                <SelectItem value="tickets">Used in Tickets</SelectItem>
                <SelectItem value="contacts">Used in Contacts</SelectItem>
                <SelectItem value="articles">Used in Articles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Tag</th>
                      <th className="text-left p-4 font-medium">Tickets</th>
                      <th className="text-left p-4 font-medium">Contacts</th>
                      <th className="text-left p-4 font-medium">Articles</th>
                      <th className="text-left p-4 font-medium">Total Usage</th>
                      <th className="text-left p-4 font-medium">Last Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTags.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/25">
                        <td className="p-4">
                          <Badge className={getTagColor(item.totalUsage)}>
                            {item.tag}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-muted-foreground" />
                            {item.ticketCount}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {item.contactCount}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {item.articleCount}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{item.totalUsage}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(item.lastUsed).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tag Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Trends analysis coming soon...</p>
                <p className="text-sm">Track how tag usage changes over time</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}