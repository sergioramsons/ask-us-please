import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, Tag, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/useTags';

interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  allowCreate?: boolean;
  showSuggestions?: boolean;
}

export function TagsInput({ 
  tags, 
  onTagsChange, 
  placeholder = "Add tags...", 
  maxTags = 10,
  className,
  allowCreate = true,
  showSuggestions = true
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { 
    tags: availableTags, 
    getTagSuggestions, 
    getOrCreateTag 
  } = useTags();

  const suggestions = showSuggestions ? getTagSuggestions(inputValue, 8) : [];
  const filteredSuggestions = suggestions.filter(tag => !tags.includes(tag.name));

  const addTag = async (tagName?: string) => {
    const newTagName = (tagName || inputValue).trim().toLowerCase();
    
    if (!newTagName || tags.includes(newTagName) || tags.length >= maxTags) {
      return;
    }

    if (allowCreate && showSuggestions) {
      // Try to get or create the tag in the database
      const tag = await getOrCreateTag(newTagName);
      if (tag) {
        onTagsChange([...tags, tag.name]);
      } else {
        onTagsChange([...tags, newTagName]);
      }
    } else {
      onTagsChange([...tags, newTagName]);
    }
    
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSelectSuggestion = async (tagName: string) => {
    await addTag(tagName);
  };

  const getTagColor = (tagName: string) => {
    const tag = availableTags.find(t => t.name === tagName);
    return tag?.color || '#3B82F6';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={isOpen && showSuggestions} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (showSuggestions) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => showSuggestions && setIsOpen(true)}
              placeholder={placeholder}
              disabled={tags.length >= maxTags}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => addTag()}
              size="sm"
              variant="outline"
              disabled={!inputValue.trim() || tags.includes(inputValue.trim().toLowerCase()) || tags.length >= maxTags}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </PopoverTrigger>
        
        {showSuggestions && (
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search tags..." 
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {allowCreate && inputValue ? (
                    <div className="flex items-center justify-center p-4">
                      <Button
                        variant="ghost"
                        onClick={() => addTag()}
                        className="text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create "{inputValue}"
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-4 text-sm text-muted-foreground">
                      No tags found
                    </div>
                  )}
                </CommandEmpty>
                
                {filteredSuggestions.length > 0 && (
                  <CommandGroup heading="Suggested Tags">
                    {filteredSuggestions.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => handleSelectSuggestion(tag.name)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                          {tag.category !== 'general' && (
                            <Badge variant="outline" className="text-xs">
                              {tag.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{tag.usage_count}</span>
                          <Check className="h-3 w-3" />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              style={{ 
                backgroundColor: showSuggestions ? getTagColor(tag) : '#3B82F6',
                color: '#ffffff',
                border: 'none'
              }}
              className="flex items-center gap-1 px-2 py-1 hover:opacity-80 transition-opacity"
            >
              {showSuggestions && (
                <Tag className="h-3 w-3" />
              )}
              <span className="text-xs">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-200 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {tags.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxTags} tags allowed
        </p>
      )}
    </div>
  );
}