import React, { useState, useRef, useEffect } from 'react';
import { bookPages } from './content';
import { QABoard } from './components/QABoard';
import { PageContent } from './types';

// Background music URL - Erik Satie: Gymnopédie No. 1
// Source: Wikimedia Commons (Kevin MacLeod performance) - Transcoded to MP3 for maximum compatibility
const BGM_URL = "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b5/Gymnopedie_No._1_%28Satie%29_-_Kevin_MacLeod.ogg/Gymnopedie_No._1_%28Satie%29_-_Kevin_MacLeod.ogg.mp3";

// Helper to determine total sheets
const TOTAL_SHEETS = Math.ceil(bookPages.length / 2);

const App: React.FC = () => {
  const [flippedCount, setFlippedCount] = useState(0); // 0 means cover is closed (all sheets on right)
  const [flippingIndex, setFlippingIndex] = useState<number | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Attempt to start audio on first interaction
  const startAudio = () => {
    if (audioRef.current) {
        // We only try to play if it's currently paused
        if (audioRef.current.paused) {
            audioRef.current.play().catch(e => {
                // Log only the message to avoid circular structure errors when logging DOM objects
                console.log("Auto-play blocked, waiting for user click.");
            });
        }
    }
  };

  // Reliable toggle function based on actual DOM state
  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Play started successfully
        }).catch(error => {
          console.error("Audio play failed:", error instanceof Error ? error.message : "Unknown error");
        });
      }
    } else {
      audio.pause();
    }
  };

  const handleNext = () => {
    // Try to play audio on the first interaction (opening the book)
    if (!hasInteracted) {
        setHasInteracted(true);
        startAudio();
    }

    if (flippedCount < TOTAL_SHEETS) {
      setFlippingIndex(flippedCount);
      setFlippedCount(prev => prev + 1);
      setTimeout(() => setFlippingIndex(null), 1000); // Sync with CSS transition duration
    }
  };

  const handlePrev = () => {
    if (flippedCount > 0) {
      setFlippingIndex(flippedCount - 1);
      setFlippedCount(prev => prev - 1);
      setTimeout(() => setFlippingIndex(null), 1000);
    }
  };

  const handleJumpToCover = () => {
    setFlippedCount(0);
  };

  const handleJumpToQA = () => {
    if (!hasInteracted) {
        setHasInteracted(true);
        startAudio();
    }
    setFlippedCount(TOTAL_SHEETS);
  };

  return (
    <div className="h-screen w-full bg-stone-900 flex items-center justify-center overflow-hidden relative font-sans">
        
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-40 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none"></div>
      
      {/* Hidden Audio Element - Removed crossOrigin to prevent CORS errors on redirects */}
      <audio 
        ref={audioRef} 
        src={BGM_URL} 
        loop 
        preload="auto"
        onPlay={() => setIsAudioPlaying(true)}
        onPause={() => setIsAudioPlaying(false)}
        onError={() => console.log("Audio source failed to load.")}
      />

      {/* Audio Control Button - Z-Index 100 to ensure it's on top */}
      <button 
        onClick={(e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            toggleAudio(); 
        }}
        className={`fixed top-4 right-4 z-[100] p-3 rounded-full shadow-lg transition-all border backdrop-blur-sm cursor-pointer hover:scale-105 active:scale-95 ${isAudioPlaying ? 'bg-orange-800/80 text-orange-100 border-orange-600' : 'bg-gray-800/80 text-gray-400 border-gray-600'}`}
        title={isAudioPlaying ? "暂停音乐" : "播放音乐"}
        aria-label={isAudioPlaying ? "Pause Music" : "Play Music"}
      >
        {isAudioPlaying ? (
            <div className="flex space-x-1 items-end h-4 w-4 justify-center pointer-events-none">
                <div className="w-1 bg-orange-200 animate-[bounce_1s_infinite] h-2"></div>
                <div className="w-1 bg-orange-200 animate-[bounce_1.2s_infinite] h-4"></div>
                <div className="w-1 bg-orange-200 animate-[bounce_0.8s_infinite] h-3"></div>
            </div>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
        )}
      </button>

      {/* Book Container 
          Dimensions Logic:
          - w-[min(95vw,1200px,135vh)] 
            1. 95vw: Never wider than 95% of screen width.
            2. 1200px: Never wider than design max.
            3. 135vh: Since height = width / 1.5, we ensure height <= 90vh (90 * 1.5 = 135).
            This ensures the book always fits completely within the viewport.
      */}
      <div className="relative shadow-2xl book-perspective select-none w-[min(95vw,1200px,135vh)] aspect-[1.5/1]">
        
        {/* Book Spine (Visual only) */}
        <div className="absolute left-1/2 top-[1%] bottom-[1%] w-8 sm:w-10 -ml-4 sm:-ml-5 bg-orange-950 rounded-l shadow-2xl z-0 transform translate-z-[-4px]"></div>

        {/* Sheets */}
        {Array.from({ length: TOTAL_SHEETS }).map((_, index) => {
          let zIndex = 0;
          if (index === flippingIndex) {
            zIndex = 100;
          } else if (index < flippedCount) {
            zIndex = index;
          } else {
            zIndex = TOTAL_SHEETS - index; 
          }

          const isFlipped = index < flippedCount;
          
          return (
            <Sheet 
              key={index}
              index={index}
              frontPage={bookPages[index * 2]}
              backPage={bookPages[index * 2 + 1]}
              zIndex={zIndex}
              isFlipped={isFlipped}
              onNext={handleNext}
              onPrev={handlePrev}
              onJumpCover={handleJumpToCover}
              onJumpQA={handleJumpToQA}
              totalSheets={TOTAL_SHEETS}
            />
          );
        })}
      </div>
    </div>
  );
};

interface SheetProps {
  index: number;
  frontPage?: PageContent;
  backPage?: PageContent;
  zIndex: number;
  isFlipped: boolean;
  onNext: () => void;
  onPrev: () => void;
  onJumpCover: () => void;
  onJumpQA: () => void;
  totalSheets: number;
}

const Sheet: React.FC<SheetProps> = ({ 
  index, 
  frontPage, 
  backPage, 
  zIndex, 
  isFlipped, 
  onNext, 
  onPrev,
  onJumpCover,
  onJumpQA,
  totalSheets
}) => {
  const isCoverSheet = index === 0;

  return (
    <div 
      className="absolute top-0 right-0 w-1/2 h-full page-3d duration-1000 ease-in-out cursor-default"
      style={{ 
        zIndex,
        transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* FRONT OF SHEET (Right Page) */}
      <div className={`absolute inset-0 rounded-r-md shadow-2xl page-front overflow-hidden border-l-0 backface-hidden ${isCoverSheet ? 'bg-[#5c2e2e] border-none' : 'bg-[#fdf6e3] border border-stone-300'}`}>
        {/* Binding Shadow */}
        <div className={`absolute left-0 top-0 bottom-0 w-[5%] bg-gradient-to-r ${isCoverSheet ? 'from-black/40' : 'from-black/10'} to-transparent pointer-events-none z-10`}></div>
        
        {/* Content Wrapper */}
        <div className="h-full flex flex-col relative">
          {frontPage ? (
            <BookPageContent page={frontPage} />
          ) : (
            <div className="flex-1 bg-orange-100/50"></div> 
          )}

          {/* Controls Footer (Right Page) */}
          {!isCoverSheet && (
            <div className="h-[10%] min-h-[40px] border-t border-stone-200/60 flex justify-between items-center px-4 sm:px-6 bg-[#fbf3db] text-[10px] sm:text-xs">
               {/* Left: Page ID */}
               <div className="text-stone-400 font-serif italic w-8">
                 {frontPage?.id}
               </div>
               
               {/* Center: Jump Link */}
               {!frontPage?.isInteractive && (
                   <button 
                       onClick={(e) => { e.stopPropagation(); onJumpQA(); }}
                       className="text-orange-800/60 hover:text-orange-800 hover:underline font-serif tracking-widest uppercase transition-colors"
                   >
                       ↬ 互动留言
                   </button>
               )}
               
               {/* Right: Next Button */}
               <div className="w-8 flex justify-end">
               {frontPage && frontPage.id < 30 && (
                   <div className="flex items-center gap-2">
                      <span className="text-orange-400 opacity-60 animate-pulse hidden md:block">点击页码翻页 👉</span>
                      <button 
                          onClick={(e) => { e.stopPropagation(); onNext(); }}
                          className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-serif font-bold shadow-sm border border-orange-200 transition-colors"
                      >
                          {frontPage.id}
                      </button>
                   </div>
               )}
               </div>
            </div>
          )}
          
          {/* Cover Navigation Overlay */}
          {isCoverSheet && (
             <div className="absolute inset-0 flex items-end justify-end p-8 z-20 pointer-events-none">
                <button 
                    onClick={(e) => { e.stopPropagation(); onNext(); }}
                    className="pointer-events-auto group flex items-center gap-2 text-orange-100 bg-black/20 hover:bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-200/30 transition-all hover:scale-105"
                >
                    <span className="text-sm font-serif tracking-widest">开始阅读</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
             </div>
          )}
        </div>
      </div>

      {/* BACK OF SHEET (Left Page) */}
      <div 
        className="absolute inset-0 bg-[#fdf6e3] rounded-l-md shadow-md page-back overflow-hidden border border-r-0 border-stone-300"
        style={{ transform: 'rotateY(180deg)' }}
      >
        {/* Binding Shadow */}
        <div className="absolute right-0 top-0 bottom-0 w-[5%] bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-10"></div>

        <div className="h-full flex flex-col relative">
          {backPage ? (
            <BookPageContent page={backPage} />
          ) : (
            <div className="flex-1 bg-orange-100/50"></div>
          )}

          {/* Controls Footer (Left Page) */}
          <div className="h-[10%] min-h-[40px] border-t border-stone-200/60 flex justify-between items-center px-4 sm:px-6 bg-[#fbf3db] text-[10px] sm:text-xs">
             {/* Left: Prev Button */}
             <div className="w-auto flex justify-start">
                 {backPage && (
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPrev(); }}
                            className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-serif font-bold shadow-sm border border-orange-200 transition-colors"
                        >
                            {backPage.id}
                        </button>
                        <span className="text-orange-400 opacity-60 animate-pulse hidden md:block">👈 点击页码翻页</span>
                     </div>
                 )}
             </div>

             {/* Center: Jump Links */}
             <div className="flex gap-4 text-orange-800/60 font-serif tracking-widest uppercase">
                 <button onClick={(e) => {e.stopPropagation(); onJumpCover();}} className="hover:text-orange-800 hover:underline transition-colors">⌂ 封面</button>
                 {!backPage?.isInteractive && (
                     <button onClick={(e) => {e.stopPropagation(); onJumpQA();}} className="hover:text-orange-800 hover:underline transition-colors">↬ 留言</button>
                 )}
             </div>
             
             {/* Right: Page ID */}
             <div className="text-stone-400 font-serif italic w-auto text-right">
               {backPage?.id}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookPageContent: React.FC<{ page: PageContent }> = ({ page }) => {
  if (page.isInteractive) {
    return (
        <div className="flex-1 overflow-hidden p-2">
            <QABoard />
        </div>
    );
  }

  const isCover = page.isCover;

  if (isCover) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-[url('https://www.transparenttextures.com/patterns/leather.png')] text-orange-100 relative overflow-hidden">
            {/* Ornate Border */}
            <div className="absolute inset-2 sm:inset-4 border-2 border-orange-300/30 rounded-sm pointer-events-none"></div>
            <div className="absolute inset-4 sm:inset-6 border border-orange-300/20 rounded-sm pointer-events-none"></div>
            
            {/* Corners */}
            <div className="absolute top-4 left-4 w-12 h-12 sm:w-16 sm:h-16 border-t-4 border-l-4 border-orange-400/40 rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-12 h-12 sm:w-16 sm:h-16 border-t-4 border-r-4 border-orange-400/40 rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 sm:w-16 sm:h-16 border-b-4 border-l-4 border-orange-400/40 rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-16 sm:h-16 border-b-4 border-r-4 border-orange-400/40 rounded-br-lg"></div>

            {/* Title Section */}
            <div className="text-center z-10 mt-6 sm:mt-10">
                <h2 className="text-orange-300 text-[10px] sm:text-xs tracking-[0.5em] uppercase mb-2 sm:mb-4 opacity-80 font-serif">Interactive E-Book</h2>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 font-['Ma_Shan_Zheng'] text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-md" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    多迷走<br/>神经理论
                </h1>
                <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent mx-auto my-4 sm:my-6"></div>
                <p className="text-base sm:text-xl font-serif text-orange-100/90 tracking-wide">
                    （下）
                </p>
            </div>

            {/* Subtitle / content */}
            <div className="mt-8 sm:mt-12 max-w-md text-center z-10 px-4">
                <div 
                    className="text-orange-200/80 font-serif leading-relaxed text-xs sm:text-sm md:text-base border-t border-b border-orange-400/30 py-4"
                    dangerouslySetInnerHTML={{ __html: page.content || '' }}
                />
            </div>

            {/* Author/Footer on cover */}
            <div className="absolute bottom-6 sm:bottom-8 text-center w-full z-10">
                <p className="text-[10px] sm:text-xs text-orange-400/60 uppercase tracking-widest font-serif">Polyvagal Theory Series</p>
            </div>
        </div>
      );
  }

  return (
    <div className="flex-1 p-6 sm:p-10 md:p-12 overflow-y-auto scrollbar-hide flex flex-col">
      {/* Header/Title */}
      <div className="mb-4 sm:mb-6 border-b-2 border-stone-800/10 pb-2 sm:pb-4">
        <h2 className="text-lg sm:text-2xl font-bold text-stone-800 font-serif">{page.title}</h2>
      </div>

      {/* Image if exists */}
      {page.image && (
        <div className="mb-4 sm:mb-6 self-center w-full flex justify-center">
            <img 
                src={page.image} 
                alt={page.title} 
                className="rounded shadow-lg max-h-[150px] sm:max-h-[250px] object-cover sepia-[.2]"
            />
        </div>
      )}

      {/* Text Content */}
      <div 
        className="prose prose-stone prose-sm sm:prose-base max-w-none font-serif leading-loose text-stone-700 text-justify"
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
      
      {/* Decoration */}
      <div className="mt-auto pt-4 sm:pt-8 flex justify-center opacity-30">
        <span className="text-xl sm:text-2xl text-stone-400">❦</span>
      </div>
    </div>
  );
};

export default App;