(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Standalone performance and error logger - SUPABASE DIRECT STREAM EDITION
  // ---------------------------------------------------------------------------
  // This file is separate from the UI layout code so junior developers can update
  // logging rules easily without breaking user dashboards or landing pages.
  //
  // SETUP RULES FOR JUNIOR DEVS:
  // 1. Replace 'YOUR_SUPABASE_PROJECT_ID' with your real Supabase reference text.
  // 2. Replace 'YOUR_SUPABASE_ANON_KEY' with your public anonymous API key.
  // ---------------------------------------------------------------------------

  const SUPABASE_PROJECT_ID = 'gelpzfafiiudidxmpofo';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHB6ZmFmaWl1ZGlkeG1wb2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTIwNzcsImV4cCI6MjA5MDk4ODA3N30.82lZQg6ZYr1SsK9SFsbszby5QEf6HENgnYn1ynS0ZhE';

  // Direct address to insert records into your public 'system_logs' Supabase table
  const LOG_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/system_logs`;
  
  const MAX_LOGS_PER_PAGE = 8; // Protective cap to prevent overloading mobile network data
  const MOBILE_BREAKPOINT = 768;

  const loggerState = {
    sentCount: 0,
    // Verifies that the user's browser has the built-in feature to send background telemetry packets
    isReady: typeof navigator !== 'undefined' && !!navigator.sendBeacon
  };

  function getDeviceType() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ? 'mobile' : 'desktop';
  }

  function getCurrentUrl() {
    return window.location.href;
  }

  function getTimestamp() {
    return new Date().toISOString();
  }

  function getViewport() {
    return `${window.innerWidth || 0}x${window.innerHeight || 0} (${getDeviceType()})`;
  }

  /**
   * Restructures our log data to map perfectly to the column headers 
   * inside our Supabase database table.
   */
  function buildSupabaseRow(type, message, extra = {}) {
    return {
      type: type,
      timestamp: getTimestamp(),
      url: getCurrentUrl(),
      screen_resolution: getViewport(),
      user_agent: navigator.userAgent || '',
      message: message,
      file: extra.file || 'unknown',
      line: extra.line || 0
    };
  }

  /**
   * Fires the packed data to Supabase using native hardware background streams.
   * This is entirely invisible to the visitor and ensures zero layout shifts (CLS).
   */
  function sendToSupabase(logRowData) {
    if (!loggerState.isReady || loggerState.sentCount >= MAX_LOGS_PER_PAGE) {
      return;
    }

    try {
      // Supabase REST endpoints require explicit header keys to authorize data insertion.
      // We attach the public anon key directly as url parameters in the endpoint variable above,
      // and use a secure Blob payload package setup to bypass browser restrictions.
      const payload = new Blob([JSON.stringify(logRowData)], { type: 'application/json' });
      
      // Fires the package instantly. It remains active even if the user changes tabs.
      const sent = navigator.sendBeacon(`${LOG_ENDPOINT}?apikey=${SUPABASE_ANON_KEY}`, payload);
      
      if (sent) {
        loggerState.sentCount += 1;
      }
    } catch (error) {
      // Fails silently so internal telemetry code never blocks or crashes your main user interface.
      console.warn('Telemetry engine could not transmit log row.', error);
    }
  }

  function captureErrorEvent(event) {
    const details = event && event.error ? event.error : null;
    const message = details && details.message ? details.message : event?.message || 'Unknown runtime error';

    const row = buildSupabaseRow('error', message, {
      file: event?.filename || 'unknown',
      line: event?.lineno || 0
    });
    
    sendToSupabase(row);
  }

  function captureUnhandledRejection(event) {
    const reason = event?.reason;
    const message = reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection');

    const row = buildSupabaseRow('unhandledrejection', message, {
      file: 'async_promise_stream',
      line: 0
    });
    
    sendToSupabase(row);
  }

  function capturePageLoadTiming() {
    try {
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      const timing = navigationEntry || performance.timing;
      const domContentLoadedMs = timing?.domContentLoadedEventEnd || 0;
      const loadEventEndMs = timing?.loadEventEnd || 0;
      const durationMs = typeof timing?.duration === 'number' ? timing.duration : Math.max(loadEventEndMs, domContentLoadedMs);
      
      const absoluteDuration = Math.max(0, Math.round(durationMs));

      // Speed Rule: Only log and store page speeds if it takes longer than 3000ms (3 seconds)
      if (absoluteDuration > 3000) {
        const row = buildSupabaseRow('pageload_warning', `Slow page load duration detected: ${absoluteDuration}ms. Check mobile assets.`);
        sendToSupabase(row);
      }
    } catch (error) {
      console.warn('Telemetry engine could not parse performance timers.', error);
    }
  }

  // Set up global web listeners to watch for crashes or lag silently
  window.addEventListener('error', captureErrorEvent, true);
  window.addEventListener('unhandledrejection', captureUnhandledRejection, true);
  window.addEventListener('load', capturePageLoadTiming, { once: true });
})();
