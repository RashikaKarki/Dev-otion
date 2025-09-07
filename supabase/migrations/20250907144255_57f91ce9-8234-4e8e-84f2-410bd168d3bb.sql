-- Restore pgvector extension and tables for free vector storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Restore notes_embeddings table with smaller dimensions for HuggingFace models
CREATE TABLE public.notes_embeddings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding VECTOR(384), -- HuggingFace sentence-transformers dimension
    chunk_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notes_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies for embeddings access
CREATE POLICY "Users can view their own embeddings" 
ON public.notes_embeddings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own embeddings" 
ON public.notes_embeddings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embeddings" 
ON public.notes_embeddings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own embeddings" 
ON public.notes_embeddings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notes_embeddings_updated_at
BEFORE UPDATE ON public.notes_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better vector similarity search performance
CREATE INDEX notes_embeddings_user_id_idx ON public.notes_embeddings(user_id);
CREATE INDEX notes_embeddings_note_id_idx ON public.notes_embeddings(note_id);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  note_id uuid,
  content_chunk text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes_embeddings.note_id,
    notes_embeddings.content_chunk,
    1 - (notes_embeddings.embedding <=> query_embedding) AS similarity
  FROM notes_embeddings
  WHERE notes_embeddings.user_id = match_embeddings.user_id
    AND 1 - (notes_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY notes_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update user_settings back to gemini
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS cohere_api_key;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;