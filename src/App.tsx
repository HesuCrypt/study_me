import { useState } from 'react';
import { Dashboard, ModuleId } from './components/Dashboard';
import { Diary } from './components/Diary';
import { DailyTasks } from './components/DailyTasks';
import { ExamCreator } from './components/ExamCreator';
import { Languages } from './components/Languages';
import { Subjects } from './components/Subjects';
import { Finance } from './components/Finance';

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleId>('dashboard');

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {currentModule === 'dashboard' && <Dashboard onNavigate={setCurrentModule} />}
      {currentModule === 'diary' && <Diary onNavigate={setCurrentModule} />}
      {currentModule === 'tasks' && <DailyTasks onNavigate={setCurrentModule} />}
      {currentModule === 'exams' && <ExamCreator onNavigate={setCurrentModule} />}
      {currentModule === 'languages' && <Languages onNavigate={setCurrentModule} />}
      {currentModule === 'subjects' && <Subjects onNavigate={setCurrentModule} />}
      {currentModule === 'finance' && <Finance onNavigate={setCurrentModule} />}
    </div>
  );
}
