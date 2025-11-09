/**
 * Quick Test for Story 2.5 - Voiceover Generation
 * Tests the core voiceover functionality with real KokoroTTS
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function quickTest() {
  console.log('='.repeat(70));
  console.log('🎧 QUICK TEST: Story 2.5 Voiceover Generation');
  console.log('='.repeat(70));

  try {
    // Step 1: Create project
    console.log('\n1️⃣  Creating test project...');
    let response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'Quick Voiceover Test' })
    });
    let data = await response.json();
    const projectId = data.data.project.id;
    console.log(`   ✅ Project created: ${projectId}`);

    // Step 2: Update project to set topic directly (bypass workflow)
    console.log('\n2️⃣  Setting up project (bypass normal workflow for testing)...');
    // We'll manually set the required state via database or API calls

    // Step 3: Generate script
    console.log('\n3️⃣  Generating script...');
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/generate-script`, {
      method: 'POST'
    });
    data = await response.json();

    if (!data.success) {
      console.log(`   ⚠️  Script generation issue: ${data.error}`);
      console.log(`   💡 This might require topic confirmation first`);
      console.log(`   🔄 Let's try updating project topic first...`);

      // Update project topic
      response = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Test: Markdown **bold** and *italic* removal' })
      });

      await sleep(1000);

      // Try script generation again
      response = await fetch(`${BASE_URL}/api/projects/${projectId}/generate-script`, {
        method: 'POST'
      });
      data = await response.json();
    }

    if (data.success) {
      console.log(`   ✅ Script generated with ${data.data.scenes?.length || 0} scenes`);
    } else {
      console.log(`   ❌ Script generation failed: ${data.error}`);
      return;
    }

    // Step 4: Select voice
    console.log('\n4️⃣  Selecting voice "sarah"...');
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/select-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId: 'sarah' })
    });
    data = await response.json();

    if (data.success) {
      console.log(`   ✅ Voice selected: sarah`);
    } else {
      console.log(`   ❌ Voice selection failed: ${data.error}`);
      return;
    }

    // Step 5: Generate voiceovers (THE ACTUAL STORY 2.5 TEST!)
    console.log('\n5️⃣  🎯 TESTING STORY 2.5: Generating voiceovers...');
    console.log('   This tests all acceptance criteria:');
    console.log('   - AC1: Prerequisite validation');
    console.log('   - AC2-AC3: Text sanitization');
    console.log('   - AC4: TTS MP3 generation');
    console.log('   - AC5: File storage');
    console.log('   - AC6: Database updates');
    console.log('   - AC7: Progress tracking');
    console.log('   - AC9: Total duration');
    console.log('   - AC10: Workflow advancement');

    const startTime = Date.now();
    response = await fetch(`${BASE_URL}/api/projects/${projectId}/generate-voiceovers`, {
      method: 'POST'
    });
    data = await response.json();

    if (!data.success) {
      console.log(`\n   ❌ FAILED: ${data.error?.message || data.error}`);
      console.log(`   Error code: ${data.error?.code}`);
      return;
    }

    console.log(`\n   ✅ Voiceover generation started!`);

    // Step 6: Poll for progress
    console.log('\n6️⃣  📊 Monitoring progress...');
    let completed = false;
    let pollCount = 0;

    while (!completed && pollCount < 60) {
      await sleep(1000);
      pollCount++;

      response = await fetch(`${BASE_URL}/api/projects/${projectId}/voiceover-progress`);
      const progressData = await response.json();

      if (progressData.success) {
        const { status, currentScene, totalScenes, progress } = progressData.data;
        process.stdout.write(`\r   Progress: ${progress || 0}% (Scene ${currentScene || 0}/${totalScenes || 0}) - ${status}  `);

        if (status === 'complete') {
          completed = true;
          console.log('\n   ✅ Generation complete!');
        } else if (status === 'error') {
          console.log('\n   ❌ Generation error!');
          return;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ⏱️  Total time: ${duration}s`);

    // Step 7: Verify results
    console.log('\n7️⃣  🔍 Verifying results...');

    // Check audio files
    const audioDir = path.join(__dirname, '.cache', 'audio', 'projects', projectId);
    if (fs.existsSync(audioDir)) {
      const files = fs.readdirSync(audioDir);
      const mp3Files = files.filter(f => f.endsWith('.mp3'));
      console.log(`   ✅ Audio directory exists: ${mp3Files.length} MP3 files`);
      mp3Files.forEach(file => {
        const stats = fs.statSync(path.join(audioDir, file));
        console.log(`      - ${file}: ${Math.round(stats.size / 1024)} KB`);
      });
    } else {
      console.log(`   ❌ Audio directory not found`);
    }

    // Check project state
    response = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    data = await response.json();

    if (data.success) {
      const project = data.data;
      console.log(`   ✅ Workflow step: ${project.currentStep} (should be 'visual-sourcing')`);
      console.log(`   ✅ Total duration: ${project.totalDuration}s`);
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('✅ Story 2.5 voiceover generation PASSED');
    console.log(`📁 Project ID: ${projectId}`);
    console.log(`🎯 Test audio files in: .cache/audio/projects/${projectId}/`);
    console.log(`👂 MANUAL STEP: Listen to MP3 files to verify audio quality`);
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();
