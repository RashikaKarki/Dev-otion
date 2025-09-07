import React, { useState, useMemo } from 'react';
import { useNotes, Note as BaseNote } from '@/hooks/useNotes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  Hash,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 12;

interface NoteWithSearch extends BaseNote {
  searchScore?: number;
}

interface NotesListViewProps {
  onNoteSelect: (note: BaseNote) => void;
  onNewNote: () => void;
}

export function NotesListView({ onNoteSelect, onNewNote }: NotesListViewProps) {
  const { notes, deleteNote } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'relevance'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [notes]);

  // Smart search with priority scoring
  const searchResults = useMemo((): NoteWithSearch[] => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase().trim();
    
    return notes.map(note => {
      let score = 0;
      
      // Title matches (highest priority)
      const titleMatch = note.title.toLowerCase().includes(query);
      if (titleMatch) score += 10;
      
      // Exact title match (even higher)
      if (note.title.toLowerCase() === query) score += 20;
      
      // Tag matches (high priority)
      const tagMatches = note.tags.filter(tag => tag.toLowerCase().includes(query));
      score += tagMatches.length * 5;
      
      // Exact tag match
      const exactTagMatch = note.tags.some(tag => tag.toLowerCase() === query);
      if (exactTagMatch) score += 10;
      
      // Content matches (lower priority but still relevant)
      const contentWords = note.content.toLowerCase().split(/\s+/);
      const queryWords = query.split(/\s+/);
      
      queryWords.forEach(queryWord => {
        contentWords.forEach(word => {
          if (word.includes(queryWord)) {
            score += word === queryWord ? 3 : 1; // Exact word match vs partial
          }
        });
      });
      
      // Boost recent notes slightly
      const daysSinceUpdate = (Date.now() - new Date(note.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) score += 1;
      
      return { ...note, searchScore: score };
    }).filter(note => note.searchScore > 0);
  }, [notes, searchQuery]);

  // Filter by tag
  const filteredResults = useMemo(() => {
    if (filterTag === 'all') return searchResults;
    return searchResults.filter(note => note.tags.includes(filterTag));
  }, [searchResults, filterTag]);

  // Sort results
  const sortedResults = useMemo(() => {
    const results = [...filteredResults];
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = (b.searchScore || 0) - (a.searchScore || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated':
        default:
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return results;
  }, [filteredResults, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / ITEMS_PER_PAGE);
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (!content) return 'No content';
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  };

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold gradient-text">Notes</h1>
              <Badge variant="secondary" className="ml-2">
                {notes.length}
              </Badge>
            </div>
            <Button onClick={onNewNote} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, content, or tags..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
                if (e.target.value.trim()) {
                  setSortBy('relevance');
                }
              }}
              className="pl-10 text-base h-12"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center space-x-2">
                        <Hash className="h-3 w-3" />
                        <span>{tag}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {searchQuery.trim() && (
                    <SelectItem value="relevance">Relevance</SelectItem>
                  )}
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 text-sm text-muted-foreground">
          {searchQuery.trim() ? (
            <>Showing {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} for "{searchQuery}"</>
          ) : (
            <>Showing {sortedResults.length} note{sortedResults.length !== 1 ? 's' : ''}</>
          )}
          {filterTag !== 'all' && (
            <> filtered by <Badge variant="outline" className="mx-1 text-xs">{filterTag}</Badge></>
          )}
        </div>

        {/* Notes Grid */}
        {paginatedResults.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery.trim() ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery.trim() 
                ? 'Try adjusting your search terms or filters'
                : 'Create your first note to get started'
              }
            </p>
            <Button onClick={onNewNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {paginatedResults.map((note) => (
              <Card 
                key={note.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-border/50 hover:border-primary/20 group"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <h3 
                      className="font-semibold text-base line-clamp-1 flex-1 cursor-pointer"
                      onClick={() => onNoteSelect(note)}
                    >
                      {note.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {searchQuery.trim() && note.searchScore && note.searchScore > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {note.searchScore > 20 ? 'Exact' : note.searchScore > 10 ? 'High' : 'Match'}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onNoteSelect(note)}>
                            View Note
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Note
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{note.title || 'Untitled Note'}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteNote(note.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Note
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div 
                    className="flex items-center text-xs text-muted-foreground space-x-4 cursor-pointer"
                    onClick={() => onNoteSelect(note)}
                  >
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(note.updated_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Created {formatDate(note.created_at)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent 
                  className="pt-0 cursor-pointer"
                  onClick={() => onNoteSelect(note)}
                >
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3 min-h-[3.6rem]">
                    {getContentPreview(note.content)}
                  </p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className={cn(
                            "text-xs px-2 py-0",
                            filterTag === tag && "bg-primary/10 border-primary"
                          )}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}