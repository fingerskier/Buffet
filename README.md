# Buffet
A terminal wrangling dashboard

## Features
* Electron.js
* Spawn native terminals and track and manage them via PIDs
  * cmd
  * pwsh
  * wsl
  * bash
  * zsh
* Terminals are referred to as "Units"
* Adjust and remember terminal window arrangements
* Remember "Favorite" units and group them
* Command/text injection into units
* Glean status from units and display it in the dashboard (working, waiting, idle, memory/CPU usage, etc.)
  * CPU usage ~ working
  * Tail (screen content) hash ~ idleness
  * Claude Haiku (via cli) gives structure output
    * `waitingForInput`
    * `hasErrors`
    * `lastCommand`
* Search/filter sessions in real time
* Export/import configurations as JSON
* Runs on Windows, macOS, and Linux (including Raspberry Pi OS)
