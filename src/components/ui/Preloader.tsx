'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PreloaderProps {
  onComplete: () => void
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<'loading' | 'logoReveal' | 'complete'>('loading')

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev < 50) {
          return prev + Math.random() * 10 + 5
        } else if (prev < 90) {
          return prev + Math.random() * 5 + 2
        } else if (prev < 100) {
          return prev + 1
        }
        return 100
      })
    }, 150)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (progress >= 40 && stage === 'loading') {
      setStage('logoReveal')
    } else if (progress >= 100 && stage === 'logoReveal') {
      setTimeout(() => {
        setStage('complete')
        setTimeout(onComplete, 600)
      }, 400)
    }
  }, [progress, stage, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      
      {/* Main Content - Centered Logo */}
      <div className="relative text-center">
        
        {/* Logo Container with Animations */}
        <div className={`relative transition-all duration-1000 ease-out ${
          stage === 'loading' 
            ? 'scale-75 opacity-60' 
            : stage === 'logoReveal'
            ? 'scale-100 opacity-100'
            : 'scale-110 opacity-100'
        }`}>
          
          {/* Logo */}
          <div className="relative w-48 h-48 mx-auto">
            <Image
              src="/images/logo.png"
              alt="ContaPymePuq"
              fill
              className={`object-contain transition-all duration-1000 ${
                stage === 'logoReveal' ? 'animate-logo-pulse' : ''
              }`}
              priority
            />
            
            {/* Subtle glow effect behind logo */}
            <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
              stage === 'logoReveal' 
                ? 'bg-blue-200/30 blur-xl scale-150' 
                : 'bg-blue-100/20 blur-lg scale-100'
            }`} />
          </div>
        </div>

        {/* Loading Text */}
        <div className={`mt-8 transition-all duration-700 ${
          stage === 'loading' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}>
          <p className="text-slate-600 text-lg font-medium">
            {stage === 'loading' && 'Cargando...'}
            {stage === 'logoReveal' && 'Preparando sistema contable'}
            {stage === 'complete' && '¡Listo!'}
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div className="mt-6 w-64 mx-auto">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>ContaPymePuq</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes logo-pulse {
          0%, 100% { 
            transform: scale(1);
          }
          50% { 
            transform: scale(1.05);
          }
        }
        
        .animate-logo-pulse {
          animation: logo-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}