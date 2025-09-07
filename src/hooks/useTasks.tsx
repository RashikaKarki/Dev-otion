import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  linked_note_id?: string;
  created_at: string;
  user_id: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (error: any) {
      toast({
        title: "Error fetching tasks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (task: Partial<Task>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: task.title!,
          completed: task.completed || false,
          priority: task.priority || 'medium',
          linked_note_id: task.linked_note_id || null,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => [data as Task, ...prev]);
      toast({
        title: "Task created",
        description: task.title,
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? data as Task : task
      ));
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast({
        title: "Task deleted",
        description: "The task has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await updateTask(taskId, { completed: !task.completed });
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    refetch: fetchTasks
  };
}