'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserProfile } from '@/lib/auth'

interface DashboardLayoutProps {
  user: UserProfile
  children: React.ReactNode
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link href="/dashboard" className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CP</span>
                  </div>
                  <span className="ml-2 text-xl font-bold text-gray-900">ContaPyme</span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href="/dashboard"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/explore"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sistema Contable
                </Link>
                <Link
                  href="/companies"
                  className="text-gray-500 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Empresas
                </Link>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Subscription Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.subscription_plan === 'annual'
                  ? 'bg-purple-100 text-purple-800'
                  : user.subscription_plan === 'semestral'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                Plan {user.subscription_plan === 'monthly' ? 'Mensual' :
                      user.subscription_plan === 'semestral' ? 'Semestral' : 'Anual'}
              </div>

              {/* User Avatar and Menu */}
              <div className="relative">
                <button className="flex items-center space-x-3 text-sm focus:outline-none">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-gray-700 font-medium">
                    {user.full_name}
                  </span>
                </button>
              </div>

              {/* Settings */}
              <Link
                href="/settings"
                className="text-gray-500 hover:text-gray-700 p-2 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 ContaPyme. Sistema contable integral para PyMEs chilenas.
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="/support" className="hover:text-gray-700">Soporte</a>
              <a href="/docs" className="hover:text-gray-700">Documentación</a>
              <a href="/privacy" className="hover:text-gray-700">Privacidad</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}