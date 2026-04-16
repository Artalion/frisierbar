/**
 * Preisliste Damen — Frisierbar
 *
 * Haarlägen-Kategorien:
 *   kurz  = bis 10 cm
 *   mittel = 10 bis 30 cm
 *   lang   = ab 30 cm
 *
 * Preise in Euro. null = Leistung in dieser Länge nicht verfügbar.
 */

export interface PreisEintrag {
  leistung: string;
  kurz: number | null;   // bis 10 cm
  mittel: number | null; // 10–30 cm
  lang: number | null;   // ab 30 cm
  hinweis?: string;
}

export interface PreisKategorie {
  kategorie: string;
  hinweis?: string;
  eintraege: PreisEintrag[];
}

export const PREISLISTE_DAMEN: PreisKategorie[] = [
  {
    kategorie: "Schneiden",
    eintraege: [
      { leistung: "Waschen & Föhnen",          kurz: 28.00, mittel: 35.00, lang: 40.00 },
      { leistung: "Schneiden",                  kurz: 35.00, mittel: 44.00, lang: 51.00 },
      { leistung: "Waschen, Schneiden & Föhnen",kurz: 45.00, mittel: 55.00, lang: 60.00 },
      { leistung: "Kur",                         kurz:  3.50, mittel:  4.00, lang:  5.00 },
    ],
  },
  {
    kategorie: "Farbe",
    eintraege: [
      { leistung: "Unicolor",                                       kurz: 40.00, mittel:  46.00, lang:  53.00 },
      { leistung: "Glamcolor",                                      kurz: 45.00, mittel:  53.00, lang:  59.00 },
      { leistung: "Highlights",                                     kurz: 54.00, mittel:  65.00, lang:  75.00 },
      { leistung: "Multi-Effekt",                                   kurz: 57.00, mittel:  67.00, lang:  75.00 },
      { leistung: "Balayage 1 (Highlights + Gloss)",                kurz: null,  mittel:  95.00, lang: 110.00 },
      { leistung: "Balayage 2 (Highlights + Ansatz + Gloss)",       kurz: null,  mittel: 105.00, lang: 120.00 },
      { leistung: "Balayage 3 (Highlights + Ansatz + Länge + Gloss)",kurz: null, mittel: 120.00, lang: 135.00 },
    ],
  },
  {
    kategorie: "Farbangebots-Pakete",
    hinweis: "Beinhaltet Waschen, Schneiden & Föhnen, Farbe und Pflege",
    eintraege: [
      { leistung: "Unicolor",                                       kurz:  85.00, mittel: 101.00, lang: 111.00 },
      { leistung: "Glamcolor",                                      kurz:  90.00, mittel: 104.00, lang: 117.00 },
      { leistung: "Highlights",                                     kurz:  99.00, mittel: 110.00, lang: 125.00 },
      { leistung: "Multi-Effekt",                                   kurz: 102.00, mittel: 118.00, lang: 133.00 },
      { leistung: "Balayage 1 (Highlights + Gloss)",                kurz: null,   mittel: 146.00, lang: 168.00 },
      { leistung: "Balayage 2 (Highlights + Ansatz + Gloss)",       kurz: null,   mittel: 156.00, lang: 178.00 },
      { leistung: "Balayage 3 (Highlights + Ansatz + Länge + Gloss)",kurz: null,  mittel: 171.00, lang: 193.00 },
    ],
  },
  {
    kategorie: "Dauerhafte Haarglättung",
    eintraege: [
      { leistung: "Dauerhafte Haarglättung", kurz: 95.00, mittel: 110.00, lang: 130.00 },
    ],
  },
  {
    kategorie: "Pflegebehandlungen",
    eintraege: [
      {
        leistung: "Olaplex",
        kurz: 20.00, mittel: 25.00, lang: 30.00,
        hinweis: "Preisaufschlag je 3,75 ml: 5,00 €",
      },
      { leistung: "Rebuild Treatment", kurz: 20.00, mittel: 25.00, lang: 30.00 },
    ],
  },
  {
    kategorie: "Volumenwelle",
    eintraege: [
      { leistung: "Volumenwelle",                          kurz: 48.00, mittel:  54.00, lang:  60.00 },
      { leistung: "Volumenwelle inkl. Waschen, Schneiden & Föhnen", kurz: 75.00, mittel: 86.00, lang: 97.00 },
    ],
  },
  {
    kategorie: "Brautfrisuren",
    eintraege: [
      { leistung: "Brautfrisur",             kurz:  80.00, mittel: 115.00, lang: 130.00 },
      { leistung: "Brautfrisur inkl. Probestecken", kurz: 150.00, mittel: 220.00, lang: 250.00 },
    ],
  },
  {
    kategorie: "Steckfrisuren",
    eintraege: [
      { leistung: "Steckfrisur ohne Waschen", kurz: null, mittel: 55.00, lang: 65.00 },
      { leistung: "Steckfrisur mit Waschen",  kurz: null, mittel: 65.00, lang: 75.00 },
    ],
  },
];

/** Sonderkonditionen */
export const SONDERKONDITIONEN = [
  "Schüler-/Studenten-Rabatt: -10 % auf alle Colorationsleistungen (Nachweis erforderlich)",
  "Bei einer Typveränderung: Aufpreis 5,00 €",
];

/**
 * Formatiert die vollständige Preisliste als lesbaren Text für den KI-Prompt.
 */
export function formatPreilisteDamenFuerPrompt(): string {
  const laengenHeader = "Haarlängen: kurz (bis 10 cm) | mittel (10–30 cm) | lang (ab 30 cm)";

  const kategorienText = PREISLISTE_DAMEN.map((kat) => {
    const header = kat.hinweis
      ? `### ${kat.kategorie}\n(${kat.hinweis})`
      : `### ${kat.kategorie}`;

    const zeilen = kat.eintraege.map((e) => {
      const fmt = (p: number | null) => (p !== null ? `${p.toFixed(2)} €` : "nicht verfügbar");
      let zeile = `- ${e.leistung}: kurz ${fmt(e.kurz)}, mittel ${fmt(e.mittel)}, lang ${fmt(e.lang)}`;
      if (e.hinweis) zeile += ` (${e.hinweis})`;
      return zeile;
    });

    return [header, ...zeilen].join("\n");
  }).join("\n\n");

  const sonderText = SONDERKONDITIONEN.map((s) => `- ${s}`).join("\n");

  return [
    "## Damen-Preisliste Frisierbar",
    laengenHeader,
    "",
    kategorienText,
    "",
    "### Sonderkonditionen",
    sonderText,
  ].join("\n");
}
