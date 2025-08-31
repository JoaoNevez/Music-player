import React from 'react'

export default function SongList({ tracks, currentIndex, onSelect, onClear }) {
  return (
    <div className="song-list">
      {tracks.length === 0 && (
        <div className="small">Nenhuma música na lista ainda. Use <b>+ Adicionar</b> para carregar arquivos MP3 do seu computador.</div>
      )}
      {tracks.map((t, i) => (
        <div
          key={t.id}
          className={['song-item', i === currentIndex ? 'active' : ''].join(' ')}
          onClick={() => onSelect(i)}
          title={t.name}
        >
          <div className="cover">{(t.artist || t.name || '?').substring(0,1).toUpperCase()}</div>
          <div className="meta">
            <span className="title">{t.name || 'Sem título'}</span>
            <span className="artist">{t.artist || 'Artista desconhecido'}</span>
          </div>
          <div className="duration">{t.formattedDuration || '--:--'}</div>
        </div>
      ))}
      {tracks.length > 0 && (
        <div style={{marginTop:8}}>
          <button className="btn danger" onClick={onClear}>Limpar lista</button>
        </div>
      )}
    </div>
  )
}
