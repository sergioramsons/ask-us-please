import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  Tag, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  Palette,
  Archive,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useTags, Tag as TagType, TagCategory } from '@/hooks/useTags';

const COLOR_OPTIONS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#6B7280', '#DC2626', '#059669', '#7C3AED',
  '#DB2777', '#4B5563', '#B45309', '#047857', '#5B21B6'
];

export function TagsManager() {
  const { 
    tags, 
    categories, 
    loading, 
    createTag, 
    updateTag, 
    deleteTag, 
    createCategory 
  } = useTags();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);

  const [newTag, setNewTag] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    category: 'general'
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#6B7280'
  });

  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateTag = async () => {
    if (!newTag.name.trim()) return;

    const success = await createTag({
      ...newTag,
      name: newTag.name.toLowerCase(),
      is_active: true
    });

    if (success) {
      setNewTag({
        name: '',
        description: '',
        color: '#3B82F6',
        category: 'general'
      });
      setShowCreateTag(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    const success = await updateTag(editingTag.id, {
      name: editingTag.name.toLowerCase(),
      description: editingTag.description,
      color: editingTag.color,
      category: editingTag.category
    });

    if (success) {
      setEditingTag(null);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;

    const success = await createCategory(newCategory);

    if (success) {
      setNewCategory({
        name: '',
        description: '',
        color: '#6B7280'
      });
      setShowCreateCategory(false);
    }
  };

  const getTagsByCategory = () => {
    const tagsByCategory: { [key: string]: TagType[] } = {};
    
    categories.forEach(category => {
      tagsByCategory[category.name] = tags.filter(tag => tag.category === category.name);
    });

    // Add uncategorized tags
    const uncategorizedTags = tags.filter(tag => 
      !categories.find(cat => cat.name === tag.category)
    );
    if (uncategorizedTags.length > 0) {
      tagsByCategory['Uncategorized'] = uncategorizedTags;
    }

    return tagsByCategory;
  };

  const totalTags = tags.length;
  const totalUsage = tags.reduce((sum, tag) => sum + tag.usage_count, 0);
  const mostUsedTag = tags.reduce((max, tag) => tag.usage_count > max.usage_count ? tag : max, tags[0]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tags Management</h2>
          <p className="text-muted-foreground">Organize and manage your tags like Freshdesk</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateCategory} onOpenChange={setShowCreateCategory}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Tag Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Category description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-8 h-8 rounded border-2 border-border"
                      style={{ backgroundColor: newCategory.color }}
                    />
                    <Select 
                      value={newCategory.color} 
                      onValueChange={(value) => setNewCategory(prev => ({ ...prev, color: value }))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(color => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              {color}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateCategory}>Create Category</Button>
                  <Button variant="outline" onClick={() => setShowCreateCategory(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newTag.name}
                    onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tag name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newTag.description}
                    onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tag description"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newTag.category} 
                    onValueChange={(value) => setNewTag(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.name} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 items-center">
                    <div 
                      className="w-8 h-8 rounded border-2 border-border"
                      style={{ backgroundColor: newTag.color }}
                    />
                    <Select 
                      value={newTag.color} 
                      onValueChange={(value) => setNewTag(prev => ({ ...prev, color: value }))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(color => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color }}
                              />
                              {color}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTag}>Create Tag</Button>
                  <Button variant="outline" onClick={() => setShowCreateTag(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Tag className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Tags</p>
                <p className="text-2xl font-bold">{totalTags}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Palette className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Archive className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Most Used</p>
                <p className="text-lg font-bold">{mostUsedTag?.name || 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-tags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-tags">All Tags</TabsTrigger>
          <TabsTrigger value="by-category">By Category</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="all-tags" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTags.map((tag) => (
              <Card key={tag.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge 
                      style={{ 
                        backgroundColor: tag.color,
                        color: '#ffffff',
                        border: 'none'
                      }}
                    >
                      {tag.name}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTag(tag)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteTag(tag.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {tag.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {tag.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Category: {tag.category}</span>
                    <span>Used: {tag.usage_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="by-category" className="space-y-4">
          {Object.entries(getTagsByCategory()).map(([categoryName, categoryTags]) => (
            <Card key={categoryName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {categoryName} ({categoryTags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categoryTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      style={{ 
                        backgroundColor: tag.color,
                        color: '#ffffff',
                        border: 'none'
                      }}
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => setEditingTag(tag)}
                    >
                      {tag.name} ({tag.usage_count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {tags.filter(tag => tag.category === category.name).length} tags
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Tag Dialog */}
      <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          {editingTag && (
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingTag.name}
                  onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Tag name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingTag.description || ''}
                  onChange={(e) => setEditingTag(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Tag description"
                  rows={2}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={editingTag.category} 
                  onValueChange={(value) => setEditingTag(prev => prev ? { ...prev, category: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <div 
                    className="w-8 h-8 rounded border-2 border-border"
                    style={{ backgroundColor: editingTag.color }}
                  />
                  <Select 
                    value={editingTag.color} 
                    onValueChange={(value) => setEditingTag(prev => prev ? { ...prev, color: value } : null)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(color => (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: color }}
                            />
                            {color}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateTag}>Update Tag</Button>
                <Button variant="outline" onClick={() => setEditingTag(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}