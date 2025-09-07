import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { EnhancedNoteEditor } from '@/components/EnhancedNoteEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notes, updateNote } = useNotes();
  const { toggleTask } = useTasks();
  const [currentNote, setCurrentNote] = useState<any>(null);

  useEffect(() => {
    if (id && notes.length > 0) {
      const note = notes.find(n => n.id === id);
      if (note) {
        setCurrentNote({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          createdAt: new Date(note.created_at),
          updatedAt: new Date(note.updated_at)
        });
      } else {
        navigate('/notes');
      }
    }
  }, [id, notes, navigate]);

  const handleNoteUpdate = async (updatedNote: any) => {
    const supabaseNote = await updateNote(updatedNote.id, {
      title: updatedNote.title,
      content: updatedNote.content,
      tags: updatedNote.tags
    });
    
    if (supabaseNote) {
      setCurrentNote({
        id: supabaseNote.id,
        title: supabaseNote.title,
        content: supabaseNote.content,
        tags: supabaseNote.tags,
        createdAt: new Date(supabaseNote.created_at),
        updatedAt: new Date(supabaseNote.updated_at)
      });
    }
  };

  if (!currentNote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-medium mb-2">Loading note...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/notes')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">
                  {currentNote.title || 'Untitled Note'}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <EnhancedNoteEditor
          note={currentNote}
          onNoteUpdate={handleNoteUpdate}
          onToggleTask={toggleTask}
          linkedTasks={[]}
        />
      </div>
    </div>
  );
}