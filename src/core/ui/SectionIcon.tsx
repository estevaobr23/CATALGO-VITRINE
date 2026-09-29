const PATHS: Record<string, string> = {
  store: "M4 10h16l-1.5-5h-13zM5 10v9h14v-9M9 19v-5h6v5",
  megaphone: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8.5a5 5 0 0 1 0 7M19 6a8 8 0 0 1 0 12",
  tags: "M4 4h7l9 9-7 7-9-9zM8 8h.01",
  basket: "M5 10h14l-1.6 8.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8zM8 10a4 4 0 0 1 8 0",
  photos: "M3 7h11v11H3zM7 4h11v11M6.5 14l2.5-3 2 2.5 1.5-1.5 2 2.5",
  quote: "M9 7H6a3 3 0 0 0-3 3v7h7v-7H7a2 2 0 0 1 2-2zM20 7h-3a3 3 0 0 0-3 3v7h7v-7h-3a2 2 0 0 1 2-2z",
  play: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM10 9l5 3-5 3z",
  heart: "M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4M12 17h.01",
  pin: "M12 21s6.5-6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21zM12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
};

export function SectionIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name] ?? PATHS.store} />
    </svg>
  );
}
