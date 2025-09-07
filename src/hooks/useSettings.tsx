import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserSettings {
  cohere_api_key?: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadSettings();
  }, [user]);

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

      setSettings(data || {});
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  const hasCohereApiKey = () => {
    return settings?.cohere_api_key && settings.cohere_api_key.length > 0;
  };

  return {
    settings,
    loading,
    hasCohereApiKey,
    refetch: loadSettings
  };
}