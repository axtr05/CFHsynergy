/**
 * Utility script to prepare the project for Vercel deployment
 * Run with: node prepare-vercel.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Preparing project for Vercel deployment...');

// Ensure vercel.json exists
const vercelConfigPath = path.join(__dirname, 'vercel.json');
if (!fs.existsSync(vercelConfigPath)) {
  console.error('Error: vercel.json is missing. Please create it first.');
  process.exit(1);
}

// Check if frontend has vercel-build script
const frontendPackageJsonPath = path.join(__dirname, 'frontend', 'package.json');
if (!fs.existsSync(frontendPackageJsonPath)) {
  console.error('Error: frontend/package.json is missing.');
  process.exit(1);
}

let frontendPackageJson;
try {
  frontendPackageJson = JSON.parse(fs.readFileSync(frontendPackageJsonPath, 'utf8'));
} catch (err) {
  console.error('Error reading frontend/package.json:', err);
  process.exit(1);
}

// Ensure vercel-build script exists
if (!frontendPackageJson.scripts || !frontendPackageJson.scripts['vercel-build']) {
  console.log('Adding vercel-build script to frontend/package.json...');
  if (!frontendPackageJson.scripts) frontendPackageJson.scripts = {};
  frontendPackageJson.scripts['vercel-build'] = 'vite build';
  
  // Write updated package.json
  fs.writeFileSync(frontendPackageJsonPath, JSON.stringify(frontendPackageJson, null, 2), 'utf8');
  console.log('Added vercel-build script to frontend/package.json');
} else {
  console.log('vercel-build script already exists in frontend/package.json');
}

// Create or update env.production if needed
const envProductionPath = path.join(__dirname, '.env.production');
const envPath = path.join(__dirname, '.env');

// If .env exists but .env.production doesn't, create it
if (fs.existsSync(envPath) && !fs.existsSync(envProductionPath)) {
  console.log('Creating .env.production from .env...');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace or add NODE_ENV=production
  let envProductionContent = envContent.includes('NODE_ENV=') 
    ? envContent.replace(/NODE_ENV=.*/, 'NODE_ENV=production')
    : `NODE_ENV=production\n${envContent}`;
  
  // Update CLIENT_URL if needed
  const defaultVercelUrl = '[your-vercel-domain].vercel.app';
  if (envProductionContent.includes('CLIENT_URL=')) {
    envProductionContent = envProductionContent.replace(
      /CLIENT_URL=.*/,
      `CLIENT_URL=https://${defaultVercelUrl}`
    );
  } else {
    envProductionContent += `\nCLIENT_URL=https://${defaultVercelUrl}`;
  }
  
  // Add comment about updating the domain
  envProductionContent += '\n# Remember to update the CLIENT_URL with your actual Vercel domain after deployment';
  
  fs.writeFileSync(envProductionPath, envProductionContent, 'utf8');
  console.log('Created .env.production file');
}

console.log('\nVercel preparation complete!');
console.log('\nNext steps:');
console.log('1. Push your project to GitHub, GitLab, or Bitbucket');
console.log('2. Import your repository in the Vercel dashboard');
console.log('3. Set up environment variables in Vercel');
console.log('4. Deploy!');
console.log('\nSee VERCEL_DEPLOYMENT.md for detailed instructions.'); 