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
const toolDropdown = document.getElementById('codie-tool-dropdown');
const toolFormContainer = document.getElementById('codie-tool-form-container');
const chatHistory = [];

// Tool state
let toolList = [];
let selectedTool = null;
let toolInputValues = {};
let toolLoading = false;

// Tool modal state
let toolModalOpen = false;

function openToolModal() {
  toolModalOpen = true;
  renderToolModal();
}

function closeToolModal() {
  toolModalOpen = false;
  renderToolModal();
}

function renderToolModal() {
  let modal = document.getElementById('codie-tool-modal');
  if (!toolModalOpen) {
    if (modal) modal.style.display = 'none';
    return;
  }
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'codie-tool-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.zIndex = 2000;
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.innerHTML = '<div id="codie-tool-modal-inner" style="background:#23272e;padding:2em 2.5em;border-radius:12px;min-width:340px;max-width:90vw;box-shadow:0 4px 32px #0008;position:relative;"></div>';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  const inner = modal.querySelector('#codie-tool-modal-inner');
  if (inner) {
    inner.innerHTML = '';
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '0.7em';
    closeBtn.style.right = '1em';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '1.7em';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = closeToolModal;
    inner.appendChild(closeBtn);
    // Title
    const title = document.createElement('div');
    title.textContent = 'Run a Tool';
    title.style.fontSize = '1.25em';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '1em';
    title.style.color = '#fff';
    inner.appendChild(title);
    // Tool dropdown and form
    const dropdownDiv = document.createElement('div');
    dropdownDiv.id = 'codie-tool-modal-dropdown';
    inner.appendChild(dropdownDiv);
    const formDiv = document.createElement('div');
    formDiv.id = 'codie-tool-modal-form';
    inner.appendChild(formDiv);
    // Render dropdown and form in modal
    renderToolDropdown(dropdownDiv, true);
    renderToolForm(formDiv, true);
  }
}

// Add a visible button to open the tool modal
function addToolModalButton() {
  let btn = document.getElementById('codie-run-tool-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'codie-run-tool-btn';
    btn.textContent = 'Run Tool';
    btn.title = 'Manually run a tool (e.g. create/edit files)';
    btn.style.position = 'absolute';
    btn.style.bottom = '1.5em';
    btn.style.right = '1.5em';
    btn.style.zIndex = 100;
    btn.style.background = '#4F8EF7';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.padding = '0.7em 1.3em';
    btn.style.fontWeight = 'bold';
    btn.style.fontSize = '1em';
    btn.style.boxShadow = '0 2px 8px #0003';
    btn.style.cursor = 'pointer';
    btn.onclick = openToolModal;
    document.body.appendChild(btn);
  }
}

// Patch: renderToolDropdown and renderToolForm now accept a parent element and modal flag
function renderToolDropdown(parent, inModal) {
  parent = parent || toolDropdown;
  if (!parent) return;
  parent.innerHTML = '';
  const select = document.createElement('select');
  select.id = inModal ? 'codie-tool-modal-select' : 'codie-tool-select';
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
    renderToolForm(undefined, inModal);
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
  form.id = inModal ? 'codie-tool-modal-form' : 'codie-tool-form';
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


// Always add the tool modal button and modal immediately (not just on DOMContentLoaded)
addToolModalButton();
renderToolModal();

// Also re-add the button and modal after React renders (in case React wipes DOM)
setTimeout(() => {
  addToolModalButton();
  renderToolModal();
}, 1000);

// Defensive: re-add after toolList loads
window.addEventListener('message', function(event) {
  const msg = event.data;
  if (msg && msg.command === 'toolList') {
    addToolModalButton();
    renderToolModal();
  }
});

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


