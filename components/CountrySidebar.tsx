
import React from 'react';
import { CountryInfo, VideoState } from '../types';

interface Props {
  data: CountryInfo;
  onGenerateVideo: () => void;
  videoState: VideoState;
  onClose: () => void;
}

const CountrySidebar: React.FC<Props> = ({ data, onGenerateVideo, videoState, onClose }) => {
  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[450px] bg-black/40 backdrop-blur-3xl border-l border-white/5 p-12 flex flex-col justify-between animate-in slide-in-from-right duration-700">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div>
        <h3 className="text-amber-500 font-mono text-xs tracking-[0.3em] uppercase mb-4">The Essence of Heritage</h3>
        <h2 className="title-font text-5xl font-bold text-white mb-6 leading-tight">{data.name}</h2>
        <p className="text-xl text-white/80 leading-relaxed font-light italic mb-12">
          "{data.description}"
        </p>

        <div className="space-y-8">
          {data.facts.map((fact, idx) => (
            <div key={idx} className="group">
              <div className="flex items-baseline gap-4 mb-2">
                <span className="text-[10px] text-amber-500/50 font-mono">0{idx + 1}</span>
                <p className="text-sm text-white/60 group-hover:text-white transition-colors leading-relaxed">
                  {fact}
                </p>
              </div>
              <div className="w-full h-px bg-white/5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-12">
        {videoState.status === 'loading' ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>
              <span className="text-xs text-amber-500 font-mono uppercase tracking-[0.2em]">
                {videoState.progressMessage}
              </span>
            </div>
            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-full origin-left animate-[shimmer_3s_infinite]"></div>
            </div>
          </div>
        ) : videoState.status === 'completed' ? (
          <div className="space-y-6">
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
              <video 
                src={videoState.url} 
                className="w-full h-full object-cover" 
                autoPlay 
                loop 
                controls={false}
              />
            </div>
            <p className="text-[10px] text-center text-white/20 uppercase tracking-widest">{data.culturalEssence}</p>
          </div>
        ) : (
          <button 
            onClick={onGenerateVideo}
            className="w-full py-5 bg-white text-black title-font font-bold text-sm tracking-widest hover:bg-amber-500 hover:text-white transition-all rounded-sm flex items-center justify-center gap-4"
          >
            BEHOLD THE VISION
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default CountrySidebar;
