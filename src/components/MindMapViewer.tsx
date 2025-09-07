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
  const [selectedInsight, setSelectedInsight] = useState<{
    type: 'note' | 'tag' | 'keyword' | null;
    data: any;
  }>({ type: null, data: null });

  const generateMindMap = async () => {
    setIsGenerating(true);
    
    // Simulate mind map generation
    setTimeout(() => {
      setMindMapUrl(mindMapPlaceholder);
      setIsGenerating(false);
    }, 2000);
  };

  const extractKeywords = (content: string, allContent?: string[]) => {
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

  const getNotesWithTag = (tag: string) => {
    return notes.filter(note => note.tags.includes(tag));
  };

  const getNotesWithKeyword = (keyword: string) => {
    return notes.filter(note => 
      note.content.toLowerCase().includes(keyword.toLowerCase()) ||
      note.title.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  const calculateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const getRelatedTags = (tag: string) => {
    const notesWithTag = getNotesWithTag(tag);
    const relatedTagCounts: Record<string, number> = {};
    
    notesWithTag.forEach(note => {
      note.tags.forEach(t => {
        if (t !== tag) {
          relatedTagCounts[t] = (relatedTagCounts[t] || 0) + 1;
        }
      });
    });

    return Object.entries(relatedTagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  };

  const totalWords = notes.reduce((total, note) => 
    total + note.content.split(/\s+/).filter(Boolean).length, 0
  );

  const allKeywords = notes.length > 0 
    ? extractKeywords(notes.map(n => n.content).join(' '))
    : [];

  const handleNodeSelect = (type: 'note' | 'tag' | 'keyword', data: any) => {
    setSelectedInsight({ type, data });
  };

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
              const note = notes.find(n => n.id === noteId);
              if (note) handleNodeSelect('note', note);
            }}
            onTagSelect={(tag) => handleNodeSelect('tag', tag)}
            onKeywordSelect={(keyword) => handleNodeSelect('keyword', keyword)}
          />
        </div>

        {/* Sidebar Info */}
        <div className="w-80 border-l border-border bg-card/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights & Analytics
            </h3>
            <p className="text-xs text-muted-foreground">
              Discover patterns and connections in your knowledge base
            </p>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-6">
              {/* Dynamic Content Based on Selection */}
              {selectedInsight.type === null ? (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    🎯 Getting Started
                  </h4>
                  <div className="p-4 bg-gradient-subtle rounded-lg border text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <div className="font-medium text-sm mb-2">Explore Your Knowledge</div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Click on any node in the mind map to view detailed insights
                    </div>
                    <div className="space-y-1 text-xs text-left">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Click notes to see content analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Click tags to explore relationships</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Click keywords to find connections</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedInsight.type === 'note' ? (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Note Analysis: {selectedInsight.data.title}
                  </h4>
                  <div className="space-y-3">
                    {/* Note Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">{selectedInsight.data.content.split(/\s+/).filter(Boolean).length}</div>
                        <div className="text-xs text-muted-foreground">Words</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">{calculateReadingTime(selectedInsight.data.content)}</div>
                        <div className="text-xs text-muted-foreground">Min Read</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">{selectedInsight.data.tags.length}</div>
                        <div className="text-xs text-muted-foreground">Tags</div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="p-3 bg-muted/50 rounded">
                      <div className="text-xs font-medium mb-2">Content Preview</div>
                      <div className="text-xs text-muted-foreground max-h-24 overflow-y-auto">
                        {selectedInsight.data.content.slice(0, 200)}
                        {selectedInsight.data.content.length > 200 && '...'}
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedInsight.data.tags.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedInsight.data.tags.map((tag: string) => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-accent"
                              onClick={() => handleNodeSelect('tag', tag)}
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keywords */}
                    <div>
                      <div className="text-xs font-medium mb-2">Extracted Keywords</div>
                      <div className="flex flex-wrap gap-1">
                        {extractKeywords(selectedInsight.data.content).slice(0, 6).map((keyword: string) => (
                          <Badge 
                            key={keyword} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-accent"
                            onClick={() => handleNodeSelect('keyword', keyword)}
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Connected Notes */}
                    <div>
                      <div className="text-xs font-medium mb-2">Connected Notes ({getConnectedNotes(selectedInsight.data).length})</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {getConnectedNotes(selectedInsight.data).map((note: Note) => (
                          <div 
                            key={note.id} 
                            className="p-2 bg-muted/50 rounded text-xs cursor-pointer hover:bg-accent"
                            onClick={() => handleNodeSelect('note', note)}
                          >
                            <div className="font-medium">{note.title}</div>
                            <div className="text-muted-foreground">
                              {note.tags.filter(tag => selectedInsight.data.tags.includes(tag)).length} shared tags
                            </div>
                          </div>
                        ))}
                        {getConnectedNotes(selectedInsight.data).length === 0 && (
                          <div className="text-xs text-muted-foreground italic">
                            No connected notes. Add matching tags to create connections.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="p-3 bg-muted/50 rounded">
                      <div className="text-xs font-medium mb-2">Timeline</div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Created: {selectedInsight.data.createdAt.toLocaleDateString()}</div>
                        <div>Updated: {selectedInsight.data.updatedAt.toLocaleDateString()}</div>
                        <div>
                          Age: {Math.ceil((Date.now() - selectedInsight.data.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedInsight.type === 'tag' ? (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Tag Analysis: #{selectedInsight.data}
                  </h4>
                  <div className="space-y-3">
                    {/* Tag Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">{getNotesWithTag(selectedInsight.data).length}</div>
                        <div className="text-xs text-muted-foreground">Notes</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">
                          {getNotesWithTag(selectedInsight.data).reduce((total, note) => 
                            total + note.content.split(/\s+/).filter(Boolean).length, 0
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Words</div>
                      </div>
                    </div>

                    {/* Notes with this tag */}
                    <div>
                      <div className="text-xs font-medium mb-2">Notes with this tag</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {getNotesWithTag(selectedInsight.data).map((note: Note) => (
                          <div 
                            key={note.id} 
                            className="p-2 bg-muted/50 rounded text-xs cursor-pointer hover:bg-accent"
                            onClick={() => handleNodeSelect('note', note)}
                          >
                            <div className="font-medium">{note.title}</div>
                            <div className="text-muted-foreground">
                              {note.content.split(/\s+/).filter(Boolean).length} words
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Related Tags */}
                    <div>
                      <div className="text-xs font-medium mb-2">Often used with</div>
                      <div className="flex flex-wrap gap-1">
                        {getRelatedTags(selectedInsight.data).map(({ tag, count }) => (
                          <Badge 
                            key={tag} 
                            variant="outline" 
                            className="text-xs cursor-pointer hover:bg-accent"
                            onClick={() => handleNodeSelect('tag', tag)}
                            title={`Used together in ${count} note(s)`}
                          >
                            #{tag} ({count})
                          </Badge>
                        ))}
                        {getRelatedTags(selectedInsight.data).length === 0 && (
                          <div className="text-xs text-muted-foreground italic">
                            No related tags found yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tag Usage Timeline */}
                    <div className="p-3 bg-muted/50 rounded">
                      <div className="text-xs font-medium mb-2">Usage Pattern</div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {(() => {
                          const tagNotes = getNotesWithTag(selectedInsight.data);
                          const firstUsed = tagNotes.reduce((earliest, note) => 
                            note.createdAt < earliest ? note.createdAt : earliest, 
                            tagNotes[0]?.createdAt || new Date()
                          );
                          const lastUsed = tagNotes.reduce((latest, note) => 
                            note.updatedAt > latest ? note.updatedAt : latest, 
                            tagNotes[0]?.updatedAt || new Date()
                          );
                          return (
                            <>
                              <div>First used: {firstUsed.toLocaleDateString()}</div>
                              <div>Last used: {lastUsed.toLocaleDateString()}</div>
                              <div>Usage frequency: {(tagNotes.length / notes.length * 100).toFixed(1)}% of notes</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedInsight.type === 'keyword' ? (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    🔤 Keyword Analysis: {selectedInsight.data}
                  </h4>
                  <div className="space-y-3">
                    {/* Keyword Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">{getNotesWithKeyword(selectedInsight.data).length}</div>
                        <div className="text-xs text-muted-foreground">Notes</div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <div className="font-semibold text-sm">
                          {(() => {
                            const keywordNotes = getNotesWithKeyword(selectedInsight.data);
                            let totalOccurrences = 0;
                            keywordNotes.forEach(note => {
                              const content = `${note.title} ${note.content}`.toLowerCase();
                              const keyword = selectedInsight.data.toLowerCase();
                              totalOccurrences += (content.match(new RegExp(keyword, 'g')) || []).length;
                            });
                            return totalOccurrences;
                          })()}
                        </div>
                        <div className="text-xs text-muted-foreground">Occurrences</div>
                      </div>
                    </div>

                    {/* Notes containing this keyword */}
                    <div>
                      <div className="text-xs font-medium mb-2">Notes containing "{selectedInsight.data}"</div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {getNotesWithKeyword(selectedInsight.data).map((note: Note) => {
                          const content = `${note.title} ${note.content}`.toLowerCase();
                          const keyword = selectedInsight.data.toLowerCase();
                          const occurrences = (content.match(new RegExp(keyword, 'g')) || []).length;
                          return (
                            <div 
                              key={note.id} 
                              className="p-2 bg-muted/50 rounded text-xs cursor-pointer hover:bg-accent"
                              onClick={() => handleNodeSelect('note', note)}
                            >
                              <div className="font-medium">{note.title}</div>
                              <div className="text-muted-foreground">
                                {occurrences} occurrence{occurrences !== 1 ? 's' : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Context Analysis */}
                    <div className="p-3 bg-muted/50 rounded">
                      <div className="text-xs font-medium mb-2">Context Preview</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {getNotesWithKeyword(selectedInsight.data).slice(0, 3).map((note: Note) => {
                          const content = note.content.toLowerCase();
                          const keyword = selectedInsight.data.toLowerCase();
                          const index = content.indexOf(keyword);
                          if (index === -1) return null;
                          
                          const start = Math.max(0, index - 50);
                          const end = Math.min(content.length, index + keyword.length + 50);
                          const preview = note.content.slice(start, end);
                          
                          return (
                            <div key={note.id} className="text-xs text-muted-foreground border-l-2 border-accent pl-2">
                              ...{preview}...
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Popular Tags */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Popular Tags
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  {getAllTags().length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {getAllTags().map(tag => {
                        const count = notes.filter(note => note.tags.includes(tag)).length;
                        return (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-accent"
                            title={`Used in ${count} note(s)`}
                          >
                            #{tag} ({count})
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No tags found. Add tags to your notes to see them here.
                    </div>
                  )}
                </div>
              </div>

              {/* Top Keywords */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  🔤 Key Terms
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  {allKeywords.length > 0 ? (
                    <div className="space-y-1">
                      {allKeywords.map((keyword, index) => (
                        <div key={keyword} className="flex items-center justify-between text-xs">
                          <span className="font-mono">{keyword}</span>
                          <Badge variant="outline" className="text-xs px-1">
                            #{index + 1}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      No keywords extracted. Add more content to your notes.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  ⏰ Recent Activity
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {notes
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    .slice(0, 5)
                    .map(note => (
                      <div key={note.id} className="p-2 bg-muted/50 rounded text-xs">
                        <div className="font-medium truncate">{note.title}</div>
                        <div className="text-muted-foreground">
                          Updated {note.updatedAt.toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  {notes.length === 0 && (
                    <div className="text-xs text-muted-foreground italic">
                      No recent activity. Start creating notes!
                    </div>
                  )}
                </div>
              </div>

              {/* Knowledge Graph Insights */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  🧠 Knowledge Insights
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Most Connected Tag</div>
                    <div className="text-muted-foreground">
                      {(() => {
                        const tagCounts = getAllTags().map(tag => ({
                          tag,
                          count: notes.filter(note => note.tags.includes(tag)).length
                        }));
                        const topTag = tagCounts.sort((a, b) => b.count - a.count)[0];
                        return topTag ? `#${topTag.tag} (${topTag.count} notes)` : 'No tags yet';
                      })()}
                    </div>
                  </div>
                  
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Average Note Length</div>
                    <div className="text-muted-foreground">
                      {notes.length > 0 
                        ? Math.round(totalWords / notes.length) + ' words'
                        : '0 words'
                      }
                    </div>
                  </div>

                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Knowledge Density</div>
                    <div className="text-muted-foreground">
                      {notes.length > 0 
                        ? Math.round(getAllTags().length / notes.length * 100) / 100 + ' tags per note'
                        : '0 tags per note'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips & Recommendations */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  💡 Recommendations
                </h4>
                <div className="space-y-2 text-xs">
                  {notes.length === 0 && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <div className="font-medium text-blue-700 dark:text-blue-300">Get Started</div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Create your first note to begin building your knowledge graph!
                      </div>
                    </div>
                  )}
                  
                  {notes.length > 0 && getAllTags().length === 0 && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                      <div className="font-medium text-yellow-700 dark:text-yellow-300">Add Tags</div>
                      <div className="text-yellow-600 dark:text-yellow-400">
                        Add tags to your notes to create connections and improve discoverability.
                      </div>
                    </div>
                  )}
                  
                  {notes.length > 5 && getAllTags().length > 0 && (
                    <div className="p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                      <div className="font-medium text-green-700 dark:text-green-300">Great Progress!</div>
                      <div className="text-green-600 dark:text-green-400">
                        Your knowledge base is growing. Consider creating a mind map to visualize connections.
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-muted-foreground">
                    <div>• Use consistent tags to group related concepts</div>
                    <div>• Connect notes through shared keywords and topics</div>
                    <div>• Review and update your mind map regularly</div>
                    <div>• Export visualizations to share knowledge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};