import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Edit2, Play, Check, X, BookMarked, Save, Sparkles } from 'lucide-react';
import { ModuleId } from './Dashboard';
import { buildApiUrl, parseApiJson } from '../lib/api';

// #region debug-point A:exam-fetch-reporter
const reportExamDebug = (
  hypothesisId: 'A' | 'B' | 'C' | 'D' | 'E',
  msg: string,
  data: Record<string, unknown>
) => {
  fetch('http://127.0.0.1:7777/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'exam-api-unavailable',
      runId: 'pre-fix',
      hypothesisId,
      location: 'src/components/ExamCreator.tsx',
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion

interface Question {
  id: string;
  question: string;
  answer: string;
  options?: string[];
}

interface Exam {
  id: string;
  title: string;
  questions: Question[];
  lastScore?: number;
}

interface GenerateExamResponse {
  title: string;
  questions: Array<{
    question: string;
    answer: string;
    options?: string[];
  }>;
  error?: string;
}

interface ExamCreatorProps {
  onNavigate: (module: ModuleId) => void;
}

type ViewState = 'list' | 'generate' | 'quiz' | 'result';

export function ExamCreator({ onNavigate }: ExamCreatorProps) {
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('study-me-exams');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [view, setView] = useState<ViewState>('list');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  
  // Generate State
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateCount, setGenerateCount] = useState(5);
  const [generateDifficulty, setGenerateDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    localStorage.setItem('study-me-exams', JSON.stringify(exams));
  }, [exams]);

  const handleCreateNew = () => {
    setGenerateTopic('');
    setGenerateCount(5);
    setGenerateError('');
    setActiveExam(null);
    setView('generate');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExams(exams.filter(ex => ex.id !== id));
  };

  const handleGenerate = async () => {
    if (!generateTopic.trim()) return;
    
    setIsGenerating(true);
    setGenerateError('');
    
    try {
      const apiUrl = buildApiUrl('/api/generate-exam');
      // #region debug-point A:request-start
      reportExamDebug('A', 'Starting exam generation request', {
        apiUrl,
        topic: generateTopic,
        questionCount: generateCount,
        difficulty: generateDifficulty,
      });
      // #endregion
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: generateTopic, 
          questionCount: generateCount,
          difficulty: generateDifficulty 
        })
      });
      // #region debug-point B:http-response
      reportExamDebug('B', 'Received HTTP response for exam generation', {
        apiUrl,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        contentType: response.headers.get('content-type'),
      });
      // #endregion
      const data = await parseApiJson<GenerateExamResponse>(
        response,
        'The exam service is unavailable right now. Check the deployed API URL.'
      );
      // #region debug-point C:parsed-json
      reportExamDebug('C', 'Parsed exam generation response JSON', {
        apiUrl,
        ok: response.ok,
        title: data.title,
        questionCount: Array.isArray(data.questions) ? data.questions.length : null,
        error: data.error ?? null,
      });
      // #endregion
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate exam');
      }
      
      const newExam: Exam = {
        id: Date.now().toString(),
        title: data.title,
        questions: data.questions.map((q: any, i: number) => ({
          id: `${Date.now()}-${i}`,
          question: q.question,
          answer: q.answer,
          options: q.options || undefined
        }))
      };
      
      setExams([newExam, ...exams]);
      setView('list');
      setGenerateTopic('');
    } catch (error: any) {
      // #region debug-point D:request-error
      reportExamDebug('D', 'Exam generation request failed', {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // #endregion
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate exam');
    } finally {
      setIsGenerating(false);
    }
  };

  const startQuiz = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScore(0);
    setView('quiz');
  };

  const advanceQuiz = (finalScore: number) => {
    if (activeExam && currentQuestionIndex < activeExam.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setShowAnswer(false);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      // Finish Quiz
      if (activeExam) {
        const percentage = Math.round((finalScore / activeExam.questions.length) * 100);
        
        setExams(prevExams => prevExams.map(e => 
          e.id === activeExam.id ? { ...e, lastScore: percentage } : e
        ));
      }
      setView('result');
    }
  };

  const handleMark = (correct: boolean) => {
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);
    advanceQuiz(newScore);
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswerRevealed || !activeExam) return;
    
    setSelectedOption(option);
    setIsAnswerRevealed(true);
    
    const isCorrect = option === activeExam.questions[currentQuestionIndex].answer;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    
    setTimeout(() => {
      advanceQuiz(newScore);
    }, 2000);
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
          {view === 'list' ? 'Flight Deck' : 'Back to Exams'}
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-neutral-400">
          <BookMarked className="w-4 h-4" />
          Mock Exams
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
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Exam Prep</h1>
              <p className="text-neutral-500">Generate custom mock exams powered by AI.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="hidden md:flex px-6 py-3 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate Exam
            </button>
          </div>

          <button 
            onClick={handleCreateNew}
            className="md:hidden w-full mb-8 px-6 py-4 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Generate Exam
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.length === 0 ? (
              <div className="col-span-1 md:col-span-2 py-16 border border-dashed border-neutral-200 text-center text-neutral-400 flex flex-col items-center">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p>No exams generated yet. Enter a topic to create your first quiz.</p>
              </div>
            ) : (
              exams.map(exam => (
                <motion.div 
                  key={exam.id}
                  whileHover={{ y: -4 }}
                  className="border border-neutral-200 p-6 flex flex-col bg-white group hover:border-black transition-all cursor-pointer"
                  onClick={() => startQuiz(exam)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-xl font-semibold tracking-tight text-black">{exam.title}</h2>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleDelete(exam.id, e)} className="p-2 text-neutral-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm text-neutral-500">{exam.questions.length} Questions</span>
                    {exam.lastScore !== undefined ? (
                      <span className={`text-sm font-medium px-3 py-1 bg-neutral-100 ${exam.lastScore >= 80 ? 'text-green-600' : 'text-black'}`}>
                        Last: {exam.lastScore}%
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-neutral-400 flex items-center gap-1 group-hover:text-black transition-colors">
                        <Play className="w-3 h-3 fill-current" /> Start
                      </span>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {view === 'generate' && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center"
        >
          <div className="w-24 h-24 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-8">
            <Sparkles className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">AI Exam Generator</h2>
          <p className="text-neutral-500 mb-12">Enter a topic and let AI create a custom mock exam for you.</p>
          
          <div className="w-full space-y-6">
            <input 
              type="text"
              value={generateTopic}
              onChange={(e) => setGenerateTopic(e.target.value)}
              placeholder="e.g. Airport IATA Codes, Aviation Security..."
              className="w-full p-4 border border-neutral-200 focus:border-black outline-none bg-white text-black text-lg transition-colors"
              disabled={isGenerating}
            />
            
            <div className="flex flex-col gap-4 text-left">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-sm font-medium">Difficulty Level</span>
                <select 
                  value={generateDifficulty} 
                  onChange={(e) => setGenerateDifficulty(e.target.value)}
                  className="p-2 border border-neutral-200 bg-white outline-none w-32"
                  disabled={isGenerating}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-sm font-medium">Number of Questions</span>
                <input 
                  type="number"
                  min="1"
                  max="100"
                  value={generateCount} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      // Clamp between 1 and 100
                      setGenerateCount(Math.min(Math.max(val, 1), 100));
                    } else if (e.target.value === '') {
                       setGenerateCount('' as any);
                    }
                  }}
                  onBlur={() => {
                     if (!generateCount) setGenerateCount(5);
                  }}
                  className="p-2 border border-neutral-200 bg-white outline-none w-32 text-center"
                  disabled={isGenerating}
                />
              </div>
            </div>

            {generateError && (
              <p className="text-red-500 text-sm text-left">{generateError}</p>
            )}

            <button 
              onClick={handleGenerate}
              disabled={!generateTopic.trim() || isGenerating}
              className="w-full py-4 bg-black text-white text-sm font-semibold tracking-wide hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate Exam
                </>
              )}
            </button>
            <button 
              onClick={() => setView('list')}
              disabled={isGenerating}
              className="w-full py-4 border border-transparent text-neutral-500 text-sm font-semibold tracking-wide hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {view === 'quiz' && activeExam && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full"
        >
          <div className="w-full mb-8 flex justify-between items-center text-sm font-medium text-neutral-400">
            <span>{activeExam.title}</span>
            <span>{currentQuestionIndex + 1} / {activeExam.questions.length}</span>
          </div>

          <div className="w-full min-h-[400px] border border-neutral-200 bg-white p-8 md:p-12 flex flex-col items-center justify-center text-center relative group">
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight mb-8">
              {activeExam.questions[currentQuestionIndex].question}
            </h2>

            {activeExam.questions[currentQuestionIndex].options ? (
               <div className="w-full flex flex-col gap-3">
                 {activeExam.questions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isCorrectAnswer = option === activeExam.questions[currentQuestionIndex].answer;
                    
                    let buttonClass = "w-full py-4 px-6 border text-left font-medium transition-all outline-none focus:ring-0 ";
                    
                    if (!isAnswerRevealed) {
                       buttonClass += "border-neutral-200 hover:border-black bg-white text-black";
                    } else {
                       if (isCorrectAnswer) {
                          buttonClass += "border-green-500 bg-green-50 text-green-700";
                       } else if (isSelected && !isCorrectAnswer) {
                          buttonClass += "border-red-500 bg-red-50 text-red-700";
                       } else {
                          buttonClass += "border-neutral-100 bg-neutral-50 text-neutral-400 opacity-50";
                       }
                    }
                    
                    return (
                       <button
                         key={idx}
                         onClick={() => handleOptionSelect(option)}
                         disabled={isAnswerRevealed}
                         className={buttonClass}
                       >
                         <span className="font-bold mr-3">{['A', 'B', 'C', 'D'][idx] || '•'}</span>
                         {option}
                       </button>
                    )
                 })}
               </div>
            ) : (
              <AnimatePresence mode="wait">
                {showAnswer ? (
                  <motion.div 
                    key="answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full pt-8 border-t border-neutral-100"
                  >
                    <p className="text-xl text-neutral-600 font-medium">
                      {activeExam.questions[currentQuestionIndex].answer}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <button 
                      onClick={() => setShowAnswer(true)}
                      className="px-8 py-3 bg-neutral-100 hover:bg-neutral-200 text-black font-semibold text-sm tracking-wide transition-colors"
                    >
                      Reveal Answer
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {showAnswer && !activeExam.questions[currentQuestionIndex].options && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 mt-8 w-full"
            >
              <button 
                onClick={() => handleMark(false)}
                className="flex-1 py-4 border border-neutral-200 hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <X className="w-4 h-4" /> Incorrect
              </button>
              <button 
                onClick={() => handleMark(true)}
                className="flex-1 py-4 bg-black text-white hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Check className="w-4 h-4" /> Correct
              </button>
            </motion.div>
          )}
        </motion.div>
      )}

      {view === 'result' && activeExam && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center"
        >
          <div className="w-24 h-24 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center mb-8">
            <BookMarked className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Quiz Complete</h2>
          <p className="text-neutral-500 mb-12">You've finished {activeExam.title}</p>
          
          <div className="w-full p-8 border border-neutral-200 bg-white mb-12">
            <p className="text-sm uppercase tracking-widest font-semibold text-neutral-400 mb-2">Final Score</p>
            <div className="text-7xl font-light tracking-tighter">
              {Math.round((score / activeExam.questions.length) * 100)}<span className="text-4xl text-neutral-300">%</span>
            </div>
            <p className="text-neutral-500 mt-4 font-medium">
              {score} correct out of {activeExam.questions.length} questions
            </p>
          </div>

          <div className="flex gap-4 w-full">
             <button 
                onClick={() => setView('list')}
                className="flex-1 py-4 border border-neutral-200 hover:border-black transition-colors font-semibold"
              >
                Done
              </button>
              <button 
                onClick={() => startQuiz(activeExam)}
                className="flex-1 py-4 bg-black text-white hover:bg-neutral-800 transition-colors font-semibold"
              >
                Try Again
              </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
