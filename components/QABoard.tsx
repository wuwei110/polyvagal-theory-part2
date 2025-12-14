import React, { useState, useEffect } from 'react';
import { subscribeToQA, addQuestion, replyToQuestion, deleteQuestion } from '../firebase';
import { QAItem } from '../types';

const MY_QUESTIONS_KEY = 'my_qa_ids';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
const ITEMS_PER_PAGE = 5;

export const QABoard: React.FC = () => {
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [nickname, setNickname] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPwdInput, setShowPwdInput] = useState(false);
  const [pwdValue, setPwdValue] = useState('');
  
  // Reply State
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  
  // User's Own Questions State
  const [myQuestionIds, setMyQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToQA((data) => {
      setQuestions(data);
    });

    // Load user's own question IDs from local storage
    try {
        const storedIds = localStorage.getItem(MY_QUESTIONS_KEY);
        if (storedIds) {
            setMyQuestionIds(JSON.parse(storedIds));
        }
    } catch (e) {
        console.error("Failed to load my questions", e);
    }

    return () => unsubscribe();
  }, []);

  const handleAdminToggle = () => {
      if (isAdmin) {
          // Logout
          setIsAdmin(false);
          setPwdValue('');
      } else {
          // Show input field
          setShowPwdInput(true);
      }
  };

  const handlePwdSubmit = () => {
      if (pwdValue === ADMIN_PASSWORD) {
          setIsAdmin(true);
          setShowPwdInput(false);
          setPwdValue('');
      } else {
          alert("你无权进入管理员模式！");
          setPwdValue('');
      }
  };

  const handleCancelAdmin = () => {
      setShowPwdInput(false);
      setPwdValue('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !newQuestion.trim()) return;
    
    // Add question and get ID
    const newId = await addQuestion(nickname, newQuestion);
    
    // Update local list of own questions
    const updatedMyIds = [...myQuestionIds, newId];
    setMyQuestionIds(updatedMyIds);
    localStorage.setItem(MY_QUESTIONS_KEY, JSON.stringify(updatedMyIds));

    setNewQuestion('');
  };

  const handleReply = async (id: string) => {
    if (!replyText[id]?.trim()) return;
    await replyToQuestion(id, replyText[id]);
    setReplyText({ ...replyText, [id]: '' });
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("确定要删除这条提问吗？此操作无法撤销。")) {
          await deleteQuestion(id);
      }
  };

  const downloadData = () => {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "qa_board_backup.json";
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-white p-4 overflow-hidden rounded-lg shadow-inner relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b pb-2 select-none gap-2">
        <h2 className="text-xl font-bold text-gray-800 font-serif flex-shrink-0">
            读者互动看板
        </h2>
        
        <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
            {/* Backup Button - Admin Only */}
            {isAdmin && (
                <button 
                    onClick={downloadData}
                    className="text-xs px-2 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition-colors"
                    title="保存数据到本地"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    备份数据
                </button>
            )}

            {/* Admin Controls */}
            {showPwdInput ? (
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-300 animate-in fade-in slide-in-from-right-2">
                    <input 
                        type="password"
                        value={pwdValue}
                        onChange={(e) => setPwdValue(e.target.value)}
                        placeholder="输入admin"
                        className="w-20 text-xs px-1 py-1 border rounded focus:outline-none focus:border-orange-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handlePwdSubmit()}
                    />
                    <button onClick={handlePwdSubmit} className="bg-orange-600 text-white text-xs px-2 py-1 rounded hover:bg-orange-700">OK</button>
                    <button onClick={handleCancelAdmin} className="text-gray-500 text-xs px-1 hover:text-gray-700">✕</button>
                </div>
            ) : (
                <button 
                    onClick={handleAdminToggle}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${isAdmin ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${isAdmin ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-400'}`}>
                        {isAdmin && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                    <span className="text-xs font-medium">{isAdmin ? '管理员在线' : '管理员模式'}</span>
                </button>
            )}
        </div>
      </div>

      {/* Question List Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide mb-4 space-y-4 pr-2">
        {questions.length === 0 ? (
            <p className="text-center text-gray-400 italic mt-10">暂无提问，欢迎留言...</p>
        ) : (
            questions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((q) => {
                const isMyQuestion = myQuestionIds.includes(q.id);
                
                return (
                <div key={q.id} className={`p-3 rounded border relative group ${isMyQuestion ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                    {/* Delete Button (Only for own questions or Admin) */}
                    {(isMyQuestion || isAdmin) && (
                        <button 
                            onClick={() => handleDelete(q.id)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 z-10"
                            title="删除"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}

                    <div className="flex justify-between items-baseline mb-1 pr-6">
                        <span className={`font-bold text-sm ${isMyQuestion ? 'text-blue-800' : 'text-orange-800'}`}>
                            {q.nickname} {isMyQuestion && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-1">我</span>}
                        </span>
                        <span className="text-xs text-gray-400">
                            {q.timestamp ? new Date(q.timestamp * 1000).toLocaleDateString() : '刚刚'}
                        </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap break-words">{q.question}</p>
                    
                    {q.isReplied && (
                    <div className="bg-white p-2 rounded border-l-4 border-green-400 mt-2">
                        <p className="text-xs font-bold text-green-700 mb-1">作者回复：</p>
                        <p className="text-gray-600 text-sm">{q.reply}</p>
                    </div>
                    )}

                    {isAdmin && !q.isReplied && (
                    <div className="mt-2 flex gap-2">
                        <input
                        type="text"
                        value={replyText[q.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
                        placeholder="输入回复..."
                        className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                        <button
                        onClick={() => handleReply(q.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                        回复
                        </button>
                    </div>
                    )}
                </div>
            )})
        )}
        
        {/* Pagination */}
        {questions.length > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center gap-2 mt-4 pt-2 border-t border-dashed border-gray-200">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200"
                >
                    上一页
                </button>
                <span className="text-xs text-gray-500">
                    {currentPage} / {Math.ceil(questions.length / ITEMS_PER_PAGE)}
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(questions.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(questions.length / ITEMS_PER_PAGE)}
                    className="text-xs px-2 py-1 rounded bg-gray-100 disabled:opacity-50 hover:bg-gray-200"
                >
                    下一页
                </button>
            </div>
        )}
      </div>

      {/* Submission Area */}
      <form onSubmit={handleSubmit} className="border-t pt-3">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-1/3 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50"
            maxLength={10}
          />
        </div>
        <div className="flex gap-2">
          <textarea
            placeholder="请输入您的问题..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50 resize-none h-16"
            maxLength={200}
          />
          <button
            type="submit"
            className="bg-orange-600 text-white px-4 rounded hover:bg-orange-700 transition-colors text-sm font-serif writing-vertical-lr"
          >
            提交
          </button>
        </div>
      </form>
    </div>
  );
};
