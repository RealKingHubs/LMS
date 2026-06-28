const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('RealKingHubs LMS Tests', () => {
  // Test 1: Verify index.html structure
  test('index.html loads and has correct container elements', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    assert.strictEqual(document.title, 'RealKingHubs Academy');
    assert.ok(document.getElementById('landingPage'), 'Should have a landing page element');
    assert.ok(document.getElementById('authPage'), 'Should have an auth page element');
    assert.ok(document.getElementById('appPage'), 'Should have an app page element');
  });

  // Test 2: Verify uc-admin/index.html structure
  test('uc-admin/index.html loads and has admin elements', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../uc-admin/index.html'), 'utf8');
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    assert.strictEqual(document.title, 'RealKingHubs Admin');
    assert.ok(document.getElementById('adminGate'), 'Should have an admin gate sign-in container');
    assert.ok(document.getElementById('adminApp'), 'Should have the main admin app container');
  });

  // Test 3: Verify data.js loads and populates RKH_DATA
  test('data.js loads RKH_DATA with correct tracks', () => {
    const dataJsContent = fs.readFileSync(path.resolve(__dirname, '../Page-Js/data.js'), 'utf8');
    const html = `<!DOCTYPE html><html><body><script>${dataJsContent}</script></body></html>`;
    const dom = new JSDOM(html, { runScripts: "dangerously" });
    const RKH_DATA = dom.window.RKH_DATA;
    
    assert.ok(RKH_DATA, 'RKH_DATA should be defined on the window object');
    assert.ok(RKH_DATA.tracks, 'RKH_DATA should contain tracks');
    
    // Check that core tracks exist
    const expectedTracks = ['cloud-engineering', 'frontend-engineering', 'backend-engineering'];
    expectedTracks.forEach(trackId => {
      assert.ok(RKH_DATA.tracks[trackId], `Track ${trackId} should be defined`);
      const track = RKH_DATA.tracks[trackId];
      assert.ok(track.semesters, `Track ${trackId} should have semesters`);
      assert.strictEqual(track.semesters.length, 3, `Track ${trackId} should have exactly 3 semesters`);
    });
  });
});
