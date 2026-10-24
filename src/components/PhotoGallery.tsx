import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ArrowsOut, Image as ImageIcon, Minus, Plus, X } from '@phosphor-icons/react';
import type { Listing } from '../domain';
import { mediaFor, type GarmentPhoto, type PhotoKind } from '../media';

export function GarmentImage({src,alt,className='',width=600,height=800,loading='lazy'}:{src:string;alt:string;className?:string;width?:number;height?:number;loading?:'lazy'|'eager'}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return failed ? <div className={`photo-unavailable ${className}`} role="status"><ImageIcon size={28} aria-hidden="true"/><span>Photo unavailable</span><button type="button" onClick={()=>setFailed(false)}>Try again</button></div> : <img className={className} src={src} alt={alt} width={width} height={height} loading={loading} onError={()=>setFailed(true)}/>;
}

export default function PhotoGallery({listing,compact=false,initialKind='front'}:{listing:Listing;compact?:boolean;initialKind?:PhotoKind}) {
  const media=mediaFor(listing.templateId||listing.id);
  const photos=media.photos;
  const initial=Math.max(0,photos.findIndex(p=>p.kind===initialKind));
  const [selected,setSelected]=useState(initial);
  const [zoom,setZoom]=useState(1);
  const [opened,setOpened]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  const photo:GarmentPhoto|undefined=photos[selected]||photos[0];
  useEffect(()=>{setSelected(initial);setZoom(1);},[listing.id,initial]);
  useEffect(()=>{if(opened)dialog.current?.querySelector<HTMLButtonElement>('[aria-label="Close photo"]')?.focus();},[opened]);
  if(!photo) return <div className="photo-unavailable">This piece’s photos are not available yet.</div>;
  const switchPhoto=(step:number)=>{setSelected((selected+step+photos.length)%photos.length);setZoom(1);};
  const open=()=>{setZoom(1);setOpened(true);dialog.current?.showModal();};
  const close=()=>{dialog.current?.close();setOpened(false);};
  return <section className={`photo-gallery ${compact?'compact':''}`} aria-label={`${listing.name} photo gallery`}>
    <div className="gallery-main">
      <button ref={opener} className="gallery-open" aria-label={`Enlarge ${photo.label.toLowerCase()} photo of ${listing.name}`} onClick={open}>
        <GarmentImage src={photo.src} alt={`${listing.name} · ${photo.label}`} width={photo.width} height={photo.height} loading="eager"/>
        <span className="gallery-expand"><ArrowsOut size={18} aria-hidden="true"/></span>
      </button>
      <span className="gallery-count">{selected+1} / {photos.length}</span>
      <span className="gallery-view-label">{photo.label}</span>
    </div>
    <div className="gallery-thumbnails" role="group" aria-label="Choose a garment view">
      {photos.map((p,i)=><button key={p.id} className={i===selected?'selected':''} aria-pressed={i===selected} aria-label={`Show ${p.label.toLowerCase()} view`} onClick={()=>setSelected(i)}>
        <GarmentImage src={p.src} alt="" width={p.width} height={p.height}/><span>{p.label}</span>
      </button>)}
    </div>
    <dialog ref={dialog} className="photo-dialog" onClose={()=>{setOpened(false);opener.current?.focus();}} aria-label={`Original ${listing.name} photo`} onKeyDown={e=>{if(e.key==='ArrowRight')switchPhoto(1);if(e.key==='ArrowLeft')switchPhoto(-1);}}>
      {opened&&<><header><div><strong>{listing.name}</strong><p>{photo.label} · {selected+1} of {photos.length}</p></div><button className="icon-button" aria-label="Close photo" onClick={close}><X size={22}/></button></header>
      <div className="photo-dialog-image" data-zoom={zoom} style={{'--photo-ratio':photo.width/photo.height,'--photo-zoom':zoom} as CSSProperties}><img src={photo.src} alt={`${listing.name} · ${photo.label}`} width={photo.width} height={photo.height}/></div>
      <footer><div className="actions"><button className="icon-button" aria-label="Previous photo" onClick={()=>switchPhoto(-1)}><ArrowLeft size={20}/></button><button className="icon-button" aria-label="Next photo" onClick={()=>switchPhoto(1)}><ArrowRight size={20}/></button></div><div className="actions"><button className="icon-button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(Math.max(1,zoom-.5))}><Minus size={19}/></button><span>{Math.round(zoom*100)}%</span><button className="icon-button" aria-label="Zoom in" disabled={zoom>=3} onClick={()=>setZoom(Math.min(3,zoom+.5))}><Plus size={19}/></button><button className="text-button" onClick={()=>setZoom(1)}>Reset</button></div><a href={photo.src} target="_blank" rel="noreferrer" className="text-link">Open full image <ArrowsOut size={16}/></a></footer></>}
    </dialog>
  </section>;
}
