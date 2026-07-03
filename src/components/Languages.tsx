import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Edit2, Play, Globe, Save, ChevronRight, ChevronLeft, Repeat } from 'lucide-react';
import { ModuleId } from './Dashboard';

interface Flashcard {
  id: string;
  term: string;
  translation: string;
}

interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
}

interface LanguagesProps {
  onNavigate: (module: ModuleId) => void;
}

type ViewState = 'list' | 'edit' | 'study';

export function Languages({ onNavigate }: LanguagesProps) {
  const [decks, setDecks] = useState<Deck[]>(() => {
    const saved = localStorage.getItem('study-me-languages');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [view, setView] = useState<ViewState>('list');
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  
  // Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editCards, setEditCards] = useState<Flashcard[]>([]);
  
  // Study State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    localStorage.setItem('study-me-languages', JSON.stringify(decks));
  }, [decks]);

  const handleCreateNew = () => {
    setEditTitle('New Language Deck');
    setEditCards([{ id: Date.now().toString(), term: '', translation: '' }]);
    setActiveDeck(null);
    setView('edit');
  };

  const handleEdit = (deck: Deck, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDeck(deck);
    setEditTitle(deck.title);
    setEditCards([...deck.cards]);
    setView('edit');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDecks(decks.filter(d => d.id !== id));
  };

  const handleSave = () => {
    const validCards = editCards.filter(c => c.term.trim() && c.translation.trim());
    
    if (validCards.length === 0) {
      alert("Please add at least one valid flashcard.");
      return;
    }

    const newDeck: Deck = {
      id: activeDeck ? activeDeck.id : Date.now().toString(),
      title: editTitle.trim() || 'Untitled Deck',
      cards: validCards,
    };

    if (activeDeck) {
      setDecks(decks.map(d => d.id === newDeck.id ? newDeck : d));
    } else {
      setDecks([newDeck, ...decks]);
    }
    setView('list');
  };

  const handleAddCard = () => {
    setEditCards([...editCards, { id: Date.now().toString(), term: '', translation: '' }]);
  };

  const handleCardChange = (id: string, field: 'term' | 'translation', value: string) => {
    setEditCards(editCards.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleRemoveCard = (id: string) => {
    if (editCards.length > 1) {
      setEditCards(editCards.filter(c => c.id !== id));
    }
  };

  const startStudy = (deck: Deck) => {
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setView('study');
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (activeDeck && currentCardIndex < activeDeck.cards.length - 1) {
        setCurrentCardIndex(i => i + 1);
      }
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex > 0) {
        setCurrentCardIndex(i => i - 1);
      }
    }, 150);
  };

  const restartStudy = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex(0);
    }, 150);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-12"
      >
        <button 
          onClick={() => view === 'list' ? onNavigate('dashboard') : setView('list')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {view === 'list' ? 'Flight Deck' : 'Back to Decks'}
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <Globe className="w-4 h-4" />
          Language Study
        </div>
      </motion.div>

      {view === 'list' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Linguistics</h1>
              <p className="text-neutral-500">Master essential phrases for your next layover.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="hidden md:flex px-6 py-3 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Deck
            </button>
          </div>

          <button 
            onClick={handleCreateNew}
            className="md:hidden w-full mb-8 px-6 py-4 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Deck
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {decks.length === 0 ? (
              <div className="col-span-1 md:col-span-2 py-16 border border-dashed border-neutral-200 text-center text-neutral-400 flex flex-col items-center">
                <Globe className="w-12 h-12 mb-4 opacity-20" />
                <p>No language decks created yet. Build your first set to start practicing.</p>
              </div>
            ) : (
              decks.map(deck => (
                <motion.div 
                  key={deck.id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="border border-neutral-200 p-6 flex flex-col bg-white shadow-sm group hover:border-black hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => startStudy(deck)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-semibold tracking-tight text-black">{deck.title}</h2>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleEdit(deck, e)} className="p-2 text-neutral-400 hover:text-black">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDelete(deck.id, e)} className="p-2 text-neutral-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{deck.cards.length} Cards</span>
                    <span className="text-sm font-medium text-neutral-400 flex items-center gap-1 group-hover:text-black transition-colors">
                      <Play className="w-3 h-3 fill-current" /> Study
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {view === 'edit' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-8">
            <input 
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Deck Title (e.g., French Basics)"
              className="text-3xl font-bold tracking-tight text-black border-none focus:ring-0 outline-none placeholder:text-neutral-300 bg-transparent w-full"
            />
            <button 
              onClick={handleSave}
              className="px-6 py-3 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Save className="w-4 h-4" /> Save Deck
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-20">
            <AnimatePresence>
              {editCards.map((card, index) => (
                <motion.div 
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-4 items-center group bg-white p-4 border border-neutral-100 hover:border-black transition-colors"
                >
                  <div className="text-xs font-semibold text-neutral-300 w-6 text-center">{index + 1}</div>
                  <input
                    type="text"
                    value={card.term}
                    onChange={(e) => handleCardChange(card.id, 'term', e.target.value)}
                    placeholder="Term (e.g., Bonjour)"
                    className="flex-1 p-3 border-b border-neutral-200 focus:border-black outline-none bg-transparent transition-colors font-medium text-black"
                  />
                  <input
                    type="text"
                    value={card.translation}
                    onChange={(e) => handleCardChange(card.id, 'translation', e.target.value)}
                    placeholder="Translation (e.g., Hello)"
                    className="flex-1 p-3 border-b border-neutral-200 focus:border-black outline-none bg-transparent transition-colors text-neutral-600"
                  />
                  <button 
                    onClick={() => handleRemoveCard(card.id)}
                    className="p-3 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <button 
              onClick={handleAddCard}
              className="w-full py-6 border-2 border-dashed border-neutral-200 text-neutral-400 hover:border-black hover:text-black transition-all flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Card
            </button>
          </div>
        </motion.div>
      )}

      {view === 'study' && activeDeck && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full"
        >
          <div className="w-full mb-8 flex flex-col gap-3">
            <div className="flex justify-between items-center text-sm font-medium text-neutral-400">
              <span>{activeDeck.title}</span>
              <span>{currentCardIndex + 1} / {activeDeck.cards.length}</span>
            </div>
            <div className="w-full h-1 bg-neutral-100 overflow-hidden rounded-full">
              <motion.div 
                className="h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div 
            className="w-full h-[400px] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ perspective: '1000px' }}
          >
            <motion.div
              initial={false}
              animate={{ rotateX: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
              className="relative w-full h-full transform-style-3d shadow-lg"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front side (Term) */}
              <div 
                className="absolute inset-0 border border-neutral-200 bg-white p-8 md:p-12 flex flex-col items-center justify-center text-center backface-hidden"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <span className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-8 absolute top-8">Term</span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-black">
                  {activeDeck.cards[currentCardIndex].term}
                </h2>
                <p className="text-sm text-neutral-400 absolute bottom-8 font-medium">Click to flip</p>
              </div>

              {/* Back side (Translation) */}
              <div 
                className="absolute inset-0 border border-black bg-black p-8 md:p-12 flex flex-col items-center justify-center text-center backface-hidden"
                style={{ 
                  backfaceVisibility: 'hidden', 
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)' 
                }}
              >
                <span className="text-xs uppercase tracking-widest font-semibold text-neutral-400 mb-8 absolute top-8">Translation</span>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
                  {activeDeck.cards[currentCardIndex].translation}
                </h2>
                <p className="text-sm text-neutral-400 absolute bottom-8 font-medium">Click to flip</p>
              </div>
            </motion.div>
          </div>

          <div className="flex gap-4 mt-12 w-full justify-between items-center">
            <button 
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              className="p-4 border border-neutral-200 hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-neutral-200 flex items-center justify-center rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
              onClick={restartStudy}
              className="p-3 text-neutral-400 hover:text-black transition-colors"
              title="Restart Deck"
            >
              <Repeat className="w-5 h-5" />
            </button>

            <button 
              onClick={nextCard}
              disabled={currentCardIndex === activeDeck.cards.length - 1}
              className="p-4 border border-neutral-200 hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-neutral-200 flex items-center justify-center rounded-full"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
