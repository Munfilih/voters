import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Camera, RotateCcw } from 'lucide-react';

interface PhotoModalProps {
  photoURL?: string;
  name: string;
  uploading: boolean;
  onClose: () => void;
  onPhoto: (file: File) => void;
}

export default function PhotoModal({ photoURL, name, uploading, onClose, onPhoto }: PhotoModalProps) {
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (capturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [capturing]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported on this connection. Use Gallery instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCapturing(true);
    } catch (err: any) {
      setCameraError(err?.name === 'NotAllowedError' ? 'Camera permission denied.' : err?.message || 'Camera not available');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        onPhoto(new File([blob], 'capture.jpg', { type: 'image/jpeg' }));
        stopCamera();
      }
    }, 'image/jpeg', 0.85);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-sans font-semibold text-[#1a1a1a]">{name}</h3>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-[#f5f5f0]">
            <X className="w-5 h-5 text-[#5A5A40]/40" />
          </button>
        </div>

        {/* Photo / Camera View */}
        <div className="relative rounded-2xl overflow-hidden bg-[#f5f5f0] mb-5" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${capturing ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {!capturing && (
            photoURL
              ? <img src={photoURL} alt={name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[#5A5A40]/20">
                  <Camera className="w-16 h-16" />
                </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {cameraError && (
          <p className="text-xs text-red-500 text-center mb-3">{cameraError}</p>
        )}

        {/* Actions */}
        {capturing ? (
          <div className="flex gap-3">
            <button onClick={stopCamera} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] text-sm font-bold hover:bg-[#f5f5f0] transition-colors">
              <RotateCcw className="w-4 h-4" /> Cancel
            </button>
            <button onClick={capturePhoto} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#5A5A40] text-white text-sm font-bold hover:bg-[#4a4a30] transition-colors shadow-md">
              <Camera className="w-4 h-4" /> Capture
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[#5A5A40]/20 text-[#5A5A40] text-sm font-bold hover:bg-[#f5f5f0] transition-colors cursor-pointer">
              <Upload className="w-4 h-4" /> Gallery
              <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onPhoto(e.target.files[0]); }} />
            </label>
            <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#5A5A40] text-white text-sm font-bold hover:bg-[#4a4a30] transition-colors shadow-md cursor-pointer" onClick={navigator?.mediaDevices?.getUserMedia ? startCamera : undefined}>
              <Camera className="w-4 h-4" /> Camera
              {!navigator?.mediaDevices?.getUserMedia && (
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) onPhoto(e.target.files[0]); }} />
              )}
            </label>
          </div>
        )}
      </motion.div>
    </div>
  );
}
