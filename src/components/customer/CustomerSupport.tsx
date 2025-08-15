import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  HelpCircle,
  Book,
  Video,
  FileText
} from "lucide-react";

export function CustomerSupport() {
  const { toast } = useToast();
  const [ticketForm, setTicketForm] = useState({
    title: "",
    category: "",
    priority: "medium",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Ticket Submitted",
        description: "Your support ticket has been created successfully. We'll get back to you soon!",
      });
      
      setTicketForm({
        title: "",
        category: "",
        priority: "medium",
        description: ""
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit ticket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportChannels = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "Live Chat",
      description: "Get instant help from our support team",
      availability: "Mon-Fri 9AM-6PM EST",
      action: "Start Chat",
      available: true
    },
    {
      icon: <Phone className="h-5 w-5" />,
      title: "Phone Support",
      description: "Speak directly with a support specialist",
      availability: "Mon-Fri 9AM-5PM EST",
      action: "Call Now",
      available: true,
      phone: "+1 (555) 123-4567"
    },
    {
      icon: <Mail className="h-5 w-5" />,
      title: "Email Support",
      description: "Send us a detailed message",
      availability: "24/7 - Response within 24 hours",
      action: "Send Email",
      available: true,
      email: "support@helpdesk.com"
    }
  ];

  const helpResources = [
    {
      icon: <Book className="h-5 w-5" />,
      title: "Knowledge Base",
      description: "Browse our comprehensive help articles",
      count: "150+ articles"
    },
    {
      icon: <Video className="h-5 w-5" />,
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      count: "25+ videos"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "User Manual",
      description: "Complete documentation and guides",
      count: "PDF Download"
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Support */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Submit Support Ticket
            </CardTitle>
            <CardDescription>
              Create a new support ticket for personalized assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <Label htmlFor="title">Subject</Label>
                <Input
                  id="title"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={ticketForm.category} onValueChange={(value) => setTicketForm({...ticketForm, category: value})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="account">Account & Billing</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({...ticketForm, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  placeholder="Please provide detailed information about your issue..."
                  rows={4}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Other Ways to Get Help</CardTitle>
            <CardDescription>
              Choose the support channel that works best for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supportChannels.map((channel, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="text-primary">{channel.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{channel.title}</h4>
                    {channel.available && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Available
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{channel.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    {channel.availability}
                  </div>
                  {channel.phone && (
                    <p className="text-sm font-mono mb-2">{channel.phone}</p>
                  )}
                  {channel.email && (
                    <p className="text-sm font-mono mb-2">{channel.email}</p>
                  )}
                  <Button variant="outline" size="sm">
                    {channel.action}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Help Resources */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Self-Help Resources
            </CardTitle>
            <CardDescription>
              Find answers instantly with our help resources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {helpResources.map((resource, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="text-primary">{resource.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">{resource.title}</h4>
                    <Badge variant="secondary">{resource.count}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Support Status */}
        <Card>
          <CardHeader>
            <CardTitle>Support Status</CardTitle>
            <CardDescription>Current system status and response times</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">All Systems</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Operational
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Average Response Time</span>
                <span className="font-semibold">2.5 hours</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Resolution Rate</span>
                <span className="font-semibold">98.2%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Customer Satisfaction</span>
                <span className="font-semibold">4.9/5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200">Emergency Support</CardTitle>
            <CardDescription>
              For critical issues that require immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Only use this for service outages or security issues that are blocking your business operations.
            </p>
            <Button variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50">
              <Phone className="h-4 w-4 mr-2" />
              Emergency Hotline: +1 (555) 911-HELP
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}