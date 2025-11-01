const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'cyph',
  description: 'Stealth extract view-once media to saved messages',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    
    try {
      let viewOnceMsg = null;
      let extractedMediaType = null;
      
      // Check if it's a reply to a view-once message
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (quotedMsg) {
        // Check for view-once in quoted message
        if (quotedMsg.viewOnceMessageV2?.message) {
          viewOnceMsg = quotedMsg.viewOnceMessageV2.message;
        } 
        else if (quotedMsg.viewOnceMessage?.message) {
          viewOnceMsg = quotedMsg.viewOnceMessage.message;
        }
      }
      
      // Also check if the current message is view-once
      if (!viewOnceMsg) {
        if (msg.message?.viewOnceMessageV2?.message) {
          viewOnceMsg = msg.message.viewOnceMessageV2.message;
        } 
        else if (msg.message?.viewOnceMessage?.message) {
          viewOnceMsg = msg.message.viewOnceMessage.message;
        }
      }

      if (!viewOnceMsg) {
        // Send stealth error - just the emoji
        await sock.sendMessage(from, { 
          text: '☢️' 
        }, { quoted: msg });
        return;
      }

      let mediaBuffer = null;
      
      // Extract media based on type
      if (viewOnceMsg.imageMessage) {
        extractedMediaType = 'image';
        mediaBuffer = await downloadMedia(viewOnceMsg.imageMessage, 'image');
      }
      else if (viewOnceMsg.videoMessage) {
        extractedMediaType = 'video';
        mediaBuffer = await downloadMedia(viewOnceMsg.videoMessage, 'video');
      }
      else if (viewOnceMsg.audioMessage) {
        extractedMediaType = 'audio';
        mediaBuffer = await downloadMedia(viewOnceMsg.audioMessage, 'audio');
      }
      else {
        // Send stealth error for unsupported type
        await sock.sendMessage(from, { 
          text: '☢️' 
        }, { quoted: msg });
        return;
      }

      // Send to your own saved messages quietly
      await sendToSavedMessages(sock, mediaBuffer, extractedMediaType, msg);

      // Send discreet confirmation in the original chat
      await sock.sendMessage(from, { 
        text: '☢️' 
      }, { quoted: msg });

    } catch (error) {
      console.error('Stealth extract error:', error);
      // Send stealth error even on failure
      await sock.sendMessage(from, { 
        text: '☢️' 
      }, { quoted: msg });
    }
  }
};

// Download media from view-once message
async function downloadMedia(mediaMessage, type) {
  try {
    const stream = await downloadContentFromMessage(mediaMessage, type);
    const buffer = await streamToBuffer(stream);
    return buffer;
  } catch (error) {
    throw new Error(`Failed to download ${type}`);
  }
}

// Send media to your own saved messages (quietly)
async function sendToSavedMessages(sock, buffer, mediaType, originalMsg) {
  try {
    // Your own WhatsApp number's chat (saved messages)
    const savedMessagesJid = sock.user?.id || originalMsg.key.remoteJid;
    
    switch (mediaType) {
      case 'image':
        await sock.sendMessage(savedMessagesJid, { 
          image: buffer
        });
        break;
      case 'video':
        await sock.sendMessage(savedMessagesJid, { 
          video: buffer
        });
        break;
      case 'audio':
        await sock.sendMessage(savedMessagesJid, { 
          audio: buffer
        });
        break;
    }
    
    console.log(`✅ Stealth extracted ${mediaType} to saved messages`);
    
  } catch (error) {
    console.error('Error sending to saved messages:', error);
    throw error;
  }
}

// Convert stream to buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}