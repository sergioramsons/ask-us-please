import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  MessageCircle, 
  Phone, 
  MessageSquare, 
  Instagram, 
  Facebook, 
  Twitter, 
  Plus, 
  Settings, 
  Globe, 
  Smartphone,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';

interface Channel {
  id: string;
  type: 'email' | 'chat' | 'phone' | 'sms' | 'whatsapp' | 'facebook' | 'twitter' | 'instagram' | 'portal';
  name: string;
  description: string;
  is_active: boolean;
  configuration: Record<string, any>;
  created_at: string;
}

const ChannelIcons = {
  email: Mail,
  chat: MessageCircle,
  phone: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  portal: Globe
};

const ChannelColors = {
  email: 'bg-blue-500',
  chat: 'bg-green-500',
  phone: 'bg-purple-500',
  sms: 'bg-orange-500',
  whatsapp: 'bg-green-600',
  facebook: 'bg-blue-600',
  twitter: 'bg-sky-500',
  instagram: 'bg-pink-500',
  portal: 'bg-gray-500'
};

export function ChannelManager() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<string>('');
  const [channelConfig, setChannelConfig] = useState<Record<string, any>>({});
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Mock data for now - in real implementation this would come from database
  useEffect(() => {
    const mockChannels: Channel[] = [
      {
        id: '1',
        type: 'email',
        name: 'Support Email',
        description: 'Primary email support channel',
        is_active: true,
        configuration: { address: 'support@company.com' },
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'phone',
        name: 'Yeastar PBX',
        description: 'Phone support via PBX system',
        is_active: true,
        configuration: { extension: '100' },
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        type: 'portal',
        name: 'Customer Portal',
        description: 'Self-service web portal',
        is_active: true,
        configuration: { url: '/portal' },
        created_at: new Date().toISOString()
      }
    ];
    setChannels(mockChannels);
  }, []);

  const channelTypes = [
    { type: 'chat', name: 'Live Chat', description: 'Real-time website chat widget' },
    { type: 'sms', name: 'SMS', description: 'Text message support' },
    { type: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp Business integration' },
    { type: 'facebook', name: 'Facebook', description: 'Facebook Messenger integration' },
    { type: 'twitter', name: 'Twitter', description: 'Twitter mentions and DMs' },
    { type: 'instagram', name: 'Instagram', description: 'Instagram Direct Messages' }
  ];

  const handleAddChannel = () => {
    if (!selectedChannelType) {
      toast({
        title: "Error",
        description: "Please select a channel type",
        variant: "destructive"
      });
      return;
    }

    const newChannel: Channel = {
      id: Date.now().toString(),
      type: selectedChannelType as any,
      name: channelConfig.name || `New ${selectedChannelType} Channel`,
      description: channelConfig.description || '',
      is_active: true,
      configuration: channelConfig,
      created_at: new Date().toISOString()
    };

    setChannels(prev => [...prev, newChannel]);
    setShowAddDialog(false);
    setSelectedChannelType('');
    setChannelConfig({});

    toast({
      title: "Channel added",
      description: `${newChannel.name} has been configured successfully`
    });
  };

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => 
      prev.map(channel => 
        channel.id === channelId 
          ? { ...channel, is_active: !channel.is_active }
          : channel
      )
    );
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setSelectedChannelType(channel.type);
    setChannelConfig({ ...channel.configuration, name: channel.name, description: channel.description });
    setShowEditDialog(true);
  };

  const handleUpdateChannel = () => {
    if (!editingChannel) return;

    setChannels(prev => 
      prev.map(channel => 
        channel.id === editingChannel.id 
          ? {
              ...channel,
              name: channelConfig.name || channel.name,
              description: channelConfig.description || channel.description,
              configuration: { ...channelConfig }
            }
          : channel
      )
    );
    
    setShowEditDialog(false);
    setEditingChannel(null);
    setSelectedChannelType('');
    setChannelConfig({});

    toast({
      title: "Channel updated",
      description: "Channel configuration has been updated successfully"
    });
  };

  const handleOpenSettings = (channel: Channel) => {
    // For now, just open edit dialog
    handleEditChannel(channel);
  };

  const renderChannelConfig = () => {
    switch (selectedChannelType) {
      case 'chat':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="chat-name">Chat Widget Name</Label>
              <Input
                id="chat-name"
                placeholder="Live Chat Support"
                value={channelConfig.name || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chat-greeting">Welcome Message</Label>
              <Textarea
                id="chat-greeting"
                placeholder="Hello! How can we help you today?"
                value={channelConfig.greeting || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, greeting: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chat-color">Widget Color</Label>
              <Input
                id="chat-color"
                type="color"
                value={channelConfig.color || '#3b82f6'}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>
        );
      
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp-number">WhatsApp Business Number</Label>
              <Input
                id="whatsapp-number"
                placeholder="+1234567890"
                value={channelConfig.phone || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp-token">API Token</Label>
              <Input
                id="whatsapp-token"
                type="password"
                placeholder="Enter WhatsApp Business API token"
                value={channelConfig.token || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, token: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'facebook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="facebook-page">Page ID</Label>
              <Input
                id="facebook-page"
                placeholder="Facebook Page ID"
                value={channelConfig.pageId || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, pageId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="facebook-token">Page Access Token</Label>
              <Input
                id="facebook-token"
                type="password"
                placeholder="Enter Facebook Page Access Token"
                value={channelConfig.accessToken || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, accessToken: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'twitter':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="twitter-handle">Twitter Handle</Label>
              <Input
                id="twitter-handle"
                placeholder="@yourcompany"
                value={channelConfig.handle || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, handle: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="twitter-consumer-key">Consumer Key</Label>
              <Input
                id="twitter-consumer-key"
                type="password"
                placeholder="Twitter Consumer Key"
                value={channelConfig.consumerKey || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, consumerKey: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="twitter-consumer-secret">Consumer Secret</Label>
              <Input
                id="twitter-consumer-secret"
                type="password"
                placeholder="Twitter Consumer Secret"
                value={channelConfig.consumerSecret || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, consumerSecret: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-name">Email Channel Name</Label>
              <Input
                id="email-name"
                placeholder="Support Email"
                value={channelConfig.name || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                placeholder="support@company.com"
                value={channelConfig.address || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email-description">Description</Label>
              <Textarea
                id="email-description"
                placeholder="Primary email support channel"
                value={channelConfig.description || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone-name">Phone Channel Name</Label>
              <Input
                id="phone-name"
                placeholder="Yeastar PBX"
                value={channelConfig.name || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone-extension">Extension</Label>
              <Input
                id="phone-extension"
                placeholder="100"
                value={channelConfig.extension || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, extension: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone-pbx-url">PBX Server URL</Label>
              <Input
                id="phone-pbx-url"
                placeholder="https://pbx.company.com"
                value={channelConfig.pbxUrl || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, pbxUrl: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone-description">Description</Label>
              <Textarea
                id="phone-description"
                placeholder="Phone support via PBX system"
                value={channelConfig.description || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'portal':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="portal-name">Portal Name</Label>
              <Input
                id="portal-name"
                placeholder="Customer Portal"
                value={channelConfig.name || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="portal-url">Portal URL</Label>
              <Input
                id="portal-url"
                placeholder="/portal"
                value={channelConfig.url || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="portal-description">Description</Label>
              <Textarea
                id="portal-description"
                placeholder="Self-service web portal"
                value={channelConfig.description || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );

      case 'sms':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-provider">SMS Provider</Label>
              <select 
                id="sms-provider"
                className="w-full p-2 border rounded"
                value={channelConfig.provider || 'twilio'}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, provider: e.target.value }))}
              >
                <option value="twilio">Twilio</option>
                <option value="textmagic">TextMagic</option>
                <option value="messagebird">MessageBird</option>
              </select>
            </div>
            <div>
              <Label htmlFor="sms-api-key">API Key</Label>
              <Input
                id="sms-api-key"
                type="password"
                placeholder="SMS Provider API Key"
                value={channelConfig.apiKey || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="sms-from-number">From Number</Label>
              <Input
                id="sms-from-number"
                placeholder="+1234567890"
                value={channelConfig.fromNumber || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, fromNumber: e.target.value }))}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                placeholder="Enter channel name"
                value={channelConfig.name || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="channel-description">Description</Label>
              <Textarea
                id="channel-description"
                placeholder="Enter channel description"
                value={channelConfig.description || ''}
                onChange={(e) => setChannelConfig(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Multi-Channel Support</h2>
          <p className="text-muted-foreground">Manage all your customer communication channels</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Channel</DialogTitle>
              <DialogDescription>
                Configure a new communication channel for customer support
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={selectedChannelType} onValueChange={setSelectedChannelType}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="">Select Type</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>
              
              <TabsContent value="" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {channelTypes.map((channel) => {
                    const Icon = ChannelIcons[channel.type as keyof typeof ChannelIcons];
                    return (
                      <Card 
                        key={channel.type}
                        className={`cursor-pointer transition-colors hover:bg-muted ${
                          selectedChannelType === channel.type ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedChannelType(channel.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${ChannelColors[channel.type as keyof typeof ChannelColors]} text-white`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium">{channel.name}</h3>
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="chat" className="mt-4">
                <div className="grid grid-cols-1 gap-4">
                  <Card 
                    className={`cursor-pointer transition-colors hover:bg-muted ${
                      selectedChannelType === 'chat' ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedChannelType('chat')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500 text-white">
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">Live Chat</h3>
                          <p className="text-xs text-muted-foreground">Real-time website chat widget</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="social" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {channelTypes.filter(c => ['whatsapp', 'facebook', 'twitter', 'instagram'].includes(c.type)).map((channel) => {
                    const Icon = ChannelIcons[channel.type as keyof typeof ChannelIcons];
                    return (
                      <Card 
                        key={channel.type}
                        className={`cursor-pointer transition-colors hover:bg-muted ${
                          selectedChannelType === channel.type ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedChannelType(channel.type)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${ChannelColors[channel.type as keyof typeof ChannelColors]} text-white`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium">{channel.name}</h3>
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {selectedChannelType && (
              <div className="mt-6 space-y-4">
                <h3 className="font-medium">Configuration</h3>
                {renderChannelConfig()}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddChannel}>
                    Add Channel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Channel Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Channel</DialogTitle>
              <DialogDescription>
                Update the configuration for {editingChannel?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <h3 className="font-medium">Configuration</h3>
              {renderChannelConfig()}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateChannel}>
                  Update Channel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => {
          const Icon = ChannelIcons[channel.type];
          return (
            <Card key={channel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${ChannelColors[channel.type]} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{channel.type}</p>
                    </div>
                  </div>
                  <Switch
                    checked={channel.is_active}
                    onCheckedChange={() => handleToggleChannel(channel.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
                
                <div className="flex items-center justify-between">
                  <Badge variant={channel.is_active ? "default" : "secondary"}>
                    {channel.is_active ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  
                   <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => handleOpenSettings(channel)}>
                       <Settings className="h-4 w-4" />
                     </Button>
                     <Button variant="outline" size="sm" onClick={() => handleEditChannel(channel)}>
                       <Edit className="h-4 w-4" />
                     </Button>
                   </div>
                </div>

                {/* Channel-specific info */}
                <div className="mt-3 text-xs text-muted-foreground">
                  {channel.type === 'email' && channel.configuration.address && (
                    <p>📧 {channel.configuration.address}</p>
                  )}
                  {channel.type === 'phone' && channel.configuration.extension && (
                    <p>📞 Ext. {channel.configuration.extension}</p>
                  )}
                  {channel.type === 'portal' && channel.configuration.url && (
                    <p>🌐 {channel.configuration.url}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Channel Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">156</div>
              <div className="text-sm text-muted-foreground">Email Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">89</div>
              <div className="text-sm text-muted-foreground">Chat Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">34</div>
              <div className="text-sm text-muted-foreground">Phone Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">67</div>
              <div className="text-sm text-muted-foreground">Portal Tickets</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}