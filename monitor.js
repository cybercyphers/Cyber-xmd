// monitor.js - Memory and crash protection
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🛡️ Starting bot with memory monitor...');

let restartCount = 0;
const maxRestarts = 10;

function startBot() {
    console.log(`🚀 Starting bot (attempt ${restartCount + 1}/${maxRestarts})...`);
    
    const botProcess = spawn('node', ['--max-old-space-size=768', 'cyphers.js'], {
        stdio: 'inherit',
        shell: true
    });

    botProcess.on('close', (code) => {
        console.log(`❌ Bot process exited with code ${code}`);
        
        if (restartCount < maxRestarts) {
            restartCount++;
            console.log(`🔄 Restarting in 3 seconds... (${restartCount}/${maxRestarts})`);
            setTimeout(startBot, 3000);
        } else {
            console.log('🛑 Maximum restart attempts reached. Stopping.');
        }
    });

    botProcess.on('error', (error) => {
        console.log('❌ Bot process error:', error);
    });
}

// Memory monitoring
setInterval(() => {
    const used = process.memoryUsage();
    const memoryMB = Math.round(used.heapUsed / 1024 / 1024);
    
    if (memoryMB > 600) {
        console.log(`⚠️ High memory usage: ${memoryMB}MB`);
    }
}, 30000);

// Start the bot
startBot();