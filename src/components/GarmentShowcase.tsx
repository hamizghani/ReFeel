import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ArrowCounterClockwise, Pause, Play, Sparkle } from '@phosphor-icons/react';
import type { Listing } from '../domain';
import { animatedVariant } from '../cloth/presentation';
import PhotoGallery from './PhotoGallery';

const AnimatedGarment=lazy(()=>import('./AnimatedGarment'));
const actions=[{step:0,label:'Full garment'},{step:3,label:'Hang & sway'},{step:4,label:'Gentle pull'}];

export default function GarmentShowcase({listing}:{listing:Listing}) {
  const variant=animatedVariant(listing);
  const [view,setView]=useState<'motion'|'photos'>(variant?'motion':'photos');
  const [step,setStep]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const [playing,setPlaying]=useState(true);
  const [resetKey,setResetKey]=useState(0);
  const [failed,setFailed]=useState(false);
  const [modelReady,setModelReady]=useState(false);
  const ready=useCallback(()=>setModelReady(true),[]);
  useEffect(()=>setModelReady(false),[view]);
  useEffect(()=>{
    if(!playing||view!=='motion'||!modelReady)return;
    let raf=0;const began=performance.now()-elapsed*1000;
    const tick=(now:number)=>{const t=Math.min(6,(now-began)/1000);setElapsed(t);if(t>=6)setPlaying(false);else raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[playing,view,step,resetKey,modelReady]);
  const fail=useCallback(()=>{setFailed(true);setPlaying(false);setView('photos');},[]);
  const replay=(nextStep=step)=>{setStep(nextStep);setElapsed(0);setResetKey(v=>v+1);setPlaying(true);setView('motion');};
  if(!variant)return <PhotoGallery listing={listing}/>;
  return <section className="garment-showcase" aria-label={`${listing.name} photos and motion`}>
    <div className="garment-view-tabs" role="group" aria-label="Choose garment presentation">
      <button aria-pressed={view==='motion'} onClick={()=>setView('motion')}><Sparkle size={17}/>Explore garment</button>
      <button aria-pressed={view==='photos'} onClick={()=>setView('photos')}>Original photos</button>
    </div>
    {failed&&<p className="showcase-notice" role="status">The motion example could not open. The original photographs are still available.</p>}
    {view==='motion'?<>
      <div className="showcase-stage"><Suspense fallback={<div className="showcase-loading" role="status">Preparing your closer look…</div>}><AnimatedGarment variant={variant} step={step} playing={playing} progress={elapsed/6} resetKey={resetKey} interactive onReady={ready} onError={fail}/></Suspense></div>
      <div className="showcase-actions" role="group" aria-label="Choose a fabric demonstration">{actions.map(action=><button key={action.step} aria-pressed={step===action.step} onClick={()=>replay(action.step)}>{action.label}</button>)}</div>
      <div className="showcase-playback"><span>{Math.min(6,Math.floor(elapsed))} / 6 sec</span><button onClick={()=>elapsed>=6?replay():setPlaying(!playing)}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'Pause':elapsed>=6?'Replay':'Play'}</button><button onClick={()=>replay()} aria-label="Replay garment demonstration"><ArrowCounterClockwise size={18}/></button></div>
      <p className="showcase-caption">Animated example · rotate and zoom to explore. Original photos show the garment and its condition.</p>
    </>:<PhotoGallery listing={listing}/>}
  </section>;
}
