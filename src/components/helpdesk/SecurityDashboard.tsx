import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  Key,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { encryptPassword, isPasswordEncrypted } from '@/lib/secureEncryption';

interface SecurityStatus {
  totalServers: number;
  encryptedServers: number;
  unencryptedServers: number;
  auditLogCount: number;
  lastAuditCheck: string | null;
}

interface EmailServer {
  id: string;
  name: string;
  smtp_password: string;
  password_encrypted: boolean;
  is_active: boolean;
  created_at: string;
}

export function SecurityDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    totalServers: 0,
    encryptedServers: 0,
    unencryptedServers: 0,
    auditLogCount: 0,
    lastAuditCheck: null
  });
  const [unencryptedServers, setUnencryptedServers] = useState<EmailServer[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const checkSecurityStatus = async () => {
    try {
      setLoading(true);

      // Get all email servers
      const { data: servers, error: serversError } = await supabase
        .from('email_servers')
        .select('*');

      if (serversError) throw serversError;

      // Get audit log count
      const { count: auditCount, error: auditError } = await supabase
        .from('email_server_audit')
        .select('*', { count: 'exact', head: true });

      if (auditError) console.warn('Could not fetch audit logs:', auditError);

      const totalServers = servers?.length || 0;
      const encryptedServers = servers?.filter(s => s.password_encrypted).length || 0;
      const unencryptedList = servers?.filter(s => !s.password_encrypted) || [];

      setSecurityStatus({
        totalServers,
        encryptedServers,
        unencryptedServers: unencryptedList.length,
        auditLogCount: auditCount || 0,
        lastAuditCheck: new Date().toISOString()
      });

      setUnencryptedServers(unencryptedList);

    } catch (error) {
      console.error('Error checking security status:', error);
      toast({
        title: "Security Check Failed",
        description: "Unable to verify email server security status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const migrateUnencryptedPasswords = async () => {
    if (unencryptedServers.length === 0) return;

    setMigrating(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const server of unencryptedServers) {
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
          successCount++;

        } catch (error) {
          console.error(`Failed to encrypt password for server ${server.name}:`, error);
          errorCount++;
        }
      }

      toast({
        title: "Password Migration Complete",
        description: `Successfully encrypted ${successCount} passwords. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default",
      });

      // Refresh security status
      await checkSecurityStatus();

    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: "Migration Failed",
        description: "Failed to encrypt email server passwords.",
        variant: "destructive",
      });
    } finally {
      setMigrating(false);
    }
  };

  const getSecurityScore = () => {
    if (securityStatus.totalServers === 0) return 100;
    return Math.round((securityStatus.encryptedServers / securityStatus.totalServers) * 100);
  };

  const getSecurityLevel = () => {
    const score = getSecurityScore();
    if (score === 100) return { level: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (score >= 80) return { level: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const securityLevel = getSecurityLevel();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Checking security status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card className={`${securityLevel.bg} ${securityLevel.border} border`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${securityLevel.color}`} />
            Email Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{securityStatus.totalServers}</div>
              <div className="text-sm text-muted-foreground">Total Servers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{securityStatus.encryptedServers}</div>
              <div className="text-sm text-muted-foreground">Encrypted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{securityStatus.unencryptedServers}</div>
              <div className="text-sm text-muted-foreground">Unencrypted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{securityStatus.auditLogCount}</div>
              <div className="text-sm text-muted-foreground">Audit Logs</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Security Score</span>
              <span className={securityLevel.color}>{getSecurityScore()}%</span>
            </div>
            <Progress value={getSecurityScore()} className="h-2" />
            <div className="text-center">
              <Badge variant={securityStatus.unencryptedServers > 0 ? 'destructive' : 'default'}>
                {securityLevel.level} Security Level
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Security Issues */}
      {securityStatus.unencryptedServers > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <div className="font-semibold">
                CRITICAL: {securityStatus.unencryptedServers} email server{securityStatus.unencryptedServers > 1 ? 's have' : ' has'} unencrypted passwords!
              </div>
              <div>
                This is a serious security vulnerability. Passwords are stored in plain text and could be stolen if your database is compromised.
              </div>
              <Button 
                onClick={migrateUnencryptedPasswords}
                disabled={migrating}
                className="mt-2"
                size="sm"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Encrypting Passwords...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Encrypt All Passwords Now
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Unencrypted Servers List */}
      {unencryptedServers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Servers with Unencrypted Passwords
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unencryptedServers.map((server) => (
                <div key={server.id} className="border rounded-lg p-3 bg-red-50 border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-red-800">{server.name}</h4>
                      <p className="text-sm text-red-600">
                        Password: {showPasswords ? server.smtp_password : '•'.repeat(server.smtp_password.length)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(server.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Unencrypted</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Status Good */}
      {securityStatus.unencryptedServers === 0 && securityStatus.totalServers > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="font-semibold">All email server passwords are properly encrypted!</div>
            <div>Your email credentials are protected using AES-256-GCM encryption.</div>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security Features Enabled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">AES-256-GCM Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Admin-Only Access Control</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Audit Logging</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Row-Level Security (RLS)</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={checkSecurityStatus}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Security Status
        </Button>
      </div>
    </div>
  );
}