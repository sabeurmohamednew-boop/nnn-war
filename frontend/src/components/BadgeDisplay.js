import React from 'react';
import { Sprout, Sparkles, Target, Swords, Star, Gem, Crown } from 'lucide-react';

const badgeConfig = {
  'Beginner': { icon: Sprout, color: 'text-emerald-400' },
  'Apprentice': { icon: Sparkles, color: 'text-primary' },
  'Disciplined': { icon: Target, color: 'text-primary' },
  'Warrior': { icon: Swords, color: 'text-white' },
  'Elite': { icon: Star, color: 'text-primary' },
  'Master': { icon: Gem, color: 'text-white' },
  'Legend': { icon: Crown, color: 'text-primary' },
  'Grandmaster': { icon: Crown, color: 'text-primary' }
};

export const BadgeDisplay = ({ badge, size = 'md' }) => {
  const config = badgeConfig[badge] || badgeConfig['Beginner'];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${config.color}`}>
      <Icon className={sizeClasses[size]} />
      <span className="font-semibold">{badge}</span>
    </span>
  );
};