import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Search, Tag, TrendingUp } from 'lucide-react';
import { CannedResponse, CannedResponseCategory } from '@/types/cannedResponse';
import { mockCannedResponses } from '@/data/mock-canned-responses';

interface CannedResponseSelectorProps {
  onSelect: (response: CannedResponse) => void;
  children: React.ReactNode;
}

export function CannedResponseSelector({ onSelect, children }: CannedResponseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredResponses = mockCannedResponses.filter(response => {
    const matchesSearch = response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         response.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || response.category === selectedCategory;
    
    return response.isActive && matchesSearch && matchesCategory;
  });

  const categories: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'All Categories' },
    { value: 'greeting', label: 'Greeting' },
    { value: 'resolution', label: 'Resolution' },
    { value: 'escalation', label: 'Escalation' },
    { value: 'information', label: 'Information' },
    { value: 'closure', label: 'Closure' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'billing', label: 'Billing' },
    { value: 'general', label: 'General' }
  ];

  const handleSelect = (response: CannedResponse) => {
    onSelect(response);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Select Canned Response
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredResponses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No canned responses found matching your criteria.
                </div>
              ) : (
                filteredResponses.map((response) => (
                  <Card 
                    key={response.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSelect(response)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{response.title}</CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          {response.usageCount} uses
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {response.category}
                        </Badge>
                        {response.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {response.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{response.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {response.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}