import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { BadgeDisplay } from '../components/BadgeDisplay';
import { StreakTimer } from '../components/StreakTimer';
import { getAvatarUrl } from '../utils/avatar';
import axios from 'axios';

export const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/users/${username}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => navigate('/')} data-testid="back-to-leaderboard-btn">
            Back to Leaderboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leaderboard
        </Button>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-card p-8 border-b border-border" style={{ background: 'linear-gradient(135deg, #161616 0%, #1F1F1F 100%)' }}>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <img
                  src={getAvatarUrl(profile.username, profile.avatar_url)}
                  alt={profile.username}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                  data-testid="profile-avatar"
                />
                {profile.rank && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg border-2 border-background text-white">
                    #{profile.rank}
                  </div>
                )}
              </div>

              <div className="flex-1 text-center md:text-left space-y-3">
                <h1 className="text-4xl font-bold uppercase tracking-wide text-white" style={{ fontFamily: 'Barlow Condensed, sans-serif' }} data-testid="profile-page-username">
                  {profile.username}
                </h1>
                <BadgeDisplay badge={profile.badge} size="lg" />
                {profile.sharing_code && (
                  <div className="inline-block bg-muted px-4 py-2 rounded-md">
                    <p className="text-sm" style={{ color: '#B3B3B3' }}>Sharing Code</p>
                    <p className="font-mono text-primary font-bold text-lg" data-testid="profile-sharing-code">{profile.sharing_code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="p-8 space-y-8">
            <div>
              <h2 className="text-sm uppercase tracking-wide mb-4 text-white font-semibold">Current Streak</h2>
              <div className="flex justify-center md:justify-start">
                <StreakTimer lastRelapseDateTime={profile.last_relapse_datetime} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/50 p-6 rounded-lg border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-sm uppercase tracking-wide" style={{ color: '#B3B3B3' }}>Member Since</h3>
                </div>
                <p className="text-xl font-bold text-white" data-testid="profile-created-at">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {profile.rank && (
                <div className="bg-muted/50 p-6 rounded-lg border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-primary text-2xl">🏆</span>
                    <h3 className="text-sm uppercase tracking-wide" style={{ color: '#B3B3B3' }}>Global Rank</h3>
                  </div>
                  <p className="text-xl font-bold text-primary" data-testid="profile-rank">
                    #{profile.rank}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};