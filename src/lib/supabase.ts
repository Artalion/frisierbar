import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

// Customer client — used in /chat (anonymous auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storageKey: 'frisierbar-customer' },
});

// Staff client — used in /dashboard (email/password auth)
export const supabaseStaff = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { storageKey: 'frisierbar-staff' },
});

export type Profile = {
    id: string;
    full_name: string | null;
    role: 'customer' | 'staff';
    created_at: string;
};

export type Conversation = {
    id: string;
    customer_id: string;
    assigned_staff_id: string | null;
    status: 'pending' | 'active' | 'closed';
    last_message_at: string;
    last_message_sender_id: string | null;
    created_at: string;
};

export type Message = {
    id: string;
    conversation_id: string;
    sender_id: string | null;
    content: string;
    created_at: string;
};

export type Appointment = {
    id: string;
    conversation_id: string;
    customer_id: string;
    staff_id: string | null;
    start_time: string;
    service_type: string | null;
    status: 'provisional' | 'confirmed' | 'cancelled';
    created_at: string;
};
