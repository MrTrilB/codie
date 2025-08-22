// Dropdown logic for Add Context
function createContextDropdown() {
  let dropdown = document.getElementById('codie-context-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'codie-context-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '3em';
    dropdown.style.left = '2em';
    dropdown.style.background = '#222';
    dropdown.style.border = '1px solid #444';
    dropdown.style.padding = '1em';
    dropdown.style.zIndex = 1000;
    dropdown.style.minWidth = '250px';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);
  }
  return dropdown;
}

function showContextDropdown() {
  const dropdown = createContextDropdown();
  // Placeholder for file/folder list
  dropdown.innerHTML = `
    <div id="codie-context-list" style="margin-bottom:0.5em;color:#ccc">Loading files and folders...</div>
    <button id="codie-context-confirm-btn" style="margin-top:0.5em;width:100%">Add Selected as Context</button>
  `;
  dropdown.style.display = 'block';
  // Request file/folder list from extension
}
document.addEventListener('DOMContentLoaded', function() {
  if (!window.vscode) {
    // VS Code webview API is injected after DOMContentLoaded in some cases
    if (typeof acquireVsCodeApi === 'function') {
      window.vscode = acquireVsCodeApi();
      console.log('[Codie] window.vscode initialized via acquireVsCodeApi');
    } else {
      console.warn('[Codie] window.vscode is not defined and acquireVsCodeApi is not available!');
    }
  }

  document.getElementById('codie-tools-btn')?.addEventListener('click', function() {
    // ...existing code...
  });

  document.addEventListener('click', function(e) {
    const target = e.target.closest('#codie-add-context-btn');
    if (target) {
      e.preventDefault();
      console.log('[Codie] Add Context button clicked');
      if (window.vscode) {
        console.log('[Codie] Posting openAddContextPicker to extension');
        window.vscode.postMessage({ command: 'openAddContextPicker' });
      } else {
        console.warn('[Codie] window.vscode is not defined at button click!');
      }
    }
  });
});

// Maintain attached context state
let attachedSources = [];
let attachedFiles = [];

window.addEventListener('message', function(event) {
  var msg = event.data;
  // Debug: log all messages
  console.log('[Codie] Webview received message:', msg);
  // Handle selectedModel
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

  // Handle addContext: update attached items UI (files)
  if (msg && msg.command === 'addContext') {
    console.log('[Codie] Received addContext message:', msg.items);
    var items = msg.items || [];
    var container = document.querySelector('.codie-attached-items');
    if (container) {
      // Only update attachedFiles, keep attachedSources
      attachedFiles = items.map(item => ({ label: item.label, description: item.description, uri: item.uri }));
      renderAttachedChips(container);
    }
  }

  // Handle addContextSource: update attached items UI (sources)
  if (msg && msg.command === 'addContextSource') {
    console.log('[Codie] Received addContextSource message:', msg.sources);
    var sources = msg.sources || [];
    var container = document.querySelector('.codie-attached-items');
    if (container) {
      // Only update attachedSources, keep attachedFiles
      attachedSources = sources;
      renderAttachedChips(container);
    }
  }
  // Handle workspace files/folders for context dropdown
  if (msg && msg.command === 'workspaceFilesAndFolders') {
    const list = msg.items || [];
    const listDiv = document.getElementById('codie-context-list');
    if (listDiv) {
      if (list.length === 0) {
        listDiv.innerHTML = '<div style="color:#888">No files or folders found.</div>';
      } else {
        listDiv.innerHTML = list.map(item => {
          const icon = item.type === 'folder' ? '📁' : '📄';
          return `<label style="display:block;margin-bottom:0.2em;cursor:pointer"><input type="checkbox" value="${encodeURIComponent(item.path)}"> ${icon} <span style="color:#ccc">${item.name}</span></label>`;
        }).join('');
      }
    }
  }
});

function renderAttachedChips(container) {
  container.innerHTML = '';
  // Render source chips (with icons for special types)
  attachedSources.forEach(function(source, idx) {
    var chip = document.createElement('span');
    chip.className = 'codie-attached-item source';
    chip.title = source;
    // Icon for screenshot or commit
    if (source.toLowerCase().includes('screenshot')) {
      chip.innerHTML = '<span class="codicon codicon-device-camera" style="font-size:12px;margin-right:2px;"></span>' + source;
    } else if (source.toLowerCase().includes('commit')) {
      chip.innerHTML = '<span class="codicon codicon-git-commit" style="font-size:12px;margin-right:2px;"></span>' + source;
    } else {
      chip.textContent = source;
    }
    // Add remove button
    var removeBtn = document.createElement('span');
    removeBtn.className = 'codie-chip-remove';
    removeBtn.textContent = ' ×';
    removeBtn.title = 'Remove';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = function(e) {
      e.stopPropagation();
      attachedSources = attachedSources.filter((_, i) => i !== idx);
      renderAttachedChips(container);
    };
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
  // Render file chips
  attachedFiles.forEach(function(item, idx) {
    var chip = document.createElement('span');
    chip.className = 'codie-attached-item file';
    chip.title = item.description || item.label;
    chip.textContent = item.label;
    // Add remove button
    var removeBtn = document.createElement('span');
    removeBtn.className = 'codie-chip-remove';
    removeBtn.textContent = ' ×';
    removeBtn.title = 'Remove';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = function(e) {
      e.stopPropagation();
      attachedFiles = attachedFiles.filter((_, i) => i !== idx);
      renderAttachedChips(container);
    };
    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

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

    // Name and time at the top
    const header = document.createElement('div');
    header.className = 'codie-chat-header';
    const label = document.createElement('span');
    label.className = 'codie-chat-label';
    label.textContent = sender === 'user' ? 'You' : (sender === 'bot' ? 'Codie' : sender);
    const timestamp = document.createElement('span');
    timestamp.className = 'codie-chat-timestamp';
    timestamp.textContent = formatTime(time);
    header.appendChild(label);
    header.appendChild(document.createTextNode(' '));
    header.appendChild(timestamp);

    // Message content
    const content = document.createElement('div');
    content.className = 'codie-chat-content';
    content.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');

    // Compose message: header, linebreak, content
    msg.appendChild(header);
    msg.appendChild(document.createElement('br'));
    msg.appendChild(content);
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


