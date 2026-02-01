// Fichier: app/layout.js

export const metadata = {
  title: 'Vespucci - Titanium',
  description: 'Manager System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f0f1a' }}>
        {children}
      </body>
    </html>
  )
}
