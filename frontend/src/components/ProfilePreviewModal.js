import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { BadgeDisplay } from './BadgeDisplay';
import { StreakTimer } from './StreakTimer';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl } from '../utils/avatar';

export const ProfilePreviewModal = ({ user, open, onClose }) => {
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border" data-testid="profile-preview-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase tracking-wide text-white">
            Warrior Profile
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
            <img
              src={getAvatarUrl(user.username, user.avatar_url)}
              alt={user.username}
              className="w-24 h-24 rounded-full object-cover border-2 border-primary"
            />
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white" data-testid="profile-username">{user.username}</h3>
            <BadgeDisplay badge={user.badge} size="lg" />
          </div>

          <div className="w-full">
            <StreakTimer lastRelapseDateTime={user.last_relapse_datetime} />
          </div>

          {user.sharing_code && (
            <div className="text-center">
              <p className="text-sm" style={{ color: '#B3B3B3' }}>Sharing Code</p>
              <p className="font-mono text-primary font-bold">{user.sharing_code}</p>
            </div>
          )}

          <Button
            onClick={() => {
              onClose();
              navigate(`/profile/${user.username}`);
            }}
            className="w-full"
            data-testid="view-full-profile-btn"
          >
            View Full Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};