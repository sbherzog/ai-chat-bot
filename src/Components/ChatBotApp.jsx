import React, { useEffect, useState, useRef } from 'react';
import './ChatBotApp.css';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { supabase } from '../lib/supabase';

const ChatBotApp = ({ onGoBack, chats, setChats, activeChat, setActiveChat, onNewChat }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    const chatObj = chats.find(c => c.id === activeChat);
    if (chatObj?.messagesLoaded) {
      setMessages(chatObj.messages);
      return;
    }
    loadMessages(activeChat);
  }, [activeChat]);

  const loadMessages = async (chatId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const formatted = data.map(m => ({
      type: m.type,
      text: m.text,
      timestamp: new Date(m.created_at).toLocaleTimeString()
    }));

    setMessages(formatted);
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: formatted, messagesLoaded: true } : c
    ));
  };

  const updateChatsCache = (chatId, msgs) => {
    setChats(prev => prev.map(c =>
      c.id === chatId ? { ...c, messages: msgs } : c
    ));
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) {
      alert('Please enter a message');
      return;
    }
    setInputValue('');

    let chatId = activeChat;
    let currentMessages = messages;

    if (!chatId) {
      chatId = await onNewChat();
      if (!chatId) return;
      currentMessages = [];
    }

    const userMsg = { type: 'prompt', text, timestamp: new Date().toLocaleTimeString() };
    const withUser = [...currentMessages, userMsg];
    setMessages(withUser);
    updateChatsCache(chatId, withUser);

    await supabase.from('messages').insert({ chat_id: chatId, type: 'prompt', text });

    setIsTyping(true);
    try {
      const openAIMessages = withUser.map(m => ({
        role: m.type === 'prompt' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: openAIMessages })
      });

      const resData = await res.json();

      if (!res.ok) {
        console.error(resData);
        alert('AI request failed. Check your API key.');
        return;
      }

      const aiText = resData.choices?.[0]?.message?.content?.trim();
      if (!aiText) {
        alert('No response from AI');
        return;
      }

      const aiMsg = { type: 'response', text: aiText, timestamp: new Date().toLocaleTimeString() };
      const final = [...withUser, aiMsg];
      setMessages(final);
      updateChatsCache(chatId, final);
      await supabase.from('messages').insert({ chat_id: chatId, type: 'response', text: aiText });
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong');
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteChat = async (id) => {
    await supabase.from('chats').delete().eq('id', id);
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    if (activeChat === id) {
      setActiveChat(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-app">
      <div className={showChatList ? 'chat-list show' : 'chat-list hidden'}>
        <div className="chat-list-header">
          <h2>Chats</h2>
          <i className="bx bx-edit-alt new-chat" onClick={() => { onNewChat(); setShowChatList(false); }}></i>
          <i className="bx bx-x-circle close-list" onClick={() => setShowChatList(false)}></i>
        </div>
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`chat-list-item ${activeChat === chat.id ? 'active' : ''}`}
            onClick={() => { setActiveChat(chat.id); setShowChatList(false); }}
          >
            <h4>{chat.display_name}</h4>
            <i className="bx bx-x-circle" onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id); }}></i>
          </div>
        ))}
      </div>

      <div className="chat-window">
        <div className="chat-title">
          <h3>Chat with AI</h3>
          <i className="bx bx-menu" onClick={() => setShowChatList(true)}></i>
          <i className="fa-solid fa-arrow-left arrow" onClick={onGoBack}></i>
        </div>

        <div className="chat">
          {messages.map((msg, i) => (
            <div key={i} className={msg.type === 'prompt' ? 'prompt' : 'response'}>
              {msg.text}
              <span className="time">{msg.timestamp}</span>
            </div>
          ))}
          {isTyping && <div className="typing">Typing...</div>}
          <div ref={chatEndRef}></div>
        </div>

        <form className="msg-form" onSubmit={e => e.preventDefault()}>
          <i
            className="fa-solid fa-face-smile emoji"
            onClick={() => setShowEmojiPicker(prev => !prev)}
          ></i>
          {showEmojiPicker && (
            <div className="picker">
              <Picker data={data} onEmojiSelect={emoji => setInputValue(prev => prev + emoji.native)} />
            </div>
          )}
          <input
            type="text"
            className="msg-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowEmojiPicker(false)}
          />
          <i className="fa-solid fa-paper-plane" onClick={sendMessage}></i>
        </form>
      </div>
    </div>
  );
};

export default ChatBotApp;
