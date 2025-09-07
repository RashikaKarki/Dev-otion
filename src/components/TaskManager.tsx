import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Calendar,
  CheckCircle2,
  Circle,
  Filter,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Edit2,
  Save,
  X,
  ExternalLink,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  linkedNoteId?: string;
}

interface TaskManagerProps {
  tasks: Task[];
  onCreateTask: (title: string, priority: 'low' | 'medium' | 'high') => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onTaskClick?: (noteId: string) => void;
  onReorderTasks?: (tasks: Task[]) => void;
}

interface SortableTaskItemProps {
  task: Task;
  isEditing: boolean;
  editTitle: string;
  onEditTask: (task: Task) => void;
  onSaveEdit: (taskId: string) => void;
  onCancelEdit: () => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick?: (noteId: string) => void;
  onEditTitleChange: (value: string) => void;
  getPriorityIcon: (priority: string) => JSX.Element | null;
  getPriorityColor: (priority: string) => string;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  isEditing,
  editTitle,
  onEditTask,
  onSaveEdit,
  onCancelEdit,
  onToggleTask,
  onDeleteTask,
  onTaskClick,
  onEditTitleChange,
  getPriorityIcon,
  getPriorityColor,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-4 rounded-lg border transition-smooth hover:shadow-md",
        task.completed 
          ? "bg-muted/30 border-muted" 
          : "bg-card border-border hover:border-primary/50",
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleTask(task.id)}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getPriorityIcon(task.priority)}
            <Badge variant={getPriorityColor(task.priority) as any} className="text-xs">
              {task.priority}
            </Badge>
            {task.linkedNoteId && (
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent" onClick={() => onTaskClick && onTaskClick(task.linkedNoteId)}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Note
              </Badge>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit(task.id);
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 h-8"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSaveEdit(task.id)}
                className="h-8 w-8 p-0"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h3 
              className={cn(
                "font-medium cursor-pointer",
                task.completed && "line-through text-muted-foreground",
                task.linkedNoteId && "hover:text-primary"
              )}
              onClick={() => {
                if (task.linkedNoteId && onTaskClick) {
                  onTaskClick(task.linkedNoteId);
                }
              }}
            >
              {task.title}
            </h3>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              Created {task.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-fast">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onEditTask(task)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onDeleteTask(task.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  onCreateTask,
  onToggleTask,
  onDeleteTask,
  onUpdateTask,
  onTaskClick,
  onReorderTasks
}) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateTask = () => {
    if (newTaskTitle.trim()) {
      onCreateTask(newTaskTitle.trim(), newTaskPriority);
      setNewTaskTitle('');
      setNewTaskPriority('medium');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
  };

  const handleSaveEdit = (taskId: string) => {
    if (editTitle.trim()) {
      onUpdateTask(taskId, { title: editTitle.trim() });
    }
    setEditingTask(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditTitle('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = filteredTasks.findIndex((task) => task.id === active.id);
    const newIndex = filteredTasks.findIndex((task) => task.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Simply reorder the current filtered tasks
    const reorderedFilteredTasks = arrayMove(filteredTasks, oldIndex, newIndex);
    
    if (onReorderTasks) {
      // Create a complete new task array with the reordered filtered tasks
      const updatedTasks = [...tasks];
      
      // Remove all filtered tasks from their current positions
      const filteredTaskIds = new Set(filteredTasks.map(t => t.id));
      const nonFilteredTasks = updatedTasks.filter(task => !filteredTaskIds.has(task.id));
      
      // Find where to insert the reordered tasks (maintain original position of first filtered task)
      const firstFilteredTaskIndex = updatedTasks.findIndex(task => filteredTaskIds.has(task.id));
      const insertIndex = firstFilteredTaskIndex >= 0 ? firstFilteredTaskIndex : nonFilteredTasks.length;
      
      // Create final array: non-filtered tasks + reordered filtered tasks
      const finalTasks = [
        ...nonFilteredTasks.slice(0, insertIndex),
        ...reorderedFilteredTasks,
        ...nonFilteredTasks.slice(insertIndex)
      ];
      
      onReorderTasks(finalTasks);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filter === 'all' || 
      (filter === 'pending' && !task.completed) ||
      (filter === 'completed' && task.completed);
    
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return statusMatch && priorityMatch;
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ArrowUp className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <ArrowRight className="h-4 w-4 text-warning" />;
      case 'low':
        return <ArrowDown className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const completedCount = tasks.filter(task => task.completed).length;
  const pendingCount = tasks.filter(task => !task.completed).length;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border p-6 bg-card/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text mb-2">Task Manager</h1>
            <p className="text-muted-foreground">
              {pendingCount} pending • {completedCount} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Circle className="h-3 w-3 mr-1" />
              {pendingCount} pending
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {completedCount} done
            </Badge>
          </div>
        </div>

        {/* New Task Input */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="Add a new task... (Press Enter)"
              className="flex-1"
            />
            <Select value={newTaskPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTaskPriority(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
          
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Task List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-sm">
                {filter === 'all' 
                  ? "Create your first task to get started"
                  : `No ${filter} tasks to show`
                }
              </p>
            </div>
          ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredTasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    isEditing={editingTask === task.id}
                    editTitle={editTitle}
                    onEditTask={handleEditTask}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onTaskClick={onTaskClick}
                    onEditTitleChange={setEditTitle}
                    getPriorityIcon={getPriorityIcon}
                    getPriorityColor={getPriorityColor}
                  />
                ))}
              </div>
            </SortableContext>
            </DndContext>
          )}
        </ScrollArea>
      </div>

      {/* Footer Stats */}
      <footer className="border-t border-border p-4 bg-card/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-destructive">{tasks.filter(t => t.priority === 'high' && !t.completed).length}</div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
          <div>
            <div className="text-lg font-bold text-warning">{tasks.filter(t => t.priority === 'medium' && !t.completed).length}</div>
            <div className="text-xs text-muted-foreground">Medium Priority</div>
          </div>
          <div>
            <div className="text-lg font-bold text-success">{tasks.filter(t => t.priority === 'low' && !t.completed).length}</div>
            <div className="text-xs text-muted-foreground">Low Priority</div>
          </div>
        </div>
      </footer>
    </div>
  );
};