import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, BookOpen, Calendar as CalendarIcon, CheckCircle2, Circle, Clock, FileText, GraduationCap, Check } from 'lucide-react';
import { ModuleId } from './Dashboard';

type TaskType = 'assignment' | 'exam';
type TaskStatus = 'todo' | 'in-progress' | 'completed';

interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  dueDate: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  tasks: Task[];
}

interface SubjectsProps {
  onNavigate: (module: ModuleId) => void;
}

const STATUSES: { id: TaskStatus; label: string; icon: any }[] = [
  { id: 'todo', label: 'To Do', icon: Circle },
  { id: 'in-progress', label: 'In Progress', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle2 }
];

export function Subjects({ onNavigate }: SubjectsProps) {
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('study-me-subjects');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  
  // New Subject State
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  
  // New Task State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('assignment');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  useEffect(() => {
    localStorage.setItem('study-me-subjects', JSON.stringify(subjects));
    if (activeSubject) {
      const updatedActive = subjects.find(s => s.id === activeSubject.id);
      if (updatedActive) setActiveSubject(updatedActive);
    }
  }, [subjects]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: newSubjectName.trim(),
      code: newSubjectCode.trim() || 'SUBJ',
      tasks: []
    };
    
    setSubjects([...subjects, newSubject]);
    setNewSubjectName('');
    setNewSubjectCode('');
    setIsAddingSubject(false);
    setActiveSubject(newSubject);
  };

  const handleDeleteSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubjects(subjects.filter(s => s.id !== id));
    if (activeSubject?.id === id) {
      setActiveSubject(null);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      type: newTaskType,
      status: 'todo',
      dueDate: newTaskDueDate || new Date().toISOString().split('T')[0]
    };
    
    setSubjects(subjects.map(s => 
      s.id === activeSubject.id ? { ...s, tasks: [...s.tasks, newTask] } : s
    ));
    
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setIsAddingTask(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeSubject) return;
    
    setSubjects(subjects.map(s => 
      s.id === activeSubject.id 
        ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } 
        : s
    ));
  };

  const cycleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    if (!activeSubject) return;
    
    const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    setSubjects(subjects.map(s => 
      s.id === activeSubject.id 
        ? { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t) } 
        : s
    ));
  };

  const toggleTaskCompletion = (taskId: string, currentStatus: TaskStatus) => {
    if (!activeSubject) return;
    const nextStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    setSubjects(subjects.map(s => 
      s.id === activeSubject.id 
        ? { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t) } 
        : s
    ));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 h-screen flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <button 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <BookOpen className="w-4 h-4" />
          Subjects & Tasks
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Sidebar - Subjects List */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-1/3 lg:w-1/4 flex flex-col border border-neutral-200 bg-neutral-50 h-[300px] md:h-full overflow-hidden"
        >
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-white">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">My Subjects</h2>
            <button 
              onClick={() => setIsAddingSubject(!isAddingSubject)}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              title="Add Subject"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <AnimatePresence>
              {isAddingSubject && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddSubject}
                  className="mb-4 p-4 border border-black bg-white"
                >
                  <input
                    type="text"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    placeholder="Code (e.g. TM101)"
                    className="w-full text-xs font-semibold uppercase tracking-wider mb-2 outline-none placeholder:text-neutral-300"
                  />
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Subject Name"
                    className="w-full text-sm font-medium mb-4 outline-none placeholder:text-neutral-300"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-black text-white text-xs font-semibold">Add</button>
                    <button type="button" onClick={() => setIsAddingSubject(false)} className="flex-1 py-2 border border-neutral-200 text-xs font-semibold">Cancel</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {subjects.length === 0 && !isAddingSubject ? (
              <p className="text-sm text-neutral-400 text-center py-8">No subjects added. Create your first one!</p>
            ) : (
              subjects.map(subject => (
                <div 
                  key={subject.id}
                  onClick={() => setActiveSubject(subject)}
                  className={`p-4 cursor-pointer border transition-all duration-200 group relative
                    ${activeSubject?.id === subject.id ? 'border-black bg-white shadow-sm' : 'border-transparent hover:border-neutral-300 hover:bg-white'}
                  `}
                >
                  <div className="text-xs font-semibold text-neutral-400 mb-1">{subject.code}</div>
                  <h3 className="font-medium text-black pr-6">{subject.name}</h3>
                  <div className="text-xs text-neutral-500 mt-2 flex gap-3">
                    <span>{subject.tasks.filter(t => t.status === 'completed').length} / {subject.tasks.length} Done</span>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteSubject(subject.id, e)}
                    className="absolute right-4 top-4 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Main Area - Tasks */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col border border-neutral-200 bg-white h-[500px] md:h-full overflow-hidden"
        >
          {activeSubject ? (
            <>
              <div className="p-8 border-b border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="text-sm font-semibold tracking-wider text-neutral-400 uppercase mb-1">{activeSubject.code}</div>
                  <h2 className="text-3xl font-bold tracking-tight">{activeSubject.name}</h2>
                </div>
                <button 
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="px-4 py-2 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <AnimatePresence>
                  {isAddingTask && (
                    <motion.form 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      onSubmit={handleAddTask}
                      className="mb-8 p-6 border border-neutral-200 bg-neutral-50"
                    >
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-4">New Task</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Task Title (e.g. Read Chapter 1)"
                          className="p-3 border border-neutral-200 outline-none focus:border-black"
                          required
                        />
                        <div className="flex gap-4">
                          <select 
                            value={newTaskType}
                            onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                            className="flex-1 p-3 border border-neutral-200 outline-none focus:border-black bg-white"
                          >
                            <option value="assignment">Assignment</option>
                            <option value="exam">Exam</option>
                          </select>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="flex-1 p-3 border border-neutral-200 outline-none focus:border-black bg-white text-neutral-600"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAddingTask(false)} className="px-6 py-2 border border-transparent text-neutral-500 font-semibold text-sm hover:bg-neutral-100">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-black text-white font-semibold text-sm hover:bg-neutral-800">Save Task</button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {activeSubject.tasks.length === 0 && !isAddingTask ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-4 py-12">
                    <FileText className="w-12 h-12 opacity-20" />
                    <p>No tasks yet for this subject. Add assignments or exams.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {STATUSES.map(status => {
                      const statusTasks = activeSubject.tasks.filter(t => t.status === status.id);
                      return (
                        <div key={status.id} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-4 border-b border-neutral-200 pb-2">
                            <status.icon className={`w-4 h-4 ${status.id === 'todo' ? 'text-neutral-400' : status.id === 'in-progress' ? 'text-blue-500' : 'text-green-500'}`} />
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">{status.label}</h3>
                            <span className="text-xs font-medium text-neutral-400 ml-auto bg-neutral-100 px-2 py-1 rounded-full">{statusTasks.length}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {statusTasks.map(task => (
                                <motion.div 
                                  layout
                                  layoutId={task.id}
                                  key={task.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                  className="p-4 border border-neutral-200 bg-white group hover:border-black transition-colors flex flex-col"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${task.type === 'exam' ? 'text-red-500' : 'text-neutral-400'}`}>
                                      {task.type === 'exam' ? <GraduationCap className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                      {task.type}
                                    </span>
                                    <button onClick={() => handleDeleteTask(task.id)} className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  
                                  <div className="flex items-start gap-3 mb-4">
                                    <button 
                                      onClick={() => toggleTaskCompletion(task.id, task.status)}
                                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center transition-colors ${task.status === 'completed' ? 'bg-black text-white' : 'border border-neutral-300 hover:border-black'}`}
                                    >
                                      <motion.div
                                        initial={false}
                                        animate={{ scale: task.status === 'completed' ? 1 : 0, opacity: task.status === 'completed' ? 1 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </motion.div>
                                    </button>
                                    <motion.h4 
                                      layout="position"
                                      className={`font-medium ${task.status === 'completed' ? 'line-through text-neutral-400' : 'text-black'}`}
                                    >
                                      {task.title}
                                    </motion.h4>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-auto border-t border-neutral-100 pt-3">
                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                      <CalendarIcon className="w-3 h-3" />
                                      {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <button 
                                      onClick={() => cycleTaskStatus(task.id, task.status)}
                                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 transition-colors text-neutral-500 hover:text-black"
                                    >
                                      Move
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center space-y-4">
              <BookOpen className="w-12 h-12 opacity-20" />
              <p>Select a subject from the sidebar or create a new one to manage tasks.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
