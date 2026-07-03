import { motion, AnimatePresence } from 'motion/react';
import { Plane, Calendar, CheckCircle2, ChevronRight, BookOpen, Wallet, Globe, BookMarked, Activity, Focus, Play, Pause, RotateCcw, Bell, AlertCircle, Clock, Download, Upload, Settings, X } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { aviationFacts } from '../data';

export type ModuleId = 'dashboard' | 'subjects' | 'tasks' | 'exams' | 'languages' | 'finance' | 'diary';

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

interface DashboardProps {
  onNavigate: (module: ModuleId) => void;
}

const mockChartData = [
  { day: 'Mon', completion: 40 },
  { day: 'Tue', completion: 65 },
  { day: 'Wed', completion: 50 },
  { day: 'Thu', completion: 80 },
  { day: 'Fri', completion: 95 },
  { day: 'Sat', completion: 60 },
  { day: 'Sun', completion: 85 },
];

const TRANSLATIONS = {
  en: {
    greeting: "Good morning.",
    subtitle: "Your flight path for today is clear. Ready for your next study session?",
    focusMode: "Enter Focus Mode",
    settings: "Local Settings",
    settingsDesc: "Manage your data locally. Flight Deck does not use cloud storage.",
    backup: "Backup Data",
    backupDesc: "Export all your modules data as JSON",
    restore: "Restore Data",
    restoreDesc: "Import a previous backup file",
    appLanguage: "App Language"
  },
  tl: {
    greeting: "Magandang umaga.",
    subtitle: "Ang iyong flight path para sa araw na ito ay malinaw. Handa na ba sa pag-aaral?",
    focusMode: "Focus Mode",
    settings: "Mga Setting",
    settingsDesc: "Lokal na pamamahala ng data. Hindi gumagamit ng cloud ang Flight Deck.",
    backup: "I-backup ang Data",
    backupDesc: "I-export ang lahat ng data bilang JSON",
    restore: "I-restore ang Data",
    restoreDesc: "Mag-import ng nakaraang backup file",
    appLanguage: "Wika ng App"
  },
  es: {
    greeting: "Buenos días.",
    subtitle: "Tu ruta de vuelo para hoy está despejada. ¿Listo para estudiar?",
    focusMode: "Modo Enfoque",
    settings: "Ajustes Locales",
    settingsDesc: "Gestiona tus datos localmente. Flight Deck no usa la nube.",
    backup: "Copia de Seguridad",
    backupDesc: "Exportar todos los datos como JSON",
    restore: "Restaurar Datos",
    restoreDesc: "Importar un archivo de respaldo",
    appLanguage: "Idioma"
  }
};

export function Dashboard({ onNavigate }: DashboardProps) {
  const [factIndex, setFactIndex] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'tl' | 'es'>(() => {
    return (localStorage.getItem('study-me-language') as 'en' | 'tl' | 'es') || 'en';
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const t = TRANSLATIONS[language];
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('study-me-streak');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('study-me-subjects');
    if (saved) {
      try {
        setSubjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse subjects", e);
      }
    }
  }, []);

  const upcomingTasks = useMemo(() => {
    const allTasks: { task: Task, subjectCode: string }[] = [];
    subjects.forEach(subject => {
      subject.tasks.forEach(task => {
        if (task.status !== 'completed') {
          allTasks.push({ task, subjectCode: subject.code });
        }
      });
    });
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    return allTasks.filter(item => {
      const dueDate = new Date(item.task.dueDate);
      dueDate.setHours(0,0,0,0);
      const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
      return diffDays >= -100 && diffDays <= 14; // Showing recent overdue and next 14 days
    }).sort((a, b) => new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime());
  }, [subjects]);

  const studyTimeData = useMemo(() => {
    const data = subjects.map(subject => {
      const completedTasks = subject.tasks.filter(t => t.status === 'completed');
      // Estimate: 1.5 hours per assignment, 3 hours per exam
      const hours = completedTasks.reduce((total, task) => {
        return total + (task.type === 'exam' ? 3 : 1.5);
      }, 0);
      return {
        subject: subject.code,
        hours: hours
      };
    }).filter(d => d.hours > 0);
    
    // If no data, provide an empty state or placeholder so chart isn't totally blank
    if (data.length === 0) {
      return [{ subject: 'No Data', hours: 0 }];
    }
    return data;
  }, [subjects]);

  const [checkedIn, setCheckedIn] = useState(() => {
    const lastCheckIn = localStorage.getItem('study-me-last-checkin');
    if (!lastCheckIn) return false;
    
    const today = new Date().toDateString();
    return lastCheckIn === today;
  });

  const [focusSessions, setFocusSessions] = useState<{ date: string, duration: number }[]>(() => {
    const saved = localStorage.getItem('study-me-focus-sessions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('study-me-focus-sessions', JSON.stringify(focusSessions));
  }, [focusSessions]);

  const weeklyFocusData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const minutes = focusSessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);
        
      data.push({
        day: days[d.getDay()],
        minutes: minutes
      });
    }
    
    return data;
  }, [focusSessions]);

  useEffect(() => {
    const lastCheckIn = localStorage.getItem('study-me-last-checkin');
    if (lastCheckIn) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastDate = new Date(lastCheckIn);
      lastDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        setStreak(0);
        localStorage.setItem('study-me-streak', '0');
      }
    }
  }, []);

  useEffect(() => {
    // Rotate fact every 8 seconds
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % aviationFacts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      const today = new Date().toISOString().split('T')[0];
      setFocusSessions(prev => [...prev, { date: today, duration: 25 }]);
      setTimeLeft(25 * 60);
    } else if (!isActive && timeLeft === 0) {
      setIsActive(false);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = () => {
    if (!checkedIn) {
      const today = new Date().toDateString();
      setStreak(s => {
        const newStreak = s + 1;
        localStorage.setItem('study-me-streak', newStreak.toString());
        return newStreak;
      });
      setCheckedIn(true);
      localStorage.setItem('study-me-last-checkin', today);
    }
  };

  const handleExportData = () => {
    const keys = ['study-me-streak', 'study-me-last-checkin', 'study-me-subjects', 'study-me-exams', 'study-me-languages', 'study-me-finance', 'study-me-diary'];
    const data: Record<string, string | null> = {};
    keys.forEach(key => {
      data[key] = localStorage.getItem(key);
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flight-deck-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.keys(data).forEach(key => {
          if (data[key] !== null) {
            localStorage.setItem(key, data[key]);
          } else {
            localStorage.removeItem(key);
          }
        });
        alert('Data imported successfully! The app will now reload.');
        window.location.reload();
      } catch (err) {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  if (isFocusMode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-900 rounded-full blur-3xl opacity-50 mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-800 rounded-full blur-3xl opacity-50 mix-blend-screen" />
        </motion.div>
        
        <button 
          onClick={() => setIsFocusMode(false)}
          className="absolute top-8 left-8 text-neutral-500 hover:text-white transition-colors uppercase tracking-widest text-xs font-semibold"
        >
          Exit Focus Mode
        </button>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="z-10 text-center flex flex-col items-center"
        >
          <Focus className="w-12 h-12 text-neutral-600 mb-8" />
          <h2 className="text-xl uppercase tracking-widest font-semibold text-neutral-400 mb-12">Deep Work Session</h2>
          
          <div className="text-8xl md:text-9xl font-light tracking-tighter tabular-nums mb-16">
            {formatTime(timeLeft)}
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTimer}
              className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 hover:scale-105 transition-all"
            >
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-2" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-14 h-14 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-500 transition-all text-neutral-400 hover:text-white"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative">
      <motion.header 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6">{t.greeting}</h1>
          <p className="text-lg md:text-xl text-neutral-500 font-medium max-w-xl">
            {t.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-14 h-14 bg-white border border-neutral-200 text-black rounded-full flex items-center justify-center hover:bg-neutral-50 hover:border-black hover:-translate-y-1 transition-all group shadow-sm hover:shadow-lg"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          </button>
          <button 
            onClick={() => setIsFocusMode(true)}
            className="h-14 px-8 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 whitespace-nowrap rounded-full group"
          >
            <Focus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" /> {t.focusMode}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white border border-neutral-200 p-8 shadow-2xl max-w-md w-full relative"
            >
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold tracking-tight mb-2">{t.settings}</h2>
              <p className="text-sm text-neutral-500 mb-8">{t.settingsDesc}</p>
              
              <div className="space-y-4">
                <div className="w-full p-4 border border-neutral-200 bg-neutral-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">{t.appLanguage}</h3>
                  </div>
                  <select 
                    value={language}
                    onChange={(e) => {
                      const newLang = e.target.value as 'en' | 'tl' | 'es';
                      setLanguage(newLang);
                      localStorage.setItem('study-me-language', newLang);
                    }}
                    className="bg-white border border-neutral-300 text-sm font-medium px-3 py-1.5 outline-none focus:border-black"
                  >
                    <option value="en">English</option>
                    <option value="tl">Tagalog</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <button 
                  onClick={handleExportData}
                  className="w-full p-4 border border-neutral-200 hover:border-black hover:bg-neutral-50 transition-colors flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{t.backup}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{t.backupDesc}</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border border-neutral-200 hover:border-black hover:bg-neutral-50 transition-colors flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-black text-black flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{t.restore}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{t.restoreDesc}</p>
                  </div>
                </button>
                <input 
                  type="file" 
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportData}
                  className="hidden"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Streak Counter */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
           whileHover={{ scale: 1.02 }}
           className="col-span-1 border border-neutral-200 bg-white p-8 flex flex-col justify-between group hover:border-black hover:shadow-lg transition-all duration-500"
        >
          <div>
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 group-hover:text-black transition-colors duration-500">Current Streak</h2>
              <motion.div
                animate={checkedIn ? { scale: [1, 1.2, 1], color: ['#000', '#10b981', '#000'] } : {}}
                transition={{ duration: 0.5 }}
              >
                <CheckCircle2 className={`w-5 h-5 ${checkedIn ? 'text-black' : 'text-neutral-300'}`} />
              </motion.div>
            </div>
            <div className="text-8xl md:text-9xl font-light tracking-tighter mb-4">{streak}</div>
            <p className="text-sm text-neutral-500 font-medium">Days of continuous learning</p>
          </div>
          <button 
            onClick={handleCheckIn}
            disabled={checkedIn}
            className={`mt-16 w-full py-4 text-sm font-semibold tracking-wide transition-all duration-300
              ${checkedIn 
                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-neutral-800'
              }`}
          >
            {checkedIn ? 'Checked In' : 'Check In Today'}
          </button>
        </motion.div>

        {/* Fun Fact Widget */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
           whileHover={{ scale: 1.01 }}
           className="col-span-1 md:col-span-2 bg-neutral-50 border border-neutral-200 p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group hover:border-black hover:shadow-lg transition-all duration-500"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
            <Plane className="w-64 h-64 -mr-16 -mt-16 transform rotate-12" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col justify-center min-h-[200px]">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 group-hover:text-black transition-colors duration-500 mb-8">Aviation Insight</h2>
            
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={factIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="text-2xl md:text-3xl lg:text-4xl font-medium leading-snug tracking-tight max-w-2xl text-black"
                >
                  "{aviationFacts[factIndex]}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-4">
             <button 
                onClick={() => setFactIndex((prev) => (prev + 1) % aviationFacts.length)}
                className="w-10 h-10 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-white hover:border-black hover:scale-105 transition-all duration-300"
              >
                <ChevronRight className="w-4 h-4 text-black" />
             </button>
             <span className="text-xs text-neutral-400 font-semibold tracking-widest uppercase">Next Fact</span>
          </div>
        </motion.div>

        {/* Modules Overview */}
        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
           className="col-span-1 md:col-span-3 mt-8"
        >
           <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-8">Flight Plan / Modules</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { id: 'subjects', title: "Subjects", desc: "Tourism & Aviation", icon: BookOpen },
                { id: 'tasks', title: "Daily Tasks", desc: "Checklist", icon: Calendar },
                { id: 'exams', title: "Mock Exams", desc: "Quiz Generator", icon: BookMarked },
                { id: 'languages', title: "Languages", desc: "Study Cards", icon: Globe },
                { id: 'finance', title: "Finance", desc: "Layover Budget", icon: Wallet },
                { id: 'diary', title: "Diary", desc: "Personal Notes", icon: Plane },
              ].map((item, idx) => (
                <motion.div 
                  key={idx} 
                  onClick={() => onNavigate(item.id as ModuleId)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 border border-neutral-200 hover:border-black transition-colors duration-300 cursor-pointer group flex flex-col gap-8 bg-white shadow-sm hover:shadow-lg">
                  <div className="flex justify-between items-start">
                    <item.icon className="w-6 h-6 text-neutral-400 group-hover:text-black transition-colors duration-300" />
                    <ChevronRight className="w-4 h-4 text-neutral-300 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black tracking-tight">{item.title}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
           </div>
        </motion.div>

        {/* Upcoming Notifications */}
        {upcomingTasks.length > 0 && (
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
             className="col-span-1 md:col-span-3 mt-8 border border-neutral-200 p-8 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-8 border-b border-neutral-100 pb-4">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Upcoming Deadlines & Exams
              </h2>
              <span className="text-xs font-bold bg-neutral-100 px-3 py-1 rounded-full text-black">
                {upcomingTasks.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTasks.slice(0, 6).map((item, idx) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const dueDate = new Date(item.task.dueDate);
                dueDate.setHours(0,0,0,0);
                const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                
                let timeStatus = '';
                let statusColor = '';
                let Icon = Clock;
                
                if (diffDays < 0) {
                  timeStatus = 'Overdue';
                  statusColor = 'text-red-500 bg-red-50 border-red-100';
                  Icon = AlertCircle;
                } else if (diffDays === 0) {
                  timeStatus = 'Due Today';
                  statusColor = 'text-orange-500 bg-orange-50 border-orange-100';
                  Icon = AlertCircle;
                } else if (diffDays === 1) {
                  timeStatus = 'Due Tomorrow';
                  statusColor = 'text-blue-500 bg-blue-50 border-blue-100';
                } else {
                  timeStatus = `Due in ${diffDays} days`;
                  statusColor = 'text-neutral-500 bg-neutral-50 border-neutral-100';
                }

                return (
                  <motion.div 
                    key={`${item.subjectCode}-${item.task.id}-${idx}`}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 border ${statusColor} rounded-sm flex flex-col gap-3 transition-transform`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white bg-opacity-50 rounded">
                        {item.subjectCode}
                      </span>
                      <div className="flex items-center gap-1 font-semibold text-xs">
                        <Icon className="w-3 h-3" />
                        {timeStatus}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{item.task.title}</h3>
                    <div className="text-xs opacity-70 mt-auto pt-2 flex items-center justify-between">
                       <span className="capitalize">{item.task.type}</span>
                       <span>{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Progress Visualization */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
           className="col-span-1 md:col-span-3 mt-8 grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          <div className="border border-neutral-200 p-8 bg-white shadow-sm group hover:border-black hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 group-hover:text-black transition-colors duration-500">Study Time by Subject (Hours)</h2>
              <Activity className="w-5 h-5 text-neutral-300 group-hover:text-black transition-colors duration-500" />
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '0px' }}
                    itemStyle={{ color: '#000', fontWeight: 600 }}
                    cursor={{ fill: '#f5f5f5' }}
                    formatter={(value: number) => [`${value} hrs`, 'Study Time']}
                  />
                  <Bar 
                    dataKey="hours" 
                    fill="#000" 
                    radius={[2, 2, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-neutral-200 p-8 bg-white shadow-sm group hover:border-black hover:shadow-lg transition-all duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-400 group-hover:text-black transition-colors duration-500">Weekly Focus Sessions (Minutes)</h2>
              <Focus className="w-5 h-5 text-neutral-300 group-hover:text-black transition-colors duration-500" />
            </div>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyFocusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '0px' }}
                    itemStyle={{ color: '#000', fontWeight: 600 }}
                    cursor={{ stroke: '#e5e5e5', strokeWidth: 1 }}
                    formatter={(value: number) => [`${value} mins`, 'Focus Time']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="minutes" 
                    stroke="#000" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorFocus)" 
                    activeDot={{ r: 6, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
