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

    // 2. ถ้ามี User แล้ว ให้เช็คว่าเป็น Admin หรือไม่?
    // วิธีที่ 1: เช็คแบบง่าย (Hardcode Email)
    const allowedEmails = ['admin@company.com', 'boss@company.com']
    if (!allowedEmails.includes(user.email!)) {
        return NextResponse.redirect(new URL('/', request.url)) // ส่งกลับหน้าบ้าน
    }

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