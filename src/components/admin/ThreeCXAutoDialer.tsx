import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Play, Square, Pause, Phone, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CallResult {
  phoneNumber: string;
  status: 'initiated' | 'failed' | 'pending';
  callId?: string;
  error?: string;
  timestamp: string;
  attempt: number;
}

interface CampaignStats {
  name?: string;
  totalNumbers: number;
  completed: number;
  successful: number;
  failed: number;
}

const ThreeCXAutoDialer = () => {
  const [isDialing, setIsDialing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [extension, setExtension] = useState('100');
  const [campaignName, setCampaignName] = useState('');
  const [dialDelay, setDialDelay] = useState(5);
  const [threeCXUrl, setThreeCXUrl] = useState('');
  const [threeCXUsername, setThreeCXUsername] = useState('');
  const [threeCXPassword, setThreeCXPassword] = useState('');
  const [threeCXPath, setThreeCXPath] = useState('/webclient/api/call/new');
  const [results, setResults] = useState<CallResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);

  const parsePhoneNumbers = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(num => num.trim())
      .filter(num => num.length > 0 && /^\+?[\d\s\-\(\)]+$/.test(num));
  };

  const handleStartDialing = async () => {
    const numbers = parsePhoneNumbers(phoneNumbers);
    
    if (numbers.length === 0) {
      toast.error('Please enter valid phone numbers');
      return;
    }

    if (!extension) {
      toast.error('Please enter an extension number');
      return;
    }

    if (!threeCXUrl || !threeCXUsername || !threeCXPassword) {
      toast.error('Please enter 3CX API credentials');
      return;
    }

    setIsDialing(true);
    setResults([]);
    setProgress(0);
    setCampaignStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('threecx-auto-dialer', {
        body: {
          action: 'start',
          phoneNumbers: numbers,
          extension,
          campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          dialDelay,
          threeCXUrl,
          threeCXUsername,
          threeCXPassword,
          threeCXPath
        }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results);
        setCampaignStats(data.campaign);
        setProgress(100);
        toast.success(`Campaign completed! ${data.campaign.successful} successful, ${data.campaign.failed} failed`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Auto dialer error:', error);
      toast.error(`Auto dialer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDialing(false);
    }
  };

  const handleSingleCall = async (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!extension) {
      toast.error('Please enter an extension number');
      return;
    }

    if (!threeCXUrl || !threeCXUsername || !threeCXPassword) {
      toast.error('Please enter 3CX API credentials');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('threecx-auto-dialer', {
        body: {
          action: 'single',
          phoneNumber: phoneNumber.trim(),
          extension,
          threeCXUrl,
          threeCXUsername,
          threeCXPassword,
          threeCXPath
        }
      });

      if (error) throw error;

      if (data.success && data.results.length > 0) {
        const result = data.results[0];
        if (result.status === 'initiated') {
          toast.success(`Call initiated to ${phoneNumber}`);
        } else {
          toast.error(`Call failed: ${result.error || 'Unknown error'}`);
        }
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Single call error:', error);
      toast.error(`Call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStopDialing = () => {
    setIsDialing(false);
    setIsPaused(false);
    toast.info('Dialing campaign stopped');
  };

  const exportResults = () => {
    if (results.length === 0) {
      toast.error('No results to export');
      return;
    }

    const csvContent = [
      ['Phone Number', 'Status', 'Call ID', 'Timestamp', 'Error'],
      ...results.map(result => [
        result.phoneNumber,
        result.status,
        result.callId || '',
        result.timestamp,
        result.error || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3cx-dialer-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Results exported to CSV');
  };

  const loadSampleNumbers = () => {
    setPhoneNumbers(`+1234567890
+1234567891
+1234567892
+1234567893
+1234567894`);
    toast.info('Sample numbers loaded');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            3CX Auto Dialer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 3CX Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">3CX Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="threecx-url">3CX Server URL</Label>
                <Input
                  id="threecx-url"
                  value={threeCXUrl}
                  onChange={(e) => setThreeCXUrl(e.target.value)}
                  placeholder="https://your-3cx-server.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threecx-username">Username</Label>
                <Input
                  id="threecx-username"
                  value={threeCXUsername}
                  onChange={(e) => setThreeCXUsername(e.target.value)}
                  placeholder="API Username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threecx-password">Password</Label>
                <Input
                  id="threecx-password"
                  type="password"
                  value={threeCXPassword}
                  onChange={(e) => setThreeCXPassword(e.target.value)}
                  placeholder="API Password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threecx-path">API Path (optional)</Label>
                <Input
                  id="threecx-path"
                  value={threeCXPath}
                  onChange={(e) => setThreeCXPath(e.target.value)}
                  placeholder="/webclient/api/call/new (v20) or /xapi/MakeCall (older)"
                />
              </div>
            </div>
          </div>
 
          <Separator />

          {/* Campaign Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Campaign Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Optional campaign name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extension">Extension</Label>
                <Input
                  id="extension"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dial-delay">Delay Between Calls (seconds)</Label>
                <Input
                  id="dial-delay"
                  type="number"
                  min="1"
                  max="60"
                  value={dialDelay}
                  onChange={(e) => setDialDelay(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Phone Numbers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Phone Numbers</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadSampleNumbers}>
                  <Upload className="h-4 w-4 mr-2" />
                  Load Sample
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone-numbers">Phone Numbers (one per line or comma-separated)</Label>
              <Textarea
                id="phone-numbers"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="+1234567890&#10;+1234567891&#10;+1234567892"
                className="h-32"
              />
              <p className="text-sm text-muted-foreground">
                Valid numbers: {parsePhoneNumbers(phoneNumbers).length}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleStartDialing}
              disabled={isDialing || parsePhoneNumbers(phoneNumbers).length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Start Campaign
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopDialing}
              disabled={!isDialing}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const number = prompt('Enter phone number to call:');
                if (number) handleSingleCall(number);
              }}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Single Call
            </Button>
            {results.length > 0 && (
              <Button variant="outline" onClick={exportResults} className="gap-2">
                <Download className="h-4 w-4" />
                Export Results
              </Button>
            )}
          </div>

          {/* Progress */}
          {isDialing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Campaign Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Campaign Stats */}
          {campaignStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{campaignStats.totalNumbers}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{campaignStats.successful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{campaignStats.failed}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{campaignStats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Call Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{result.phoneNumber}</span>
                    <Badge variant={result.status === 'initiated' ? 'default' : 'destructive'}>
                      {result.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                  {result.error && (
                    <div className="text-sm text-red-600 max-w-xs truncate">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ThreeCXAutoDialer;