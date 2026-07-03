import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { ModuleId } from './Dashboard';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface DailyTasksProps {
  onNavigate: (module: ModuleId) => void;
}

export function DailyTasks({ onNavigate }: DailyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('study-me-tasks');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Review Aviation Code Alpha-Echo', completed: false },
      { id: '2', text: 'Memorize Airport IATA codes', completed: false },
      { id: '3', text: 'Read Chapter 4 of Tourism Marketing', completed: false }
    ];
  });
  
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    localStorage.setItem('study-me-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    setTasks([...tasks, {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false
    }]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 h-screen flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-16"
      >
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Flight Deck
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <CalendarIcon className="w-4 h-4" />
          Daily Checklist
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Today's Itinerary</h1>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-black"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-sm font-medium text-neutral-500 w-12">{progress}%</span>
        </div>
        <p className="text-sm text-neutral-400">
          {completedCount} of {tasks.length} tasks completed
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <form onSubmit={addTask} className="mb-8 relative">
          <input 
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add a new task..."
            className="w-full pb-4 text-xl border-b border-neutral-300 focus:border-black outline-none bg-transparent placeholder:text-neutral-300 transition-colors"
          />
          <button 
            type="submit"
            disabled={!newTaskText.trim()}
            className="absolute right-0 bottom-4 text-neutral-400 hover:text-black disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>

        <div className="flex-1 overflow-y-auto pr-4">
          <AnimatePresence>
            {tasks.map(task => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="group flex items-center justify-between mb-4 border border-neutral-100 p-4 hover:border-neutral-300 transition-all bg-white"
              >
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleTask(task.id)}>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors
                    ${task.completed ? 'bg-black border-black text-white' : 'border-neutral-300 group-hover:border-black text-transparent'}
                  `}>
                    <motion.div
                      initial={false}
                      animate={{ scale: task.completed ? 1 : 0, opacity: task.completed ? 1 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  </div>
                  <span className={`text-lg transition-all ${task.completed ? 'text-neutral-400 line-through' : 'text-black'}`}>
                    {task.text}
                  </span>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {tasks.length === 0 && (
            <p className="text-center text-neutral-400 mt-12 py-12 border border-dashed border-neutral-200">
              Your itinerary is clear. Add a task above to begin.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
