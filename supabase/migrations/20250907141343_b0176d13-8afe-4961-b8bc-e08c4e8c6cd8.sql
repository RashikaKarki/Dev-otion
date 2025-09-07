-- Create user_settings table for storing encrypted API keys and other user preferences
CREATE TABLE public.user_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gemini_api_key TEXT, -- Will be encrypted before storage
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" 
ON public.user_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notes_embeddings table for vector storage
CREATE TABLE public.notes_embeddings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding VECTOR(768), -- Gemini embeddings are 768 dimensions
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