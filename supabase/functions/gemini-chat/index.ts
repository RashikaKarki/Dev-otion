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

interface EmbeddingMatch {
  content_chunk: string;
  note_id: string;
  similarity: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Get user's Gemini API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settingsData?.gemini_api_key) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API key not found. Please add your API key in settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = settingsData.gemini_api_key;

    // Generate embedding for the user's message
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [{ text: message }]
          }
        })
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error(`Embedding API error: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;

    // Search for similar embeddings using vector similarity
    const { data: matches, error: searchError } = await supabase.rpc(
      'match_embeddings',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
        user_id: userId
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // Get relevant notes content
    let context = '';
    let sourceNotes: Array<{id: string, title: string, similarity: number}> = [];

    if (matches && matches.length > 0) {
      const noteIds = [...new Set(matches.map((match: any) => match.note_id))];
      
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('id, title, content')
        .in('id', noteIds)
        .eq('user_id', userId);

      if (!notesError && notesData) {
        // Create context and track note relevance
        const noteContexts = notesData.map(note => {
          const noteMatches = matches.filter((match: any) => match.note_id === note.id);
          const avgSimilarity = noteMatches.reduce((sum: number, match: any) => sum + match.similarity, 0) / noteMatches.length;
          
          return {
            note,
            similarity: avgSimilarity,
            contextText: `Note: "${note.title}"\n${note.content}`
          };
        });

        // Sort by relevance and create context
        noteContexts.sort((a, b) => b.similarity - a.similarity);
        context = noteContexts.map(nc => nc.contextText).join('\n\n');
        
        // Track source notes with similarity scores
        sourceNotes = noteContexts.map(nc => ({
          id: nc.note.id,
          title: nc.note.title,
          similarity: nc.similarity
        }));
      }
    }

    // Generate response using Gemini
    const prompt = context 
      ? `You are an AI assistant that ONLY answers questions based on the user's provided notes. Your role is to help users find information from their personal note collection.

IMPORTANT RULES:
1. ONLY use information from the provided context below
2. If the context doesn't contain enough information to answer the question, say "I don't have enough information in your notes to answer this question"
3. Do not use any external knowledge or make assumptions beyond what's in the context
4. When referencing information, mention which note it comes from by using the note title in quotes
5. Keep responses concise and helpful

Context from your notes (ordered by relevance):
${context}

User question: ${message}

Please provide a helpful answer based only on the information in your notes above. When referencing specific information, mention which note it comes from.`
      : `I don't have any relevant information in your notes to answer the question: "${message}"

To get better answers, please add some notes related to this topic so I can help you find information from your personal knowledge base.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const response = geminiData.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ 
      response,
      sourceNotes: sourceNotes.slice(0, 4).map(note => ({ id: note.id, title: note.title })) // Return top 4 most relevant notes
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});