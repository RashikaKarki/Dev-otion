import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from './CodeBlock';
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
  Edit3,
  Terminal,
  Plus
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

interface EnhancedNoteEditorProps {
  note: Note | null;
  onNoteUpdate: (note: Note) => void;
  onCreateTask?: (title: string, priority: 'low' | 'medium' | 'high', linkedNoteId: string, completed?: boolean) => void;
}

interface CodeBlockData {
  id: string;
  code: string;
  language: string;
  startLine: number;
  endLine: number;
}

export const EnhancedNoteEditor: React.FC<EnhancedNoteEditorProps> = ({ note, onNoteUpdate, onCreateTask }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockData[]>([]);
  const [selectedCodeBlock, setSelectedCodeBlock] = useState<string | null>(null);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      extractCodeBlocks(note.content);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setCodeBlocks([]);
    }
  }, [note]);

  const extractCodeBlocks = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: CodeBlockData[] = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2];
      const startIndex = match.index;
      const beforeMatch = text.substring(0, startIndex);
      const startLine = beforeMatch.split('\n').length;
      const codeLines = code.split('\n').length;
      
      blocks.push({
        id: crypto.randomUUID(),
        code,
        language,
        startLine,
        endLine: startLine + codeLines - 1
      });
    }
    
    setCodeBlocks(blocks);
  };

  const handleSave = () => {
    if (!note) return;
    
    // Parse and create tasks from checkbox format
    parseAndCreateTasks(content);
    
    onNoteUpdate({
      ...note,
      title: title || 'Untitled',
      content,
      tags
    });
  };

  const parseAndCreateTasks = (content: string) => {
    if (!onCreateTask) return;
    
    // Parse unchecked tasks: - [ ] task title
    const uncheckedRegex = /^-\s*\[\s*\]\s+(.+)$/gm;
    let match;
    
    while ((match = uncheckedRegex.exec(content)) !== null) {
      const taskTitle = match[1].trim();
      if (taskTitle) {
        onCreateTask(taskTitle, 'medium', note?.id || '');
      }
    }
    
    // Parse checked tasks: - [x] or - [X] task title
    const checkedRegex = /^-\s*\[[xX]\]\s+(.+)$/gm;
    
    while ((match = checkedRegex.exec(content)) !== null) {
      const taskTitle = match[1].trim();
      if (taskTitle) {
        // Create task as completed
        onCreateTask(taskTitle, 'medium', note?.id || '', true);
      }
    }
    
    // Remove all checkbox tasks from content after creating them
    const updatedContent = content
      .replace(/^-\s*\[\s*\]\s+.+$/gm, '')
      .replace(/^-\s*\[[xX]\]\s+.+$/gm, '')
      .replace(/\n\n\n+/g, '\n\n'); // Clean up extra line breaks
      
    if (updatedContent !== content) {
      setContent(updatedContent);
    }
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

  const insertCodeBlock = (language = 'javascript') => {
    if (!contentRef.current) return;
    
    const textarea = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const codeBlockTemplate = `\n\`\`\`${language}\n// Your ${language} code here\nconsole.log("Hello, world!");\n\`\`\`\n`;
    
    const newContent = content.substring(0, start) + codeBlockTemplate + content.substring(end);
    setContent(newContent);
    
    // Update code blocks
    setTimeout(() => {
      extractCodeBlocks(newContent);
    }, 100);
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

  const updateCodeBlock = (blockId: string, newCode: string, newLanguage: string) => {
    const block = codeBlocks.find(b => b.id === blockId);
    if (!block) return;

    // Find and replace the code block in content
    const codeBlockRegex = new RegExp(`\`\`\`${block.language}?\\n[\\s\\S]*?\`\`\``, 'g');
    const newCodeBlock = `\`\`\`${newLanguage}\n${newCode}\n\`\`\``;
    
    let updatedContent = content;
    let matchCount = 0;
    updatedContent = updatedContent.replace(codeBlockRegex, (match) => {
      matchCount++;
      const targetIndex = codeBlocks.findIndex(b => b.id === blockId);
      if (matchCount === targetIndex + 1) {
        return newCodeBlock;
      }
      return match;
    });

    setContent(updatedContent);
    extractCodeBlocks(updatedContent);
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim() || !note || !onCreateTask) return;
    
    onCreateTask(newTaskTitle.trim(), newTaskPriority, note.id);
    setNewTaskTitle('');
    setShowTaskInput(false);
  };

  const renderPreview = (text: string) => {
    // Enhanced preview with proper code block rendering
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
      .replace(/\n/g, '<br>');

    // Handle code blocks separately for better rendering
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      return `<div class="code-preview-block">
        <div class="code-preview-header">${language || 'code'}</div>
        <pre><code>${code}</code></pre>
      </div>`;
    });

    return html;
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
          case '`':
            e.preventDefault();
            insertCodeBlock();
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
          <p className="text-xs mt-2">⌘N to create a new note • Use "- [ ] task" to create tasks</p>
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
              title="Inline Code (⌘E)"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertCodeBlock()}
              title="Code Block (⌘`)"
              className="bg-accent/50"
            >
              <Terminal className="h-4 w-4" />
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
          <div className="h-full overflow-auto space-y-4">
            <style dangerouslySetInnerHTML={{
              __html: `
                .code-preview-block {
                  margin: 1rem 0;
                  border-radius: 0.5rem;
                  border: 1px solid hsl(var(--border));
                  overflow: hidden;
                  background: hsl(var(--code-bg));
                }
                .code-preview-header {
                  padding: 0.5rem 1rem;
                  background: hsl(var(--muted));
                  font-size: 0.75rem;
                  font-weight: 500;
                  color: hsl(var(--muted-foreground));
                }
                .code-preview-block pre {
                  margin: 0;
                  padding: 1rem;
                  background: transparent;
                  overflow-x: auto;
                }
                .code-preview-block code {
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 0.875rem;
                  color: hsl(var(--foreground));
                }
                .inline-code {
                  background: hsl(var(--muted));
                  padding: 0.125rem 0.25rem;
                  border-radius: 0.25rem;
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 0.875rem;
                }
              `
            }} />
            
            {/* Render code blocks with enhanced editor */}
            {codeBlocks.length > 0 ? (
              <div className="space-y-6">
                {content.split(/```\w*\n[\s\S]*?```/).map((textPart, index) => (
                  <div key={index}>
                    {textPart && (
                      <div 
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ 
                          __html: renderPreview(textPart.replace(/```\w*\n[\s\S]*?```/g, ''))
                        }}
                      />
                    )}
                    {codeBlocks[index] && (
                      <CodeBlock
                        code={codeBlocks[index].code}
                        language={codeBlocks[index].language}
                        onCodeChange={(newCode) => 
                          updateCodeBlock(codeBlocks[index].id, newCode, codeBlocks[index].language)
                        }
                        onLanguageChange={(newLanguage) => 
                          updateCodeBlock(codeBlocks[index].id, codeBlocks[index].code, newLanguage)
                        }
                        isEditing={selectedCodeBlock === codeBlocks[index].id}
                        onToggleEdit={() => 
                          setSelectedCodeBlock(
                            selectedCodeBlock === codeBlocks[index].id 
                              ? null 
                              : codeBlocks[index].id
                          )
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div 
                className="prose prose-invert max-w-none h-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
              />
            )}
          </div>
        ) : (
          <Textarea
            ref={contentRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              extractCodeBlocks(e.target.value);
            }}
            onBlur={handleSave}
            placeholder="Start writing your note... Use ``` for code blocks with syntax highlighting and error detection."
            className="h-full resize-none border-none p-0 focus-visible:ring-0 bg-transparent font-mono text-sm leading-relaxed"
          />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-2 bg-card/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{content.length} characters • {content.split(/\s+/).filter(Boolean).length} words</span>
            {codeBlocks.length > 0 && (
              <span>{codeBlocks.length} code block{codeBlocks.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div>
            Updated {note.updatedAt.toLocaleTimeString()}
          </div>
        </div>
      </footer>
    </div>
  );
};