-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(768),
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