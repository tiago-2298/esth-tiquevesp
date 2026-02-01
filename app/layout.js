export const metadata = {
  title: 'Vespucci - Titanium Edition',
  description: 'Terminal de gestion employé',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0f0f1a', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
