const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const sourceDir = path.join(rootDir, 'public');
const outputDir = path.join(rootDir, 'dist');

function removeDirectory(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.rmSync(directoryPath, { recursive: true, force: true });
  }
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function createRuntimeConfigFile(destinationDir) {
  const socketUrl = (process.env.SOCKET_URL || '').trim();
  const configContent = `window.APP_CONFIG = ${JSON.stringify({
    SOCKET_URL: socketUrl,
  }, null, 2)};\n`;
  fs.writeFileSync(path.join(destinationDir, 'config.js'), configContent, 'utf8');
}

removeDirectory(outputDir);
copyDirectory(sourceDir, outputDir);
createRuntimeConfigFile(outputDir);

console.log(`Built frontend into ${path.relative(rootDir, outputDir)}`);
