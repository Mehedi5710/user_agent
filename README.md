# FB / Mobile User Agent Generator

This is a small client-side app (HTML/CSS/JS) that generates realistic, unique-looking user-agent strings typical of mobile browsers and Facebook in-app browsers.

Features
- Choose quantity, device type (iPhone, iPad, Android, Pixel, Samsung), and locale.
- Produce Facebook in-app UAs (FBAN/FBIOS, FB_IAB tokens) or plain Chrome/Safari-style UAs.
- Prevent duplicates within the stored set (uses localStorage when "persist" is checked).
- Copy all, Download CSV, and clear stored UAs.
- Client-side only — no server required.

How to use
1. Save the files (index.html, styles.css, script.js, README.md) to the same folder.
2. Open index.html in a modern browser.
3. Choose options, click "Generate".
4. Use "Copy All" or "Download CSV" to export results.

Notes & next steps
- This starter uses internal arrays for OS versions and browser versions. To keep versions truly "latest", you can extend the script to fetch live version lists (example sources: Google's OmahaProxy for Chrome versions). Be aware of CORS and the need for a server-side proxy if remote endpoints don't allow cross-origin requests.
- To guarantee uniqueness across multiple machines or long-term, move persistence to a server-side store or a shared database.
- You can add more device models, locales, and specialized tokens to make specific UA families closer to your target profiles.
- This tool is intended for testing and development. Use responsibly and respect site terms of service.

License: MIT (adapt and extend)