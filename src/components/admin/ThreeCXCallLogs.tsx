import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Phone, Download, Calendar, Filter, RefreshCw, Clock, PhoneCall, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CallLog {
  id: string;
  callDate: string;
  duration: number;
  caller: string;
  callee: string;
  extension?: string;
  callType: 'inbound' | 'outbound' | 'internal';
  status: string;
  recording?: string;
  cost?: number;
  timeEnd?: string;
  timeStart?: string;
  ringDuration?: number;
  talkDuration?: number;
}

interface CallLogFilters {
  dateFrom?: string;
  dateTo?: string;
  phoneNumber?: string;
  extension?: string;
  callType?: 'inbound' | 'outbound' | 'internal' | '';
  limit?: number;
}

const ThreeCXCallLogs = () => {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<CallLogFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    limit: 100
  });

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('threecx-call-logs', {
        body: filters
      });

      if (error) throw error;

      if (data.success) {
        setCallLogs(data.data || []);
        toast.success(`Fetched ${data.total} call logs from 3CX`);
      } else {
        throw new Error(data.error || 'Failed to fetch call logs');
      }
    } catch (error: any) {
      console.error('Error fetching call logs:', error);
      toast.error(error.message || 'Failed to fetch call logs from 3CX');
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CallLogFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getCallTypeIcon = (callType: string) => {
    switch (callType) {
      case 'inbound':
        return <PhoneIncoming className="h-4 w-4 text-green-600" />;
      case 'outbound':
        return <PhoneOutgoing className="h-4 w-4 text-blue-600" />;
      case 'internal':
        return <PhoneCall className="h-4 w-4 text-orange-600" />;
      default:
        return <Phone className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'answered': 'bg-green-100 text-green-800',
      'missed': 'bg-red-100 text-red-800',
      'busy': 'bg-yellow-100 text-yellow-800',
      'no-answer': 'bg-gray-100 text-gray-800',
      'failed': 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (callLogs.length === 0) {
      toast.error('No call logs to export');
      return;
    }

    const headers = ['Date/Time', 'Caller', 'Callee', 'Extension', 'Type', 'Duration', 'Status', 'Cost'];
    const rows = callLogs.map(log => [
      formatDateTime(log.callDate),
      log.caller,
      log.callee,
      log.extension || '',
      log.callType,
      formatDuration(log.duration),
      log.status,
      log.cost ? `$${log.cost.toFixed(2)}` : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3cx-call-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Call logs exported to CSV');
  };

  useEffect(() => {
    fetchCallLogs();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            3CX Call Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium">From Date</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">To Date</label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  placeholder="Enter phone number"
                  value={filters.phoneNumber || ''}
                  onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Extension</label>
                <Input
                  placeholder="Enter extension"
                  value={filters.extension || ''}
                  onChange={(e) => handleFilterChange('extension', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Call Type</label>
                <Select value={filters.callType || ''} onValueChange={(value) => handleFilterChange('callType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Limit</label>
                <Select value={filters.limit?.toString() || '100'} onValueChange={(value) => handleFilterChange('limit', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={fetchCallLogs} disabled={loading} className="gap-2">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loading ? 'Loading...' : 'Fetch Call Logs'}
              </Button>
              <Button variant="outline" onClick={exportToCSV} disabled={callLogs.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </Card>

          {/* Call Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-200 px-4 py-2 text-left">Type</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Date/Time</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Caller</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Callee</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Extension</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Duration</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Cost</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Recording</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-gray-200 px-4 py-8 text-center text-gray-500">
                      {loading ? 'Loading call logs...' : 'No call logs found. Try adjusting your filters.'}
                    </td>
                  </tr>
                ) : (
                  callLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getCallTypeIcon(log.callType)}
                          <span className="capitalize">{log.callType}</span>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDateTime(log.callDate)}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {log.caller}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {log.callee}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {log.extension || '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDuration(log.duration)}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {log.cost ? `$${log.cost.toFixed(2)}` : '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {log.recording ? (
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {callLogs.length > 0 && (
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{callLogs.length}</div>
                  <div className="text-sm text-gray-600">Total Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {callLogs.filter(log => log.status.toLowerCase() === 'answered').length}
                  </div>
                  <div className="text-sm text-gray-600">Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {callLogs.filter(log => log.status.toLowerCase() === 'missed').length}
                  </div>
                  <div className="text-sm text-gray-600">Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(callLogs.reduce((total, log) => total + (log.duration || 0), 0))}
                  </div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
              </div>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreeCXCallLogs;