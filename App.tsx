
import React, { useState, useEffect, useCallback } from 'react';
import Globe from './components/Globe';
import CountrySidebar from './components/CountrySidebar';
import ThreeBackground from './components/ThreeBackground';
import { CountryInfo, VideoState } from './types';
import { getCountryData, generateCinematicZoom } from './services/geminiService';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [phase, setPhase] = useState<'intro' | 'revealing' | 'narrative' | 'explore'>('intro');
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const startJourney = useCallback(async () => {
    setPhase('revealing');
    
    // Zoom through UMOJA text takes 2.5s.
    // We wait 2.5s to start the Narrative zoom onto the first country.
    setTimeout(async () => {
      setPhase('narrative');
      setIsLoading(true);
      try {
        const data = await getCountryData('Kenya');
        setCountryInfo(data);
      } catch (e) {
        console.error(e);
        setPhase('explore'); 
      } finally {
        setIsLoading(false);
      }
    }, 2500);
  }, []);

  const handleCountrySelect = useCallback(async (name: string) => {
    setPhase('explore');
    setIsLoading(true);
    setVideoState({ status: 'idle' });
    try {
      const info = await getCountryData(name);
      setCountryInfo(info);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerateVideo = async () => {
    if (!countryInfo) return;
    
    if (needsApiKey && window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
    }

    setVideoState({ status: 'loading', progressMessage: "Initiating Vision..." });
    try {
      const url = await generateCinematicZoom(
        countryInfo.name, 
        countryInfo.landscapeDescription,
        (msg) => setVideoState(prev => ({ ...prev, progressMessage: msg }))
      );
      setVideoState({ status: 'completed', url });
    } catch (err: any) {
      console.error("Video generation error:", err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setNeedsApiKey(true);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      }
      setVideoState({ status: 'error', error: "Transmission failed." });
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen bg-[#020205] text-white selection:bg-amber-500/30 overflow-hidden"
    >
      {/* Cinematic 3D Background */}
      <ThreeBackground mousePos={mousePos} phase={phase} />
      
      {/* New Realistic 3D Globe Layer */}
      {(phase !== 'intro') && (
        <div className={`absolute inset-0 z-10 ${phase === 'revealing' ? 'reveal-earth' : ''}`}>
          <Globe 
            onCountrySelect={handleCountrySelect} 
            targetCoordinates={countryInfo?.coordinates}
            isCinematicMode={phase === 'narrative'}
            isRevealing={phase === 'revealing'}
          />
        </div>
      )}

      {/* Intro Overlay */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center bg-transparent">
          <div className="max-w-3xl space-y-8 relative">
            <h1 
              style={{ 
                transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
                transition: 'transform 0.4s cubic-bezier(0.2, 0, 0.2, 1)' 
              }}
              className="title-font text-8xl md:text-9xl font-bold tracking-tighter text-white/90 drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            >
              UMOJA
            </h1>
            <p 
              style={{ 
                transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)`,
                transition: 'transform 0.6s cubic-bezier(0.2, 0, 0.2, 1)' 
              }}
              className="text-amber-500 font-mono tracking-[0.5em] text-xs uppercase animate-pulse"
            >
              One World • One People • One Spirit
            </p>
            <div className="h-px w-24 bg-white/20 mx-auto"></div>
            <p 
              style={{ 
                transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px)`,
                transition: 'transform 0.8s cubic-bezier(0.2, 0, 0.2, 1)' 
              }}
              className="text-xl text-white/40 font-light max-w-lg mx-auto leading-relaxed"
            >
              We are defined not by our borders, but by the stories that connect us across the deep blue.
            </p>
            <button 
              onClick={startJourney}
              className="mt-12 px-12 py-4 border border-white/10 hover:border-amber-500 hover:text-amber-500 transition-all text-white tracking-[0.4em] text-sm rounded-full bg-white/5 backdrop-blur-sm relative z-10 hover:scale-105 active:scale-95"
            >
              BEGIN THE RETURN
            </button>
          </div>
          <div className="absolute bottom-12 text-[10px] text-white/20 uppercase tracking-[0.2em]">
            A Cinematic Gateway into Global Heritage
          </div>
        </div>
      )}

      {/* Revealing Phase Text (Zooming past it) */}
      {phase === 'revealing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
          <h1 className="title-font text-8xl md:text-9xl font-bold tracking-tighter text-white/90 zoom-through">
            UMOJA
          </h1>
        </div>
      )}

      {/* Narrative Reveal */}
      {phase === 'narrative' && !isLoading && countryInfo && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
            <div className="text-center animate-in fade-in zoom-in duration-1000 delay-700">
                <h2 className="title-font text-6xl text-white mb-2">{countryInfo.name}</h2>
                <p className="text-amber-500 tracking-[0.3em] text-xs uppercase mb-8">{countryInfo.culturalEssence}</p>
                <button 
                    onClick={() => setPhase('explore')}
                    className="pointer-events-auto px-8 py-3 bg-white text-black text-[10px] tracking-[0.3em] font-bold rounded-sm hover:bg-amber-500 transition-colors"
                >
                    EXPLORE HERITAGE
                </button>
            </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6">
            <div className="w-8 h-8 border-t-2 border-amber-500 rounded-full animate-spin"></div>
            <p className="text-amber-500 font-mono text-[10px] tracking-widest uppercase animate-pulse">
                Crossing Continents...
            </p>
          </div>
        </div>
      )}

      {/* UI Elements for Explore Phase */}
      {phase === 'explore' && countryInfo && !isLoading && (
        <CountrySidebar 
          data={countryInfo} 
          onGenerateVideo={handleGenerateVideo}
          videoState={videoState}
          onClose={() => setCountryInfo(null)}
        />
      )}

      {/* Floating Search (Only in Explore) */}
      {phase === 'explore' && (
        <div className="absolute top-12 left-12 z-20 w-full max-w-xs animate-in slide-in-from-left duration-500">
           <form 
             onSubmit={(e) => {
               e.preventDefault();
               const input = (e.target as any).search.value;
               if (input) handleCountrySelect(input);
             }} 
             className="relative group"
           >
             <input 
               name="search"
               type="text" 
               placeholder="DISCOVER ANOTHER STORY" 
               className="w-full bg-black/40 border border-white/5 rounded-full px-6 py-3 focus:outline-none focus:border-amber-500/50 backdrop-blur-md transition-all placeholder:text-white/20 text-xs tracking-widest uppercase text-white shadow-2xl"
             />
             <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-amber-500 transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
             </button>
           </form>
           <button 
             onClick={() => setPhase('intro')}
             className="mt-4 text-[9px] text-white/20 hover:text-white transition-colors tracking-widest uppercase"
           >
             ← BACK TO UNITY
           </button>
        </div>
      )}

      <div className="absolute bottom-8 right-8 text-white/10 text-[9px] tracking-widest uppercase pointer-events-none z-30">
        Umoja Project // Orbital Vision V1.0
      </div>
    </div>
  );
};

export default App;
