import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Copy, FileText } from 'lucide-react';

const ThreeCXIntegration = () => {
  const [copied, setCopied] = useState(false);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Crm Name="Lovable Helpdesk" Version="1" Country="US" SupportsEmojis="false">
  <Number Prefix="AsIs" MaxLength="[MaxLength]"/>
  <Connection MaxConcurrentRequests="5"/>
  <Parameters>
    <Parameter Name="ServerUrl" Type="String" Title="Helpdesk Server URL" Default="thzdazcmswmeolaiijml.supabase.co"/>
    <Parameter Name="ApiToken" Type="Password" Title="API Token" Default=""/>
    <Parameter Name="Protocol" Type="String" Title="Protocol" Default="https"/>
  </Parameters>
  <Authentication Type="No"/>
  <Scenarios>
    <Scenario Id="">
      <Request Url="[Protocol]://[ServerUrl]/functions/v1/yeastar-contacts" Method="GET">
        <Parameter Name="phone" Value="[Number]"/>
      </Request>
      <Rules>
        <Rule Type="Any">users</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" Path="users.0.id"/>
        <Variable Name="FirstName" Path="users.0.first_name"/>
        <Variable Name="LastName" Path="users.0.last_name"/>
        <Variable Name="Email" Path="users.0.email"/>
        <Variable Name="Phone" Path="users.0.phone"/>
        <Variable Name="Company" Path="users.0.company"/>
      </Variables>
      <Outputs>
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone=[Number]&amp;name=[FirstName] [LastName]"/>
        <Output Type="FirstName" Value="[FirstName]"/>
        <Output Type="LastName" Value="[LastName]"/>
        <Output Type="Email" Value="[Email]"/>
        <Output Type="Phone" Value="[Phone]"/>
        <Output Type="Company" Value="[Company]"/>
        <Output Type="EntityType" Value="Contacts"/>
        <Output Type="EntityId" Value="[ContactID]"/>
      </Outputs>
    </Scenario>
    <Scenario Id="CreateContactRecordFromClient">
      <Request Url="[Protocol]://[ServerUrl]/functions/v1/yeastar-contacts" Method="POST" 
               RequestEncoding="JSON" RequestContentType="application/json">
        <Parameter Name="" Value="{&quot;first_name&quot;: &quot;[CreateContactFirstName]&quot;, &quot;last_name&quot;: &quot;[CreateContactLastName]&quot;, &quot;phone&quot;: &quot;[CreateContactPhoneNumber]&quot;, &quot;email&quot;: &quot;[CreateContactEmail]&quot;, &quot;company&quot;: &quot;[CreateContactCompany]&quot;}"/>
      </Request>
      <Rules>
        <Rule Type="Any">id</Rule>
      </Rules>
      <Variables>
        <Variable Name="ContactID" Path="id"/>
        <Variable Name="FirstName" Path="first_name"/>
        <Variable Name="LastName" Path="last_name"/>
        <Variable Name="Email" Path="email"/>
        <Variable Name="Phone" Path="phone"/>
        <Variable Name="Company" Path="company"/>
      </Variables>
      <Outputs>
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone=[Phone]&amp;name=[FirstName] [LastName]"/>
        <Output Type="FirstName" Value="[FirstName]"/>
        <Output Type="LastName" Value="[LastName]"/>
        <Output Type="Email" Value="[Email]"/>
        <Output Type="Phone" Value="[Phone]"/>
        <Output Type="Company" Value="[Company]"/>
        <Output Type="EntityType" Value="Contacts"/>
        <Output Type="EntityId" Value="[ContactID]"/>
      </Outputs>
    </Scenario>
    <Scenario Id="ReportCall">
      <Request Url="[Protocol]://[ServerUrl]/functions/v1/yeastar-tickets" Method="POST" 
               RequestEncoding="JSON" RequestContentType="application/json">
        <Parameter Name="" Value="{&quot;ticket&quot;: {&quot;subject&quot;: &quot;Call from [CallStartTime] - [CallerNumber] to [CalleeNumber]&quot;, &quot;description&quot;: &quot;Call Details:\\n- From: [CallerNumber]\\n- To: [CalleeNumber]\\n- Duration: [CallDuration]\\n- Date: [CallStartTime]\\n- Type: [CallType]&quot;, &quot;priority&quot;: &quot;normal&quot;, &quot;status&quot;: &quot;new&quot;, &quot;tags&quot;: [&quot;3cx-call&quot;, &quot;[CallType]&quot;]}}"/>
      </Request>
      <Rules>
        <Rule Type="Any">ticket</Rule>
      </Rules>
      <Variables>
        <Variable Name="TicketID" Path="ticket.id"/>
        <Variable Name="TicketNumber" Path="ticket.ticket_number"/>
      </Variables>
      <Outputs>
        <Output Type="EntityType" Value="Tickets"/>
        <Output Type="EntityId" Value="[TicketID]"/>
        <Output Type="ContactUrl" Value="https://helpdesk.bernsergsolutions.com/tickets/[TicketID]"/>
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
            3CX IP PBX Integration Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Configuration Values:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Server Address:</strong> thzdazcmswmeolaiijml.supabase.co</p>
              <p><strong>Helpdesk Domain:</strong> thzdazcmswmeolaiijml</p>
              <p><strong>API Token:</strong> You'll need to generate an API token from your helpdesk admin panel</p>
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
            <label className="text-sm font-medium">3CX CRM Template XML:</label>
            <Textarea
              value={xmlContent}
              readOnly
              className="mt-2 font-mono text-xs h-64"
              placeholder="3CX CRM template content..."
            />
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">3CX Setup Instructions:</h4>
            <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
              <li>Download the XML template using the button above</li>
              <li>Log into your 3CX Management Console</li>
              <li>Navigate to <strong>Settings → CRM → Add CRM</strong></li>
              <li>Select "Generic CRM" and click "Add Template"</li>
              <li>Upload the downloaded XML file</li>
              <li>Configure the following parameters:
                <ul className="ml-6 mt-1 list-disc space-y-1">
                  <li><strong>API Token:</strong> Generate from Admin Panel → API Settings</li>
                  <li><strong>Helpdesk Domain:</strong> thzdazcmswmeolaiijml</li>
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
              <li><strong>Agent Lookup:</strong> Match 3CX users with helpdesk agents</li>
              <li><strong>Ticket Creation:</strong> Auto-create tickets from calls</li>
              <li><strong>Call Logging:</strong> Add call details to existing tickets</li>
              <li><strong>Screen Pop:</strong> Open helpdesk interface on incoming calls</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Ensure your helpdesk API endpoints are accessible from your 3CX server</li>
              <li>The API token needs appropriate permissions for contact and ticket management</li>
              <li>Test with a few extensions first before rolling out company-wide</li>
              <li>Monitor 3CX logs for any connection issues during setup</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreeCXIntegration;