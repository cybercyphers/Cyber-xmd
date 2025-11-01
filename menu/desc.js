const os = require('os');

function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

function getRAMUsage() {
  const totalRAM = os.totalmem() / (1024 * 1024 * 1024);
  const freeRAM = os.freemem() / (1024 * 1024 * 1024);
  const usedRAM = totalRAM - freeRAM;
  return `${usedRAM.toFixed(0)}/${totalRAM.toFixed(0)}GB`;
}

async function getBotStats(sock, msg) {
  // Get current time and date
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  // Bot statistics
  const botVersion = '1.0.0';
  const pluginsCount = '12'; // Update this with your actual plugin count
  const ramUsage = getRAMUsage();
  const platform = os.platform();
  const uptime = formatUptime(process.uptime());

  let menuText = `╭═══ CYPHER ═══⊷
┃❃╭──────────────
┃❃│ Prefix : .
┃❃│ User : ${msg.pushName || 'User'}
┃❃│ Time : ${time}
┃❃│ Day : ${day}
┃❃│ Date : ${date}
┃❃│ Version : ${botVersion}
┃❃│ Plugins : ${pluginsCount}
┃❃│ Ram : ${ramUsage}
┃❃│ Uptime : ${uptime}
┃❃│ Platform : ${platform}
┃❃╰───────────────
╰═════════════════⊷\n\n`

  // User Management Commands
  menuText += '╭─❏ USER MANAGEMENT ❏\n'
  menuText += '│ listuser\n'
  menuText += '│ adduser\n'
  menuText += '│ deluser\n'
  menuText += '╰─────────────────\n\n'
  
  // Security/Encryption Commands
  menuText += '╭─❏ SECURITY & ENCRYPTION ❏\n'
  menuText += '│ cyph\n'
  menuText += '│ cyph2\n'
  menuText += '╰─────────────────\n\n'
  
  // F-Droid Commands
  menuText += '╭─❏ F-DROID ❏\n'
  menuText += '│ fdroid\n'
  menuText += '╰─────────────────\n\n'
  
  // Help & Information Commands
  menuText += '╭─❏ HELP & INFORMATION ❏\n'
  menuText += '│ help\n'
  menuText += '│ hp\n'
  menuText += '│ hp2\n'
  menuText += '│ vidhp\n'
  menuText += '│ menu\n'
  menuText += '╰─────────────────\n\n'
  
  // System & Utility Commands
  menuText += '╭─❏ SYSTEM & UTILITY ❏\n'
  menuText += '│ mode\n'
  menuText += '│ ping\n'
  menuText += '╰─────────────────\n\n'
  
  menuText += '👑 Global Owner: Am All\n'
  menuText += '📝 Use commands with prefix . (dot)'

  return menuText;
}

module.exports = {
  getBotStats,
  formatUptime,
  getRAMUsage
};
