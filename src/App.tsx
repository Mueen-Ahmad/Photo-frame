import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Download, ZoomIn, ZoomOut, Image as ImageIcon, RotateCcw } from 'lucide-react';

const FRAME_URL = '/frame.svg';

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Interaction State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Viewport/Element Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Constants
  const CANVAS_EXPORT_SIZE = 1080;

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    const newScale = baseScale * newZoom;
    
    if (containerRef.current) {
      const cx = containerRef.current.clientWidth / 2;
      const cy = containerRef.current.clientHeight / 2;
      
      const newPanX = cx - ((cx - pan.x) / scale) * newScale;
      const newPanY = cy - ((cy - pan.y) / scale) * newScale;
      
      setPan({ x: newPanX, y: newPanY });
    }
    
    setZoomMultiplier(newZoom);
    setScale(newScale);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);

    // Calculate initial scale to "cover" the frame minimum requirement
    const img = new Image();
    img.onload = () => {
      const containerSize = containerRef.current?.clientWidth || 400; // Expected square container
      
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      
      // We want to make sure the image at least covers the transparent hole (which is roughly 70% of the area in our placeholder)
      // Actually, standard "cover" means the minimum dimension fits the bounding box.
      const initialScale = Math.max(containerSize / imgW, containerSize / imgH);
      
      setBaseScale(initialScale);
      setScale(initialScale);
      setZoomMultiplier(1);
      
      // Center the image initially
      const scaledW = imgW * initialScale;
      const scaledH = imgH * initialScale;
      setPan({
        x: (containerSize - scaledW) / 2,
        y: (containerSize - scaledH) / 2
      });
    };
    img.src = objectUrl;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    
    // Only drag with left mouse button / single touch point
    if (e.buttons !== 1 && e.button !== 0) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleDownload = async () => {
    if (!imageSrc) return;

    // We draw to an offscreen high-resolution canvas
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_EXPORT_SIZE;
    canvas.height = CANVAS_EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    try {
      // Load both images
      const frameImg = new Image();
      frameImg.crossOrigin = "anonymous";
      frameImg.src = FRAME_URL;
      
      const userImg = new Image();
      userImg.crossOrigin = "anonymous";
      userImg.src = imageSrc;
      
      await Promise.all([
        new Promise(resolve => { frameImg.onload = resolve; }),
        new Promise(resolve => { userImg.onload = resolve; })
      ]);

      // Calculate conversion scale. The user panned and scaled in the container's coordinate system.
      // We must scale those transformations up to the CANVAS_EXPORT_SIZE coordinate system.
      const displaySize = containerRef.current?.clientWidth || 400;
      const mappingRatio = CANVAS_EXPORT_SIZE / displaySize;

      // Draw the user photo FIRST (ctx.globalCompositeOperation = "source-over" by default, so it's behind the frame)
      ctx.save();
      
      // Translate to the panned position (scaled for export)
      ctx.translate(pan.x * mappingRatio, pan.y * mappingRatio);
      // Scale to match the user's interactive scale (scaled for export)
      ctx.scale(scale * mappingRatio, scale * mappingRatio);
      
      // Draw image
      ctx.drawImage(userImg, 0, 0);
      
      ctx.restore();

      // Now draw the frame overlay ON TOP
      ctx.drawImage(frameImg, 0, 0, CANVAS_EXPORT_SIZE, CANVAS_EXPORT_SIZE);

      // Trigger Download
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = 'reunion_profile.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image", err);
      alert("There was an issue generating your profile picture. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-emerald-900 border-b border-emerald-800 text-white py-6 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-amber-200 to-amber-500">
            EID REUNION 2026
          </h1>
          <p className="text-emerald-100 font-medium">Create your official profile picture!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        
        {/* Workspace Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-8 w-full max-w-[500px]">
          
          {/* Canvas Interactive Container */}
          <div 
            className="w-full relative mx-auto mb-6 bg-gray-100 rounded-2xl overflow-hidden shadow-inner border border-gray-200/60 aspect-square touch-none group"
          >
            {!imageSrc ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 transition-colors pointer-events-none">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                 <ImageIcon className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 text-lg">No photo yet</h3>
                <p className="text-sm text-gray-500 mb-6">Upload a photo to see it in the frame.</p>
                <div className="pointer-events-auto">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200 active:scale-95"
                  >
                    <UploadCloud className="w-5 h-5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Hidden Input */}
            <input 
              type="file" 
              accept="image/*"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />

            {/* The interactive area */}
            <div 
              ref={containerRef}
              className={`absolute inset-0 w-full h-full select-none ${imageSrc ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* User Image Layer */}
              {imageSrc && (
                <img 
                  src={imageSrc} 
                  alt="User Upload"
                  className="max-w-none origin-top-left pointer-events-none"
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    willChange: 'transform'
                  }}
                />
              )}

              {/* Frame Layer Overlay (Always on top, purely visual, passes clicks through) */}
              <img 
                src={FRAME_URL} 
                alt="Reunion Frame" 
                draggable={false}
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${!imageSrc && 'opacity-60 grayscale'}`} 
              />
            </div>
            
            {imageSrc && (
               <div className="absolute top-3 right-3 z-20 pointer-events-auto">
                 <button 
                   onClick={() => setImageSrc(null)}
                   className="bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-md transition"
                   title="Start over"
                 >
                   <RotateCcw className="w-4 h-4" />
                 </button>
               </div>
            )}
          </div>

          {/* Controls */}
          {imageSrc && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in mt-6">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4" />
                    Zoom & Adjust
                  </label>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">
                    {Math.round(zoomMultiplier * 100)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <ZoomOut className="w-4 h-4 text-emerald-600/60 shrink-0" />
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    step="0.05"
                    value={zoomMultiplier}
                    onChange={handleZoomChange}
                    className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <ZoomIn className="w-4 h-4 text-emerald-600/60 shrink-0" />
                </div>
                
                <p className="text-[11px] text-center text-emerald-600/70 mt-3 font-medium flex items-center justify-center gap-1">
                  <UploadCloud className="w-3 h-3" /> Drag the photo inside the frame to adjust
                </p>
              </div>

              <button 
                onClick={handleDownload}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
              >
                <Download className="w-6 h-6" />
                <span>Save Profile Picture</span>
              </button>
            </div>
          )}
          
        </div>
        
        {/* Footer info */}
        <p className="mt-8 text-sm text-emerald-800/60 font-medium text-center">
          All processing happens in your browser. No photos are uploaded to any server.
        </p>
      </main>
    </div>
  );
}
