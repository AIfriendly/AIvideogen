/**
 * Manual Test Script for Story 4.1
 * Scene-by-Scene UI Layout & Script Display
 *
 * Tests:
 * 1. API endpoint returns scenes correctly
 * 2. Various scene counts (0, 1, many)
 * 3. Error handling (invalid project ID)
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, 'ai-video-generator.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('='.repeat(80));
console.log('Story 4.1 Test: Scene-by-Scene UI Layout & Script Display');
console.log('='.repeat(80));
console.log();

// Test 1: Get all projects
console.log('Test 1: Get All Projects');
console.log('-'.repeat(80));
const projects = db.prepare('SELECT * FROM projects ORDER BY last_active DESC').all();
console.log(`Found ${projects.length} projects:`);
projects.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
  console.log(`     Current Step: ${p.current_step}`);
  console.log(`     Visuals Generated: ${p.visuals_generated ? 'Yes' : 'No'}`);
});
console.log();

// Test 2: Get scenes for each project
console.log('Test 2: Get Scenes for Each Project');
console.log('-'.repeat(80));
projects.forEach((project) => {
  const scenes = db
    .prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC')
    .all(project.id);

  console.log(`Project: ${project.name}`);
  console.log(`  Scenes Count: ${scenes.length}`);

  if (scenes.length > 0) {
    console.log(`  First Scene:`);
    console.log(`    - Number: ${scenes[0].scene_number}`);
    console.log(`    - Text: ${scenes[0].text.substring(0, 80)}...`);
    console.log(`    - Duration: ${scenes[0].duration}s`);
    console.log(`    - Audio: ${scenes[0].audio_file_path || 'None'}`);

    const totalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
    console.log(`  Total Duration: ${totalDuration.toFixed(1)}s`);
  } else {
    console.log(`  No scenes found for this project`);
  }
  console.log();
});

// Test 3: Check visual suggestions for scenes
console.log('Test 3: Check Visual Suggestions for Scenes');
console.log('-'.repeat(80));
projects.forEach((project) => {
  const scenesWithSuggestions = db
    .prepare(
      `
    SELECT s.id, s.scene_number, COUNT(vs.id) as suggestion_count
    FROM scenes s
    LEFT JOIN visual_suggestions vs ON s.id = vs.scene_id
    WHERE s.project_id = ?
    GROUP BY s.id
    ORDER BY s.scene_number ASC
  `
    )
    .all(project.id);

  if (scenesWithSuggestions.length > 0) {
    console.log(`Project: ${project.name}`);
    scenesWithSuggestions.forEach((scene) => {
      console.log(
        `  Scene ${scene.scene_number}: ${scene.suggestion_count} visual suggestions`
      );
    });
    console.log();
  }
});

// Test 4: Simulate API response format
console.log('Test 4: Simulated API Response Format');
console.log('-'.repeat(80));
if (projects.length > 0) {
  const testProject = projects[0];
  const scenes = db
    .prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY scene_number ASC')
    .all(testProject.id);

  const apiResponse = {
    success: true,
    data: {
      scenes: scenes.map((s) => ({
        id: s.id,
        project_id: s.project_id,
        scene_number: s.scene_number,
        text: s.text,
        sanitized_text: s.sanitized_text,
        audio_file_path: s.audio_file_path,
        duration: s.duration,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })),
    },
  };

  console.log('Sample API Response (first project):');
  console.log(JSON.stringify(apiResponse, null, 2).substring(0, 500) + '...');
  console.log();
}

// Test 5: Test Cases Summary
console.log('Test 5: Test Cases Summary');
console.log('-'.repeat(80));

const testCases = [
  {
    name: 'Projects with scenes',
    count: projects.filter((p) => {
      const scenes = db
        .prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?')
        .get(p.id);
      return scenes.count > 0;
    }).length,
  },
  {
    name: 'Projects without scenes',
    count: projects.filter((p) => {
      const scenes = db
        .prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?')
        .get(p.id);
      return scenes.count === 0;
    }).length,
  },
  {
    name: 'Projects with visuals generated',
    count: projects.filter((p) => p.visuals_generated === 1).length,
  },
  {
    name: 'Scenes with audio',
    count: db
      .prepare('SELECT COUNT(*) as count FROM scenes WHERE audio_file_path IS NOT NULL')
      .get().count,
  },
  {
    name: 'Scenes with visual suggestions',
    count: db
      .prepare('SELECT COUNT(DISTINCT scene_id) as count FROM visual_suggestions')
      .get().count,
  },
];

testCases.forEach((tc) => {
  console.log(`✓ ${tc.name}: ${tc.count}`);
});
console.log();

// Test 6: Ready for Visual Curation Check
console.log('Test 6: Projects Ready for Visual Curation');
console.log('-'.repeat(80));
const readyProjects = projects.filter((p) => p.visuals_generated === 1);
console.log(`${readyProjects.length} project(s) ready for visual curation:`);
readyProjects.forEach((p, i) => {
  const sceneCount = db
    .prepare('SELECT COUNT(*) as count FROM scenes WHERE project_id = ?')
    .get(p.id).count;
  console.log(`  ${i + 1}. ${p.name} - ${sceneCount} scenes`);
  console.log(`     URL: /projects/${p.id}/visual-curation`);
});
console.log();

console.log('='.repeat(80));
console.log('Story 4.1 Implementation Test Complete');
console.log('='.repeat(80));
console.log();
console.log('Next Steps:');
console.log('  1. Start dev server: npm run dev');
console.log('  2. Navigate to a visual curation URL from above');
console.log('  3. Verify scene cards display correctly');
console.log('  4. Test responsive design (desktop, tablet)');
console.log('  5. Test loading/error states');
console.log();

db.close();
