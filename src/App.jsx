import React, { useEffect, useMemo, useRef, useState } from 'react'
import Equalizer from './components.Equalizer.jsx'
import SongList from './components.SongList.jsx'

function formatTime(sec) {
  if (isNaN(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2,'0')
  return `${m}:${s}`
}

export default function App() {
  const audioRef = useRef(null)
  const [tracks, setTracks] = useState([])
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [progress, setProgress] = useState(0)

  // Web Audio API
  const [audioCtx, setAudioCtx] = useState(null)
  const [analyser, setAnalyser] = useState(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audioCtx) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      setAudioCtx(ctx)
      const an = ctx.createAnalyser()
      an.fftSize = 1024
      an.smoothingTimeConstant = 0.8
      setAnalyser(an)
      const src = ctx.createMediaElementSource(audio)
      sourceRef.current = src
      src.connect(an)
      an.connect(ctx.destination)
    }
  }, [])

  // connect volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // update time/progress
  useEffect(() => {
    const a = audioRef.current
    const onTime = () => setProgress(a.currentTime)
    const onEnded = () => {
      if (repeat) { a.currentTime = 0; a.play(); return }
      handleNext()
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnded)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnded)
    }
  }, [repeat, current, tracks])

  // compute durations once loaded
  const onLoadedMetadata = () => {
    const a = audioRef.current
    setTracks(prev => prev.map((t, i) => i === current ? ({...t, duration: a.duration, formattedDuration: formatTime(a.duration)}) : t))
  }

  // controls
  const handlePlayPause = async () => {
    const a = audioRef.current
    if (!tracks.length) return
    if (audioCtx && audioCtx.state === 'suspended') await audioCtx.resume()
    if (isPlaying) {
      a.pause()
      setIsPlaying(false)
    } else {
      await a.play()
      setIsPlaying(true)
    }
  }

  const handlePrev = () => {
    if (!tracks.length) return
    setCurrent(i => (i - 1 + tracks.length) % tracks.length)
    setIsPlaying(true)
    setTimeout(() => audioRef.current.play(), 0)
  }

  const handleNext = () => {
    if (!tracks.length) return
    if (shuffle) {
      const r = Math.floor(Math.random() * tracks.length)
      setCurrent(r)
    } else {
      setCurrent(i => (i + 1) % tracks.length)
    }
    setIsPlaying(true)
    setTimeout(() => audioRef.current.play(), 0)
  }

  const handleSeek = (e) => {
    if (!tracks.length) return
    const a = audioRef.current
    const value = Number(e.target.value)
    a.currentTime = value
    setProgress(value)
  }

  const handleSelect = (index) => {
    setCurrent(index)
    setIsPlaying(true)
    setTimeout(() => audioRef.current.play(), 0)
  }

  const onFiles = async (files) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('audio/'))
    const newTracks = await Promise.all(arr.map(async (f) => {
      const url = URL.createObjectURL(f)
      return {
        id: `${f.name}-${f.size}-${Date.now()}`,
        name: f.name.replace(/\.(mp3|wav|ogg|m4a)$/i,''),
        artist: 'Arquivo Local',
        url,
      }
    }))
    setTracks(prev => [...prev, ...newTracks])
    if (tracks.length === 0 && newTracks.length > 0) {
      setCurrent(0)
      setTimeout(() => audioRef.current.play(), 0)
      setIsPlaying(true)
    }
  }

  const clearList = () => {
    // revoke object urls
    tracks.forEach(t => { if (t.url?.startsWith('blob:')) URL.revokeObjectURL(t.url) })
    setTracks([])
    setIsPlaying(false)
    setProgress(0)
  }

  const currentTrack = tracks[current]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="header">
          <div className="logo">
            <span className="logo-dot" />
            <span>Music Player <span className="badge">Dark</span></span>
          </div>
          <label className="btn">
            + Adicionar
            <input type="file" accept="audio/*" multiple style={{display:'none'}}
              onChange={(e)=> onFiles(e.target.files)} />
          </label>
        </div>

        <input className="search" placeholder="Pesquisar..." onChange={(e)=>{
          const q = e.target.value.toLowerCase()
          document.querySelectorAll('.song-item').forEach(el => {
            const text = (el.getAttribute('title')||'').toLowerCase()
            el.style.display = text.includes(q) ? '' : 'none'
          })
        }} />

        <SongList
          tracks={tracks}
          currentIndex={current}
          onSelect={handleSelect}
          onClear={clearList}
        />

        <div className="footer small">
          <span>{tracks.length} faixa(s)</span>
          <a className="link small" href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" target="_blank" rel="noreferrer">Web Audio API</a>
        </div>
      </aside>

      <main className="main">
        <div className="canvas-wrap">
          <Equalizer audioEl={audioRef} analyser={analyser} />
          <div className="info">
            <div className="title">{currentTrack?.name || 'Selecione uma música'}</div>
            <div className="artist">{currentTrack?.artist || '—'}</div>
          </div>
          <audio
            ref={audioRef}
            src={currentTrack?.url}
            onLoadedMetadata={onLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        <div className="controls">
          <div className="row">
            <button className="icon-btn" onClick={handlePrev} title="Anterior">⏮</button>
            <button className="icon-btn primary" onClick={handlePlayPause} title="Play/Pause">{isPlaying ? '⏸' : '▶️'}</button>
            <button className="icon-btn" onClick={handleNext} title="Próxima">⏭</button>
          </div>

          <div className="row" style={{gap:12}}>
            <span className="small">{formatTime(progress)}</span>
            <input
              className="slider"
              type="range"
              min="0"
              max={Number.isFinite(audioRef.current?.duration) ? audioRef.current.duration : 0}
              value={progress}
              onChange={handleSeek}
              step="0.01"
              style={{flex:1}}
            />
            <span className="small">{formatTime(audioRef.current?.duration || 0)}</span>
          </div>

          <div className="row" style={{gap:12}}>
            <button className={['btn', shuffle ? 'primary' : 'secondary'].join(' ')} onClick={()=> setShuffle(s=>!s)}>
              🔀 Shuffle {shuffle && 'On'}
            </button>
            <button className={['btn', repeat ? 'primary' : 'secondary'].join(' ')} onClick={()=> setRepeat(r=>!r)}>
              🔁 Repeat {repeat && 'On'}
            </button>
            <div style={{display:'flex', alignItems:'center', gap:8, minWidth:220}}>
              <span className="small">🔊</span>
              <input className="slider" type="range" min="0" max="1" step="0.01" value={volume} onChange={(e)=> setVolume(Number(e.target.value))} />
              <span className="small">{Math.round(volume*100)}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
