// main.js - Skeleton logic for Codie Chat webview

document.addEventListener('DOMContentLoaded', () => {
  // Session bar
  const sessionList = document.getElementById('session-list');
  const newSessionBtn = document.getElementById('new-session-btn');

  // Context bar
  const contextSelect = document.getElementById('context-select');

  // Shortcut bar
  const shortcutBar = document.getElementById('shortcut-bar');

  // Settings bar
  const settingsBar = document.getElementById('settings-bar');

  // Message history
  const messageHistory = document.getElementById('message-history');

  // Input area
  const promptInput = document.getElementById('prompt-input');
  const sendButton = document.getElementById('send-button');

  // --- SKELETON UI LOGIC ---

  // Sessions
  newSessionBtn.addEventListener('click', () => {
    // TODO: Add new session logic
    alert('New session (not implemented)');
  });

  // Context
  contextSelect.innerHTML = '<option>Default Context</option>';

  // Shortcuts
  shortcutBar.innerHTML = '<button class="shortcut-btn">Sample Shortcut</button>';

  // Settings
  settingsBar.innerHTML = '<label>Model:</label><select><option>gpt-4</option></select>';

  // Message sending
  sendButton.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (!text) {
      return;
    }
    addMessage('user', text);
    promptInput.value = '';
    // TODO: Send message to extension/backend
    setTimeout(() => addMessage('ai', 'This is a placeholder AI response.'), 600);
  });

  // Enter key to send
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
    }
  });

  // Add message to history
  function addMessage(role, text) {
    const msg = document.createElement('div');
    msg.className = 'msg ' + role;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    msg.appendChild(bubble);
    messageHistory.appendChild(msg);
    messageHistory.scrollTop = messageHistory.scrollHeight;
  }

  // Initial welcome message
  addMessage('ai', 'Welcome to Codie Chat!');
});
