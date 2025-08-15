import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, Copy, FileText } from 'lucide-react';

const YeastarIntegration = () => {
  const [copied, setCopied] = useState(false);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Information Provider="helpdesk" Name="Custom Helpdesk" Key="custom_helpdesk" Logo="helpdesk.png" Remark="" Version="1.0.0" AuthType="oauth2" MaxConcurrentRequest="10" UserAssociation="1" CallJournal="1" CreateNewContact="1" CreateNewTicket="1">
  <Parameters />
  <Scenarios>
    <Scenario Id="AuthMethod" Type="AUTH">
      <Presets />
      <Parameters>
        <Parameter Name="AuthMethod" Value="oauth2" />
        <Parameter Name="TokenType" Value="Bearer" />
        <Parameter Name="AuthEndPoint" Value="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-auth/oauth/authorizations/new?client_id={{.client_id}}&client_secret={{.client_secret}}" />
        <Parameter Name="TokenEndPoint" Value="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-auth/oauth/tokens?client_id={{.client_id}}&client_secret={{.client_secret}}" />
        <Parameter Name="AdditionalQueryString" />
        <Parameter Name="Scope" Value="read write" />
        <Parameter Father="AuthOption" Name="NoNeedRefreshAccessToken" Value="1" />
        <Parameter Father="TokenErrorMap" Type="TokenInvalid" Name="TokenInvalid" Value="invalid_token" />
        <Parameter Name="CredentialType" />
        <Parameter Name="Base64EncodedCredential" />
        <Parameter Father="CustomFieldList" Name="client_id" Editor="password" Title="Client ID" Key="client_id" />
        <Parameter Father="CustomFieldList" Name="client_secret" Editor="password" Title="Client Secret" Key="client_secret" />
        <Parameter Father="CustomFieldList" Name="helpdesk_domain" Editor="string" Title="Helpdesk Domain (your-project-id)" Key="helpdesk_domain" />
        <Parameter Father="PopulateTemplateString" Name="Content-Type" Type="Header" Value="application/json" />
        <Parameter Father="PopulateTemplateString" Name="Accept" Type="Header" Value="application/json" />
      </Parameters>
      <Requests />
      <Responses />
    </Scenario>
    <Scenario Id="SyncContactAuto" Type="REST">
      <Presets />
      <Parameters>
        <Parameter Name="ContactUrlType" Value="specify_url_format" />
        <Parameter Name="URLFormat" Value="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-tickets/{{.ContactId}}" />
        <Parameter Name="ContactFieldForUri" />
        <Parameter Name="ContactsIdEnable" Value="1" />
        <Parameter Name="FirstNameEnable" Value="1" />
        <Parameter Name="EmailEnable" Value="1" />
        <Parameter Name="BusinessNumberEnable" Value="1" />
        <Parameter Name="RemarkEnable" Value="1" />
        <Parameter Name="CustomValueEnable" Value="1" />
        <Parameter Name="BusinessNumber2Enable" Value="1" />
        <Parameter Name="BusinessFaxNumberEnable" Value="1" />
        <Parameter Name="MobileNumberEnable" Value="1" />
        <Parameter Name="MobileNumber2Enable" Value="1" />
        <Parameter Name="HomeNumberEnable" Value="1" />
        <Parameter Name="HomeNumber2Enable" Value="1" />
        <Parameter Name="HomeFaxNumberEnable" Value="1" />
        <Parameter Name="OtherNumberEnable" Value="1" />
        <Parameter Name="CustomValueEnable" Value="1" />
      </Parameters>
      <Requests>
        <Request Name="contacts" Method="GET" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-contacts?phone={{UrlEncode .Phone}}">
          <Parameters />
          <Outputs>
            <Output Name="ContactsId" Path="users.#.id" />
            <Output Name="FirstName" Path="users.#.name" />
            <Output Name="BusinessNumber" Path="users.#.phone" />
            <Output Name="Email" Path="users.#.email" />
            <Output Name="Remark" Path="users.#.notes" />
            <Output Name="BusinessNumber2" Path="" />
            <Output Name="BusinessFaxNumber" Path="" />
            <Output Name="MobileNumber" Path="" />
            <Output Name="MobileNumber2" Path="" />
            <Output Name="HomeNumber" Path="" />
            <Output Name="HomeNumber2" Path="" />
            <Output Name="HomeFaxNumber" Path="" />
            <Output Name="OtherNumber" Path="" />
            <Output Name="CustomValue" Path="" />
          </Outputs>
        </Request>
      </Requests>
    </Scenario>
    <Scenario Id="SearchContact" Type="REST">
      <Presets />
      <Parameters />
      <Requests>
        <Request Name="SearchContact_contacts" Method="GET" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-contacts?query={{UrlEncode .SearchValue}}">
          <Parameters />
          <Outputs>
            <Output Name="ContactsId" Path="users.#.id" />
            <Output Name="FirstName" Path="users.#.name" />
            <Output Name="BusinessNumber" Path="users.#.phone" />
            <Output Name="Email" Path="users.#.email" />
            <Output Name="Remark" Path="users.#.notes" />
            <Output Name="BusinessNumber2" Path="" />
            <Output Name="BusinessFaxNumber" Path="" />
            <Output Name="MobileNumber" Path="" />
            <Output Name="MobileNumber2" Path="" />
            <Output Name="HomeNumber" Path="" />
            <Output Name="HomeNumber2" Path="" />
            <Output Name="HomeFaxNumber" Path="" />
            <Output Name="OtherNumber" Path="" />
            <Output Name="CustomValue" Path="" />
          </Outputs>
        </Request>
      </Requests>
    </Scenario>
    <Scenario Id="UserAssociation" Type="REST">
      <Presets />
      <Parameters />
      <Requests>
        <Request Name="UserAssociation" Method="GET" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-users">
          <Parameters />
          <Outputs>
            <Output Name="UserUniqueId" Path="users.#.id" />
            <Output Name="LastName" Path="users.#.name" />
            <Output Name="Email" Path="users.#.email" />
          </Outputs>
        </Request>
      </Requests>
    </Scenario>
    <Scenario Id="CreateNewContact" Type="REST">
      <Presets />
      <Parameters />
      <Requests>
        <Request Name="contacts" Method="POST" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-contacts">
          <Parameters>
            <Parameter Name="Data" Type="Body" Value="{&#xA;"user":{&#xA;"name": "{{.DisplayName}}","phone": "{{.BusinessNumber}}"&#xA;}&#xA;}" />
          </Parameters>
          <Outputs>
            <Output Name="ContactId" Path="user.id" />
          </Outputs>
        </Request>
      </Requests>
    </Scenario>
    <Scenario Id="CreateNewTicket" Type="REST">
      <Presets />
      <Parameters>
        <Parameter Name="EnableSubject" Value="1" />
        <Parameter Name="Subject" Value="{{.Communication_Type}} {{.Call_Status}} - from {{.Call_From}} to {{.Call_To}}" />
        <Parameter Name="EnableDescription" Value="1" />
        <Parameter Name="Description" Value="{{.Time}} {{.Communication_Type}} {{.Call_Status}} - from {{.Call_From}} to {{.Call_To}} {{.Talk_Duration}}" />
        <Parameter Name="NeedSyncContact" Value="1" />
        <Parameter Father="CustomScenarioParameter" Name="DepartmentId" />
      </Parameters>
      <Requests>
        <Request Name="CreateNewTicket" Method="POST" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-tickets">
          <Parameters>
            <Parameter Name="Data" Type="Body" Value="{&#xA;"ticket":{&#xA;"status":"new","subject":"{{.Subject}}",&#xA;"description":"{{.Description}}",&#xA;"tags":["auto-ticket-created-by-pbx","{{.Communication_Type}}","{{.Call_Status}}"],&#xA;"comment":{&#xA;"body":"{{.Description}}"&#xA;},&#xA;"requester_id":"{{.ContactId}}"&#xA;}&#xA;}" />
          </Parameters>
          <Outputs>
            <Output Name="TicketId" Path="ticket.id" />
          </Outputs>
        </Request>
        <Request Name="UpdateTicket" Method="PATCH" ResponseType="application/json" URLFormat="https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-tickets/{{.TicketId}}.json">
          <Parameters>
            <Parameter Name="Data" Type="Body" Value="{&#xA;"ticket":{&#xA;"comment":{&#xA;"body":"{{.Description}}",&#xA;"public":true,&#xA;"author_id":"{{.ContactId}}"&#xA;}&#xA;}&#xA;}" />
          </Parameters>
          <Outputs />
        </Request>
      </Requests>
    </Scenario>
    <Scenario Id="CallJournal" Type="REST">
      <Presets />
      <Parameters>
        <Parameter Name="EnableSubject" Value="0" />
        <Parameter Name="EnableDescription" Value="0" />
        <Parameter Name="EnablePlayCallRecording" Value="1" />
        <Parameter Name="PlayCallRecording" Value="0" />
        <Parameter Name="NeedSyncContact" Value="1" />
        <Parameter Name="TicketId" Value="" />
      </Parameters>
      <Requests>
        <Request Name="CallJournal" Method="PUT" ResponseType="application/json" URLFormat="{{if .RecordPath}}https://{{.helpdesk_domain}}.supabase.co/functions/v1/yeastar-tickets/{{.TicketId}}.json{{end}}">
          <Parameters>
            <Parameter Name="Data" Type="Body" Value="{&#xA;"ticket":{&#xA;"voice_comment":{&#xA;"from": "{{.CallerNumber}}",&#xA;"to": "{{.CalleeNumber}}",&#xA;"recording_url":"{{.RecordPath}}",&#xA;"started_at": "{{ TimeFormat .StartTimeUnix "yyyy-MM-dd HH:mm:ss +0000" "1"}}",&#xA;"call_duration":{{.Talk_Duration_Sec}}&#xA;}&#xA;}&#xA;}" />
          </Parameters>
          <Outputs />
        </Request>
      </Requests>
    </Scenario>
  </Scenarios>
</Information>`;

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yeastar-helpdesk-integration.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('XML file downloaded successfully!');
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
            Yeastar IP PBX Integration Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Configuration Values:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Helpdesk Domain:</strong> thzdazcmswmeolaiijml</p>
              <p><strong>Client ID:</strong> helpdesk_client (or any unique ID)</p>
              <p><strong>Client Secret:</strong> your_secure_secret_key</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download XML File
            </Button>
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy Content'}
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium">XML Configuration Content:</label>
            <Textarea
              value={xmlContent}
              readOnly
              className="mt-2 font-mono text-xs h-64"
              placeholder="XML configuration content..."
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download the XML file using the button above</li>
              <li>Log into your Yeastar PBX management interface</li>
              <li>Navigate to Settings → PBX → Call Control → Information Provider</li>
              <li>Click "Add" and upload the downloaded XML file</li>
              <li>Configure the connection with your domain and credentials</li>
              <li>Test the integration by making a test call</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default YeastarIntegration;