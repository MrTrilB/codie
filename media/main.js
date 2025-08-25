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
function ensureVsCodeApi() {
  if (!window.vscode && typeof acquireVsCodeApi === 'function') {
    window.vscode = acquireVsCodeApi();
    console.log('[Codie] window.vscode initialized via acquireVsCodeApi');
  } else if (!window.vscode) {
    console.warn('[Codie] window.vscode is not defined and acquireVsCodeApi is not available!');
  }
}

ensureVsCodeApi();
document.addEventListener('DOMContentLoaded', function() {
  ensureVsCodeApi();

  document.getElementById('codie-tools-btn')?.addEventListener('click', function() {
    // ...existing code...
  });

  // (React handles Add Context button click now)
});

// Maintain attached context state
let attachedSources = [];
let attachedFiles = [];

window.addEventListener('message', function(event) {
  var msg = event.data;
  // Debug: log all messages
  console.log('[Codie] Webview received message:', msg);
  // (selectedModel is now handled by React, not here)

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
    // Icon for screenshot, commit, or folder
    if (source.toLowerCase().includes('screenshot')) {
      chip.innerHTML = '<span class="codicon codicon-device-camera codie-chip-icon"></span>' + source;
    } else if (source.toLowerCase().includes('commit')) {
      chip.innerHTML = '<span class="codicon codicon-git-commit codie-chip-icon"></span>' + source;
    } else if (source.toLowerCase().includes('folder')) {
      chip.innerHTML = '<span class="codicon codicon-folder codie-chip-icon"></span>' + source;
    } else {
      chip.innerHTML = '<span class="codicon codicon-symbol-file codie-chip-icon"></span>' + source;
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
    // Use folder or file icon based on label/description
    var isFolder = (item.label && item.label.toLowerCase().includes('folder')) || (item.description && item.description.toLowerCase().includes('folder'));
    var iconClass = isFolder ? 'codicon-folder' : 'codicon-symbol-file';
    chip.innerHTML = '<span class="codicon ' + iconClass + ' codie-chip-icon"></span>' + item.label;
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
const toolDropdown = document.getElementById('codie-tool-dropdown');
const toolFormContainer = document.getElementById('codie-tool-form-container');
const chatHistory = [];

// Tool state
let toolList = [];
let selectedTool = null;
let toolInputValues = {};
let toolLoading = false;




// Patch: renderToolDropdown and renderToolForm now accept a parent element and modal flag
function renderToolDropdown(parent, inModal) {
  parent = parent || toolDropdown;
  if (!parent) return;
  parent.innerHTML = '';
  const select = document.createElement('select');
  select.id = 'codie-tool-select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select a Tool --';
  select.appendChild(defaultOpt);
  toolList.forEach(tool => {
    if (!tool.enabled) return;
    const opt = document.createElement('option');
    opt.value = tool.id;
    opt.textContent = tool.label || tool.id;
    select.appendChild(opt);
  });
  select.value = selectedTool ? selectedTool.id : '';
  select.onchange = function() {
    const toolId = select.value;
    selectedTool = toolList.find(t => t.id === toolId) || null;
    toolInputValues = {};
    renderToolForm();
  };
  parent.appendChild(select);
}

function renderToolForm(parent, inModal) {
  parent = parent || toolFormContainer;
  if (!parent) return;
  parent.innerHTML = '';
  if (!selectedTool) return;
  // If tool has inputSchema, render fields
  const schema = selectedTool.inputSchema || {};
  const props = schema.properties || selectedTool.inputSchema || {};
  const required = schema.required || [];
  const form = document.createElement('form');
  form.id = 'codie-tool-form';
  Object.keys(props).forEach(key => {
    const field = props[key] || {};
    const label = document.createElement('label');
    label.textContent = field.title || key;
    label.style.display = 'block';
    label.style.marginTop = '0.5em';
    const input = document.createElement('input');
    input.type = field.type === 'number' ? 'number' : 'text';
    input.value = toolInputValues[key] || '';
    input.required = required.includes(key);
    input.oninput = function() {
      toolInputValues[key] = input.value;
    };
    label.appendChild(input);
    form.appendChild(label);
  });
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = toolLoading ? 'Running...' : 'Run Tool';
  submit.disabled = toolLoading;
  form.appendChild(submit);
  form.onsubmit = function(e) {
    e.preventDefault();
    if (!selectedTool) return;
    // Confirm destructive actions (if tool has a "destructive" flag)
    if (selectedTool.destructive) {
      if (!confirm('This tool may overwrite or delete files. Are you sure?')) return;
    }
    // Send invokeTool message
    const input = { ...toolInputValues };
    const requestId = makeRequestId();
    appendMessage('Invoking tool: ' + selectedTool.label, 'user', { isTool: true, toolId: selectedTool.id });
    toolLoading = true;
    renderToolForm(undefined, inModal);
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'invokeTool',
        toolId: selectedTool.id,
        input,
        sessionId,
        requestId
      });
      console.log('[Codie] Sent invokeTool:', selectedTool.id, input, sessionId, requestId);
    }
    if (inModal) {
      closeToolModal();
    }
  };
  parent.appendChild(form);
}

// Generate a unique sessionId for this chat session
const sessionId = (() => {
  return 'sid-' + Math.random().toString(36).slice(2) + Date.now();
})();

// Generate a unique requestId for each tool invocation
function makeRequestId() {
  return 'rid-' + Math.random().toString(36).slice(2) + Date.now();
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


function renderMessages() {
  if (!chatMessages) return;
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
  chatHistory.forEach(({ text, sender, time, isTool, toolId, loading }) => {
    const msg = document.createElement('div');
    msg.className = `codie-chat-message ${sender}` + (isTool ? ' tool' : '');

    // Name and time at the top
    const header = document.createElement('div');
    header.className = 'codie-chat-header';
    const label = document.createElement('span');
    label.className = 'codie-chat-label';
    if (isTool && toolId) {
      label.textContent = `Tool: ${toolId}`;
    } else {
      label.textContent = sender === 'user' ? 'You' : (sender === 'bot' ? 'Codie' : sender);
    }
    const timestamp = document.createElement('span');
    timestamp.className = 'codie-chat-timestamp';
    timestamp.textContent = formatTime(time);
    header.appendChild(label);
    header.appendChild(document.createTextNode(' '));
    header.appendChild(timestamp);

    // Message content
    const content = document.createElement('div');
    content.className = 'codie-chat-content';
    if (loading) {
      content.innerHTML = '<em>Running tool...</em>';
    } else {
      content.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    }

    // Compose message: header, linebreak, content
    msg.appendChild(header);
    msg.appendChild(document.createElement('br'));
    msg.appendChild(content);
    chatMessages.appendChild(msg);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


function appendMessage(text, sender = 'user', opts = {}) {
  chatHistory.push({ text, sender, time: new Date(), ...opts });
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

// --- TOOL INVOCATION UI ---
function renderToolDropdown() {
  if (!toolDropdown) return;
  toolDropdown.innerHTML = '';
  const select = document.createElement('select');
  select.id = 'codie-tool-select';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '-- Select a Tool --';
  select.appendChild(defaultOpt);
  toolList.forEach(tool => {
    if (!tool.enabled) return;
    const opt = document.createElement('option');
    opt.value = tool.id;
    opt.textContent = tool.label || tool.id;
    select.appendChild(opt);
  });
  select.value = selectedTool ? selectedTool.id : '';
  select.onchange = function() {
    const toolId = select.value;
    selectedTool = toolList.find(t => t.id === toolId) || null;
    toolInputValues = {};
    renderToolForm();
  };
  toolDropdown.appendChild(select);
}

function renderToolForm() {
  if (!toolFormContainer) return;
  toolFormContainer.innerHTML = '';
  if (!selectedTool) return;
  // If tool has inputSchema, render fields
  const schema = selectedTool.inputSchema || {};
  const props = schema.properties || {};
  const required = schema.required || [];
  const form = document.createElement('form');
  form.id = 'codie-tool-form';
  Object.keys(props).forEach(key => {
    const field = props[key];
    const label = document.createElement('label');
    label.textContent = field.title || key;
    label.style.display = 'block';
    label.style.marginTop = '0.5em';
    const input = document.createElement('input');
    input.type = field.type === 'number' ? 'number' : 'text';
    input.value = toolInputValues[key] || '';
    input.required = required.includes(key);
    input.oninput = function() {
      toolInputValues[key] = input.value;
    };
    label.appendChild(input);
    form.appendChild(label);
  });
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = toolLoading ? 'Running...' : 'Run Tool';
  submit.disabled = toolLoading;
  form.appendChild(submit);
  form.onsubmit = function(e) {
    e.preventDefault();
    if (!selectedTool) return;
    // Confirm destructive actions (if tool has a "destructive" flag)
    if (selectedTool.destructive) {
      if (!confirm('This tool may overwrite or delete files. Are you sure?')) return;
    }
    // Send invokeTool message
    const input = { ...toolInputValues };
    const requestId = makeRequestId();
    appendMessage('Invoking tool: ' + selectedTool.label, 'user', { isTool: true, toolId: selectedTool.id });
    toolLoading = true;
    renderToolForm();
    if (window.vscode) {
      window.vscode.postMessage({
        command: 'invokeTool',
        toolId: selectedTool.id,
        input,
        sessionId,
        requestId
      });
      console.log('[Codie] Sent invokeTool:', selectedTool.id, input, sessionId, requestId);
    }
  };
  toolFormContainer.appendChild(form);
}


// Listen for tool list from extension
window.addEventListener('message', function(event) {
  const msg = event.data;
  if (msg && msg.command === 'toolList') {
    toolList = msg.tools || [];
    renderToolDropdown();
    renderToolForm();
    renderToolModal();
  }
});

// Request tool list on load
if (window.vscode) {
  window.vscode.postMessage({ command: 'getToolList' });
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
  if (msg && msg.command === 'toolResult') {
    // Remove loading state for this tool invocation
    toolLoading = false;
    renderToolForm();
    // Format result for chat
    let text = '';
    if (msg.error) {
      text = `❌ Tool error: ${msg.error}`;
      appendMessage(text, 'bot', { isTool: true, toolId: msg.toolId });
      // Optionally, allow retry/cancel UI (not implemented here)
      return;
    }
    if (msg.result && typeof msg.result === 'object') {
      if (msg.result.success === false && msg.result.error) {
        text = `❌ Tool error: ${msg.result.error}`;
      } else if (msg.result.success && msg.result.filePath) {
        text = `✅ Tool succeeded: ${msg.result.filePath}`;
      } else if (msg.result.success) {
        text = `✅ Tool succeeded.`;
      } else if (msg.result.message) {
        text = msg.result.message;
      } else {
        text = JSON.stringify(msg.result, null, 2);
      }
    } else {
      text = String(msg.result);
    }
    appendMessage(text, 'bot', { isTool: true, toolId: msg.toolId });
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


