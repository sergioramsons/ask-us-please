import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Download, Copy, FileText, Phone, Radio } from 'lucide-react';
import ThreeCXCallLogs from './ThreeCXCallLogs';
import AutoDialerCampaigns from './AutoDialerCampaigns';

const ThreeCXIntegration = () => {
  const [copied, setCopied] = useState(false);

  const xmlContent = `<?xml version="1.0"?>
<Crm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Country="US" Name="LovableHelpdesk" Version="1" SupportsEmojis="false" ListPageSize="0">
  <Number Prefix="AsIs" MaxLength="[MaxLength]" />
  <Connection MaxConcurrentRequests="5" />
  <Parameters>
    <Parameter Name="ServerUrl" Type="String" Parent="General Configuration" Editor="String" Title="Helpdesk Server URL" Default="https://thzdazcmswmeolaiijml.supabase.co" />
  </Parameters>
  <Authentication Type="No" />
  <Scenarios>
    <Scenario Id="" Type="REST">
      <Request Url="[ServerUrl]/functions/v1/yeastar-contacts" MessagePasses="0" RequestType="Get" ResponseType="Json">
        <Query>
          <Parameter Name="phone" Value="[Number]" />
        </Query>
      </Request>
      <Rules>
        <Rule Type="Any">users</Rule>
        <Rule Type="Number">users.phone</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" Path="users.0.id" />
        <Variable Name="FirstName" Path="users.0.first_name" />
        <Variable Name="LastName" Path="users.0.last_name" />
        <Variable Name="Email" Path="users.0.email" />
        <Variable Name="CompanyName" Path="users.0.company" />
      </Variables>
      <Outputs AllowEmpty="false">
        <Output Type="ContactUrl" Value="https://thzdazcmswmeolaiijml.lovable.app/yeastar?popup=helpdesk&amp;phone=[Number]&amp;name=[FirstName] [LastName]" />
        <Output Type="FirstName" Value="[FirstName]" />
        <Output Type="LastName" Value="[LastName]" />
        <Output Type="Email" Value="[Email]" />
        <Output Type="CompanyName" Value="[CompanyName]" />
        <Output Type="PhoneBusiness" Value="[Number]" />
        <Output Type="EntityType" Value="Contacts" />
        <Output Type="EntityId" Value="[ContactID]" />
      </Outputs>
    </Scenario>
  </Scenarios>
</Crm>`;

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '3cx-helpdesk-integration.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('3CX XML template downloaded successfully!');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xmlContent);
      setCopied(true);
      toast.success('XML content copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration" className="gap-2">
            <FileText className="h-4 w-4" />
            Integration Configuration
          </TabsTrigger>
          <TabsTrigger value="call-logs" className="gap-2">
            <Phone className="h-4 w-4" />
            Call Logs
          </TabsTrigger>
          <TabsTrigger value="auto-dialer" className="gap-2">
            <Radio className="h-4 w-4" />
            Auto Dialer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                3CX V20 IP PBX Integration Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Configuration Values:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Server URL:</strong> https://thzdazcmswmeolaiijml.supabase.co</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download XML Template
                </Button>
                <Button variant="outline" onClick={handleCopy} className="gap-2">
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy Content'}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium">3CX V20 CRM Template XML:</label>
                <Textarea
                  value={xmlContent}
                  readOnly
                  className="mt-2 font-mono text-xs h-64"
                  placeholder="3CX CRM template content..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="call-logs" className="mt-6">
          <ThreeCXCallLogs />
        </TabsContent>

        <TabsContent value="auto-dialer" className="mt-6">
          <AutoDialerCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThreeCXIntegration;