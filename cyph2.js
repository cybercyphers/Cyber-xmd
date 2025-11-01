const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'cyph2',
  description: 'Extract view-once to saved messages and current chat',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    
    try {
      let viewOnceMsg = null;
      let extractedMediaType = null;
      
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (quotedMsg?.viewOnceMessageV2?.message) {
        viewOnceMsg = quotedMsg.viewOnceMessageV2.message;
      } 
      else if (quotedMsg?.viewOnceMessage?.message) {
        viewOnceMsg = quotedMsg.viewOnceMessage.message;
      }
      else if (msg.message?.viewOnceMessageV2?.message) {
        viewOnceMsg = msg.message.viewOnceMessageV2.message;
      }
      else if (msg.message?.viewOnceMessage?.message) {
        viewOnceMsg = msg.message.viewOnceMessage.message;
      }

      if (!viewOnceMsg) {
        await sock.sendMessage(from, { text: '☢️' }, { quoted: msg });
        return;
      }

      let mediaBuffer = null;
      
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
        await sock.sendMessage(from, { text: '☢️' }, { quoted: msg });
        return;
      }

      // Send to saved messages (quiet archive)
      await sendToSavedMessages(sock, mediaBuffer, extractedMediaType);
      
      // Also send to current chat discreetly
      await sendDiscreetToCurrent(sock, from, mediaBuffer, extractedMediaType, msg);
      
      // Small confirmation emoji
      await sock.sendMessage(from, { text: '☢️' }, { quoted: msg });

    } catch (error) {
      console.error('Extract error:', error);
      await sock.sendMessage(from, { text: '☢️' }, { quoted: msg });
    }
  }
};

async function downloadMedia(mediaMessage, type) {
  const stream = await downloadContentFromMessage(mediaMessage, type);
  const buffer = await streamToBuffer(stream);
  return buffer;
}

async function sendToSavedMessages(sock, buffer, mediaType) {
  const savedMessagesJid = sock.user?.id;
  if (!savedMessagesJid) return;

  try {
    switch (mediaType) {
      case 'image':
        await sock.sendMessage(savedMessagesJid, { image: buffer });
        break;
      case 'video':
        await sock.sendMessage(savedMessagesJid, { video: buffer });
        break;
      case 'audio':
        await sock.sendMessage(savedMessagesJid, { audio: buffer });
        break;
    }
    console.log(`✅ Saved ${mediaType} to your messages`);
  } catch (error) {
    console.error('Error saving to messages:', error);
  }
}

async function sendDiscreetToCurrent(sock, from, buffer, mediaType, originalMsg) {
  try {
    switch (mediaType) {
      case 'image':
        await sock.sendMessage(from, { image: buffer }, { quoted: originalMsg });
        break;
      case 'video':
        await sock.sendMessage(from, { video: buffer }, { quoted: originalMsg });
        break;
      case 'audio':
        await sock.sendMessage(from, { audio: buffer }, { quoted: originalMsg });
        break;
    }
  } catch (error) {
    console.error('Error sending to current chat:', error);
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}