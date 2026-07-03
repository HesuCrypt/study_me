import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Plus, Trash2, Plane } from 'lucide-react';
import { ModuleId } from './Dashboard';

interface Note {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface DiaryProps {
  onNavigate: (module: ModuleId) => void;
}

export function Diary({ onNavigate }: DiaryProps) {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('study-me-diary');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  useEffect(() => {
    localStorage.setItem('study-me-diary', JSON.stringify(notes));
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    setNotes([newNote, ...notes]);
    setActiveNote(newNote);
  };

  const updateActiveNote = (field: 'title' | 'content', value: string) => {
    if (!activeNote) return;
    
    const updatedNote = { ...activeNote, [field]: value };
    setActiveNote(updatedNote);
    
    setNotes(notes.map(note => note.id === updatedNote.id ? updatedNote : note));
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 h-screen flex flex-col">
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
        <h1 className="text-xl font-semibold tracking-tight">Personal Notes</h1>
      </motion.div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-1/3 flex flex-col border border-neutral-200 bg-neutral-50 h-[300px] md:h-full overflow-hidden"
        >
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-white">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Entries</h2>
            <button 
              onClick={createNewNote}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              title="New Note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {notes.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">No notes yet. Create one!</p>
            ) : (
              notes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className={`p-4 cursor-pointer border transition-all duration-200 group relative
                    ${activeNote?.id === note.id ? 'border-black bg-white shadow-sm' : 'border-transparent hover:border-neutral-300 hover:bg-white'}
                  `}
                >
                  <h3 className="font-medium text-black truncate pr-6">{note.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1">{note.date}</p>
                  
                  <button 
                    onClick={(e) => deleteNote(note.id, e)}
                    className="absolute right-4 top-4 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Editor */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col border border-neutral-200 bg-white h-[400px] md:h-full"
        >
          {activeNote ? (
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => updateActiveNote('title', e.target.value)}
                className="text-3xl md:text-4xl font-bold tracking-tight text-black mb-6 border-none focus:ring-0 outline-none placeholder:text-neutral-300 bg-transparent"
                placeholder="Note Title"
              />
              <textarea
                value={activeNote.content}
                onChange={(e) => updateActiveNote('content', e.target.value)}
                className="flex-1 text-lg leading-relaxed text-neutral-700 resize-none border-none focus:ring-0 outline-none placeholder:text-neutral-300 bg-transparent"
                placeholder="Start typing your notes here..."
              />
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                <span>{activeNote.content.length} characters</span>
                <span className="flex items-center gap-1"><Save className="w-3 h-3" /> Auto-saved locally</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 flex-col gap-4">
              <Plane className="w-12 h-12 opacity-20" />
              <p>Select a note or create a new one to start writing.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
