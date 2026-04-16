'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Message } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Send } from 'lucide-react';

const AI_GREETING = 'Hallo! Willkommen bei der Frisierbar. 😊 Wann darf ich Sie einplanen? Bitte nennen Sie mir Ihren Wunschtermin (Datum und Uhrzeit) sowie die gewünschte Dienstleistung.';

export default function CustomerChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState('');
    const [session, setSession] = useState<{ user: { id: string } } | null>(null);
    const [name, setName] = useState('');
    const [isJoined, setIsJoined] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setSession(session as { user: { id: string } });
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.full_name) {
                    setName(profile.full_name);
                    const { data: convData } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('customer_id', session.user.id)
                        .neq('status', 'closed')
                        .order('last_message_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (convData) {
                        await startChatSession(convData.id);
                    }
                }
            }
            setIsLoading(false);
        };
        init();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streamingMessage]);

    const joinChat = async () => {
        if (!name.trim()) return;
        setIsLoading(true);

        try {
            let userId = session?.user?.id;
            if (!userId) {
                const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
                if (authError) throw authError;
                userId = authData.user?.id;
                setSession(authData.session as { user: { id: string } });
            }

            if (!userId) return;

            await supabase.from('profiles').upsert({
                id: userId,
                full_name: name.trim(),
                role: 'customer',
            });

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
                await startChatSession(targetId, true);
            }
        } catch (err) {
            console.error('Join Error:', err);
            alert('Fehler beim Starten des Chats.');
        } finally {
            setIsLoading(false);
        }
    };

    const startChatSession = async (convId: string, isNew = false) => {
        setConversationId(convId);
        setIsJoined(true);

        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        const existing = data ?? [];
        setMessages(existing);

        // Send AI greeting for brand-new conversations
        if (isNew && existing.length === 0) {
            await saveAiMessage(convId, AI_GREETING);
        }

        const channel = supabase
            .channel(`chat:${convId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${convId}`,
            }, (payload) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as Message];
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const saveAiMessage = async (convId: string, text: string) => {
        const { data } = await supabase
            .from('messages')
            .insert({ conversation_id: convId, sender_id: null, content: text })
            .select()
            .single();
        if (data) {
            setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
        }
    };

    const getAiResponse = async (convId: string, history: { role: 'user' | 'assistant'; content: string }[]) => {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history }),
        });

        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            fullText += chunk;
            setStreamingMessage(fullText);
        }

        setStreamingMessage('');
        await saveAiMessage(convId, fullText);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !conversationId || !session?.user?.id || isSending) return;

        const text = content.trim();
        setContent('');
        setIsSending(true);

        const { data: inserted } = await supabase
            .from('messages')
            .insert({ conversation_id: conversationId, sender_id: session.user.id, content: text })
            .select()
            .single();

        // Build history for AI (all messages + the new one)
        const currentMessages = inserted
            ? [...messages.filter(m => m.sender_id !== null || m.content !== AI_GREETING), inserted]
            : messages;

        const history = currentMessages.map(m => ({
            role: (m.sender_id === session?.user?.id ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.content,
        }));

        await getAiResponse(conversationId, history);
        setIsSending(false);
    };

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
                            onKeyDown={(e) => e.key === 'Enter' && joinChat()}
                            className="h-12 text-lg"
                        />
                    </CardContent>
                    <CardFooter>
                        <Button onClick={joinChat} disabled={isLoading} className="w-full h-12 text-lg bg-black">
                            {isLoading ? 'Einen Moment...' : 'Chat starten'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-neutral-100 max-w-lg mx-auto shadow-2xl overflow-hidden">
            <div className="bg-white border-b p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-sm">
                    FB
                </div>
                <div>
                    <h2 className="font-semibold">Frisierbar</h2>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full" /> Online
                    </p>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => {
                    const isCustomer = m.sender_id === session?.user?.id;
                    return (
                        <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed ${isCustomer
                                ? 'bg-green-600 text-white rounded-tr-none'
                                : 'bg-white text-neutral-800 rounded-tl-none border border-neutral-100'
                                }`}>
                                {m.content}
                            </div>
                        </div>
                    );
                })}

                {/* Streaming bubble */}
                {streamingMessage && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed bg-white text-neutral-800 rounded-tl-none border border-neutral-100">
                            {streamingMessage}
                            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-neutral-400 rounded-sm animate-pulse" />
                        </div>
                    </div>
                )}

                {/* Typing indicator (waiting for stream to start) */}
                {isSending && !streamingMessage && (
                    <div className="flex justify-start">
                        <div className="px-4 py-3 rounded-2xl bg-white border border-neutral-100 shadow-sm flex gap-1 items-center rounded-tl-none">
                            {[0, 1, 2].map(i => (
                                <span
                                    key={i}
                                    className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-2">
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nachricht schreiben..."
                    className="flex-1 rounded-xl h-11"
                    disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending} className="w-11 h-11 bg-black text-white rounded-xl shrink-0">
                    <Send size={18} />
                </Button>
            </form>
        </div>
    );
}
