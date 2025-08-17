import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Play, Square, Pause, Phone, Upload, Download, Plus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Campaign {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';
  agent_extension: string;
  delay_seconds: number;
  phone_numbers: string[];
  current_index: number;
  successful_calls: number;
  failed_calls: number;
  total_calls: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface CallResult {
  id: string;
  phone_number: string;
  status: 'dialing' | 'connected' | 'busy' | 'no_answer' | 'failed' | 'cancelled';
  call_duration?: number;
  call_id?: string;
  error_message?: string;
  dialed_at: string;
}

const AutoDialerCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [extension, setExtension] = useState('100');
  const [dialDelay, setDialDelay] = useState(5);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_dialer_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    }
  };

  const fetchCallResults = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('auto_dialer_results')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('dialed_at', { ascending: false });

      if (error) throw error;
      setCallResults((data || []) as CallResult[]);
    } catch (error) {
      console.error('Error fetching call results:', error);
      toast.error('Failed to fetch call results');
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCallResults(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  // Realtime updates
  useEffect(() => {
    const campaignChannel = supabase
      .channel('campaign-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'auto_dialer_campaigns'
      }, () => {
        fetchCampaigns();
      })
      .subscribe();

    const resultsChannel = supabase
      .channel('results-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'auto_dialer_results'
      }, () => {
        if (selectedCampaign) {
          fetchCallResults(selectedCampaign.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, [selectedCampaign]);

  const parsePhoneNumbers = (text: string): string[] => {
    return text
      .split(/[\n,;]/)
      .map(num => num.trim())
      .filter(num => num.length > 0 && /^\+?[\d\s\-\(\)]+$/.test(num));
  };

  const createCampaign = async () => {
    const numbers = parsePhoneNumbers(phoneNumbers);
    
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (numbers.length === 0) {
      toast.error('Please enter valid phone numbers');
      return;
    }

    if (!extension) {
      toast.error('Please enter an extension number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-dialer-campaign', {
        body: {
          action: 'create',
          name: campaignName,
          phoneNumbers: numbers,
          agentExtension: extension,
          delaySeconds: dialDelay
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Campaign created successfully');
        setCampaignName('');
        setPhoneNumbers('');
        setExtension('100');
        setDialDelay(5);
        setShowCreateForm(false);
        fetchCampaigns();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      toast.error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const controlCampaign = async (campaignId: string, action: 'start' | 'pause' | 'stop') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-dialer-campaign', {
        body: {
          action,
          campaignId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Campaign control error:', error);
      toast.error(`Failed to ${action} campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'dialing': return 'secondary';
      case 'busy': case 'no_answer': return 'outline';
      case 'failed': case 'cancelled': return 'destructive';
      default: return 'outline';
    }
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
      {/* Campaign List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Auto Dialer Campaigns
            </CardTitle>
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-x-4">
                    <span>Extension: {campaign.agent_extension}</span>
                    <span>Numbers: {campaign.total_calls}</span>
                    <span>Progress: {campaign.current_index}/{campaign.total_calls}</span>
                    <span>Success: {campaign.successful_calls}</span>
                    <span>Failed: {campaign.failed_calls}</span>
                  </div>
                  {campaign.status === 'running' && (
                    <Progress 
                      value={(campaign.current_index / campaign.total_calls) * 100} 
                      className="w-48 mt-2" 
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCampaign(campaign)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  {campaign.status === 'pending' && (
                    <Button
                      onClick={() => controlCampaign(campaign.id, 'start')}
                      disabled={loading}
                      size="sm"
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  )}
                  {campaign.status === 'running' && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => controlCampaign(campaign.id, 'pause')}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => controlCampaign(campaign.id, 'stop')}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    </>
                  )}
                  {campaign.status === 'paused' && (
                    <Button
                      onClick={() => controlCampaign(campaign.id, 'start')}
                      disabled={loading}
                      size="sm"
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Sales Campaign 2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extension">Agent Extension</Label>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="phone-numbers">Phone Numbers (one per line or comma-separated)</Label>
                <Button variant="outline" size="sm" onClick={loadSampleNumbers}>
                  <Upload className="h-4 w-4 mr-2" />
                  Load Sample
                </Button>
              </div>
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

            <div className="flex gap-4">
              <Button onClick={createCampaign} disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call Results */}
      {selectedCampaign && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Campaign Results: {selectedCampaign.name}</CardTitle>
              <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {callResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{result.phone_number}</span>
                    <Badge variant={getResultStatusColor(result.status)}>
                      {result.status}
                    </Badge>
                    {result.call_duration && (
                      <span className="text-sm text-muted-foreground">
                        {result.call_duration}s
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(result.dialed_at).toLocaleTimeString()}
                  </div>
                  {result.error_message && (
                    <div className="text-sm text-red-600 max-w-xs truncate">
                      {result.error_message}
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

export default AutoDialerCampaigns;