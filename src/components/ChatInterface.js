import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

/*
  Behavior:
  - If REACT_APP_USE_PROXY === 'true' (set at build time), the component will call the local proxy
    at /api/openrouter/chat and will NOT ask the user for an API key.
  - If REACT_APP_USE_PROXY !== 'true', the component will ask for an API key and call the
    upstream OpenRouter API directly (NOT recommended for production).
*/

const TypingIndicator = () => (
  <div className="typing-indicator">
    <span></span>
    <span></span>
    <span></span>
  </div>
);

const useProxy = process.env.REACT_APP_USE_PROXY === 'true';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setIsApiKeySet(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const targetUrl = useProxy
        ? '/api/openrouter/chat'
        : 'https://api.openrouter.ai/v1/chat/completions';

      const headers = {
        'Content-Type': 'application/json'
      };

      // If not using proxy, require an API key and attach Authorization header.
      if (!useProxy) {
        if (!isApiKeySet) {
          // No key provided yet — display an assistant message and abort.
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'An API key is required when not using a proxy.'
          }]);
          setIsLoading(false);
          return;
        }
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'qwen/qwen2.5-vl-72b-instruct:free',
          messages: [...messages, userMessage]
        })
      });

      // Handle network HTTP errors gracefully
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '<unreadable response>');
        console.error('OpenRouter/proxy returned error', response.status, bodyText);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Upstream error: ${response.status}`
        }]);
        setIsLoading(false);
        return;
      }

      // Parse JSON defensively
      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error('Failed to parse JSON from upstream', err);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Invalid response from model service.'
        }]);
        setIsLoading(false);
        return;
      }

      // Defensive extraction of the assistant's content (different APIs may use choices[0].message.content or choices[0].text)
      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? null;
      if (!content) {
        console.error('Unexpected upstream response shape', data);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Model returned no content.'
        }]);
        setIsLoading(false);
        return;
      }

      const assistantMessage = { role: 'assistant', content };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error while calling model:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.'
      }]);
      setIsLoading(false);
    }
  };

  // If using a proxy, there's no need to collect a client-side API key.
  if (!useProxy && !isApiKeySet) {
    // Show API key input only when NOT using proxy
    return (
      <div className="api-key-container">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your OpenRouter API key"
          className="api-key-input"
        />
        <button onClick={handleApiKeySubmit} className="api-key-button">
          Set API Key
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message-wrapper ${message.role}`}>
            <div className="avatar">
              {message.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className={`message ${message.role}`}>
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="avatar">🤖</div>
            <div className="message assistant">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button onClick={handleSend} className="send-button">Send</button>
      </div>
    </div>
  );
};

export default ChatInterface;
