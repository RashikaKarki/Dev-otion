import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Settings() {
  const [cohereApiKey, setCohereApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('cohere_api_key')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.cohere_api_key) {
        setCohereApiKey(data.cohere_api_key);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          cohere_api_key: cohereApiKey,
        });

      if (error) throw error;

      toast({
        title: "Settings saved!",
        description: "Your Cohere API key has been securely stored.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Integration</CardTitle>
          </div>
          <CardDescription>
            Configure your AI settings to enable the RAG chatbot feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              Currently using Cohere for embeddings and text generation. Get your API key from the Cohere dashboard.
            </AlertDescription>
          </Alert>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cohere-api-key">Cohere API Key</Label>
                <div className="relative">
                  <Input
                    id="cohere-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter your Cohere API key"
                    value={cohereApiKey}
                    onChange={(e) => setCohereApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely. It's only used for AI features.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-2">How to get your Cohere API key:</h3>
              <ol className="text-xs text-muted-foreground space-y-1">
                <li>1. Visit Cohere Dashboard (dashboard.cohere.ai)</li>
                <li>2. Sign up or sign in to your account</li>
                <li>3. Go to API Keys section</li>
                <li>4. Create a new API key and copy it</li>
                <li>5. Paste the key above and save</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}