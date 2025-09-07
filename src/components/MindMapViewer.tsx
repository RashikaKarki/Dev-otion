import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Sparkles, 
  Download, 
  RefreshCw,
  FileText,
  Hash,
  Lightbulb
} from 'lucide-react';
import { InteractiveMindMap } from './InteractiveMindMap';
import mindMapPlaceholder from '@/assets/mind-map-placeholder.jpg';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

interface MindMapViewerProps {
  notes: Note[];
  activeNote: Note | null;
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({ notes, activeNote }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [mindMapUrl, setMindMapUrl] = useState<string | null>(null);

  const generateMindMap = async () => {
    setIsGenerating(true);
    
    // Simulate mind map generation
    setTimeout(() => {
      setMindMapUrl(mindMapPlaceholder);
      setIsGenerating(false);
    }, 2000);
  };

  const extractKeywords = (content: string) => {
    const words = content.toLowerCase().split(/\W+/);
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    const keywords = words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .reduce((acc: Record<string, number>, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
    
    return Object.entries(keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  };

  const getAllTags = () => {
    const allTags = notes.flatMap(note => note.tags);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags.slice(0, 15);
  };

  const getConnectedNotes = (note: Note) => {
    return notes.filter(n => 
      n.id !== note.id && 
      n.tags.some(tag => note.tags.includes(tag))
    ).slice(0, 5);
  };

  const totalWords = notes.reduce((total, note) => 
    total + note.content.split(/\s+/).filter(Boolean).length, 0
  );

  const allKeywords = notes.length > 0 
    ? extractKeywords(notes.map(n => n.content).join(' '))
    : [];

  return (
    <div className="flex-1 flex flex-col bg-background overflow-auto">
      {/* Header */}
      <header className="border-b border-border p-6 bg-card/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-2 flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Mind Map
            </h1>
            <p className="text-muted-foreground">
              Visual representation of your notes and connections
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-3 bg-gradient-subtle">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{notes.length}</div>
              <div className="text-xs text-muted-foreground">Notes</div>
            </div>
          </Card>
          <Card className="p-3 bg-gradient-subtle">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{getAllTags().length}</div>
              <div className="text-xs text-muted-foreground">Tags</div>
            </div>
          </Card>
          <Card className="p-3 bg-gradient-subtle">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{allKeywords.length}</div>
              <div className="text-xs text-muted-foreground">Keywords</div>
            </div>
          </Card>
          <Card className="p-3 bg-gradient-subtle">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{totalWords}</div>
              <div className="text-xs text-muted-foreground">Words</div>
            </div>
          </Card>
        </div>
      </header>

      <div className="flex-1 flex overflow-auto">
        {/* Mind Map Display */}
        <div className="flex-1 min-h-0">
          <InteractiveMindMap 
            notes={notes} 
            activeNote={activeNote}
            onNoteSelect={(noteId) => {
              console.log('Selected note:', noteId);
              // Add navigation logic here if needed
            }}
          />
        </div>

        {/* Sidebar Info */}
        <div className="w-80 border-l border-border bg-card/30 overflow-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </h3>
          </div>

          <div className="p-4 space-y-6 overflow-auto flex-1">
            {/* Active Note Connections */}
            {activeNote && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Current Note Connections
                </h4>
                <div className="space-y-2">
                  <Card className="p-3 bg-gradient-subtle">
                    <div className="font-medium text-sm mb-2">{activeNote.title}</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {activeNote.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                  
                  {getConnectedNotes(activeNote).map(note => (
                    <Card key={note.id} className="p-2 bg-muted/50">
                      <div className="text-sm font-medium">{note.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {note.tags.filter(tag => activeNote.tags.includes(tag)).length} shared tags
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Top Tags */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Popular Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {getAllTags().map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <h4 className="text-sm font-medium mb-3">Key Terms</h4>
              <div className="space-y-1">
                {allKeywords.map(keyword => (
                  <div key={keyword} className="text-sm text-muted-foreground">
                    {keyword}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h4 className="text-sm font-medium mb-3">Tips</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Use tags to connect related notes</p>
                <p>• Keywords are extracted from note content</p>
                <p>• Connected notes share common tags</p>
                <p>• Mind maps update as you add content</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};