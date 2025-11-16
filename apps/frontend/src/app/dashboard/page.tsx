'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || user?.email}!</h1>
          <p className="text-muted-foreground mb-8">
            Your personal SAP learning dashboard
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Favorites</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Saved resources</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Playlists</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Learning collections</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-3xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Personal notes</p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-muted-foreground">
              No recent activity yet. Start exploring SAP learning resources!
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
