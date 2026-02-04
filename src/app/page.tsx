import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, ChevronRight, Scissors } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      {/* Navigation */}
      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 group cursor-default">
          <div className="bg-neutral-900 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <Scissors className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase transition-colors">Frisierbar</h1>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">
            Staff Portal
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-500">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Chat Terminanfragen Aktiv
          </div>

          <h2 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase text-neutral-900 leading-[0.85]">
            Handwerk <br />
            trifft <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-400">Digital</span>
          </h2>

          <p className="text-lg md:text-xl text-neutral-500 font-medium max-w-xl mx-auto leading-relaxed">
            Willkommen bei der Frisierbar. Buchen Sie Ihren nächsten Termin einfach und unkompliziert direkt über unseren Live-Chat.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/chat">
              <Button size="lg" className="bg-neutral-900 text-white hover:bg-neutral-800 h-16 px-10 rounded-2xl text-xl font-black italic uppercase shadow-2xl shadow-neutral-200 group transition-all hover:scale-105 active:scale-95">
                Chat Starten
                <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 justify-center px-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-neutral-50 bg-neutral-200 flex items-center justify-center overflow-hidden grayscale hover:grayscale-0 transition-all duration-500">
                    <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="Customer" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-left">
                Bereits über 500+ <br />
                erfolgreiche Buchungen
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="bg-white border-t border-neutral-100 py-24">
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <MessageSquare className="text-neutral-900" size={24} />
            </div>
            <h4 className="font-black text-xl uppercase italic tracking-tight">Echtzeit Beratung</h4>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Stellen Sie Fragen zu Frisuren oder Dienstleistungen direkt im Chat und erhalten Sie sofortige Antworten.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <Calendar className="text-neutral-900" size={24} />
            </div>
            <h4 className="font-black text-xl uppercase italic tracking-tight">Schnelle Buchung</h4>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Kein Warten am Telefon. Sagen Sie uns einfach, wann Sie Zeit haben, und wir erledigen den Rest.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <ChevronRight className="text-neutral-900" size={24} />
            </div>
            <h4 className="font-black text-xl uppercase italic tracking-tight">Bestätigung</h4>
            <p className="text-neutral-500 text-sm leading-relaxed">
              Erhalten Sie Ihre Terminbestätigung sofort, nachdem unser Personal Ihren Wunsch geprüft hat.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-8 border-t border-neutral-100 text-center text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
        &copy; 2026 Frisierbar &bull; Made with Style
      </footer>
    </div>
  );
}
