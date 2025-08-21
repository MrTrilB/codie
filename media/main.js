// Only call acquireVsCodeApi() ONCE and reuse
window.vscode = window.vscode || (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined);

// Picker/model/tools button event listeners and selected model handler
if (window.vscode) {
  document.getElementById('codie-tools-btn')?.addEventListener('click', function() {
    window.vscode.postMessage({ command: 'openToolsDropdown' });
  });
  document.getElementById('codie-ai-provider-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.vscode.postMessage({ command: 'openProviderSettings' });
  });
  document.getElementById('codie-model-picker-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    window.vscode.postMessage({ command: 'openModelPicker' });
  });
  // Request selected model/provider on load
  window.vscode.postMessage({ command: 'getSelectedModel' });
}
// Listen for selectedModel message
window.addEventListener('message', function(event) {
  var msg = event.data;
  if (msg && msg.command === 'selectedModel') {
    var el = document.getElementById('codie-selected-model');
    if (el) {
      var text = '';
      if (msg.model && msg.provider) {
        text = 'Selected: ' + msg.model + ' | ' + msg.provider;
      } else if (msg.provider) {
        text = 'Selected: ' + msg.provider;
      } else {
        text = 'No AI selected';
      }
      el.textContent = text;
    }
  }
});

// Main chat UI logic
const chatMessages = document.getElementById('codie-chat-messages');
const chatInputs = document.querySelectorAll('textarea.codie-input');
const chatInput = chatInputs[0];
const chatSend = document.getElementById('codie-chat-send');
const chatForm = document.querySelector('form.codie-input-form');
const chatHistory = [];

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessages() {
  chatMessages.innerHTML = '';
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(tag) {
      const charsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return charsToReplace[tag] || tag;
    });
  }
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
    content.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
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
  if (window.vscode) {
    window.vscode.postMessage({ command: 'userChatMessage', text });
    console.log('[Codie] Sent userChatMessage:', text);
  }
}

if (chatSend) {
  chatSend.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('[Codie] Send button clicked');
    sendMessage();
  });
}

if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        e.preventDefault();
        console.log('[Codie] Enter pressed');
        sendMessage();
      }
    }
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('[Codie] Form submitted');
    sendMessage();
  });
}

window.addEventListener('message', function(event) {
  const msg = event.data;
  if (msg && msg.command === 'aiChatResponse') {
    console.log('[Codie] Received aiChatResponse from extension:', msg);
    appendMessage(msg.text || '(No response)', 'bot');
  }
});


if (chatInput) {
  const computed = getComputedStyle(chatInput);
  let lineHeight = parseFloat(computed.lineHeight);
  if (isNaN(lineHeight)) lineHeight = 18;
  const maxHeight = 12 * lineHeight;
  console.log('[Codie] Textarea lineHeight:', lineHeight, 'maxHeight:', maxHeight);
  function autoResize() {
    chatInput.style.height = 'auto';
    const scrollHeight = chatInput.scrollHeight;
    if (scrollHeight > maxHeight) {
      chatInput.style.height = maxHeight + 'px';
      chatInput.style.overflowY = 'auto';
    } else {
      chatInput.style.height = scrollHeight + 'px';
      chatInput.style.overflowY = 'hidden';
    }
  }
  chatInput.addEventListener('input', autoResize);
  autoResize();
  chatInput.focus();
}


