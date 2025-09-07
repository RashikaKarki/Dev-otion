-- Remove vector-related tables and functions since we're moving to Chroma
DROP TABLE IF EXISTS public.notes_embeddings CASCADE;
DROP FUNCTION IF EXISTS public.match_embeddings CASCADE;

-- Update user_settings to use Cohere instead of Gemini
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS gemini_api_key;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS cohere_api_key TEXT;

-- Remove the pgvector extension since we won't need it
DROP EXTENSION IF EXISTS vector;