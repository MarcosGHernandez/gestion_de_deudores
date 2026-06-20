import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMockMode = !supabaseUrl || supabaseUrl.includes('placeholder.supabase.co')

  if (isMockMode) {
    const path = request.nextUrl.pathname
    const hasMockSession = request.cookies.has('mock_session')

    // Allow static files, images, favicon, etc.
    if (
      path.startsWith('/_next') ||
      path.startsWith('/api') ||
      path.includes('.') ||
      path === '/favicon.ico'
    ) {
      return NextResponse.next()
    }

    if (!hasMockSession) {
      if (path !== '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    } else {
      if (path === '/login' || path === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
    return NextResponse.next()
  }

  // Si no está en modo mock, delegar a Supabase
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
