import './globals.css';

export const metadata = {
  title: 'Vespucci Titanium',
  description: 'Manager Système V5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
