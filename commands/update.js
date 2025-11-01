const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: 'update',
    description: 'Update bot from GitHub',
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        
        try {
            const action = args[0]?.toLowerCase();
            const repoUrl = 'https://github.com/cybercyphers/Cyphers.git';

            if (action === 'check') {
                await sock.sendMessage(from, { 
                    text: '🔄 Checking for update...' 
                }, { quoted: msg });

                const updateInfo = await checkForUpdates(repoUrl);
                
                if (updateInfo.status === 'up-to-date') {
                    await sock.sendMessage(from, { 
                        text: '✅ Bot is up to date!' 
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { 
                        text: `📦 Updates available!\n\n🔄 Use .update now to install` 
                    }, { quoted: msg });
                }
                return;
            }

            if (action === 'now') {
                await sock.sendMessage(from, { 
                    text: '🚀 Starting update process...' 
                }, { quoted: msg });

                const result = await forceUpdate(repoUrl);
                await sock.sendMessage(from, { 
                    text: result 
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { 
                text: '🔄 Update System\n\n.update check - Check updates\n.update now - Force update' 
            }, { quoted: msg });

        } catch (error) {
            console.error('Update error:', error);
            await sock.sendMessage(from, { 
                text: `❌ Update error: ${error.message}` 
            }, { quoted: msg });
        }
    }
};

async function checkForUpdates(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_check_' + Date.now());
        
        console.log('🔍 Checking GitHub repository...');
        
        exec(`git clone --depth 1 ${repoUrl} ${tempDir}`, (cloneError) => {
            if (cloneError) {
                reject(new Error('Cannot access repository'));
                return;
            }

            compareEverything(tempDir).then(result => {
                fs.removeSync(tempDir);
                resolve(result);
            }).catch(error => {
                fs.removeSync(tempDir);
                reject(error);
            });
        });
    });
}

async function compareEverything(tempRepoPath) {
    const currentDir = path.join(__dirname, '..');
    
    const repoFiles = await getAllFiles(tempRepoPath);
    const currentFiles = await getAllFiles(currentDir);
    
    const filteredRepoFiles = repoFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git')
    );
    
    const filteredCurrentFiles = currentFiles.filter(file => 
        !file.includes('node_modules') && 
        !file.includes('auth_info') &&
        !file.includes('temp_') &&
        !file.includes('.git')
    );

    if (filteredRepoFiles.length !== filteredCurrentFiles.length) {
        return { status: 'updates-available' };
    }

    for (const file of filteredRepoFiles) {
        const relativePath = path.relative(tempRepoPath, file);
        const currentFilePath = path.join(currentDir, relativePath);
        
        if (!await fs.pathExists(currentFilePath)) {
            return { status: 'updates-available' };
        }
        
        const repoContent = await fs.readFile(file, 'utf8').catch(() => '');
        const currentContent = await fs.readFile(currentFilePath, 'utf8').catch(() => '');
        
        if (repoContent !== currentContent) {
            return { status: 'updates-available' };
        }
    }

    return { status: 'up-to-date' };
}

async function getAllFiles(dir) {
    let results = [];
    
    try {
        const list = await fs.readdir(dir);
        
        for (const file of list) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isDirectory()) {
                if (!file.includes('node_modules') && !file.includes('.git')) {
                    const subFiles = await getAllFiles(filePath);
                    results = results.concat(subFiles);
                }
            } else {
                results.push(filePath);
            }
        }
    } catch (error) {
        // Skip if cannot read directory
    }
    
    return results;
}

async function forceUpdate(repoUrl) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, '..', 'temp_update_' + Date.now());
        const currentDir = path.join(__dirname, '..');
        
        console.log('📥 Downloading repository...');
        
        // Step 1: Clone fresh repo
        exec(`git clone ${repoUrl} ${tempDir}`, async (cloneError) => {
            if (cloneError) {
                reject(new Error('Download failed: ' + cloneError.message));
                return;
            }

            console.log('🔄 Replacing files...');
            
            try {
                // Step 2: Get ALL files and folders from temp repo
                const getAllItems = async (dir) => {
                    let items = [];
                    const list = await fs.readdir(dir);
                    
                    for (const item of list) {
                        const itemPath = path.join(dir, item);
                        const stat = await fs.stat(itemPath);
                        items.push({
                            name: item,
                            path: itemPath,
                            isDirectory: stat.isDirectory(),
                            relativePath: path.relative(tempDir, itemPath)
                        });
                    }
                    return items;
                };

                const repoItems = await getAllItems(tempDir);
                
                // Step 3: Delete existing bot files (KEEP THESE FOLDERS!)
                const foldersToKeep = ['node_modules', 'auth_info'];
                const filesToKeep = ['package-lock.json', '.npm'];
                
                const currentItems = await fs.readdir(currentDir);
                
                for (const item of currentItems) {
                    // DON'T delete these important folders/files
                    if (!foldersToKeep.includes(item) && 
                        !filesToKeep.includes(item) &&
                        !item.startsWith('temp_') && 
                        item !== '.git') {
                        
                        const itemPath = path.join(currentDir, item);
                        try {
                            await fs.remove(itemPath);
                            console.log('🗑️ Deleted:', item);
                        } catch (error) {
                            console.log('⚠️ Could not delete:', item);
                        }
                    } else {
                        console.log('🔒 Preserved:', item);
                    }
                }

                console.log('📁 Copying ALL files from repository...');
                
                // Step 4: Copy EVERYTHING from temp repo
                for (const item of repoItems) {
                    if (item.name !== '.git') { // Don't copy .git folder
                        const sourcePath = item.path;
                        const destPath = path.join(currentDir, item.name);
                        
                        try {
                            if (item.isDirectory) {
                                await fs.copy(sourcePath, destPath);
                                console.log('📁 Copied folder:', item.name);
                            } else {
                                await fs.copy(sourcePath, destPath);
                                console.log('📄 Copied file:', item.name);
                            }
                        } catch (error) {
                            console.log('❌ Failed to copy:', item.name, error.message);
                        }
                    }
                }

                console.log('✅ All files copied successfully!');
                console.log('📦 Installing dependencies...');
                
                // Step 5: Install dependencies
                exec('npm install', { cwd: currentDir }, (npmError) => {
                    // Step 6: Cleanup
                    fs.removeSync(tempDir);
                    
                    if (npmError) {
                        console.log('NPM install warning:', npmError.message);
                        resolve('✅ Files updated! Run npm install manually.');
                    } else {
                        console.log('✅ Update complete, restarting...');
                        
                        // Step 7: Restart bot after 3 seconds
                        setTimeout(() => {
                            process.exit(0);
                        }, 3000);
                        
                        resolve('✅ Update complete! Bot restarting...');
                    }
                });
                
            } catch (error) {
                fs.removeSync(tempDir);
                reject(new Error('File operation failed: ' + error.message));
            }
        });
    });
}
