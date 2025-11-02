#!/usr/bin/env node
/**
 * Setup Verification Script
 * Tests AC1-AC4: Next.js initialization, dependencies, structure, and environment
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  ac: string;
}

const results: TestResult[] = [];

function test(name: string, ac: string, fn: () => boolean, successMsg: string, failMsg: string) {
  try {
    const passed = fn();
    results.push({
      name,
      ac,
      passed,
      message: passed ? successMsg : failMsg
    });
  } catch (error) {
    results.push({
      name,
      ac,
      passed: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

console.log('🔍 AI Video Generator - Setup Verification\n');
console.log('Running tests for AC1-AC4...\n');

// AC1: Next.js Project Initialized
test(
  'Next.js package.json exists',
  'AC1',
  () => existsSync(join(process.cwd(), 'package.json')),
  '✅ package.json found',
  '❌ package.json not found'
);

test(
  'TypeScript configured',
  'AC1',
  () => existsSync(join(process.cwd(), 'tsconfig.json')),
  '✅ tsconfig.json found',
  '❌ tsconfig.json not found'
);

test(
  'Tailwind CSS configured',
  'AC1',
  () => existsSync(join(process.cwd(), 'tailwind.config.ts')),
  '✅ tailwind.config.ts found',
  '❌ tailwind.config.ts not found'
);

test(
  'Next.js App Router structure',
  'AC1',
  () => existsSync(join(process.cwd(), 'src', 'app')),
  '✅ src/app directory exists (App Router)',
  '❌ src/app directory not found'
);

// AC2: Dependencies Installed
const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const requiredDeps = {
  'next': 'Next.js framework',
  'react': 'React library',
  'zustand': 'State management',
  'better-sqlite3': 'SQLite database',
  'ollama': 'Ollama LLM client',
  'typescript': 'TypeScript',
  'tailwindcss': 'Tailwind CSS'
};

Object.entries(requiredDeps).forEach(([dep, description]) => {
  test(
    `Dependency: ${dep}`,
    'AC2',
    () => dep in deps,
    `✅ ${description} installed (${deps[dep]})`,
    `❌ ${description} not installed`
  );
});

// AC3: Project Structure Created
const requiredDirs = [
  'src/app',
  'src/components',
  'src/lib',
  'src/stores',
  'src/types'
];

requiredDirs.forEach(dir => {
  test(
    `Directory: ${dir}`,
    'AC3',
    () => existsSync(join(process.cwd(), dir)),
    `✅ ${dir} exists`,
    `❌ ${dir} not found`
  );
});

test(
  '.gitignore configured',
  'AC3',
  () => {
    const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf-8');
    return gitignore.includes('node_modules') && gitignore.includes('.env');
  },
  '✅ .gitignore includes node_modules and .env',
  '❌ .gitignore missing critical entries'
);

// AC4: Environment Configuration
test(
  '.env.local exists',
  'AC4',
  () => existsSync(join(process.cwd(), '.env.local')),
  '✅ .env.local file exists',
  '❌ .env.local file not found'
);

test(
  '.env.example exists',
  'AC4',
  () => existsSync(join(process.cwd(), '.env.example')),
  '✅ .env.example file exists',
  '❌ .env.example file not found'
);

if (existsSync(join(process.cwd(), '.env.local'))) {
  const envLocal = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  const requiredVars = [
    'OLLAMA_BASE_URL',
    'OLLAMA_MODEL',
    'LLM_PROVIDER',
    'DATABASE_PATH'
  ];

  requiredVars.forEach(varName => {
    test(
      `Environment variable: ${varName}`,
      'AC4',
      () => envLocal.includes(varName),
      `✅ ${varName} configured`,
      `❌ ${varName} missing`
    );
  });
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test Results Summary\n');

const byAC = results.reduce((acc, result) => {
  if (!acc[result.ac]) acc[result.ac] = { passed: 0, failed: 0 };
  result.passed ? acc[result.ac].passed++ : acc[result.ac].failed++;
  return acc;
}, {} as Record<string, { passed: number; failed: number }>);

Object.entries(byAC).forEach(([ac, counts]) => {
  const total = counts.passed + counts.failed;
  const status = counts.failed === 0 ? '✅' : '⚠️';
  console.log(`${status} ${ac}: ${counts.passed}/${total} tests passed`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 Detailed Results\n');

results.forEach(result => {
  console.log(`${result.passed ? '✅' : '❌'} [${result.ac}] ${result.message}`);
});

const totalPassed = results.filter(r => r.passed).length;
const totalTests = results.length;
const allPassed = totalTests === totalPassed;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`\n${allPassed ? '✅' : '⚠️'} Overall: ${totalPassed}/${totalTests} tests passed\n`);

process.exit(allPassed ? 0 : 1);
