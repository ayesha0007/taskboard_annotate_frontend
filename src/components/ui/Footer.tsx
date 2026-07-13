export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted">
      © {year} AYESHA SIDDIKA. All rights reserved. Flowdeck is proprietary software; unauthorized
      copying or redistribution is prohibited.
    </footer>
  );
}
