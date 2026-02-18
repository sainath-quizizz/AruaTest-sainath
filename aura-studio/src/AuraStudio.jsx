import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import {
  Camera,
  Loader2,
  Sparkles,
  ImagePlus,
  Wand2,
  X,
  Flame,
  Wind,
  Zap,
  CloudFog,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  Settings,
  RotateCcw
} from 'lucide-react';

const PORTKEY_API_KEY = '7uuFM238TMkz2A0I+VvMfoZVm9l+';
const PORTKEY_BASE = 'https://api.portkey.ai/v1';
const VIDEO_VIRTUAL_KEY = 'open-ai-service-60e884';
const VIDEO_MODEL = 'sora-2';

const PRESETS = {
  fire: {
    name: 'Fire',
    color: '#ff5500',
    prompt: 'Blazing fire aura with rising orange and red flames, hot embers floating upward, intense heat distortion, anime power-up fire energy'
  },
  wind: {
    name: 'Wind',
    color: '#00ffcc',
    prompt: 'Swirling cyan and teal wind aura, flowing ethereal air currents spiraling upward, magical wind energy streams and glowing particles'
  },
  electric: {
    name: 'Shock',
    color: '#aa00ff',
    prompt: 'Purple and blue electric lightning aura, crackling bolts of electricity and bright plasma arcs, anime electric power-up effect'
  },
  cosmic: {
    name: 'Cosmic',
    color: '#6366f1',
    prompt: 'Cosmic galaxy aura with swirling nebula clouds, twinkling stars in deep purple and blue, mystical space energy radiating outward'
  },
  smoke: {
    name: 'Smoke',
    color: '#94a3b8',
    prompt: 'Ethereal grey and silver smoke aura, wisps of mysterious fog rising and swirling slowly, misty supernatural energy effect'
  }
};

const PRESET_ICONS = {
  fire: <Flame size={13} />,
  wind: <Wind size={13} />,
  electric: <Zap size={13} />,
  cosmic: <Sparkles size={13} />,
  smoke: <CloudFog size={13} />
};

const BG_PRESETS = [
  { name: 'Black', color: '#000000' },
  { name: 'Dark Navy', color: '#0a0e1a' },
  { name: 'Charcoal', color: '#1a1a2e' },
  { name: 'Deep Purple', color: '#1a0a2e' },
  { name: 'Midnight Blue', color: '#0d1b2a' },
  { name: 'Forest', color: '#0a1a0a' },
  { name: 'Dark Red', color: '#1a0a0a' },
  { name: 'Slate', color: '#1e293b' },
  { name: 'Storm', color: '#111827' },
  { name: 'red', color: '#ff0000' },
  { name: 'blue', color: '#0000ff' },
];

const DEFAULT_ADMIN_PROMPT = `Research and integrate visual styles from iconic anime, games, and VFX (such as Dragon Ball, Solo Leveling, Naruto, and Genshin Impact) to replicate the precise aura shapes and effects from these sources. Focus specifically on capturing the dynamics and patterns of these auras, including how they flow, move, and change shape.

Generate a VFX aura effect over a PURE BLACK background. The aura should be dynamically shaped and visibly contrast against the black canvas. Emphasize motion and organic form, focusing more on the flow of the effect rather than its clarity.

Shape & Style: The aura must have a clearly defined and specific shape based on "{user_prompt}". The aura can include dynamic, irregular forms such as energy spirals, lightning bolts, swarming particle clouds, or energy waves. It can be flames, vertical pillars, or spirals, but the focus should be on a unique, varied, and specific shape that conveys the essence of the prompt.

Framing: Ensure the aura effect is fully contained within the frame, with at least 10% black padding on all edges. There should be no cropped or cut-off elements of the aura. The aura should appear centered and symmetrical with no distractions from the edges.

Center Gap: Keep the center of the frame (roughly 35%-65% width, 25%-75% height) mostly dark and empty, ensuring space for later compositing. The aura must emanate from or surround this gap, framing the empty space rather than encroaching upon it.

Do not include any characters, people, or figures in the frame. Only the VFX aura effects should be visible. The focus must remain strictly on the aura's shape, structure, and motion.

The aura should have clearly defined, dynamic movement that suits the specific shape and style requested. Pay special attention to how the aura moves—whether it swirls, flows upward, pulses, or changes direction. The aura must maintain a sense of motion while adhering to the desired structure, whether it's a static burst or an evolving, swirling pattern. The key focus is on the consistency of the shape and motion, rather than visual clarity.

Ensure that all shapes, motions, and effects follow a consistent, repeatable pattern that can be adapted to different prompts. Focus on creating effects that are flexible for integration into various scenes while maintaining the desired aura form.`.trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ffmpegInstance = null;
let ffmpegLoading = false;

async function getFFmpeg() {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoading) {
    while (ffmpegLoading) await sleep(200);
    return ffmpegInstance;
  }
  
  ffmpegLoading = true;
  try {
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });
    ffmpegInstance = ffmpeg;
    console.log('FFmpeg loaded');
    return ffmpeg;
  } finally {
    ffmpegLoading = false;
  }
}

async function chromaKeyBlack(videoUrl, onProgress) {
  const ffmpeg = await getFFmpeg();
  
  onProgress?.('Downloading video for processing...');
  const response = await fetch(videoUrl);
  const videoData = await response.arrayBuffer();
  
  onProgress?.('Removing black background...');
  await ffmpeg.writeFile('input.mp4', new Uint8Array(videoData));
  
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', 'colorkey=black:0.3:0.15',
    '-c:v', 'libvpx-vp9',
    '-auto-alt-ref', '0',
    '-pix_fmt', 'yuva420p',
    '-b:v', '2M',
    '-an',
    'output.webm'
  ]);
  
  const data = await ffmpeg.readFile('output.webm');
  await ffmpeg.deleteFile('input.mp4');
  await ffmpeg.deleteFile('output.webm');
  
  const blob = new Blob([data.buffer], { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  onProgress?.('Background removed!');
  return url;
}

async function videoUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to convert video to base64:', e);
    return null;
  }
}

const DB_NAME = 'aura-studio-db';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveVideoToDB(id, videoBase64) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, data: videoBase64 });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to save video to IndexedDB:', e);
    return false;
  }
}

async function loadVideoFromDB(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load video from IndexedDB:', e);
    return null;
  }
}

async function deleteVideoFromDB(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

function authHeaders() {
  return {
    'x-portkey-api-key': PORTKEY_API_KEY,
    'x-portkey-virtual-key': VIDEO_VIRTUAL_KEY
  };
}

async function apiCreateVideo(prompt) {
  console.log('Generated prompt:', prompt);

  const res = await fetch(`${PORTKEY_BASE}/videos`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      size: '1280x720',
      seconds: '4'
    })
  });

  if (!res.ok) {
    const bodyText = await res.text();
    console.error('Create video error:', res.status, bodyText);
    throw new Error(`Create failed (${res.status}): ${bodyText}`);
  }
  return res.json();
}

async function apiPollVideo(videoId) {
  const res = await fetch(`${PORTKEY_BASE}/videos/${videoId}`, {
    headers: authHeaders()
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Poll video error:', res.status, body);
    throw new Error(`Poll failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function apiDownloadVideo(videoId) {
  const res = await fetch(`${PORTKEY_BASE}/videos/${videoId}/content?variant=video`, {
    headers: authHeaders()
  });

  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function extractVideoUrl(video) {
  if (video.url) return video.url;
  if (video.output?.url) return video.output.url;
  if (Array.isArray(video.output) && video.output[0]?.url) return video.output[0].url;
  if (video.data?.url) return video.data.url;
  if (Array.isArray(video.data) && video.data[0]?.url) return video.data[0].url;
  if (video.result?.url) return video.result.url;
  return null;
}

function AuraThumbnail({ aura, onLoad, onDelete }) {
  const [videoSrc, setVideoSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadVideo() {
      if (aura.hasLocalVideo) {
        const data = await loadVideoFromDB(aura.id);
        if (mounted && data) {
          setVideoSrc(data);
        }
      } else if (aura.url) {
        setVideoSrc(aura.url);
      }
      if (mounted) setLoading(false);
    }
    
    loadVideo();
    return () => { mounted = false; };
  }, [aura.id, aura.hasLocalVideo, aura.url]);

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer bg-white/[0.02]"
      onClick={onLoad}
    >
      <div className="aspect-video bg-black relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-purple-400" />
          </div>
        ) : videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
            objectFit="cover !important"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <X size={16} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play size={14} className="text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: aura.color }}
          />
          <span className="text-xs text-gray-400 truncate">{aura.name}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function AuraStudio() {
  const [avatar, setAvatar] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [auraName, setAuraName] = useState(null);
  const [glowColor, setGlowColor] = useState('#a855f7');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [savedAuras, setSavedAuras] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [videoTransparent, setVideoTransparent] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');
  const [adminPrompt, setAdminPrompt] = useState(DEFAULT_ADMIN_PROMPT);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const abortRef = useRef(false);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('aura-studio-saved');
    if (stored) {
      try {
        setSavedAuras(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved auras:', e);
      }
    }
    const savedPrompt = localStorage.getItem('aura-studio-admin-prompt');
    if (savedPrompt) {
      setAdminPrompt(savedPrompt);
    }
  }, []);

  useEffect(() => {
    if (savedAuras.length > 0) {
      localStorage.setItem('aura-studio-saved', JSON.stringify(savedAuras));
    }
  }, [savedAuras]);

  useEffect(() => {
    localStorage.setItem('aura-studio-admin-prompt', adminPrompt);
  }, [adminPrompt]);

  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const generateVideoAura = async (prompt, name, color) => {
    if (generating) return;
    abortRef.current = false;
    setGenerating(true);
    setProgress(0);
    setGlowColor(color);
    setAuraName(name);
    setStatusMsg('Starting video generation...');

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setVideoUrl(null);

    try {
      const finalPrompt = adminPrompt.replace(/\{user_prompt\}/g, prompt);
      const job = await apiCreateVideo(finalPrompt);
      const videoId = job.id;
      console.log('Video job created:', videoId, job.status);
      setStatusMsg(`Queued (${videoId})`);

      let video = job;
      while (
        (video.status === 'queued' || video.status === 'in_progress') &&
        !abortRef.current
      ) {
        await sleep(5000);
        video = await apiPollVideo(videoId);
        const p = video.progress ?? 0;
        setProgress(p);
        setStatusMsg(
          video.status === 'queued'
            ? `Queued... ${p.toFixed(0)}%`
            : `Generating... ${p.toFixed(0)}%`
        );
      }

      if (abortRef.current) {
        setStatusMsg('Cancelled');
        return;
      }

      if (video.status === 'failed') {
        throw new Error(video.error?.message || 'Video generation failed');
      }
      if (video.status !== 'completed') {
        throw new Error(`Unexpected status: ${video.status}`);
      }

      console.log('Video completed:', JSON.stringify(video, null, 2));
      setStatusMsg('Loading video...');

      let url = extractVideoUrl(video);
      if (!url) {
        console.log('No URL in response, attempting direct download...');
        url = await apiDownloadVideo(videoId);
        blobUrlRef.current = url;
      }

      setProgress(100);

      let processedUrl;
      try {
        processedUrl = await chromaKeyBlack(url, setStatusMsg);
      } catch (e) {
        console.warn('Chroma key failed, falling back to screen blend:', e);
        processedUrl = null;
      }

      const finalUrl = processedUrl || url;
      const isTransparent = !!processedUrl;
      setVideoTransparent(isTransparent);
      setVideoUrl(finalUrl);
      setStatusMsg('Saving video for later...');
      
      const videoBase64 = await videoUrlToBase64(finalUrl);
      const auraId = Date.now();
      
      if (videoBase64) {
        await saveVideoToDB(auraId, videoBase64);
        console.log('Video saved to IndexedDB, size:', Math.round(videoBase64.length / 1024), 'KB');
      } else {
        console.warn('Could not save video, using original URL (may expire)');
      }
      
      setStatusMsg(`${name} aura ready!`);

      const newAura = {
        id: auraId,
        name,
        color,
        url: videoBase64 ? null : finalUrl,
        hasLocalVideo: !!videoBase64,
        isTransparent,
        createdAt: new Date().toISOString()
      };
      setSavedAuras(prev => [newAura, ...prev]);
    } catch (err) {
      console.error('Video generation error:', err);
      setStatusMsg(`Failed: ${err.message}`);
      setAuraName(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    const text = promptInput.trim();
    if (!text) return;
    setPromptInput('');
    generateVideoAura(text, text, '#a855f7');
  };

  const clearAura = () => {
    abortRef.current = true;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setVideoUrl(null);
    setAuraName(null);
    setStatusMsg('');
    setProgress(0);
    setGenerating(false);
  };

  const loadSavedAura = async (aura) => {
    setAuraName(aura.name);
    setGlowColor(aura.color);
    setVideoTransparent(!!aura.isTransparent);
    setStatusMsg(`Loading ${aura.name}...`);
    
    if (aura.hasLocalVideo) {
      const videoData = await loadVideoFromDB(aura.id);
      if (videoData) {
        setVideoUrl(videoData);
        setStatusMsg(`${aura.name} aura loaded`);
      } else {
        setStatusMsg(`Failed to load ${aura.name} - video data missing`);
      }
    } else if (aura.url) {
      setVideoUrl(aura.url);
      setStatusMsg(`${aura.name} aura loaded`);
    } else {
      setStatusMsg(`Failed to load ${aura.name} - no video data`);
    }
  };

  const deleteSavedAura = async (id) => {
    await deleteVideoFromDB(id);
    setSavedAuras(prev => prev.filter(a => a.id !== id));
  };

  const hasAura = !!videoUrl;

  return (
    <div className="h-screen text-white font-sans overflow-hidden flex relative select-none" style={{ backgroundColor: bgColor }}>

      <div
        className={`h-full backdrop-blur-xl border-r border-white/[0.06] flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
        style={{ backgroundColor: `${bgColor}cc` }}
      >
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300 tracking-wide">Saved Auras</h2>
          <span className="text-xs text-gray-600">{savedAuras.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {savedAuras.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs">
              <Sparkles size={24} className="mx-auto mb-2 opacity-30" />
              <p>No saved auras yet</p>
              <p className="mt-1 text-gray-700">Generate your first aura!</p>
            </div>
          ) : (
            savedAuras.map((aura) => (
              <AuraThumbnail
                key={aura.id}
                aura={aura}
                onLoad={() => loadSavedAura(aura)}
                onDelete={() => deleteSavedAura(aura.id)}
              />
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-r-lg flex items-center justify-center text-gray-500 hover:text-white transition-all"
        style={{ left: sidebarOpen ? '256px' : '0' }}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <div className="flex-1 flex flex-col relative">
        <div
          className="absolute inset-0 transition-all duration-1000 pointer-events-none"
          style={{
            background: hasAura
              ? `radial-gradient(ellipse at 50% 40%, ${glowColor}15 0%, ${glowColor}08 30%, transparent 70%)`
              : 'radial-gradient(ellipse at 50% 40%, rgba(88,28,135,0.06) 0%, transparent 70%)'
          }}
        />

        <header className="relative z-30 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold tracking-widest uppercase text-gray-300">
              Aura Studio
            </span>
          </div>

          <div className="flex items-center gap-2">
            {BG_PRESETS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => setBgColor(preset.color)}
                title={preset.name}
                className="w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: preset.color,
                  borderColor: bgColor === preset.color ? '#a855f7' : 'rgba(255,255,255,0.1)',
                  boxShadow: bgColor === preset.color ? '0 0 8px #a855f780' : 'none',
                }}
              />
            ))}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ImagePlus size={14} />
            {avatar ? 'Change' : 'Upload'}
          </button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center relative pb-4 min-h-0">

        <div className="relative flex items-center justify-center">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              className="absolute pointer-events-none w-[560px] h-[315px] md:w-[640px] md:h-[360px]"
              style={{
                objectFit: 'contain',
                mixBlendMode: 'screen',
                transform: 'scale(2.5)',
                transformOrigin: 'center',
              }}
              onError={() => setStatusMsg('Video failed to load')}
            />
          )}

          <div className="relative z-10 w-72 h-72 md:w-96 md:h-96 transition-all duration-700 ease-out">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-contain transition-all duration-700"
                style={{
                  filter: hasAura
                    ? `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor}80) drop-shadow(0 8px 16px rgba(0,0,0,0.6))`
                    : 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))'
                }}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full rounded-3xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.03] transition-all duration-300 group"
              >
                <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-purple-500/10 transition-colors">
                  <Camera size={32} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-400 transition-colors">Drop your character here</p>
                <p className="text-xs text-gray-700 mt-1">PNG, JPG, or WebP</p>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-40 w-full max-w-lg mt-2 space-y-3">

          {auraName && !generating && videoUrl && (
            <div className="flex items-center justify-center gap-3">
              <div
                className="px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-500 flex items-center gap-2"
                style={{
                  color: glowColor,
                  background: `${glowColor}12`,
                  border: `1px solid ${glowColor}25`,
                  textShadow: `0 0 20px ${glowColor}60`
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: glowColor }} />
                {auraName}
              </div>
              <button
                onClick={clearAura}
                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/10 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {generating && (
            <div className="space-y-2 px-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-purple-400" />
                  {statusMsg}
                </span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.max(progress, 2)}%`,
                    background: `linear-gradient(90deg, ${glowColor}, #a855f7)`
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {Object.entries(PRESETS).map(([key, { name, color, prompt }]) => (
              <button
                key={key}
                onClick={() => generateVideoAura(prompt, name, color)}
                disabled={generating}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-300 border border-white/[0.06] text-gray-500 ${
                  generating
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.04]'
                }`}
              >
                {PRESET_ICONS[key]}
                {name}
              </button>
            ))}
          </div>

          {statusMsg && !generating && (
            <p className="text-center text-xs text-gray-500 italic truncate px-4">{statusMsg}</p>
          )}

          <div className="relative group">
            <div
              className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm"
              style={{ background: `linear-gradient(135deg, ${hasAura ? glowColor : '#a855f7'}40, transparent)` }}
            />
            <div className="relative flex items-center bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm group-focus-within:border-white/[0.15] transition-all">
              <div className="pl-4 pr-2 text-gray-600">
                <Wand2 size={16} />
              </div>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={generating ? 'Generating video aura...' : "Describe an aura... e.g. 'super saiyan energy'"}
                disabled={generating}
                className="flex-1 bg-transparent py-3.5 pr-4 text-sm text-white focus:outline-none placeholder:text-gray-600 disabled:opacity-40"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              {generating ? (
                <div className="pr-4">
                  <Loader2 size={16} className="animate-spin text-purple-400" />
                </div>
              ) : promptInput.trim() && (
                <button
                  onClick={handleGenerate}
                  className="mr-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.08] text-gray-300 hover:bg-white/[0.15] hover:text-white transition-all"
                >
                  Enter
                </button>
              )}
            </div>
          </div>

        </div>
        </main>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
        />
      </div>

      <button
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-5 h-12 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-l-lg flex items-center justify-center text-gray-500 hover:text-white transition-all"
        style={{ right: rightSidebarOpen ? '320px' : '0' }}
      >
        {rightSidebarOpen ? <ChevronRight size={14} /> : <Settings size={14} />}
      </button>

      <div
        className={`h-full backdrop-blur-xl border-l border-white/[0.06] flex flex-col transition-all duration-300 ${
          rightSidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
        style={{ backgroundColor: `${bgColor}cc` }}
      >
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-300 tracking-wide">Admin Prompt</h2>
          </div>
          <button
            onClick={() => setAdminPrompt(DEFAULT_ADMIN_PROMPT)}
            title="Reset to default"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-500 hover:text-purple-400 hover:bg-white/[0.06] transition-all"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>

        <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
          <p className="text-[11px] text-gray-500 leading-relaxed flex-shrink-0">
            Edit the system prompt sent with every generation. Use <code className="px-1 py-0.5 rounded bg-white/[0.06] text-purple-400 text-[10px]">{'{user_prompt}'}</code> as a placeholder for the user's input.
          </p>
          <textarea
            value={adminPrompt}
            onChange={(e) => setAdminPrompt(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs text-gray-300 leading-relaxed font-mono resize-none focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.05] transition-all scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent placeholder:text-gray-700"
            placeholder="Enter your admin prompt template..."
          />
          <div className="flex items-center justify-between flex-shrink-0 text-[10px] text-gray-600">
            <span>{adminPrompt.length} chars</span>
            <span className={adminPrompt.includes('{user_prompt}') ? 'text-green-500' : 'text-amber-500'}>
              {adminPrompt.includes('{user_prompt}') ? 'Placeholder found' : 'No {user_prompt} placeholder'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
