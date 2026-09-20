const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

describe("RealKingHubs LMS Tests", () => {
  // Test 1: Verify index.html structure
  test("index.html loads and has correct container elements", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../index.html"),
      "utf8",
    );
    const dom = new JSDOM(html);
    const document = dom.window.document;

    assert.strictEqual(document.title, "RealKingHubs Academy");
    assert.ok(
      document.getElementById("landingPage"),
      "Should have a landing page element",
    );
    assert.ok(
      document.getElementById("authPage"),
      "Should have an auth page element",
    );
    assert.ok(
      document.getElementById("appPage"),
      "Should have an app page element",
    );
  });

  // Test 2: Verify uc-admin/index.html structure
  test("uc-admin/index.html loads and has admin elements", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../uc-admin/index.html"),
      "utf8",
    );
    const dom = new JSDOM(html);
    const document = dom.window.document;

    assert.strictEqual(document.title, "RealKingHubs Admin");
    assert.ok(
      document.getElementById("adminGate"),
      "Should have an admin gate sign-in container",
    );
    assert.ok(
      document.getElementById("adminApp"),
      "Should have the main admin app container",
    );
  });

  // Test 3: Verify data.js loads and populates RKH_DATA
  test("data.js loads RKH_DATA with correct tracks", () => {
    const dataJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/data.js"),
      "utf8",
    );
    const html = `<!DOCTYPE html><html><body><script>${dataJsContent}</script></body></html>`;
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    const RKH_DATA = dom.window.RKH_DATA;

    assert.ok(RKH_DATA, "RKH_DATA should be defined on the window object");
    assert.ok(RKH_DATA.tracks, "RKH_DATA should contain tracks");

    // Check that core tracks exist
    const expectedTracks = [
      "cloud-engineering",
      "frontend-engineering",
      "backend-engineering",
    ];
    expectedTracks.forEach((trackId) => {
      assert.ok(RKH_DATA.tracks[trackId], `Track ${trackId} should be defined`);
      const track = RKH_DATA.tracks[trackId];
      assert.ok(track.semesters, `Track ${trackId} should have semesters`);
      assert.strictEqual(
        track.semesters.length,
        3,
        `Track ${trackId} should have exactly 3 semesters`,
      );
    });
  });

  test("shared config script is loaded before the app entry points", () => {
    const landingHtml = fs.readFileSync(
      path.resolve(__dirname, "../index.html"),
      "utf8",
    );
    const adminHtml = fs.readFileSync(
      path.resolve(__dirname, "../uc-admin/index.html"),
      "utf8",
    );

    const landingConfigIndex = landingHtml.indexOf("Page-Js/config.js");
    const landingAppIndex = landingHtml.indexOf("Page-Js/app.js");
    assert.ok(
      landingConfigIndex !== -1,
      "Landing page should load the shared config script",
    );
    assert.ok(
      landingAppIndex > landingConfigIndex,
      "Landing page should load config before app logic",
    );

    const adminConfigIndex = adminHtml.indexOf("/Page-Js/config.js");
    const adminAppIndex = adminHtml.indexOf("/uc-admin/admin.js");
    assert.ok(
      adminConfigIndex !== -1,
      "Admin page should load the shared config script",
    );
    assert.ok(
      adminAppIndex > adminConfigIndex,
      "Admin page should load config before admin logic",
    );
  });

  test("auth helpers keep the dashboard open for real sign-in sessions", () => {
    const configJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/config.js"),
      "utf8",
    );
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><script>${configJsContent}</script></body></html>`,
      { runScripts: "dangerously" },
    );
    const helpers = dom.window.RKH_AUTH_HELPERS;

    assert.ok(helpers, "Auth helpers should be exposed from the shared config");
    assert.strictEqual(
      helpers.resolveAuthEventAction(
        "SIGNED_IN",
        { user: { id: "user-1" } },
        null,
      ),
      "open-dashboard",
    );
    assert.strictEqual(
      helpers.resolveAuthEventAction(
        "INITIAL_SESSION",
        { user: { id: "user-1" } },
        null,
      ),
      "open-dashboard",
    );
    assert.strictEqual(
      helpers.resolveAuthEventAction(
        "TOKEN_REFRESHED",
        { user: { id: "user-1" } },
        "user-1",
      ),
      "keep-current",
    );
    assert.strictEqual(
      helpers.resolveAuthEventAction("SIGNED_OUT", null, "user-1"),
      "show-landing",
    );
    assert.strictEqual(
      helpers.resolveAuthEventAction("SIGNED_OUT", null, null),
      "keep-current",
    );
  });

  test("auth helpers choose a fallback track when login metadata omits one", () => {
    const configJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/config.js"),
      "utf8",
    );
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><script>${configJsContent}</script></body></html>`,
      { runScripts: "dangerously" },
    );
    const helpers = dom.window.RKH_AUTH_HELPERS;

    const resolvedTrackId = helpers.resolveEffectiveTrackId({}, [
      "cloud-engineering",
      "frontend-engineering",
    ]);

    assert.strictEqual(resolvedTrackId, "cloud-engineering");
  });

  test("auth helpers build a learner snapshot from the signed-in session", () => {
    const configJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/config.js"),
      "utf8",
    );
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><script>${configJsContent}</script></body></html>`,
      { runScripts: "dangerously" },
    );
    const helpers = dom.window.RKH_AUTH_HELPERS;

    const snapshot = helpers.buildAuthenticatedUserSnapshot(
      {
        user: {
          id: "user-1",
          email: "learner@example.com",
          user_metadata: {
            first_name: "Ada",
            track_id: "cloud-engineering",
          },
        },
      },
      "cloud-engineering",
    );

    assert.strictEqual(snapshot.id, "user-1");
    assert.strictEqual(snapshot.email, "learner@example.com");
    assert.strictEqual(snapshot.firstName, "Ada");
    assert.strictEqual(snapshot.trackId, "cloud-engineering");
  });

  test("dashboard content surfaces render a structured header shell", () => {
    const appJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/app.js"),
      "utf8",
    );
    const match = appJsContent.match(
      /function buildContentSurfaceHeader\([^)]*\) \{[\s\S]*?\n  \}/,
    );

    assert.ok(match, "The dashboard content-surface helper should be defined");

    const context = { escapeHtml: (value) => String(value || "") };
    vm.createContext(context);
    vm.runInContext(match[0], context);

    const html = context.buildContentSurfaceHeader({
      eyebrow: "Course content",
      title: "Curriculum",
      description: "A calmer view of learning content.",
      metaItems: ["3 semesters", "12 months"],
    });

    assert.match(html, /content-surface-shell/);
    assert.match(html, /Course content/);
    assert.match(html, /Curriculum/);
    assert.match(html, /3 semesters/);
  });

  test("admin log panel uses the authenticated Supabase client for reads and deletes", () => {
    const adminJsContent = fs.readFileSync(
      path.resolve(__dirname, "../uc-admin/admin.js"),
      "utf8",
    );

    assert.match(
      adminJsContent,
      /from\(["']system_logs["']\)\s*\.select\(\s*["']\*['"]\s*\)/,
      "The admin log feed should query the authenticated system_logs table.",
    );
    assert.match(
      adminJsContent,
      /from\(["']system_logs["']\)\s*\.delete\(\)\s*\.eq\(\s*["']id["']\s*,\s*logId\s*\)/,
      "Log deletion should use the authenticated Supabase client.",
    );
  });

  test("certificate preview reflects the current brand and footer values", () => {
    const adminJsContent = fs.readFileSync(
      path.resolve(__dirname, "../uc-admin/admin.js"),
      "utf8",
    );

    assert.match(
      adminJsContent,
      /certificate-brand-name|certificate-track-copy|certificate-footer-note/,
      "The certificate preview markup should render the live brand, track text, and footer note.",
    );
  });

  test("learner certificate uses a professional certificate of completion template", () => {
    const appJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/app.js"),
      "utf8",
    );

    assert.match(
      appJsContent,
      /title:\s*"Certificate of Completion"/,
      "The default learner certificate should use a professional Certificate of Completion title.",
    );
    assert.match(
      appJsContent,
      /This certifies that/,
      "The learner certificate should keep the modern certifying line.",
    );
    assert.match(
      appJsContent,
      /certificate-brand-name|certificate-pro-badge/,
      "The live learner certificate should include the premium branded top bar.",
    );
  });

  test("direct video file links render with an HTML5 player instead of an iframe", () => {
    const appJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/app.js"),
      "utf8",
    );
    const mediaHelpersMatch = appJsContent.match(
      /function normalizeMediaUrlForPlayer\([^)]*\) \{[\s\S]*?function buildLessonMediaPlayerHtml\([^)]*\) \{[\s\S]*?\n  \}/,
    );

    assert.ok(
      mediaHelpersMatch,
      "The app should include direct media detection and player helpers",
    );

    const context = {
      escapeHtml: (value) =>
        String(value || "").replace(
          /[&<>"']/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[ch],
        ),
      escapeAttribute: (value) =>
        String(value || "").replace(
          /[&<>"']/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[ch],
        ),
    };
    vm.createContext(context);
    vm.runInContext(mediaHelpersMatch[0], context);

    assert.strictEqual(
      context.isDirectVideoUrl("https://example.com/video.mp4"),
      true,
    );
    assert.strictEqual(
      context.isDirectVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      false,
    );
    const html = context.buildLessonMediaPlayerHtml(
      "https://example.com/video.mp4",
      "Intro lesson",
    );
    assert.match(html, /<video/i);
    assert.match(html, /src="https:\/\/example.com\/video.mp4"/);
    assert.doesNotMatch(html, /<iframe/i);
  });

  test("lesson resource links render for students inside the lesson player", () => {
    const appJsContent = fs.readFileSync(
      path.resolve(__dirname, "../Page-Js/app.js"),
      "utf8",
    );
    const renderMatch = appJsContent.match(
      /function renderLessonPlayer\([^)]*\) \{[\s\S]*?\n  \}/,
    );

    assert.ok(renderMatch, "The lesson player should render resource links");

    const context = {
      state: { currentLessonVideoIndex: 0 },
      escapeHtml: (value) =>
        String(value || "").replace(
          /[&<>"']/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[ch],
        ),
      escapeAttribute: (value) =>
        String(value || "").replace(
          /[&<>"']/g,
          (ch) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[ch],
        ),
      normalizeLessonVideoItems: (videoItems, fallbackVideoUrl = "") => {
        const resolved = Array.isArray(videoItems)
          ? videoItems
          : typeof videoItems === "string"
            ? videoItems
                .split(/\r?\n|,/)
                .map((item) => item.trim())
                .filter(Boolean)
            : [];

        const normalized = resolved.map((item, index) => {
          if (typeof item === "string") {
            return { title: `Video ${index + 1}`, url: item.trim() };
          }

          if (item && typeof item === "object") {
            const url = String(item.url || item.videoUrl || "").trim();
            if (!url) return null;
            return {
              title: String(item.title || `Video ${index + 1}`).trim(),
              url,
            };
          }

          return null;
        });

        const filtered = normalized.filter(Boolean);
        if (filtered.length) return filtered;
        if (fallbackVideoUrl) {
          return [{ title: "Lesson video", url: fallbackVideoUrl }];
        }
        return [];
      },
      getLessonContext: () => ({
        semester: { label: "Semester 1" },
        month: { label: "Month 1", title: "Learning" },
      }),
      getNextLessonContext: () => null,
      getCertificateData: () => ({ unlocked: false }),
      buildLessonMediaPlayerHtml: (url, title) =>
        `<video src="${url}" controls title="${title}"></video>`,
    };

    vm.createContext(context);
    vm.runInContext(renderMatch[0], context);

    const html = context.renderLessonPlayer(
      { label: "Cloud Engineering" },
      { completedLessonIds: [] },
      {
        id: "week-1",
        title: "Intro lesson",
        objective: "Learn a core concept.",
        type: "learning",
        videoItems: [],
        videoUrl: "",
        resourceItems: [
          { title: "Class notes", url: "https://example.com/notes" },
        ],
      },
    );

    assert.match(html, /resource-link-card/i);
    assert.match(html, /Class notes/i);
    assert.match(html, /https:\/\/example.com\/notes/i);
  });
});
