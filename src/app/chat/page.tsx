'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Message } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Send, User } from 'lucide-react';

export default function CustomerChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState('');
    const [session, setSession] = useState<{ user: { id: string } } | null>(null);
    const [name, setName] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Check for existing session on mount
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setSession(session as { user: { id: string } });
                // Fetch profile to get name
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.full_name) {
                    setName(profile.full_name);
                    // Find existing conv
                    const { data: convData } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('customer_id', session.user.id)
                        .neq('status', 'closed')
                        .order('last_message_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (convData) {
                        startChatSession(convData.id);
                    }
                }
            }
            setIsLoading(false);
        };
        init();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 2. Reconnect Logic
    const reconnect = async (userId: string) => {
        const { data: convData } = await supabase
            .from('conversations')
            .select('id')
            .eq('customer_id', userId)
            .neq('status', 'closed')
            .order('last_message_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (convData) {
            startChatSession(convData.id);
        }
    };

    // 3. Join Chat (New or Existing)
    const joinChat = async () => {
        if (!name.trim()) return;
        setIsLoading(true);

        try {
            // Sign in anonymously if no session
            let userId = session?.user?.id;
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw authError;
                userId = authData.user?.id;
                setSession(authData.session as any);
            }

            if (!userId) return;

            // Update profile with name
            await supabase.from('profiles').upsert({
                id: userId,
                full_name: name.trim(),
                role: 'customer'
            });

            // Find or create conversation
            const { data: convData } = await supabase
                .from('conversations')
                .select('id')
                .eq('customer_id', userId)
                .neq('status', 'closed')
                .maybeSingle();

            let targetId = convData?.id;
            if (!targetId) {
                const { data: newConv } = await supabase
                    .from('conversations')
                    .insert({ customer_id: userId })
                    .select()
                    .single();
                targetId = newConv?.id;
            }

            if (targetId) {
                startChatSession(targetId);
            }
        } catch (err) {
            console.error('Join Error:', err);
            alert('Fehler beim Starten des Chats.');
        } finally {
            setIsLoading(false);
        }
    };

    const startChatSession = (convId: string) => {
        setConversationId(convId);
        setIsJoined(true);
        fetchMessages(convId);

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${convId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${convId}`
            }, (payload) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as Message];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const fetchMessages = async (convId: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !conversationId || !session?.user?.id) return;

        const { error } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: session.user.id,
            content: content.trim()
        });

        if (!error) setContent('');
    };

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isLoading && !isJoined) {
        return <div className="h-screen flex items-center justify-center">Laden...</div>;
    }

    if (!isJoined) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 p-4">
                <Card className="w-full max-w-md shadow-xl border-none">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold">Frisierbar Chat</CardTitle>
                        <p className="text-neutral-500">Willkommen! Wie dürfen wir Sie nennen?</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Input
                            placeholder="Ihr Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 text-lg"
                        />
                    </CardContent>
                    <CardFooter>
                        <Button onClick={joinChat} className="w-full h-12 text-lg bg-black">
                            Chat starten
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-neutral-100 max-w-lg mx-auto shadow-2xl overflow-hidden">
            <div className="bg-white border-b p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                        <User size={20} className="text-neutral-600" />
                    </div>
                    <div>
                        <h2 className="font-semibold">{name}</h2>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
                        </p>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && <p className="text-center text-neutral-400 text-sm mt-8">Übermitteln Sie uns Ihre Terminanfrage...</p>}
                {messages.map((m) => {
                    const isMe = m.sender_id === session?.user?.id;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-md ${isMe
                                ? 'bg-green-600 text-white rounded-tr-none'
                                : 'bg-white text-neutral-800 rounded-tl-none border border-neutral-100'
                                }`}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nachricht schreiben..."
                    className="flex-1 rounded-xl h-11"
                />
                <Button type="submit" size="icon" className="w-11 h-11 bg-black text-white rounded-xl shrink-0">
                    <Send size={18} />
                </Button>
            </form>
        </div>
    );
}
