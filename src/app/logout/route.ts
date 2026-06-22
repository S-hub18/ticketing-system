import { signOut } from '@/lib/auth'

export async function GET(req: Request) {
  // Clear the session, then redirect to login with a real Response.
  await signOut({ redirect: false })
  return Response.redirect(new URL('/login', req.url))
}
