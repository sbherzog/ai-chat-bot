import React, { useState, useEffect } from 'react';
import ChatBotStart from './Components/ChatBotStart';
import ChatBotApp from './Components/ChatBotApp';
import Auth from './Components/Auth';
import { supabase } from './lib/supabase';

const App = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isChatting, setIsChatting] = useState(false);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadChats();
    } else {
      setChats([]);
      setActiveChat(null);
      setIsChatting(false);
    }
  }, [user]);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('id, display_name, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading chats:', error);
      return;
    }

    const formatted = data.map(chat => ({ ...chat, messages: [], messagesLoaded: false }));
    setChats(formatted);
    if (formatted.length > 0) {
      setActiveChat(formatted[0].id);
    }
  };

  const handleStartChat = () => {
    setIsChatting(true);
    if (chats.length === 0) {
      createNewChat().catch(console.error);
    }
  };

  const handleGoBack = () => {
    setIsChatting(false);
  };

  const createNewChat = async () => {
    const displayName = `Chat ${new Date().toLocaleDateString('en-gb')} ${new Date().toLocaleTimeString()}`;

    const { data, error } = await supabase
      .from('chats')
      .insert({ user_id: user.id, display_name: displayName })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat:', error);
      return null;
    }

    const newChat = { ...data, messages: [], messagesLoaded: true };
    setChats(prev => [newChat, ...prev]);
    setActiveChat(data.id);
    return data.id;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) {
    return (
      <div className="container">
        <p style={{ color: '#7b8ebc', fontSize: '1.8rem' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <Auth />
      </div>
    );
  }

  return (
    <div className="container">
      {isChatting ? (
        <ChatBotApp
          onGoBack={handleGoBack}
          chats={chats}
          setChats={setChats}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          onNewChat={createNewChat}
          onSignOut={handleSignOut}
        />
      ) : (
        <ChatBotStart onStartChat={handleStartChat} user={user} onSignOut={handleSignOut} />
      )}
    </div>
  );
};

export default App;
