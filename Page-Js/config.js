(function () {
  const appConfig = {
    supabase: {
      url: 'https://gelpzfafiiudidxmpofo.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHB6ZmFmaWl1ZGlkeG1wb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTIwNzcsImV4cCI6MjA5MDk4ODA3N30.82lZQg6ZYr1SsK9SFsbszby5QEf6HENgnYn1ynS0ZhE'
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    app: {
      version: '1.0.3'
    }
  };

  const authHelpers = {
    resolveAuthEventAction(eventName, session, previousUserId) {
      const hasSession = Boolean(session?.user?.id);
      const hadUser = Boolean(previousUserId);

      if (eventName === 'SIGNED_OUT') {
        return hadUser ? 'show-landing' : 'keep-current';
      }

      if (eventName === 'TOKEN_REFRESHED') {
        return hasSession ? 'keep-current' : 'show-landing';
      }

      if (eventName === 'INITIAL_SESSION' || eventName === 'SIGNED_IN' || eventName === 'USER_UPDATED') {
        return hasSession ? 'open-dashboard' : 'keep-current';
      }

      return hasSession ? 'open-dashboard' : 'keep-current';
    },
    resolveEffectiveTrackId(userMetadata, availableTrackIds = []) {
      const trackId = userMetadata?.track_id || userMetadata?.trackId || '';
      if (trackId && availableTrackIds.includes(trackId)) {
        return trackId;
      }

      if (Array.isArray(availableTrackIds) && availableTrackIds.length) {
        return availableTrackIds[0];
      }

      return '';
    },
    buildAuthenticatedUserSnapshot(session, fallbackTrackId = '') {
      const metadata = session?.user?.user_metadata || {};
      const userId = session?.user?.id || '';
      const email = session?.user?.email || '';
      const resolvedTrackId = metadata.track_id || metadata.trackId || fallbackTrackId || '';

      return {
        id: userId,
        email,
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        trackId: resolvedTrackId,
        timezone: metadata.timezone || 'Africa/Lagos',
        headline: metadata.headline || 'Learner at RealKingHubs Academy',
        bio: metadata.bio || 'Add your professional summary, learning goals, and revision focus in profile settings.',
        avatar: metadata.avatar_url || '',
        completedLessonIds: [],
        joinedClassIds: [],
        lastSeenCommunityAt: '',
        lastSeenAnnouncementsAt: ''
      };
    }
  };

  window.RKH_CONFIG = appConfig;
  window.RKH_AUTH_HELPERS = authHelpers;
})();
