import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TagsInput } from '@/components/ui/tags-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, BookOpen, FileText, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  created_by: string;
  views: number;
}

export function ArticlesManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const [newArticle, setNewArticle] = useState<{
    title: string;
    content: string;
    summary: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
  }>({
    title: '',
    content: '',
    summary: '',
    category: 'general',
    tags: [],
    status: 'draft'
  });

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'faq', label: 'FAQ' }
  ];

  useEffect(() => {
    loadArticles();
  }, [organization?.id]);

  const loadArticles = async () => {
    if (!organization?.id) return;
    
    try {
      setLoading(true);
      // Mock data since we don't have articles table yet
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Getting Started Guide',
          content: 'Complete guide for new users...',
          summary: 'Learn the basics of using our platform',
          category: 'onboarding',
          tags: ['getting-started', 'tutorial', 'basics'],
          status: 'published',
          created_at: new Date().toISOString(),
          created_by: 'system',
          views: 156
        },
        {
          id: '2',
          title: 'Troubleshooting Login Issues',
          content: 'Common solutions for login problems...',
          summary: 'Fix common authentication problems',
          category: 'troubleshooting',
          tags: ['login', 'authentication', 'password', 'troubleshooting'],
          status: 'published',
          created_at: new Date().toISOString(),
          created_by: 'system',
          views: 89
        },
        {
          id: '3',
          title: 'API Integration Guide',
          content: 'How to integrate with our API...',
          summary: 'Complete API integration documentation',
          category: 'technical',
          tags: ['api', 'integration', 'development', 'technical'],
          status: 'published',
          created_at: new Date().toISOString(),
          created_by: 'system',
          views: 234
        }
      ];
      setArticles(mockArticles);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArticle = async () => {
    if (!newArticle.title || !newArticle.content) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const article: Article = {
        id: Date.now().toString(),
        ...newArticle,
        created_at: new Date().toISOString(),
        created_by: 'current_user',
        views: 0
      };

      setArticles(prev => [article, ...prev]);
      setShowCreateForm(false);
      setNewArticle({
        title: '',
        content: '',
        summary: '',
        category: 'general',
        tags: [],
        status: 'draft'
      });

      toast({
        title: "Success",
        description: "Article created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive"
      });
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
          <p className="text-muted-foreground">Manage articles and documentation</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create Article Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newArticle.title}
                  onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Article title"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={newArticle.category} 
                  onValueChange={(value) => setNewArticle(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Summary</Label>
              <Input
                value={newArticle.summary}
                onChange={(e) => setNewArticle(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Brief description of the article"
              />
            </div>

            <div>
              <Label>Content</Label>
              <Textarea
                value={newArticle.content}
                onChange={(e) => setNewArticle(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Article content"
                rows={8}
              />
            </div>

            <div>
              <Label>Tags</Label>
              <TagsInput
                tags={newArticle.tags}
                onTagsChange={(tags) => setNewArticle(prev => ({ ...prev, tags }))}
                placeholder="Add tags to help organize articles"
                maxTags={10}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={newArticle.status} 
                onValueChange={(value: 'draft' | 'published' | 'archived') => 
                  setNewArticle(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateArticle}>Create Article</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading articles...</div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No articles found. {searchTerm && 'Try adjusting your search criteria.'}
          </div>
        ) : (
          filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">{article.title}</h3>
                      <Badge className={getStatusColor(article.status)}>
                        {article.status}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-3">
                      {article.summary}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {categories.find(c => c.value === article.category)?.label}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {article.views} views
                      </span>
                    </div>
                    
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}