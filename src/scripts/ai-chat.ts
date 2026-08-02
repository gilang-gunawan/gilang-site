// Lightweight client-side script for the dedicated AI chat page

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

// Fast, safe markdown formatter for chat responses
function formatMarkdown(raw: string): string {
  if (!raw) return '';

  // 1. Escape HTML
  let text = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Extract and preserve code blocks (```lang ... ```)
  const codeBlocks: string[] = [];
  text = text.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (_, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre class="chat-code-block"><code>${code.trim()}</code></pre>`);
    return placeholder;
  });

  // 3. Inline formatting
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');

  // Bold & Italic: ***text***
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  text = text.replace(/(^|[^\w*])\*([^*\n]+)\*([^\w*]|$)/g, '$1<em>$2</em>$3');

  // Links: [text](url) — markdown link syntax
  text = text.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/|#)[^)\s]+)\)/g,
    (_, label, href) => {
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}" class="chat-link"${targetAttr}>${label}</a>`;
    }
  );

  // Bare URLs: auto-link plain https:// or http:// not already inside an href
  text = text.replace(
    /(?<!href=")(https?:\/\/[^\s<"'()]+)/g,
    (url) => `<a href="${url}" class="chat-link" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

  // 4. Line by line processing for Headings, Lists, Blockquotes, Paragraphs
  const lines = text.split('\n');
  const result: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (listType) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        listType = null;
      }
      continue;
    }

    // Check for code block placeholders
    if (trimmed.startsWith('__CODE_BLOCK_') && trimmed.endsWith('__')) {
      if (listType) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        listType = null;
      }
      result.push(trimmed);
      continue;
    }

    // Headings: ### H3, ## H2, # H1
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (listType) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        listType = null;
      }
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      result.push(`<h${level + 1} class="chat-h${level}">${content}</h${level + 1}>`);
      continue;
    }

    // Unordered list item: - item, * item, with any whitespace
    const ulMatch = rawLine.match(/^(\s*)(?:[-*+])\s+(.+)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        if (listType === 'ol') result.push('</ol>');
        result.push('<ul class="chat-list">');
        listType = 'ul';
      }
      result.push(`<li>${ulMatch[2]}</li>`);
      continue;
    }

    // Ordered list item: 1. item
    const olMatch = rawLine.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        if (listType === 'ul') result.push('</ul>');
        result.push('<ol class="chat-ordered-list">');
        listType = 'ol';
      }
      result.push(`<li>${olMatch[2]}</li>`);
      continue;
    }

    // Close open lists before normal paragraph
    if (listType) {
      result.push(listType === 'ul' ? '</ul>' : '</ol>');
      listType = null;
    }

    // Normal paragraph line
    result.push(`<p class="chat-p">${trimmed}</p>`);
  }

  if (listType) {
    result.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  let html = result.join('');

  // 5. Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return html;
}

export function initDedicatedChat() {
  const container = document.getElementById('dedicated-ai-chat');
  if (!container || container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';

  const form = document.getElementById('chat-main-form') as HTMLFormElement | null;
  const textarea = document.getElementById('chat-user-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement | null;
  const messagesContainer = document.getElementById('chat-messages-container');
  const emptyState = document.getElementById('chat-empty-state');
  const resetBtn = document.getElementById('chat-reset-button') as HTMLButtonElement | null;
  const statusIndicator = document.getElementById('chat-status-indicator');


  // Suggestion cards are rendered inside the empty state (inside the message container)
  const suggestionCards = document.querySelectorAll<HTMLButtonElement>('#chat-empty-state .chat-suggestion-card');

  let history: ChatHistoryItem[] = [];
  let isGenerating = false;

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function adjustTextareaHeight() {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${Math.max(newHeight, 44)}px`;
  }

  function appendMessage(role: 'user' | 'assistant', content: string): HTMLElement {
    if (!messagesContainer) return document.createElement('div');

    if (emptyState) {
      emptyState.style.display = 'none';
    }
    if (resetBtn) {
      resetBtn.classList.remove('hidden');
    }

    const msgRow = document.createElement('div');
    msgRow.className = `chat-message-row chat-message-row--${role}`;

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'chat-bubble-wrapper';

    const senderName = document.createElement('span');
    senderName.className = 'chat-sender-name';
    senderName.textContent = role === 'user' ? 'You' : 'Assistant';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${role}`;

    if (role === 'user') {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = formatMarkdown(content);
    }

    bubbleWrapper.appendChild(senderName);
    bubbleWrapper.appendChild(bubble);

    msgRow.appendChild(bubbleWrapper);
    messagesContainer.appendChild(msgRow);
    scrollToBottom();

    return bubble;
  }

  async function handleSendMessage(messageText: string) {
    const text = messageText.trim();
    if (!text || isGenerating) return;

    isGenerating = true;
    if (textarea) {
      textarea.value = '';
      adjustTextareaHeight();
    }
    if (sendBtn) sendBtn.disabled = true;
    if (statusIndicator) {
      statusIndicator.textContent = 'Typing...';
      statusIndicator.classList.add('is-typing');
    }

    // Add user message to UI & history
    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    // Create assistant placeholder bubble
    const assistantBubble = appendMessage('assistant', '...');
    let accumulatedResponse = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.slice(0, -1),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedFirstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              // Stream complete — now apply full markdown formatting on the finished response
              if (accumulatedResponse) {
                assistantBubble.innerHTML = formatMarkdown(accumulatedResponse);
                scrollToBottom();
              }
              continue;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                if (!hasReceivedFirstToken) {
                  accumulatedResponse = '';
                  hasReceivedFirstToken = true;
                }
                accumulatedResponse += parsed.text;
                // During streaming: render as plain text to avoid broken partial markdown
                assistantBubble.textContent = accumulatedResponse;
                scrollToBottom();
              }
            } catch {
              // Ignore chunk parse errors
            }
          }
        }
      }

      if (!accumulatedResponse) {
        accumulatedResponse = 'No response received from server.';
        assistantBubble.innerHTML = formatMarkdown(accumulatedResponse);
      }

      history.push({ role: 'assistant', content: accumulatedResponse });
    } catch (err) {
      console.error('Chat request error:', err);
      assistantBubble.innerHTML =
        '<span style="color: var(--theme-pink, #e53e3e);">Sorry, an error occurred while connecting to the AI service. Please try again in a moment.</span>';
    } finally {
      isGenerating = false;
      if (sendBtn) sendBtn.disabled = false;
      if (statusIndicator) {
        statusIndicator.textContent = 'Ready';
        statusIndicator.classList.remove('is-typing');
      }
      if (textarea) textarea.focus();
    }
  }

  // Handle textarea auto-resize and Enter to submit
  textarea?.addEventListener('input', adjustTextareaHeight);
  textarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textarea.value.trim()) {
        handleSendMessage(textarea.value);
      }
    }
  });

  // Handle form submit
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (textarea && textarea.value.trim()) {
      handleSendMessage(textarea.value);
    }
  });

  // Quick suggestions click
  suggestionCards.forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        handleSendMessage(prompt);
      }
    });
  });

  // Reset conversation
  resetBtn?.addEventListener('click', () => {
    history = [];
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      if (emptyState) {
        messagesContainer.appendChild(emptyState);
        emptyState.style.display = '';
      }
    }
    if (resetBtn) resetBtn.classList.add('hidden');
    if (textarea) {
      textarea.value = '';
      adjustTextareaHeight();
      textarea.focus();
    }
    if (statusIndicator) statusIndicator.textContent = 'Ready';
  });
}

// Auto-run on DOM ready or client load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDedicatedChat);
  } else {
    initDedicatedChat();
  }
}
