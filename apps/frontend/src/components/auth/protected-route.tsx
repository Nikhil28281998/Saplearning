'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      // If we have a token but no user, try to get the user
      if (!isAuthenticated && typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            await getCurrentUser();
          } catch (error) {
            // Token is invalid, redirect to login
            if (requireAuth) {
              router.push(redirectTo);
            }
          }
        } else if (requireAuth) {
          // No token and auth is required
          router.push(redirectTo);
        }
      } else if (requireAuth && !isAuthenticated && !isLoading) {
        // Not authenticated and auth is required
        router.push(redirectTo);
      }
    };

    checkAuth();
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, getCurrentUser]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required and user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
