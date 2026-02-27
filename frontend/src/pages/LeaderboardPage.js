import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, User, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { StreakTimer } from '../components/StreakTimer';
import { ProfilePreviewModal } from '../components/ProfilePreviewModal';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatar';
import axios from 'axios';

export const LeaderboardPage = () => {
  const { user, logout, API } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchLeaderboard, 10000);
    
    // Refresh on tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`${API}/leaderboard`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (username) => {
    try {
      const response = await axios.get(`${API}/users/${username}`);
      setSelectedUser(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-primary" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
              No Nut November War
            </h1>
            <p className="text-sm italic" style={{ color: '#B3B3B3' }}>"Reclaim what was taken from you."</p>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
                data-testid="settings-btn"
              >
                <User className="w-4 h-4 mr-2" />
                {user.username}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Top 3 Podium */}
        {top3.length >= 3 && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold uppercase tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                Top Warriors
              </h2>
            </div>

            <div className="flex items-end justify-center gap-4 md:gap-8">
              {/* Rank 2 */}
              {top3[1] && (
                <div
                  className="flex-1 max-w-xs cursor-pointer"
                  onClick={() => handleUserClick(top3[1].username)}
                  data-testid="podium-rank-2"
                >
                  <div className="bg-card border-2 rounded-lg p-6 hover:bg-card-hover transition-colors" style={{ borderColor: '#C0C0C0', boxShadow: '0 0 15px rgba(192, 192, 192, 0.2)' }}>
                    <div className="text-center space-y-3">
                      <div className="inline-block relative">
                        <img
                          src={getAvatarUrl(top3[1].username, top3[1].avatar_url)}
                          alt={top3[1].username}
                          className="w-20 h-20 rounded-full object-cover border-2"
                          style={{ borderColor: '#C0C0C0' }}
                        />
                        <div className="absolute -top-2 -right-2 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg" style={{ backgroundColor: '#C0C0C0', color: '#000' }}>
                          2
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-white">{top3[1].username}</h3>
                      <BadgeDisplay badge={top3[1].badge} />
                      <div className="text-sm">
                        <StreakTimer lastRelapseDateTime={top3[1].last_relapse_datetime} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 1 */}
              {top3[0] && (
                <div
                  className="flex-1 max-w-xs cursor-pointer"
                  onClick={() => handleUserClick(top3[0].username)}
                  data-testid="podium-rank-1"
                >
                  <div className="bg-card border-2 border-primary rounded-lg p-8 hover:bg-card-hover transition-colors" style={{ boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)' }}>
                    <div className="text-center space-y-4">
                      <div className="inline-block relative">
                        <img
                          src={getAvatarUrl(top3[0].username, top3[0].avatar_url)}
                          alt={top3[0].username}
                          className="w-28 h-28 rounded-full object-cover border-4 border-primary"
                        />
                        <div className="absolute -top-2 -right-2 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl" style={{ backgroundColor: '#F97316', color: '#FFF' }}>
                          1
                        </div>
                      </div>
                      <h3 className="font-bold text-xl text-primary">{top3[0].username}</h3>
                      <BadgeDisplay badge={top3[0].badge} size="lg" />
                      <div className="text-base">
                        <StreakTimer lastRelapseDateTime={top3[0].last_relapse_datetime} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rank 3 */}
              {top3[2] && (
                <div
                  className="flex-1 max-w-xs cursor-pointer"
                  onClick={() => handleUserClick(top3[2].username)}
                  data-testid="podium-rank-3"
                >
                  <div className="bg-card border-2 rounded-lg p-6 hover:bg-card-hover transition-colors" style={{ borderColor: '#CD7F32', boxShadow: '0 0 15px rgba(205, 127, 50, 0.2)' }}>
                    <div className="text-center space-y-3">
                      <div className="inline-block relative">
                        <img
                          src={getAvatarUrl(top3[2].username, top3[2].avatar_url)}
                          alt={top3[2].username}
                          className="w-20 h-20 rounded-full object-cover border-2"
                          style={{ borderColor: '#CD7F32' }}
                        />
                        <div className="absolute -top-2 -right-2 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg" style={{ backgroundColor: '#CD7F32', color: '#FFF' }}>
                          3
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-white">{top3[2].username}</h3>
                      <BadgeDisplay badge={top3[2].badge} />
                      <div className="text-sm">
                        <StreakTimer lastRelapseDateTime={top3[2].last_relapse_datetime} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white">Warrior</th>
                  <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white">Streak</th>
                  <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white">Badge</th>
                  <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white">Code</th>
                </tr>
              </thead>
              <tbody>
                {rest.map((entry) => (
                  <tr
                    key={entry.username}
                    className="border-t border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleUserClick(entry.username)}
                    data-testid={`leaderboard-row-${entry.rank}`}
                  >
                    <td className="px-4 py-4 font-bold text-primary text-lg">{entry.rank}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getAvatarUrl(entry.username, entry.avatar_url)}
                          alt={entry.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="font-semibold text-white">{entry.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StreakTimer lastRelapseDateTime={entry.last_relapse_datetime} />
                    </td>
                    <td className="px-4 py-4">
                      <BadgeDisplay badge={entry.badge} />
                    </td>
                    <td className="px-4 py-4">
                      {entry.sharing_code ? (
                        <span className="font-mono text-sm text-muted-foreground">{entry.sharing_code}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        )}

        {!loading && leaderboard.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground">No warriors yet. Be the first to join the war!</p>
          </div>
        )}
      </main>

      <ProfilePreviewModal
        user={selectedUser}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#B3B3B3' }}>
              You will need to login again to access your profile and the leaderboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderColor: '#2A2A2A', color: '#B3B3B3' }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={logout}
              className="bg-primary text-white"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};