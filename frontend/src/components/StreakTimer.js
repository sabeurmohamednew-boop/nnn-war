import React, { useState, useEffect } from 'react';

export const StreakTimer = ({ lastRelapseDateTime }) => {
  const [streak, setStreak] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!lastRelapseDateTime || !isMounted) {
      return;
    }

    const calculateStreak = () => {
      try {
        // Handle both ISO strings and already-parsed dates
        const relapseTime = new Date(lastRelapseDateTime);
        
        // Check if date is valid
        if (isNaN(relapseTime.getTime())) {
          console.error('Invalid date:', lastRelapseDateTime);
          setStreak({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }

        const now = new Date();
        const diff = Math.floor((now - relapseTime) / 1000);

        // Ensure diff is positive
        if (diff < 0) {
          setStreak({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          return;
        }

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        setStreak({ days, hours, minutes, seconds });
      } catch (error) {
        console.error('Error calculating streak:', error);
        setStreak({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateStreak();
    const interval = setInterval(calculateStreak, 1000);

    return () => clearInterval(interval);
  }, [lastRelapseDateTime, isMounted]);

  // Show placeholder until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 font-mono text-lg" data-testid="streak-timer">
        <div className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-bold text-primary">--</span>
          <span className="text-xs text-muted-foreground uppercase">Days</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl md:text-3xl font-bold">--</span>
          <span className="text-xs text-muted-foreground uppercase">Hrs</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl md:text-3xl font-bold">--</span>
          <span className="text-xs text-muted-foreground uppercase">Min</span>
        </div>
        <span className="text-muted-foreground">:</span>
        <div className="flex flex-col items-center">
          <span className="text-xl md:text-3xl font-bold">--</span>
          <span className="text-xs text-muted-foreground uppercase">Sec</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-lg" data-testid="streak-timer">
      <div className="flex flex-col items-center">
        <span className="text-2xl md:text-4xl font-bold text-primary">{streak.days}</span>
        <span className="text-xs text-muted-foreground uppercase">Days</span>
      </div>
      <span className="text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-3xl font-bold">{String(streak.hours).padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground uppercase">Hrs</span>
      </div>
      <span className="text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-3xl font-bold">{String(streak.minutes).padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground uppercase">Min</span>
      </div>
      <span className="text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <span className="text-xl md:text-3xl font-bold">{String(streak.seconds).padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground uppercase">Sec</span>
      </div>
    </div>
  );
};
