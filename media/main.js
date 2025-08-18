// Codie Chat UI Interactivity

(function () {
  const chatMessages = document.getElementById('codie-chat-messages');
  const chatInput = document.getElementById('codie-chat-input');
  const chatSend = document.getElementById('codie-chat-send');

  // Chat history array
  const chatHistory = [];

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessages() {
    chatMessages.innerHTML = '';
    chatHistory.forEach(({ text, sender, time }) => {
      const msg = document.createElement('div');
      msg.className = `codie-chat-message ${sender}`;
      const label = document.createElement('span');
      label.className = 'codie-chat-label';
      label.textContent = sender === 'user' ? 'You' : 'Codie';
      const timestamp = document.createElement('span');
      timestamp.className = 'codie-chat-timestamp';
      timestamp.textContent = formatTime(time);
      const content = document.createElement('span');
      content.className = 'codie-chat-content';
      content.textContent = text;
      msg.appendChild(label);
      msg.appendChild(content);
      msg.appendChild(timestamp);
      chatMessages.appendChild(msg);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendMessage(text, sender = 'user') {
    chatHistory.push({ text, sender, time: new Date() });
    renderMessages();
  }

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendMessage(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    // Simulate bot response (stub)
    setTimeout(() => {
      appendMessage('This is a stubbed response. (AI coming soon!)', 'bot');
    }, 500);
  }


  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      // If Shift+Enter, allow default (newline)
    }
  });

  // Auto-grow textarea height
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
  });

  // Focus input on load
  chatInput.focus();
  chatInput.style.height = 'auto';
})();
