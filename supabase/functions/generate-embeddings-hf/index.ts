import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  noteId: string;
  content: string;
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, content, title }: EmbeddingRequest = await req.json();
    
    if (!noteId || !content) {
      throw new Error('noteId and content are required');
    }

    // Create Supabase client with auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    const userId = user.id;
    console.log(`Starting embedding generation for note ${noteId}, user ${userId}`);

    // Verify the note belongs to the authenticated user
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('user_id, title, content')
      .eq('id', noteId)
      .single();

    if (noteError || !noteData || noteData.user_id !== userId) {
      console.error('Note verification failed:', noteError || 'Access denied');
      throw new Error('Note not found or access denied');
    }

    console.log(`Note verified: "${noteData.title}" (${noteData.content.length} chars)`);

    // Delete existing embeddings for this note
    const { error: deleteError } = await supabase
      .from('notes_embeddings')
      .delete()
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing embeddings:', deleteError);
    } else {
      console.log('Existing embeddings deleted successfully');
    }

    // Combine title and content for better context
    const fullContent = `${noteData.title}\n\n${noteData.content}`;
    console.log(`Full content length: ${fullContent.length} characters`);
    
    // Split content into overlapping chunks
    const chunks = [];
    const chunkSize = 800;
    const overlap = 200;
    
    for (let i = 0; i < fullContent.length; i += (chunkSize - overlap)) {
      const chunk = fullContent.slice(i, i + chunkSize);
      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim());
      }
    }

    console.log(`Created ${chunks.length} chunks for processing`);

    // Generate embeddings using HuggingFace Transformers (FREE!)
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        // Using HuggingFace's free sentence-transformers API
        const embeddingResponse = await fetch(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // HuggingFace Inference API is free! No API key needed for public models
            },
            body: JSON.stringify({
              inputs: chunk,
              options: { wait_for_model: true }
            })
          }
        );

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`HuggingFace API error for chunk ${i}:`, embeddingResponse.status, errorText);
          
          // If rate limited, wait and retry once
          if (embeddingResponse.status === 429) {
            console.log('Rate limited, waiting 2 seconds and retrying...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Will retry this chunk in next iteration
          }
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        
        // HuggingFace returns the embedding directly as an array
        let embedding;
        if (Array.isArray(embeddingData)) {
          embedding = embeddingData;
        } else if (embeddingData.embeddings) {
          embedding = embeddingData.embeddings;
        } else {
          console.error(`Unexpected embedding format for chunk ${i}:`, embeddingData);
          continue;
        }

        console.log(`Generated embedding for chunk ${i}: ${embedding.length} dimensions`);

        embeddings.push({
          note_id: noteId,
          user_id: userId,
          content_chunk: chunk,
          embedding: `[${embedding.join(',')}]`, // Store as string array format
          chunk_index: i
        });

        console.log(`Successfully processed chunk ${i + 1}`);

        // Add delay to avoid rate limiting on free tier
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
      }
    }

    console.log(`Generated ${embeddings.length} embeddings out of ${chunks.length} chunks`);

    // Insert embeddings into Supabase database (FREE!)
    if (embeddings.length > 0) {
      console.log(`Inserting ${embeddings.length} embeddings into database`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('notes_embeddings')
        .insert(embeddings)
        .select('id');

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log(`Successfully inserted ${insertData?.length || 0} embeddings`);
    } else {
      console.warn('No embeddings were generated!');
    }

    return new Response(JSON.stringify({ 
      success: true,
      chunksProcessed: embeddings.length,
      totalChunks: chunks.length,
      noteTitle: noteData.title,
      noteId: noteId,
      model: 'sentence-transformers/all-MiniLM-L6-v2 (FREE)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-embeddings-hf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});