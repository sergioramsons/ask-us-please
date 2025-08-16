import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { detectTenant, isValidSubdomain } from '@/lib/subdomain';
import { Globe, Info, CheckCircle, AlertCircle } from 'lucide-react';

const SubdomainDemo: React.FC = () => {
  const [currentTenant, setCurrentTenant] = useState(detectTenant());
  const [testHostname, setTestHostname] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestSubdomain = () => {
    if (!testHostname) return;

    // Simulate subdomain detection
    const parts = testHostname.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      const baseDomain = parts.slice(1).join('.');
      
      setTestResult({
        hostname: testHostname,
        subdomain,
        baseDomain,
        isValid: isValidSubdomain(subdomain),
        type: parts.length > 2 ? 'subdomain' : 'domain'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Wildcard Subdomain System
          </CardTitle>
          <CardDescription>
            Automatic tenant detection based on subdomain patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>How it works:</strong> Each organization can have a subdomain (e.g., acme.yourdomain.com) 
              that automatically routes to their branded instance of the helpdesk.
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="text-sm font-medium mb-2">Current Domain Detection</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Badge variant="outline" className="mb-2">Current Hostname</Badge>
                <p className="text-sm font-mono bg-muted p-2 rounded">{currentTenant.hostname}</p>
              </div>
              <div>
                <Badge variant={currentTenant.type === 'subdomain' ? 'default' : 'secondary'} className="mb-2">
                  Tenant Type: {currentTenant.type}
                </Badge>
                {currentTenant.subdomain && (
                  <p className="text-sm">
                    <span className="font-medium">Subdomain:</span> {currentTenant.subdomain}
                  </p>
                )}
                {currentTenant.baseDomain && (
                  <p className="text-sm">
                    <span className="font-medium">Base Domain:</span> {currentTenant.baseDomain}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Test Subdomain Detection</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Enter hostname (e.g., acme.yourdomain.com)"
                value={testHostname}
                onChange={(e) => setTestHostname(e.target.value)}
              />
              <Button onClick={handleTestSubdomain} variant="outline">
                Test
              </Button>
            </div>
            
            {testResult && (
              <div className="mt-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {testResult.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    {testResult.isValid ? 'Valid Subdomain' : 'Invalid Subdomain'}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Hostname:</span> {testResult.hostname}</p>
                  <p><span className="font-medium">Subdomain:</span> {testResult.subdomain}</p>
                  <p><span className="font-medium">Base Domain:</span> {testResult.baseDomain}</p>
                  <p><span className="font-medium">Type:</span> {testResult.type}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Domain Type Examples</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default">Exact</Badge>
                <span>support.acme.com → matches only this exact domain</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Subdomain</Badge>
                <span>acme → matches acme.yourdomain.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Wildcard</Badge>
                <span>*.yourdomain.com → matches any.yourdomain.com</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubdomainDemo;