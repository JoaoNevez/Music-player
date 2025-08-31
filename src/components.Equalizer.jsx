import React, { useEffect, useRef } from 'react'

export default function Equalizer({ audioEl, analyser }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let rafId
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const { clientWidth, clientHeight } = canvas
      canvas.width = Math.floor(clientWidth * dpr)
      canvas.height = Math.floor(clientHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const bufferLength = analyser ? analyser.frequencyBinCount : 0
    const dataArray = new Uint8Array(bufferLength)

    function draw() {
      rafId = requestAnimationFrame(draw)
      if (!analyser) return
      analyser.getByteFrequencyData(dataArray)
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      ctx.clearRect(0,0,width,height)

      const barCount = 48
      const barWidth = width / barCount
      for (let i = 0; i < barCount; i++) {
        const index = Math.floor(i * (bufferLength / barCount))
        const value = dataArray[index] / 255 // 0..1
        const barHeight = Math.max(2, value * (height * 0.9))
        const x = i * barWidth
        const y = height - barHeight
        // soft glow grid bars
        ctx.fillStyle = 'rgba(148,163,184,0.25)'
        ctx.fillRect(x, y, barWidth * 0.72, barHeight)
        ctx.fillStyle = 'rgba(94,234,212,0.8)'
        ctx.fillRect(x, y + barHeight*0.05, barWidth * 0.72, barHeight * 0.95)
      }
      // subtle top gradient overlay
      const grad = ctx.createLinearGradient(0,0,0,height)
      grad.addColorStop(0,'rgba(0,0,0,0.35)')
      grad.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0,0,width,height)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [analyser])

  return <canvas ref={canvasRef} style={{ width:'100%', height:'420px' }} className="eq-canvas"/>
}
