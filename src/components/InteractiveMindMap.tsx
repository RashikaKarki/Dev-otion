import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { pipeline } from '@huggingface/transformers';
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
}

export const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({
  notes,
  activeNote,
  onNoteSelect
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

  // Calculate semantic similarity using cosine similarity
  const calculateSemanticSimilarity = async (text1: string, text2: string): Promise<number> => {
    try {
      // Use a lightweight embedding model that runs in browser
      const extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { device: 'webgpu' }
      );

      const [embedding1, embedding2] = await Promise.all([
        extractor(text1.slice(0, 500), { pooling: 'mean', normalize: true }),
        extractor(text2.slice(0, 500), { pooling: 'mean', normalize: true })
      ]);

      // Calculate cosine similarity
      const vec1 = Array.from(embedding1.data as Float32Array);
      const vec2 = Array.from(embedding2.data as Float32Array);
      
      const dotProduct = vec1.reduce((sum: number, a: number, i: number) => sum + a * vec2[i], 0);
      const magnitude1 = Math.sqrt(vec1.reduce((sum: number, a: number) => sum + a * a, 0));
      const magnitude2 = Math.sqrt(vec2.reduce((sum: number, a: number) => sum + a * a, 0));
      
      return dotProduct / (magnitude1 * magnitude2);
    } catch (error) {
      console.warn('Semantic similarity calculation failed, using keyword overlap:', error);
      // Fallback to keyword overlap
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      return intersection.size / Math.max(words1.size, words2.size);
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
          case 'semantic': return '#8b5cf6';
          case 'tag': return '#10b981';
          case 'keyword': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.strength * 5));

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
        if (activeNote && d.id === activeNote.id) return '#ef4444';
        switch (d.type) {
          case 'note': return '#3b82f6';
          case 'tag': return '#10b981';
          case 'keyword': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
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
      .style("fill", (d) => d.type === 'note' ? '#1f2937' : '#6b7280')
      .style("pointer-events", "none");

    // Add click handlers
    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      if (d.type === 'note' && onNoteSelect) {
        onNoteSelect(d.id);
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
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Tags</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Keywords</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
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