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
  if (window.vscode) {
    window.vscode.postMessage({ command: 'getWorkspaceFilesAndFolders' });
  }
  // Confirm button handler
  setTimeout(() => {
    const confirmBtn = document.getElementById('codie-context-confirm-btn');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        const checked = Array.from(dropdown.querySelectorAll('input[type=checkbox]:checked'));
        const selected = checked.map(cb => cb.value);
        if (window.vscode && selected.length > 0) {
          window.vscode.postMessage({ command: 'addContext', items: selected });
        }
        hideContextDropdown();
      };
    }
  }, 100);
}

function hideContextDropdown() {
  const dropdown = document.getElementById('codie-context-dropdown');
  if (dropdown) dropdown.style.display = 'none';
}

document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('codie-context-dropdown');
  if (dropdown && dropdown.style.display === 'block') {
    if (!dropdown.contains(e.target) && e.target.id !== 'codie-add-context-btn') {
      hideContextDropdown();
    }
  }
});

window.addEventListener('DOMContentLoaded', function() {
  // Attach to the Add Context button by id
  const addContextBtn = document.getElementById('codie-add-context-btn');
  if (addContextBtn) {
    addContextBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const dropdown = createContextDropdown();
      if (dropdown.style.display === 'block') {
        hideContextDropdown();
      } else {
        showContextDropdown();
      }
    });
  }
});
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


