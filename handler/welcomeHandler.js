const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: 'welcomeHandler',
    description: 'Send welcome message on connection',
    
    async execute(sock, m, state, commands) {
        // This handler can be expanded for connection events
        // Currently handles welcome message functionality
    }
};