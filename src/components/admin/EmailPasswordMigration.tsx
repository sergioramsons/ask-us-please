import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { encryptPassword, isPasswordEncrypted } from '@/lib/secureEncryption';

interface EmailServer {
  id: string;
  name: string;
  smtp_password: string;
  password_encrypted: boolean;
  is_active: boolean;
}

export function EmailPasswordMigration() {
  const { toast } = useToast();
  const [servers, setServers] = useState<EmailServer[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_servers')
        .select('id, name, smtp_password, password_encrypted, is_active')
        .order('created_at');

      if (error) throw error;
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch email servers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const migratePasswords = async () => {
    if (migrating) return;
    
    setMigrating(true);
    setMigrationProgress(0);

    try {
      // Filter servers that need migration
      const serversToMigrate = servers.filter(server => 
        !server.password_encrypted && !isPasswordEncrypted(server.smtp_password)
      );

      if (serversToMigrate.length === 0) {
        toast({
          title: "No Migration Needed",
          description: "All email server passwords are already encrypted.",
        });
        return;
      }

      // Migrate each server
      for (let i = 0; i < serversToMigrate.length; i++) {
        const server = serversToMigrate[i];
        
        try {
          // Encrypt the password
          const encryptedPassword = await encryptPassword(server.smtp_password);
          
          // Update the server record
          const { error } = await supabase
            .from('email_servers')
            .update({
              smtp_password: encryptedPassword,
              password_encrypted: true
            })
            .eq('id', server.id);

          if (error) throw error;

          // Update progress
          setMigrationProgress(Math.round(((i + 1) / serversToMigrate.length) * 100));
          
        } catch (error) {
          console.error(`Failed to migrate server ${server.name}:`, error);
          toast({
            title: "Migration Error",
            description: `Failed to migrate password for ${server.name}`,
            variant: "destructive",
          });
        }
      }

      // Run database migration function for audit logging
      await supabase.rpc('migrate_email_server_passwords');

      toast({
        title: "Migration Complete",
        description: `Successfully encrypted passwords for ${serversToMigrate.length} email servers.`,
      });

      // Refresh the list
      await fetchServers();

    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: "Failed to complete password migration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
      setMigrationProgress(0);
    }
  };

  const unencryptedCount = servers.filter(server => 
    !server.password_encrypted && !isPasswordEncrypted(server.smtp_password)
  ).length;

  const encryptedCount = servers.filter(server => 
    server.password_encrypted || isPasswordEncrypted(server.smtp_password)
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Email Password Security Migration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Security Enhancement:</strong> This tool migrates plain text email server passwords 
              to encrypted storage using AES-256-GCM encryption. This prevents unauthorized access to 
              email credentials even by admin users.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 justify-center">
            <Button 
              onClick={fetchServers} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Scan Servers
            </Button>
          </div>

          {servers.length > 0 && (
            <div className="space-y-4">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Encrypted</p>
                        <p className="text-2xl font-bold text-green-600">{encryptedCount}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Unencrypted</p>
                        <p className="text-2xl font-bold text-red-600">{unencryptedCount}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Migration Progress */}
              {migrating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Migration Progress</span>
                    <span className="text-sm text-muted-foreground">{migrationProgress}%</span>
                  </div>
                  <Progress value={migrationProgress} className="w-full" />
                </div>
              )}

              {/* Server List */}
              <div className="space-y-2">
                <h4 className="font-semibold">Email Servers Status</h4>
                {servers.map((server) => {
                  const isEncrypted = server.password_encrypted || isPasswordEncrypted(server.smtp_password);
                  
                  return (
                    <div 
                      key={server.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isEncrypted ? (
                          <Lock className="h-4 w-4 text-green-600" />
                        ) : (
                          <Unlock className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{server.name}</p>
                          {server.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={isEncrypted ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {isEncrypted ? "Encrypted" : "Plain Text"}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              {/* Migration Button */}
              {unencryptedCount > 0 && (
                <div className="pt-4">
                  <Button 
                    onClick={migratePasswords}
                    disabled={migrating}
                    className="w-full flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {migrating ? 'Migrating Passwords...' : `Encrypt ${unencryptedCount} Password(s)`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}