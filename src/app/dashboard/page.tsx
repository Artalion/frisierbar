'use client';

import { useState, useEffect } from 'react';
import { supabaseStaff as supabase, Conversation, Message, Profile } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Inbox, User, MessageSquare, Calendar, CheckCircle, LogOut, AlertCircle } from 'lucide-react';

export default function StaffDashboard() {
    // Auth & Identity
    const [staffProfile, setStaffProfile] = useState<Profile | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Dashboard State
    const [conversations, setConversations] = useState<(Conversation & { profiles: Profile })[]>([]);
    const [selectedConv, setSelectedConv] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState('');

    // UI Helpers
    const [extractionResult, setExtractionResult] = useState<{
        date: string | null;
        time: string | null;
        service: string | null;
        missing_info: string[];
    } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualDetails, setManualDetails] = useState({ date: '', time: '', service: '' });

    // 1. Realtime: keep conversation list fresh
    useEffect(() => {
        const convSub = supabase
            .channel('dashboard-pool')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => { supabase.removeChannel(convSub); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 2. Fetchers
    const fetchProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) setStaffProfile(data);
    };

    const fetchConversations = async () => {
        const { data, error } = await supabase
            .from('conversations')
            .select('*, profiles:customer_id(id, full_name, role)')
            .order('last_message_at', { ascending: false });

        if (error) {
            console.error('Fetch Conversations Error:', error);
            return;
        }

        if (data) {
            const formatted = (data as unknown as (Conversation & { profiles: Profile })[]).map(c => ({
                ...c,
                profiles: c.profiles
            }));
            setConversations(formatted);
        }
    };

    const fetchMessages = async (id: string) => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
    };

    // 3. Message Subscription
    useEffect(() => {
        if (!selectedConv) return;

        fetchMessages(selectedConv);
        const sub = supabase
            .channel(`chat:${selectedConv}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${selectedConv}`
            }, (payload) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev;
                    return [...prev, payload.new as Message];
                });
                fetchConversations(); // Refresh list to update unread status / timestamps
            })
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [selectedConv]); // eslint-disable-line react-hooks/exhaustive-deps

    // 4. Actions
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Login fehlgeschlagen: " + error.message);
            setIsLoggingIn(false);
        } else if (data.user) {
            await fetchProfile(data.user.id);
            await fetchConversations();
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setStaffProfile(null);
        setConversations([]);
        setSelectedConv(null);
        setMessages([]);
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !selectedConv || !staffProfile) return;

        await supabase.from('messages').insert({
            conversation_id: selectedConv,
            sender_id: staffProfile.id,
            content: content.trim()
        });

        setContent('');
        fetchConversations(); // Refresh to update last_sender_id
    };

    const claimConversation = async (id: string) => {
        if (!staffProfile) return;
        await supabase.from('conversations').update({
            assigned_staff_id: staffProfile.id,
            status: 'active'
        }).eq('id', id);
    };

    const releaseConversation = async (id: string) => {
        await supabase.from('conversations').update({
            assigned_staff_id: null,
            status: 'pending'
        }).eq('id', id);
    };

    const analyzeMessages = async () => {
        if (messages.length === 0) return;
        setIsAnalyzing(true);
        try {
            const chatLogs = messages.map(m => ({
                role: (m.sender_id === staffProfile?.id ? 'assistant' : 'user') as 'assistant' | 'user' | 'system',
                content: m.content
            }));

            const res = await fetch('/api/extract-appointment', {
                method: 'POST',
                body: JSON.stringify({ messages: chatLogs }),
            });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            setExtractionResult(data);
        } catch (err) {
            console.error('Extraction error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const confirmAppointment = async () => {
        if (!extractionResult?.date || !extractionResult?.time || !selectedConv) return;

        const customerName = conversations.find(c => c.id === selectedConv)?.profiles?.full_name || 'Gast';
        const { date, time, service } = extractionResult;

        try {
            const res = await fetch('/api/book-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, service, customerName, conversationId: selectedConv }),
            });
            const data = await res.json();

            if (data.success) {
                alert(`Termin für ${customerName} erfolgreich gebucht!`);
                setExtractionResult(null);
            } else {
                alert(`Fehler bei der Buchung: ${data.error}`);
            }
        } catch (err) {
            console.error('Booking error:', err);
            alert('Technischer Fehler bei der Kalender-Buchung.');
        }
    };

    // 5. Render States
    if (!staffProfile || staffProfile.role !== 'staff') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-50 p-4">
                <Card className="w-full max-w-md p-8 shadow-2xl border-none">
                    <div className="text-center mb-8">
                        <h2 className="text-4xl font-black mb-3 italic tracking-tighter">SALON ADMIN</h2>
                        <p className="text-neutral-500 text-sm">
                            {!staffProfile ? 'Bitte loggen Sie sich ein.' : 'Zugriff eingeschränkt.'}
                        </p>
                    </div>

                    {!staffProfile ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">E-Mail</label>
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 bg-neutral-100 border-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Passwort</label>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 bg-neutral-100 border-none" />
                            </div>
                            <Button type="submit" className="w-full bg-black hover:bg-neutral-800 h-12 text-lg font-bold mt-4" disabled={isLoggingIn}>
                                {isLoggingIn ? 'Wird geprüft...' : 'Einloggen'}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-900">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertCircle className="text-amber-500" />
                                    <p className="font-black text-lg">Keine Mitarbeiter-Rolle!</p>
                                </div>
                                <p className="mb-4 text-sm leading-relaxed">Dein Account (<code>{email || 'Staff'}</code>) ist registriert, aber du hast noch nicht die Rolle <strong>&apos;staff&apos;</strong> erhalten.</p>
                                <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-amber-200 shadow-sm">
                                    <p className="text-xs font-bold uppercase opacity-50">Deine User-ID:</p>
                                    <code className="text-[10px] block break-all font-mono bg-white p-2 rounded">{staffProfile.id}</code>
                                    <p className="text-xs font-bold uppercase opacity-50 mt-4">SQL Befehl für Supabase:</p>
                                    <code className="text-[10px] block font-mono bg-white p-2 rounded">
                                        UPDATE profiles SET role = &apos;staff&apos; WHERE id = &apos;{staffProfile.id}&apos;;
                                    </code>
                                </div>
                            </div>
                            <Button onClick={handleLogout} className="w-full bg-neutral-200 text-black font-bold h-12 rounded-xl">Abmelden & Neustart</Button>
                        </div>
                    )}
                </Card>
            </div>
        );
    }

    // 6. Main UI
    return (
        <div className="flex h-screen bg-neutral-50 overflow-hidden text-neutral-900">
            {/* Conversations Sidebar */}
            <div className="w-80 bg-white border-r flex flex-col shadow-sm">
                <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Inbox className="text-black" size={24} />
                        <h1 className="font-black text-2xl tracking-tighter italic">INBOX</h1>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600 transition-colors">
                        <LogOut size={18} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center opacity-30">
                            <MessageSquare size={48} className="mb-4" />
                            <p className="text-sm font-medium">Momentan keine Anfragen vorhanden.</p>
                        </div>
                    ) : (
                        conversations.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => { setSelectedConv(c.id); setExtractionResult(null); setShowManualForm(false); }}
                                className={`p-5 border-b cursor-pointer transition-all ${selectedConv === c.id ? 'bg-neutral-900 text-white shadow-lg' : 'hover:bg-neutral-50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-bold text-lg leading-none ${selectedConv === c.id ? 'text-white' : 'text-neutral-900'}`}>
                                            {c.profiles?.full_name || 'Gast'}
                                        </p>
                                        {c.last_message_sender_id === c.customer_id && (
                                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" title="Unerledigte Antwort vom Kunden" />
                                        )}
                                    </div>
                                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${selectedConv === c.id ? 'bg-white/20 text-white' :
                                        c.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                        }`}>
                                        {c.status === 'pending' ? 'Offen' : c.status === 'active' ? 'Aktiv' : 'Erledigt'}
                                    </span>
                                </div>
                                <p className={`text-[10px] font-medium opacity-50 ${selectedConv === c.id ? 'text-white' : 'text-neutral-500'}`}>
                                    Letzte Nachricht: {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-neutral-100/50">
                {selectedConv ? (
                    <>
                        <div className="p-5 bg-white border-b flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-400">
                                    <User size={20} />
                                </div>
                                <h2 className="font-black text-xl tracking-tight">{conversations.find(c => c.id === selectedConv)?.profiles?.full_name || 'Gast-Chat'}</h2>
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={analyzeMessages} disabled={isAnalyzing} className="bg-neutral-100 text-black hover:bg-neutral-200 font-bold px-5">
                                    {isAnalyzing ? '...' : 'KI ANALYSE'}
                                </Button>
                                {conversations.find(c => c.id === selectedConv)?.assigned_staff_id ? (
                                    <Button onClick={() => releaseConversation(selectedConv)} className="bg-green-600 text-white hover:bg-green-700 font-bold px-6">
                                        KI AKTIVIEREN
                                    </Button>
                                ) : (
                                    <Button onClick={() => claimConversation(selectedConv)} className="bg-black text-white hover:bg-neutral-800 font-bold px-6">
                                        KI PAUSIEREN
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {messages.map((m) => {
                                const isCustomer = m.sender_id === conversations.find(c => c.id === selectedConv)?.customer_id;
                                return (
                                    <div key={m.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[70%] px-6 py-3 rounded-3xl shadow-sm ${!isCustomer
                                            ? 'bg-neutral-900 text-white rounded-tr-none'
                                            : 'bg-white text-neutral-800 rounded-tl-none border border-neutral-200'
                                            }`}>
                                            <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={sendMessage} className="p-6 bg-white border-t flex gap-3 shadow-top">
                            <Input
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Antworten..."
                                className="flex-1 h-12 bg-neutral-100 border-none rounded-2xl px-6 font-medium"
                            />
                            <Button type="submit" className="bg-black text-white px-8 font-black rounded-2xl h-12">SENDEN</Button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-10">
                        <MessageSquare size={120} />
                        <p className="text-2xl font-black uppercase tracking-widest italic">Bereit zum Chatten</p>
                    </div>
                )}
            </div>

            {/* AI/Booking Sidebar */}
            <div className="w-80 bg-white border-l p-6 flex flex-col shadow-sm">
                <div className="flex-1 space-y-8 overflow-y-auto">
                    <div className="space-y-6">
                        <h3 className="font-black text-xl tracking-tight flex items-center gap-2 italic uppercase">
                            <Calendar size={22} className="text-neutral-400" />
                            Booking
                        </h3>

                        {extractionResult ? (
                            <div className="space-y-4">
                                <div className="p-6 bg-neutral-900 text-white rounded-3xl shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <CheckCircle size={80} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Vorschlag erkannt</p>
                                    <div className="space-y-3 mb-6 relative z-10">
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-xs font-bold opacity-50 italic">DATUM</span>
                                            <span className="font-black text-sm">{extractionResult.date || '---'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-xs font-bold opacity-50 italic">ZEIT</span>
                                            <span className="font-black text-sm">{extractionResult.time || '---'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-xs font-bold opacity-50 italic">SERVICE</span>
                                            <span className="font-black text-xs text-right max-w-[120px]">{extractionResult.service || '---'}</span>
                                        </div>
                                    </div>

                                    {extractionResult.missing_info.length > 0 && (
                                        <div className="text-[11px] bg-white/10 p-4 rounded-2xl mb-6 backdrop-blur-sm">
                                            <p className="font-black mb-2 uppercase text-[9px] opacity-70 tracking-widest">Wird noch benötigt:</p>
                                            <ul className="space-y-1">
                                                {extractionResult.missing_info.map((info, idx) => (
                                                    <li key={idx} className="flex items-center gap-2">
                                                        <div className="w-1 h-1 bg-amber-400 rounded-full" />
                                                        {info}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Button onClick={confirmAppointment} disabled={!extractionResult.date || !extractionResult.time} className="w-full bg-white text-black hover:bg-neutral-200 font-black h-12 rounded-2xl shadow-lg">
                                        BESTÄTIGEN
                                    </Button>
                                </div>
                                <Button variant="ghost" className="w-full text-[10px] font-bold text-neutral-400" onClick={() => setExtractionResult(null)}>
                                    IGNORIEREN
                                </Button>
                            </div>
                        ) : showManualForm ? (
                            <div className="p-6 bg-white border border-neutral-100 rounded-3xl shadow-xl space-y-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Manuelle Buchung</p>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Datum</label>
                                        <Input type="date" className="h-10 bg-neutral-50 border-none font-bold" value={manualDetails.date} onChange={(e) => setManualDetails({ ...manualDetails, date: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Zeit</label>
                                        <Input type="time" className="h-10 bg-neutral-50 border-none font-bold" value={manualDetails.time} onChange={(e) => setManualDetails({ ...manualDetails, time: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Service</label>
                                        <Input placeholder="Haarschnitt..." className="h-10 bg-neutral-50 border-none font-bold" value={manualDetails.service} onChange={(e) => setManualDetails({ ...manualDetails, service: e.target.value })} />
                                    </div>
                                </div>
                                <Button onClick={() => { alert(`Gespeichert!`); setShowManualForm(false); }} disabled={!manualDetails.date || !manualDetails.time} className="w-full bg-black text-white h-12 font-black rounded-2xl">
                                    SPEICHERN
                                </Button>
                                <Button variant="ghost" className="w-full text-xs font-bold text-neutral-400 h-10 rounded-2xl" onClick={() => setShowManualForm(false)}>Abbrechen</Button>
                            </div>
                        ) : (
                            <Card className="bg-neutral-50 border-dashed border-neutral-300 rounded-3xl group hover:border-neutral-900 transition-colors cursor-pointer" onClick={() => setShowManualForm(true)}>
                                <CardContent className="p-8 text-center">
                                    <MessageSquare size={32} className="mx-auto mb-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                    <p className="text-xs font-black uppercase tracking-tight text-neutral-400 group-hover:text-neutral-800">Manuelle Buchung</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-neutral-100">
                    <div className="bg-green-50 p-4 rounded-3xl flex items-center gap-3 border border-green-100/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <div>
                            <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Live Status</p>
                            <p className="text-[10px] font-bold text-green-700 opacity-60 italic">System bereit.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
