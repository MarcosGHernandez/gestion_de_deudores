'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Por favor, introduce correo electrónico y contraseña.' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  if (isMockMode) {
    // Aceptar cualquier credencial en modo local, o requerir un formato simple
    // Para simplificar, aceptaremos cualquier usuario/contraseña
    const cookieStore = await cookies()
    cookieStore.set('mock_session', 'owner-session-token', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400, // 1 día
    })
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Credenciales incorrectas. Verifique e intente de nuevo.' }
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  if (isMockMode) {
    const cookieStore = await cookies()
    cookieStore.delete('mock_session')
    redirect('/login')
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

