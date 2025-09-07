import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message }: ChatRequest = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
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
    console.log(`Processing chat request from user ${userId}: "${message}"`);

    // Get user's Cohere API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('cohere_api_key')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settingsData?.cohere_api_key) {
      return new Response(JSON.stringify({ 
        error: 'Cohere API key not found. Please add your API key in settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cohereApiKey = settingsData.cohere_api_key;

    // Generate query embedding using Cohere
    const queryEmbeddingResponse = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [message],
        model: 'embed-english-v3.0',
        input_type: 'search_query',
        embedding_types: ['float']
      })
    });

    if (!queryEmbeddingResponse.ok) {
      const errorText = await queryEmbeddingResponse.text();
      console.error('Cohere query embedding error:', errorText);
      throw new Error(`Failed to generate query embedding: ${errorText}`);
    }

    const queryEmbeddingData = await queryEmbeddingResponse.json();
    const queryEmbedding = queryEmbeddingData.embeddings.float[0];
    console.log(`Generated query embedding with ${queryEmbedding.length} dimensions`);

    // Search for similar embeddings in Chroma
    const chromaUrl = Deno.env.get('CHROMA_URL') || 'http://localhost:8000';
    const collectionName = 'notes_embeddings';
    
    console.log('Searching for similar embeddings in Chroma...');
    const chromaSearchResponse = await fetch(`${chromaUrl}/api/v1/collections/${collectionName}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: 8,
        where: { userId: userId }, // Filter by user
        include: ['metadatas', 'documents', 'distances']
      })
    });

    if (!chromaSearchResponse.ok) {
      const errorText = await chromaSearchResponse.text();
      console.error('Chroma search error:', errorText);
      // Continue without context if Chroma search fails
    }

    let context = '';
    let sourceNotes = [];

    try {
      if (chromaSearchResponse.ok) {
        const searchResults = await chromaSearchResponse.json();
        console.log(`Found ${searchResults.documents?.[0]?.length || 0} matching chunks`);

        if (searchResults.documents?.[0]?.length > 0) {
          const documents = searchResults.documents[0];
          const metadatas = searchResults.metadatas[0];
          const distances = searchResults.distances[0];

          // Group by note and calculate relevance
          const noteGroups = new Map();
          documents.forEach((doc, index) => {
            const metadata = metadatas[index];
            const distance = distances[index];
            const similarity = 1 - distance; // Convert distance to similarity

            if (!noteGroups.has(metadata.noteId)) {
              noteGroups.set(metadata.noteId, {
                noteId: metadata.noteId,
                noteTitle: metadata.noteTitle,
                chunks: [],
                avgSimilarity: 0
              });
            }

            noteGroups.get(metadata.noteId).chunks.push({
              content: doc,
              similarity: similarity
            });
          });

          // Sort chunks by similarity and create context
          const sortedNotes = Array.from(noteGroups.values())
            .map(note => {
              // Calculate average similarity
              note.avgSimilarity = note.chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / note.chunks.length;
              // Sort chunks by similarity and take top 3
              note.chunks.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
              return note;
            })
            .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
            .slice(0, 4); // Top 4 notes

          // Create context
          context = sortedNotes.map(note => 
            `Note: "${note.noteTitle}"\nContent: ${note.chunks.map(c => c.content).join('\n...\n')}`
          ).join('\n\n---\n\n');

          // Track source notes
          sourceNotes = sortedNotes.map(note => ({
            id: note.noteId,
            title: note.noteTitle,
            similarity: Math.round(note.avgSimilarity * 100) / 100
          }));

          console.log(`Created context from ${sortedNotes.length} notes, total length: ${context.length} chars`);
        }
      }
    } catch (error) {
      console.error('Error processing search results:', error);
    }

    // Generate response using Cohere
    const prompt = context 
      ? `You are an AI assistant that ONLY answers questions based on the user's provided notes. Your role is to help users find information from their personal note collection.

IMPORTANT RULES:
1. ONLY use information from the provided context below
2. If the context doesn't contain enough information to answer the question, say "No notes available so I can't answer this question."
3. Do not use any external knowledge or make assumptions beyond what's in the context
4. When referencing information, mention which note it comes from by using the note title in quotes
5. Keep responses concise and helpful
6. If you find relevant information but it's incomplete, acknowledge what you found and mention what's missing

Context from your notes (ordered by relevance):
${context}

User question: ${message}

Please provide a helpful answer based only on the information in your notes above. When referencing specific information, mention which note it comes from.`
      : `No notes available so I can't answer this question.

💡 Dev tip: Add some notes related to "${message}" to build your personal knowledge base. The more context you provide, the better I can assist you with code snippets, project documentation, or technical concepts!`;

    console.log('Context available:', !!context);
    console.log('Source notes count:', sourceNotes.length);
    console.log('Sending request to Cohere...');

    const cohereResponse = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cohereApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-r',
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.3,
        stop_sequences: []
      })
    });

    if (!cohereResponse.ok) {
      const errorText = await cohereResponse.text();
      console.error('Cohere generation error:', errorText);
      throw new Error(`Failed to generate response: ${errorText}`);
    }

    const cohereData = await cohereResponse.json();
    const response = cohereData.generations[0].text.trim();
    
    console.log(`Generated response: ${response.length} characters`);
    console.log(`Returning ${sourceNotes.length} source notes`);

    return new Response(JSON.stringify({ 
      response,
      sourceNotes: sourceNotes.slice(0, 4),
      debug: {
        hasContext: !!context,
        contextLength: context.length,
        totalNotes: sourceNotes.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cohere-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});