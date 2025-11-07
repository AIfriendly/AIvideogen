// Quick script to check database contents
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'ai-video-generator.db');
const db = new Database(dbPath);

console.log('\n📊 Projects in Database:\n');
console.log('─'.repeat(100));

const projects = db.prepare(`
  SELECT id, name, topic, current_step, created_at, last_active
  FROM projects
  ORDER BY last_active DESC
`).all();

if (projects.length === 0) {
  console.log('No projects found.');
} else {
  projects.forEach((project, index) => {
    console.log(`\n${index + 1}. Project: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Topic: ${project.topic || '(not set)'}`);
    console.log(`   Current Step: ${project.current_step}`);
    console.log(`   Created: ${project.created_at}`);
    console.log(`   Last Active: ${project.last_active}`);

    // Count messages for this project
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE project_id = ?').get(project.id);
    console.log(`   Messages: ${messageCount.count}`);
  });
}

console.log('\n' + '─'.repeat(100));
console.log(`\nTotal Projects: ${projects.length}\n`);

db.close();
