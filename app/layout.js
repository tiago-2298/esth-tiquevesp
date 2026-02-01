export const metadata = {
  title: 'Vespucci - Titanium Edition',
  description: 'Terminal de gestion employé',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* On charge les icônes RemixIcon et les polices ici pour tout le site */}
        <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f0f1a', color: '#f1f5f9' }}>
        {children}
      </body>
    </html>
  )
}
