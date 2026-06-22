import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
const SECRET = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null

/**
 * Decode JWT token dan return payload atau null jika invalid
 */
async function decodeToken(token: string) {
  try {
    if (!SECRET) {
      console.error('[JWT] JWT_SECRET is not configured')
      return null
    }


    const verified = await jwtVerify(token, SECRET)
    return verified.payload as {
      id: string
      email: string
      role: string
      fullName?: string
      iat?: number
      exp?: number
    }
  } catch (error: any) {
  console.error('[JWT] Verification Error Name:', error?.name)
  console.error('[JWT] Verification Error Code:', error?.code)
  console.error('[JWT] Verification Error Message:', error?.message)

  return null
}
}

/**
 * ============================================================================
 * Route Protection Configuration
 * ============================================================================
 */

const protectedRoutes: Record<
  string,
  {
    requiredRoles: string[]
    requiresAuth: boolean
  }
> = {
  '/admin': {
    requiredRoles: ['ADMIN'],
    requiresAuth: true,
  },
  '/kabid': {
    requiredRoles: ['KABID'],
    requiresAuth: true,
  },
  '/Supir': {
    requiredRoles: ['OPERATOR'],
    requiresAuth: true,
  },
}

// Routes yang public (tidak butuh token)
const publicRoutes = new Set([
  '/',
  '/login',
  '/unauthorized',
  '/500',
  '/not-found',
])

/**
 * Check apakah path adalah static file atau next internal
 */
function isStaticFile(path: string): boolean {
  return (
    path.startsWith('/_next') ||
    path.includes('.') ||
    path.startsWith('/api/') || // API routes
    path.startsWith('/public/')
  )
}

function getRequiredRole(
  path: string
): { requiredRoles: string[] | null; requiresAuth: boolean } {
  // Check exact match dan startsWith untuk protected routes
  for (const [route, config] of Object.entries(protectedRoutes)) {
    if (path === route || path.startsWith(route + '/')) {
      return config
    }
  }

  return {
    requiredRoles: null,
    requiresAuth: false,
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  console.log("================================");
  console.log("[PROXY] PATH:", path);
  // console.log(`[PROXY] 🔍 Checking path: ${path}`)

  // 1. Allow static files dan next internals
  if (isStaticFile(path)) {
    return NextResponse.next()
  }

  // 2. Allow public routes
  if (publicRoutes.has(path)) {
    return NextResponse.next()
  }

  // 3. Get token dari cookie
  const tokenCookie = request.cookies.get('token')
  const token = tokenCookie?.value

  console.log('[PROXY] Path:', path)
  console.log('[PROXY] Token exists:', !!token)

if (token) {
  console.log('[PROXY] Token preview:', token.substring(0, 30) + '...')
}
  if (token) {
    console.log("[PROXY] TOKEN:", token.substring(0, 40) + "...");
  }

  console.log("================================");
  // 4. Get route protection config
  const { requiredRoles, requiresAuth } = getRequiredRole(path)

  // =========================================================================
  // CASE 1: Route tidak memerlukan auth (public atau unprotected)
  // =========================================================================
  if (!requiresAuth && !requiredRoles) {
    return NextResponse.next()
  }

  // =========================================================================
  // CASE 2: Route memerlukan auth, tapi user tidak ada token
  // =========================================================================
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // =========================================================================
  // CASE 3: User punya token, lakukan decode & validate
  // =========================================================================
  const decodedToken = await decodeToken(token)

  // Token invalid atau expired
  if (!decodedToken) {
    console.log(`[PROXY]  Invalid or expired token for path: ${path}`)
    // Clear invalid token dari cookie
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }

  // Check token expiry manually (sebagai extra safety)
  if (decodedToken.exp) {
    const now = Math.floor(Date.now() / 1000)
    if (decodedToken.exp < now) {
      console.log(`[PROXY] ⏰ Token expired for path: ${path}`)
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }
  }

  // =========================================================================
  // CASE 4: Validate user role
  // =========================================================================
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = decodedToken.role?.toUpperCase()
    const allowedRoles = requiredRoles.map((r) => r.toUpperCase())

    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // =========================================================================
  // CASE 5: All checks passed, allow request
  // =========================================================================
  // console.log(
  //   `[PROXY] ✅ Access granted to ${path} for user: ${decodedToken.email} (${decodedToken.role})`
  // )
  const response = NextResponse.next()

  // Add user info to headers untuk debugging
  response.headers.set('X-User-Id', decodedToken.id)
  response.headers.set('X-User-Role', decodedToken.role)
  response.headers.set('X-User-Email', decodedToken.email)

  return response
}

/**
 * ============================================================================
 * Middleware Configuration
 * ============================================================================
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes akan di-handle oleh server middleware)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}