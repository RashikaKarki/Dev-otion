import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevWorkspace } from '@/components/DevWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <BookOpen className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Dev-otion</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Welcome to your developer workspace</h2>
          <p className="text-muted-foreground max-w-md">
            Organize your notes, manage tasks, and visualize your thoughts with mind maps.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return <DevWorkspace />;
};

export default Index;
