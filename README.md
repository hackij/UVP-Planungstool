# UVP Studio

Responsive React-Web-App zur kompetenzorientierten Unterrichtsplanung für Referendarinnen und Referendare.

## Lokal starten

```bash
npm install
npm run dev
```

Produktionsbuild:

```bash
npm run build
npm run preview
```

> Der übergeordnete Ordner `#Lernapps` enthält ein `#`. Vite warnt deshalb beim Start, die App funktioniert aber. Die expliziten TypeScript-Dateiendungen im Projekt sind dafür erforderlich.

## In Microsoft Teams einsetzen

1. Mit `npm run build` den Ordner `dist/` erzeugen.
2. `dist/` auf einem statischen HTTPS-Webspace veröffentlichen, zum Beispiel Azure Static Web Apps, GitHub Pages oder einem Schulserver.
3. Die HTTPS-Adresse in Teams als Website-Registerkarte oder in einer eigenen Teams-App als `contentUrl` einbinden.

Es gibt kein Backend. Planungsdaten bleiben in `localStorage` des jeweiligen Browser-/Teams-Kontexts. Für den Wechsel zwischen Geräten stehen JSON-Export und -Import bereit.

## PDF-Export

Die Schaltfläche **PDF exportieren** öffnet den Druckdialog. Dort „Als PDF sichern“ wählen. Das Druckstylesheet erzeugt genau zwei A4-Seiten:

1. Thema, Globalziel und Unterrichtsverlauf
2. Handlungskompetenzmatrix und Erläuterungen
