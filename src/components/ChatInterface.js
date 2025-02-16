import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

const TypingIndicator = () => (
    <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
    </div>
);

const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isApiKeySet, setIsApiKeySet] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "Chat Interface",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "qwen/qwen2.5-vl-72b-instruct:free",
                    "messages": [...messages, userMessage]
                })
            });

            const data = await response.json();
            const assistantMessage = data.choices[0].message;
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.'
            }]);
            setIsLoading(false);
        }
    };

    if (!isApiKeySet) {
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your message..."
                    disabled={isLoading}
                />
                <button onClick={handleSend} disabled={isLoading}>
                    {isLoading ? '...' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatInterface;
