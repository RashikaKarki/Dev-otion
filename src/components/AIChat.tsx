import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Sparkles, Settings, ExternalLink, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  sourceNotes?: Array<{id: string, title: string}>;
}

interface AIChatProps {
  onSelectNote?: (noteId: string) => void;
}

export function AIChat({ onSelectNote }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { settings, hasGeminiApiKey } = useSettings();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat-hf', {
        body: {
          message: userMessage.content
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
        sourceNotes: data.sourceNotes || []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I encountered an error. Please try again or check your settings.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!hasGeminiApiKey()) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Chat Assistant</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>To use the AI chat feature, please add your Gemini API key in settings.</p>
              <p className="text-xs text-muted-foreground">✨ Embeddings are FREE via HuggingFace!</p>
              <Link to="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Settings
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Chat Assistant</CardTitle>
          </div>
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1 pr-4 max-h-[calc(100vh-200px)]">
          <div className="space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Ask me anything about your notes!</p>
                <p className="text-sm mt-1">I'll search through your content to help answer your questions.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.isUser ? (
                      <User className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Bot className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      
                      {message.sourceNotes && message.sourceNotes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-xs opacity-75 mb-2 font-medium">
                            📚 Referenced from {message.sourceNotes.length} note{message.sourceNotes.length !== 1 ? 's' : ''}:
                          </p>
                          <div className="grid gap-1">
                            {message.sourceNotes.map((note, index) => (
                              <Button
                                key={note.id}
                                variant="ghost"
                                size="sm"
                                className="h-auto p-2 text-xs justify-start w-full hover:bg-accent/50 transition-colors"
                                onClick={() => onSelectNote?.(note.id)}
                              >
                                <div className="flex items-center space-x-2 w-full">
                                  <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
                                  <span className="truncate font-medium">{note.title}</span>
                                  <span className="text-xs opacity-50 ml-auto">#{index + 1}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                          <p className="text-xs opacity-50 mt-2">
                            💡 Click any note to view the full content
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg p-4 max-w-[85%]">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 flex-shrink-0" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="border-t border-border pt-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your notes..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}