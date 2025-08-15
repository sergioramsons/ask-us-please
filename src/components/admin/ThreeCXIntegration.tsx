import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Copy, FileText } from 'lucide-react';

const ThreeCXIntegration = () => {
  const [copied, setCopied] = useState(false);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CRMTemplates>
  <Template Name="Lovable Helpdesk" AuthType="Bearer Token" Simultaneous="5">
    <Number Prefix="" MaxLength="15" MinLength="3"/>
    <Connection>
      <Server Name="Lovable Helpdesk API" Address="thzdazcmswmeolaiijml.supabase.co" Port="443" SSL="true"/>
    </Connection>
    <Parameters>
      <Parameter Name="api_token" DisplayName="API Token" Type="password" Required="true"/>
      <Parameter Name="domain" DisplayName="Helpdesk Domain" Type="string" Required="true" Default="thzdazcmswmeolaiijml"/>
    </Parameters>
    <Authentication Type="Bearer">
      <Header Name="Authorization" Value="Bearer {api_token}"/>
      <Header Name="Content-Type" Value="application/json"/>
    </Authentication>
    <Scenarios>
      <Scenario Type="GetContact" Name="Contact Lookup">
        <Request Type="HTTP" Method="GET" URL="/functions/v1/yeastar-contacts?phone={number}"/>
        <Response>
          <Contact Name="{users.0.name}" Company="{users.0.company}" 
                   Phone="{users.0.phone}" Email="{users.0.email}" 
                   CrmLink="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone={number}&amp;name={users.0.name}"/>
        </Response>
      </Scenario>
      <Scenario Type="CreateContact" Name="Create New Contact">
        <Request Type="HTTP" Method="POST" URL="/functions/v1/yeastar-contacts">
          <Header Name="Content-Type" Value="application/json"/>
          <Body>{"name": "{displayname}", "phone": "{number}", "notes": "Created from 3CX call"}</Body>
        </Request>
        <Response>
          <Contact Name="{name}" Phone="{phone}" Email="{email}" 
                   CrmLink="https://helpdesk.bernsergsolutions.com/yeastar?popup=helpdesk&amp;phone={number}&amp;name={name}"/>
        </Response>
      </Scenario>
      <Scenario Type="GetAgents" Name="Agent Lookup">
        <Request Type="HTTP" Method="GET" URL="/functions/v1/yeastar-users"/>
        <Response>
          <Agent ID="{users.#.id}" Name="{users.#.name}" Email="{users.#.email}"/>
        </Response>
      </Scenario>
      <Scenario Type="CreateTicket" Name="Create Support Ticket">
        <Request Type="HTTP" Method="POST" URL="/functions/v1/yeastar-tickets">
          <Header Name="Content-Type" Value="application/json"/>
          <Body>{"ticket": {"subject": "Call from {callerid} to {dialed}", "description": "Call details: Duration {duration}s, Date: {datetime}", "priority": "normal", "status": "new", "tags": ["3cx-call", "{calltype}"]}}</Body>
        </Request>
        <Response>
          <Ticket ID="{ticket.id}" URL="https://helpdesk.bernsergsolutions.com/tickets/{ticket.id}"/>
        </Response>
      </Scenario>
      <Scenario Type="LogCall" Name="Call Journal">
        <Request Type="HTTP" Method="POST" URL="/functions/v1/yeastar-tickets/{ticketid}/comments">
          <Header Name="Content-Type" Value="application/json"/>
          <Body>{"comment": {"content": "Call log: {calltype} call from {callerid} to {dialed}, Duration: {duration}s, Recording: {recordingurl}", "is_internal": false}}</Body>
        </Request>
        <Response>
          <Success/>
        </Response>
      </Scenario>
    </Scenarios>
  </Template>
</CRMTemplates>`;

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