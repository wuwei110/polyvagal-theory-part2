import React, { useState, useEffect } from 'react';
import { subscribeToQA, addQuestion, replyToQuestion, deleteQuestion, isLocalMode } from '../firebase';
import { QAItem } from '../types';

const MY_QUESTIONS_KEY = 'my_qa_ids';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
const ITEMS_PER_PAGE = 5;

export const QABoard: React.FC = () => {
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nickname, setNickname] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  
  // Admin State (Persisted)
  const [isAdmin, setIsAdmin] = useState(() => {
      try {
          return localStorage.getItem('qa_is_admin') === 'true';
      } catch { return false; }
  });
  const [showPwdInput, setShowPwdInput] = useState(false);
  const [pwdValue, setPwdValue] = useState('');
  
  // Reply State
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  
  // User's Own Questions State
  const [myQuestionIds, setMyQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToQA((data, error) => {
      if (error) {
          console.error("Subscription Error:", error);
          setConnectionError(error);
          // Don't clear data immediately on error to show cached if available
      } else {
          setQuestions(data);
          setConnectionError(null);
          // Debug logs
          console.log("QABoard Updated. Items:", data.length);
          if (data.length > 0) console.log("Sample ID:", data[0].id);
      }
    });

    // Load user's own question IDs from local storage
    try {
        const storedIds = localStorage.getItem(MY_QUESTIONS_KEY);
        if (storedIds) {
            const parsed = JSON.parse(storedIds);
            setMyQuestionIds(parsed);
            console.log("Loaded My IDs:", parsed);
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
          localStorage.removeItem('qa_is_admin');
          setPwdValue('');
      } else {
          // Show input field
          setShowPwdInput(true);
      }
  };

  const handlePwdSubmit = () => {
      if (pwdValue === ADMIN_PASSWORD) {
          setIsAdmin(true);
          localStorage.setItem('qa_is_admin', 'true');
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
    
    try {
        // Add question and get ID (With timeout)
        const newId = await addQuestion(nickname, newQuestion);
        console.log("Submitted New Question. ID:", newId);
        
        // Update local list of own questions
        const updatedMyIds = [...myQuestionIds, newId];
        setMyQuestionIds(updatedMyIds);
        localStorage.setItem(MY_QUESTIONS_KEY, JSON.stringify(updatedMyIds));

        setNewQuestion('');
    } catch (error) {
        console.error("Submit error:", error);
        alert(`提交失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText[id]?.trim()) return;
    await replyToQuestion(id, replyText[id]);
    setReplyText({ ...replyText, [id]: '' });
  };

  const handleDelete = async (id: string) => {
      if (window.confirm("确定要删除这条提问吗？此操作无法撤销。")) {
          try {
              await deleteQuestion(id);
          } catch (error) {
              console.error("Delete failed:", error);
              alert(`删除失败: ${error instanceof Error ? error.message : '网络超时或无权限'}`);
          }
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
    <div className="flex flex-col md:h-full h-auto bg-white p-2 sm:p-4 md:overflow-hidden overflow-visible rounded-lg shadow-inner relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-4 border-b pb-2 select-none gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 font-serif flex-shrink-0">
            读者互动看板
        </h2>
        
        <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
            {/* Status Indicator */}
            {isLocalMode ? (
                <div className="text-xs px-2 py-1.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1 font-bold" title="未检测到腾讯云开发配置，使用本地存储">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                    本地模式 (无同步)
                </div>
            ) : connectionError ? (
                <div className="text-xs px-2 py-1.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-bold animate-pulse" title={connectionError}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    连接失败
                </div>
            ) : (
                <div className="text-xs px-2 py-1.5 rounded bg-green-50 text-green-700 border border-green-200 flex items-center gap-1 font-bold" title="已连接腾讯云开发">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    云端已连接
                </div>
            )}

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
      <div className="md:flex-1 md:overflow-y-auto overflow-visible scrollbar-hide mb-4 space-y-4 pr-2">
        {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-400 gap-2">
                <p className="italic">
                    {connectionError ? `连接断开: ${connectionError}` : '暂无提问，欢迎留言...'}
                </p>
                {connectionError && (
                    <button 
                        onClick={() => window.location.reload()} 
                        className="text-xs text-blue-500 underline"
                    >
                        刷新重试
                    </button>
                )}
            </div>
        ) : (
            questions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((q) => {
                const isMyQuestion = myQuestionIds.includes(q.id);
                // Highlight logic
                const containerClass = `p-3 rounded border relative group transition-colors duration-500 
                    ${q.pending ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 
                      isMyQuestion ? 'bg-blue-50 border-blue-100' : 
                      'bg-orange-50 border-orange-100'}`;

                return (
                <div key={q.id} className={containerClass}>
                    {/* Delete Button (Only for own questions or Admin) */}
                    {(isMyQuestion || isAdmin) && (
                        <button 
                            // Use onPointerUp for better mobile touch response
                            onPointerUp={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(q.id);
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-2 z-20 cursor-pointer active:scale-125 transition-transform"
                            title="删除"
                            aria-label="删除此留言"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}

                    <div className="flex justify-between items-baseline mb-1 pr-6">
                        <span className={`font-bold text-sm ${isMyQuestion ? 'text-blue-800' : 'text-orange-800'}`}>
                            {q.nickname} 
                            {isMyQuestion && <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-1">我</span>}
                            {isAdmin && <span className="text-[8px] text-gray-300 ml-1 font-mono">{q.id.slice(0,4)}</span>}
                            {q.pending && <span className="text-[10px] text-orange-600 ml-2 animate-pulse font-bold flex items-center gap-1">
                                <span className="w-2 h-2 bg-orange-500 rounded-full"></span> 
                                发送中... (若长时间未消失请检查网络)
                            </span>}
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
            className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50 resize-none h-12 sm:h-16"
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
