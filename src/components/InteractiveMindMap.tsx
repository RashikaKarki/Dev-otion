import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
// Removed HuggingFace transformers import - using local algorithms instead
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface MindMapNode {
  id: string;
  title: string;
  type: 'note' | 'keyword' | 'tag';
  content?: string;
  importance: number;
  connections: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface MindMapLink {
  source: string;
  target: string;
  strength: number;
  type: 'semantic' | 'tag' | 'keyword';
}

interface InteractiveMindMapProps {
  notes: Note[];
  activeNote: Note | null;
  onNoteSelect?: (noteId: string) => void;
  onTagSelect?: (tag: string) => void;
  onKeywordSelect?: (keyword: string) => void;
}

export const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({
  notes,
  activeNote,
  onNoteSelect,
  onTagSelect,
  onKeywordSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [links, setLinks] = useState<MindMapLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const { toast } = useToast();

  // Extract keywords using TF-IDF approach
  const extractKeywords = (content: string, allContent: string[]): string[] => {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'this', 'that', 'these', 'those', 'they', 'them', 'their', 'there',
      'where', 'when', 'what', 'who', 'why', 'how', 'can', 'may', 'might',
      'must', 'shall', 'should', 'will', 'would', 'could', 'from', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
    ]);

    const filteredWords = words.filter(word => !stopWords.has(word));
    
    // Calculate TF-IDF
    const termFreq: Record<string, number> = {};
    filteredWords.forEach(word => {
      termFreq[word] = (termFreq[word] || 0) + 1;
    });

    const docFreq: Record<string, number> = {};
    Object.keys(termFreq).forEach(term => {
      docFreq[term] = allContent.filter(doc => 
        doc.toLowerCase().includes(term)
      ).length;
    });

    const tfidf = Object.entries(termFreq).map(([term, freq]) => ({
      term,
      score: (freq / filteredWords.length) * Math.log(allContent.length / (docFreq[term] || 1))
    }));

    return tfidf
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.term);
  };

  // Calculate semantic similarity using local text analysis
  const calculateSemanticSimilarity = async (text1: string, text2: string): Promise<number> => {
    try {
      // Simple but effective local similarity calculation
      const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      
      // Calculate Jaccard similarity (intersection over union)
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      const jaccardSimilarity = intersection.size / union.size;
      
      // Also consider text length similarity
      const lengthSimilarity = 1 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length);
      
      // Combine both similarities
      return (jaccardSimilarity * 0.7 + lengthSimilarity * 0.3);
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  };

  const generateMindMap = async () => {
    if (notes.length === 0) return;
    
    setIsGenerating(true);
    try {
      const allContent = notes.map(note => `${note.title} ${note.content}`);
      const newNodes: MindMapNode[] = [];
      const newLinks: MindMapLink[] = [];

      // Create note nodes
      notes.forEach(note => {
        const keywords = extractKeywords(`${note.title} ${note.content}`, allContent);
        newNodes.push({
          id: note.id,
          title: note.title,
          type: 'note',
          content: note.content,
          importance: Math.log(note.content.length + 1),
          connections: keywords,
        });

        // Create keyword nodes
        keywords.forEach(keyword => {
          const keywordId = `keyword_${keyword}`;
          if (!newNodes.find(n => n.id === keywordId)) {
            newNodes.push({
              id: keywordId,
              title: keyword,
              type: 'keyword',
              importance: 0.5,
              connections: [],
            });
          }
          
          // Link note to keyword
          newLinks.push({
            source: note.id,
            target: keywordId,
            strength: 0.6,
            type: 'keyword'
          });
        });
      });

      // Create tag nodes and connections
      const allTags = [...new Set(notes.flatMap(note => note.tags))];
      allTags.forEach(tag => {
        const tagId = `tag_${tag}`;
        newNodes.push({
          id: tagId,
          title: `#${tag}`,
          type: 'tag',
          importance: 0.7,
          connections: [],
        });

        // Link notes to tags
        notes.forEach(note => {
          if (note.tags.includes(tag)) {
            newLinks.push({
              source: note.id,
              target: tagId,
              strength: 0.8,
              type: 'tag'
            });
          }
        });
      });

      // Calculate semantic connections between notes (limit to avoid performance issues)
      const noteNodes = newNodes.filter(n => n.type === 'note').slice(0, 10);
      for (let i = 0; i < noteNodes.length; i++) {
        for (let j = i + 1; j < noteNodes.length; j++) {
          const note1 = notes.find(n => n.id === noteNodes[i].id)!;
          const note2 = notes.find(n => n.id === noteNodes[j].id)!;
          
          const similarity = await calculateSemanticSimilarity(
            `${note1.title} ${note1.content}`,
            `${note2.title} ${note2.content}`
          );

          if (similarity > 0.3) { // Only create links for meaningful similarities
            newLinks.push({
              source: noteNodes[i].id,
              target: noteNodes[j].id,
              strength: similarity,
              type: 'semantic'
            });
          }
        }
      }

      setNodes(newNodes);
      setLinks(newLinks);
      
      toast({
        title: "Mind map generated!",
        description: `Created ${newNodes.length} nodes with ${newLinks.length} connections`,
      });
    } catch (error) {
      console.error('Error generating mind map:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate mind map. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Render D3 visualization
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const g = svg.append("g");

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d) => {
        switch (d.type) {
          case 'semantic': return 'hsl(var(--primary))';
          case 'tag': return 'hsl(var(--success))';
          case 'keyword': return 'hsl(var(--warning))';
          default: return 'hsl(var(--muted-foreground))';
        }
      })
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", (d) => Math.sqrt(d.strength * 6));

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", (d) => {
        switch (d.type) {
          case 'note': return 12 + d.importance * 3;
          case 'tag': return 8;
          case 'keyword': return 6;
          default: return 5;
        }
      })
      .attr("fill", (d) => {
        if (activeNote && d.id === activeNote.id) return 'hsl(var(--destructive))';
        switch (d.type) {
          case 'note': return 'hsl(var(--primary))';
          case 'tag': return 'hsl(var(--success))';
          case 'keyword': return 'hsl(var(--warning))';
          default: return 'hsl(var(--muted-foreground))';
        }
      })
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .call(d3.drag<SVGCircleElement, MindMapNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add labels
    const labels = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text((d) => d.title.length > 15 ? d.title.substring(0, 15) + '...' : d.title)
      .attr("font-size", (d) => {
        switch (d.type) {
          case 'note': return '12px';
          case 'tag': return '10px';
          case 'keyword': return '9px';
          default: return '9px';
        }
      })
      .attr("dx", 15)
      .attr("dy", 4)
      .style("font-weight", (d) => d.type === 'note' ? 'bold' : 'normal')
      .style("fill", "hsl(var(--foreground))")
      .style("text-shadow", "0 0 3px hsl(var(--background)), 0 0 6px hsl(var(--background))")
      .style("pointer-events", "none");

    // Add click handlers
    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      
      if (d.type === 'note' && onNoteSelect) {
        onNoteSelect(d.id);
      } else if (d.type === 'tag' && onTagSelect) {
        const tagName = d.title.replace('#', '');
        onTagSelect(tagName);
      } else if (d.type === 'keyword' && onKeywordSelect) {
        onKeywordSelect(d.title);
      }
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d) => d.x!)
        .attr("cy", (d) => d.y!);

      labels
        .attr("x", (d) => d.x!)
        .attr("y", (d) => d.y!);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, links, activeNote, onNoteSelect]);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={generateMindMap}
              disabled={isGenerating || notes.length === 0}
              className="bg-primary hover:bg-primary/90"
              size="sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Mind Map'}
            </Button>
            
            <Button
              onClick={() => {
                setNodes([]);
                setLinks([]);
                setSelectedNode(null);
              }}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {selectedNode && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Selected: {selectedNode.title}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {selectedNode.type}
              </Badge>
            </div>
          )}
        </div>

        {nodes.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {nodes.filter(n => n.type === 'note').length} notes • 
            {nodes.filter(n => n.type === 'tag').length} tags • 
            {nodes.filter(n => n.type === 'keyword').length} keywords • 
            {links.length} connections
          </div>
        )}
      </div>

      {/* Mind Map Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        {notes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold mb-2">No notes to visualize</h3>
              <p className="text-sm">Create some notes to generate an interactive mind map</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2">Ready to generate</h3>
              <p className="text-sm mb-4">Click "Generate Mind Map" to create your visualization</p>
              <Button onClick={generateMindMap} className="bg-primary hover:bg-primary/90">
                <Zap className="h-4 w-4 mr-2" />
                Generate Mind Map
              </Button>
            </div>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Legend */}
        {nodes.length > 0 && (
          <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs">
            <div className="font-medium mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
                <span>Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
                <span>Tags</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--warning))' }}></div>
                <span>Keywords</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
                <span>Active</span>
              </div>
            </div>
            <div className="mt-2 text-muted-foreground">
              Drag nodes • Click to select • Scroll to zoom
            </div>
          </div>
        )}
      </div>
    </div>
  );
};