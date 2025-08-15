import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Copy, FileText } from 'lucide-react';

const ThreeCXIntegration = () => {
  const [copied, setCopied] = useState(false);

  const xmlContent = `<?xml version="1.0"?>
<Crm xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Country="US" Name="Lovable Helpdesk" Version="1" SupportsEmojis="false">
  <Number Prefix="AsIs" MaxLength="[MaxLength]" />
  <Connection MaxConcurrentRequests="5" />
  <Parameters>
    <Parameter Name="ServerUrl" Type="String" Parent="General Configuration" Editor="String" Title="Helpdesk Server URL" Default="https://thzdazcmswmeolaiijml.supabase.co" />
    <Parameter Name="ApiKey" Type="String" Parent="General Configuration" Editor="String" Title="API Key" />
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
      </Rules>
      <Variables>
        <Variable Name="ContactID" Path="users.0.id" />
        <Variable Name="FirstName" Path="users.0.first_name" />
        <Variable Name="LastName" Path="users.0.last_name" />
        <Variable Name="Email" Path="users.0.email" />
        <Variable Name="Phone" Path="users.0.phone" />
        <Variable Name="CompanyName" Path="users.0.company" />
      </Variables>
      <Outputs>
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone=[Number]&amp;name=[FirstName] [LastName]" />
        <Output Type="FirstName" Value="[FirstName]" />
        <Output Type="LastName" Value="[LastName]" />
        <Output Type="Email" Value="[Email]" />
        <Output Type="CompanyName" Value="[CompanyName]" />
        <Output Type="PhoneBusiness" Value="[Number]" />
        <Output Type="EntityType" Value="Contacts" />
        <Output Type="EntityId" Value="[ContactID]" />
      </Outputs>
    </Scenario>
    <Scenario Id="CreateContactRecordFromClient" Type="REST">
      <Request Url="[ServerUrl]/functions/v1/yeastar-contacts" MessagePasses="0" RequestType="Post" ResponseType="Json" RequestEncoding="Json">
        <PostValues>
          <Value Key="first_name" Type="String">[CreateContactFirstName]</Value>
          <Value Key="last_name" Type="String">[CreateContactLastName]</Value>
          <Value Key="phone" Type="String">[CreateContactPhoneNumber]</Value>
          <Value Key="email" Type="String">[CreateContactEmail]</Value>
          <Value Key="company" Type="String">[CreateContactCompany]</Value>
        </PostValues>
      </Request>
      <Rules>
        <Rule Type="Any">id</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" Path="id" />
        <Variable Name="FirstName" Path="first_name" />
        <Variable Name="LastName" Path="last_name" />
        <Variable Name="Email" Path="email" />
        <Variable Name="Phone" Path="phone" />
        <Variable Name="CompanyName" Path="company" />
      </Variables>
      <Outputs>
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone=[Phone]&amp;name=[FirstName] [LastName]" />
        <Output Type="FirstName" Value="[FirstName]" />
        <Output Type="LastName" Value="[LastName]" />
        <Output Type="Email" Value="[Email]" />
        <Output Type="CompanyName" Value="[CompanyName]" />
        <Output Type="PhoneBusiness" Value="[Phone]" />
        <Output Type="EntityType" Value="Contacts" />
        <Output Type="EntityId" Value="[ContactID]" />
      </Outputs>
    </Scenario>
    <Scenario Id="ReportCall" Type="REST">
      <Request Url="[ServerUrl]/functions/v1/yeastar-tickets" MessagePasses="0" RequestType="Post" ResponseType="Json" RequestEncoding="Json">
        <PostValues>
          <Value Key="ticket" Type="Object">
            <Value Key="subject" Type="String">Call from [CallStartTime] - [CallerNumber] to [CalleeNumber]</Value>
            <Value Key="description" Type="String">Call Details:
- From: [CallerNumber]
- To: [CalleeNumber]  
- Duration: [CallDuration]
- Date: [CallStartTime]
- Type: [CallType]</Value>
            <Value Key="priority" Type="String">normal</Value>
            <Value Key="status" Type="String">new</Value>
            <Value Key="tags" Type="Array">
              <Value Type="String">3cx-call</Value>
              <Value Type="String">[CallType]</Value>
            </Value>
          </Value>
        </PostValues>
      </Request>
      <Rules>
        <Rule Type="Any">ticket</Rule>
      </Rules>
      <Variables>
        <Variable Name="TicketID" Path="ticket.id" />
        <Variable Name="TicketNumber" Path="ticket.ticket_number" />
      </Variables>
      <Outputs>
        <Output Type="EntityType" Value="Tickets" />
        <Output Type="EntityId" Value="[TicketID]" />
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/tickets/[TicketID]" />
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
    <div className="container mx-auto p-6 max-w-6xl">
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
              <p><strong>API Key:</strong> Generate from Admin Panel → API Settings</p>
              <p><strong>CRM Link:</strong> https://helpdesk.bernsergsolutions.com</p>
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

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">3CX V20 Setup Instructions:</h4>
            <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
              <li>Download the XML template using the button above</li>
              <li>Log into your 3CX V20 Management Console</li>
              <li>Navigate to <strong>Settings → CRM → Server side tab</strong></li>
              <li>Click <strong>"Add"</strong> to upload a CRM template</li>
              <li>Upload the downloaded XML file</li>
              <li>Configure the parameters:
                <ul className="ml-6 mt-1 list-disc space-y-1">
                  <li><strong>Helpdesk Server URL:</strong> https://thzdazcmswmeolaiijml.supabase.co</li>
                  <li><strong>API Key:</strong> Generate from Admin Panel → API Settings</li>
                </ul>
              </li>
              <li>Test the integration with a sample phone number</li>
              <li>Enable CRM integration for your 3CX extensions</li>
            </ol>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Features Supported:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Contact Lookup:</strong> Automatic caller identification</li>
              <li><strong>Contact Creation:</strong> Add new contacts from calls</li>
              <li><strong>Ticket Creation:</strong> Auto-create tickets from calls</li>
              <li><strong>Screen Pop:</strong> Open helpdesk interface on incoming calls</li>
            </ul>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2">V20 Specific Notes:</h4>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>This template is specifically formatted for 3CX V20 with required XML namespaces</li>
              <li>Uses proper RequestType and MessagePasses attributes required by V20</li>
              <li>PostValues structure for JSON requests compatible with V20 validation</li>
              <li>If migrating from V18, use this new template format</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreeCXIntegration;