'use client'

import React, { useActionState } from 'react'
import { login } from '@/app/actions/auth'

const initialState = {
  error: '',
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm max-w-md w-full">
        <div className="mb-6 text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">VIKOTECH</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Control de Deudores</h1>
          <p className="text-slate-500 text-sm mt-2">Inicia sesión con tu cuenta administrativa</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
              placeholder="ejemplo@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={`w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg text-sm transition-colors focus:outline-none ${
              isPending ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isPending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
