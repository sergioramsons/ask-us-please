import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const loadTags = async () => {
    try {
      setLoading(true);
      // Single tenant - get all tags without organization filtering
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tags',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // Single tenant - get all categories without organization filtering
      const { data, error } = await supabase
        .from('tag_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading tag categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tag categories',
        variant: 'destructive'
      });
    }
  };

  const createTag = async (tagData: Omit<Tag, 'id' | 'usage_count' | 'created_at' | 'updated_at'>) => {
    // Get the default organization ID for single tenant
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          ...tagData,
          organization_id: defaultOrgId
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadTags(); // Refresh the list
      toast({
        title: 'Success',
        description: 'Tag created successfully'
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tag',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateTag = async (id: string, updates: Partial<Tag>) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await loadTags(); // Refresh the list
      toast({
        title: 'Success',
        description: 'Tag updated successfully'
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating tag:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tag',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      await loadTags(); // Refresh the list
      toast({
        title: 'Success',
        description: 'Tag archived successfully'
      });
      
      return true;
    } catch (error: any) {
      console.error('Error archiving tag:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive tag',
        variant: 'destructive'
      });
      return false;
    }
  };

  const createCategory = async (categoryData: Omit<TagCategory, 'id' | 'created_at' | 'updated_at'>) => {
    // Get the default organization ID for single tenant
    const defaultOrgId = '00000000-0000-0000-0000-000000000001';

    try {
      const { data, error } = await supabase
        .from('tag_categories')
        .insert({
          ...categoryData,
          organization_id: defaultOrgId
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadCategories(); // Refresh the list
      toast({
        title: 'Success',
        description: 'Category created successfully'
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive'
      });
      return null;
    }
  };

  const getTagSuggestions = (searchTerm: string, limit: number = 10): Tag[] => {
    if (!searchTerm.trim()) return tags.slice(0, limit);
    
    return tags
      .filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .slice(0, limit);
  };

  const getOrCreateTag = async (tagName: string, category: string = 'general'): Promise<Tag | null> => {
    // First check if tag exists
    const existingTag = tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
    if (existingTag) return existingTag;

    // Create new tag
    const defaultColors = {
      general: '#6B7280',
      priority: '#EF4444', 
      department: '#3B82F6',
      status: '#10B981',
      product: '#8B5CF6'
    };

    return await createTag({
      name: tagName.toLowerCase(),
      description: `Auto-created tag for ${tagName}`,
      color: defaultColors[category as keyof typeof defaultColors] || '#6B7280',
      category,
      is_active: true
    });
  };

  useEffect(() => {
    // Load tags and categories immediately without waiting for organization
    loadTags();
    loadCategories();
  }, []);

  return {
    tags,
    categories,
    loading,
    loadTags,
    loadCategories,
    createTag,
    updateTag,
    deleteTag,
    createCategory,
    getTagSuggestions,
    getOrCreateTag
  };
}