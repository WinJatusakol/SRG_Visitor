import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Logic การป้องกัน Route /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    
    // 1. ถ้าไม่มี User (ยังไม่ login) -> ส่งไปหน้า Login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const adminEmails = String(process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const adminDomains = String(process.env.ADMIN_EMAIL_DOMAINS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean)

    const email = String(user.email ?? '').trim().toLowerCase()
    const domain = email.includes('@') ? email.split('@').pop() ?? '' : ''
    const allowed =
      adminEmails.length === 0 && adminDomains.length === 0
        ? true
        : adminEmails.includes(email) || (domain && adminDomains.includes(domain))

    if (!allowed) return NextResponse.redirect(new URL('/', request.url))

    // วิธีที่ 2: เช็คจาก Database (Real-world กว่า)
    /* const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profile?.role !== 'admin') {
       return NextResponse.redirect(new URL('/', request.url))
    }
    */
  }

  return response
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
