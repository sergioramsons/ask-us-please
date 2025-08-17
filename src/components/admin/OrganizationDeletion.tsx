import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export function OrganizationDeletion() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch organizations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrg || confirmationText !== selectedOrg.name) {
      toast({
        title: "Error",
        description: "Please type the organization name correctly to confirm deletion",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_organization', {
        org_id: selectedOrg.id
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Organization "${selectedOrg.name}" has been deleted`,
      });

      // Reset state and refresh list
      setSelectedOrg(null);
      setConfirmationText("");
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete organization",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Organization Deletion
          </CardTitle>
          <CardDescription>
            Permanently delete organizations and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting an organization will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All tickets and comments</li>
                <li>All contacts</li>
                <li>All auto-dialer campaigns and results</li>
                <li>All email servers and configurations</li>
                <li>All departments and assignment rules</li>
                <li>Organization domains and settings</li>
              </ul>
              User profiles will be preserved but their organization reference will be removed.
            </AlertDescription>
          </Alert>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Only super administrators can delete organizations.
            </p>
            <Button 
              onClick={fetchOrganizations} 
              disabled={loading}
              variant="outline"
            >
              {loading ? "Loading..." : "Load Organizations"}
            </Button>
          </div>

          {organizations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Organizations</h3>
              <div className="grid gap-3">
                {organizations.map((org) => (
                  <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Slug: {org.slug} • Created: {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setSelectedOrg(org);
                            setConfirmationText("");
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-3">
                              <p>
                                Are you absolutely sure you want to delete <strong>"{org.name}"</strong>?
                              </p>
                              <p>
                                This action cannot be undone. This will permanently delete the organization
                                and all associated data including tickets, contacts, campaigns, and configurations.
                              </p>
                              <div className="space-y-2">
                                <Label htmlFor="confirmation">
                                  Type <strong>{org.name}</strong> to confirm:
                                </Label>
                                <Input
                                  id="confirmation"
                                  value={confirmationText}
                                  onChange={(e) => setConfirmationText(e.target.value)}
                                  placeholder={org.name}
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel 
                            onClick={() => {
                              setSelectedOrg(null);
                              setConfirmationText("");
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteOrganization}
                            disabled={confirmationText !== org.name || isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? "Deleting..." : "Delete Organization"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </div>
          )}

          {organizations.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">
              No organizations found. Click "Load Organizations" to refresh.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}