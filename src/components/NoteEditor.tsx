import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Hash, 
  Bold, 
  Italic, 
  Code, 
  List, 
  ListOrdered,
  Quote,
  Eye,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

interface NoteEditorProps {
  note: Note | null;
  onNoteUpdate: (note: Note) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onNoteUpdate }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
    }
  }, [note]);

  const handleSave = () => {
    if (!note) return;
    
    onNoteUpdate({
      ...note,
      title: title || 'Untitled',
      content,
      tags
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      
      if (note) {
        onNoteUpdate({
          ...note,
          title: title || 'Untitled',
          content,
          tags: updatedTags
        });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    
    if (note) {
      onNoteUpdate({
        ...note,
        title: title || 'Untitled',
        content,
        tags: updatedTags
      });
    }
  };

  const insertMarkdown = (syntax: string, placeholder = '') => {
    if (!contentRef.current) return;
    
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText || placeholder;
    
    let newContent = '';
    
    switch (syntax) {
      case 'bold':
        newContent = content.substring(0, start) + `**${replacement}**` + content.substring(end);
        break;
      case 'italic':
        newContent = content.substring(0, start) + `*${replacement}*` + content.substring(end);
        break;
      case 'code':
        newContent = content.substring(0, start) + `\`${replacement}\`` + content.substring(end);
        break;
      case 'quote':
        newContent = content.substring(0, start) + `> ${replacement}` + content.substring(end);
        break;
      case 'list':
        newContent = content.substring(0, start) + `- ${replacement}` + content.substring(end);
        break;
      case 'ordered-list':
        newContent = content.substring(0, start) + `1. ${replacement}` + content.substring(end);
        break;
      default:
        return;
    }
    
    setContent(newContent);
    
    // Reset cursor position
    setTimeout(() => {
      if (textarea) {
        const newPosition = start + syntax.length + (replacement ? 0 : placeholder.length);
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }
    }, 0);
  };

  const renderPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="code-inline">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
      .replace(/\n/g, '<br>');
  };

  // Keyboard shortcuts for editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!note) return;
      
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            insertMarkdown('bold', 'bold text');
            break;
          case 'i':
            e.preventDefault();
            insertMarkdown('italic', 'italic text');
            break;
          case 'e':
            e.preventDefault();
            insertMarkdown('code', 'code');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [note, content]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <Edit3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Select a note to edit</h2>
          <p className="text-sm">Choose a note from the sidebar or create a new one</p>
          <p className="text-xs mt-2">⌘N to create a new note</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border p-4 bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            placeholder="Note title..."
            className="text-lg font-semibold bg-transparent border-none p-0 focus-visible:ring-0 flex-1"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className={cn(isPreview && "bg-accent")}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save (⌘S)
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleRemoveTag(tag)}
            >
              #{tag} ×
            </Badge>
          ))}
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Add tag..."
              className="w-20 h-7 text-xs bg-transparent border-none p-0 focus-visible:ring-0"
            />
          </div>
        </div>
      </header>

      {/* Toolbar */}
      {!isPreview && (
        <div className="border-b border-border p-2 bg-card/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('bold', 'bold text')}
              title="Bold (⌘B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('italic', 'italic text')}
              title="Italic (⌘I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('code', 'code')}
              title="Code (⌘E)"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('quote', 'quote')}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('list', 'list item')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown('ordered-list', 'list item')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {isPreview ? (
          <div 
            className="prose prose-invert max-w-none h-full overflow-auto"
            dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
          />
        ) : (
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSave}
            placeholder="Start writing your note... Use markdown for formatting."
            className="h-full resize-none border-none p-0 focus-visible:ring-0 bg-transparent font-mono text-sm leading-relaxed"
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-2 bg-card/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {content.length} characters • {content.split(/\s+/).filter(Boolean).length} words
          </div>
          <div>
            Updated {note.updatedAt.toLocaleTimeString()}
          </div>
        </div>
      </footer>
    </div>
  );
};