# Big Floating Chess Timer 🏁⏱️

A draggable, feature-rich timer overlay for Chess.com that provides enhanced visual and audio feedback based on remaining time.

![Chess Timer Demo](https://img.shields.io/badge/Chess.com-Compatible-green) ![Version](https://img.shields.io/badge/Version-2025--08--08-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

<img width="240" height="179" alt="image" src="https://github.com/user-attachments/assets/53f7a096-6e23-48b7-9634-694ff5320f3b" />
<img width="217" height="162" alt="image" src="https://github.com/user-attachments/assets/c39b83e3-d005-4f81-a07b-ac4286249102" />
<img width="218" height="161" alt="image" src="https://github.com/user-attachments/assets/9e8624e8-9e14-483e-9cde-6eb9dae5e066" />

## Features

### 🎯 Visual Alerts
- **Large, readable display** - 72px monospace font for clear time visibility
- **Dynamic color coding** - Green → Orange → Red based on time remaining
- **Progress bar** - Visual representation of time remaining
- **Pulsing effects** - Border pulses during your turn, font scales during critical time
- **Background alerts** - Red background pulse during final phase

### 🔊 Audio Notifications
- **Warning beep** (800Hz) - Single beep when reaching 2/3 time threshold
- **Critical beeps** (1200Hz) - Beep on every turn during final 1/6 of time
- **Smooth audio** - Fade-in/fade-out for pleasant sound experience

### 🎛️ Interactive Features
- **Fully draggable** - Position anywhere on screen
- **Turn-based display** - Dimmed when not your turn
- **Auto-reset** - Adapts to new games automatically

## Phase Breakdown

| Time Remaining | Visual State | Audio Behavior |
|----------------|--------------|----------------|
| > 1/3 time | Green border, white text | Silent |
| 1/3 - 1/6 time | Orange border & text | Single warning beep |
| < 1/6 time | Red everything, pulsing background & font | Beep every turn |

## Installation

### Tampermonkey (Recommended)
1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click "Create a new script"
3. Copy and paste the entire script
4. Save (Ctrl+S)
5. Navigate to any Chess.com game

### Other Userscript Managers
Compatible with Greasemonkey, Violentmonkey, and similar extensions.

## Usage

1. **Start a game** on Chess.com - Timer appears automatically
2. **Drag to position** - Click and drag to move anywhere on screen
3. **Audio permissions** - Browser may ask for audio permission on first beep
4. **Multiple games** - Timer resets automatically for each new game

## Technical Details

### Browser Compatibility
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Performance
- **Lightweight** - Updates every 200ms without impacting game performance
- **Memory efficient** - Proper cleanup of audio contexts
- **No external dependencies** - Pure JavaScript implementation

## Customization

### Adjust Audio
```javascript
// Change beep frequencies (Hz)
playNote(800, 0.2);  // Warning beep
playNote(1200, 0.2); // Critical beep

// Adjust volume (0.0 - 1.0)
gainNode.gain.linearRampToValueAtTime(0.3, currentTime + fadeTime);
```

### Modify Thresholds
```javascript
// Current thresholds
elapsed >= startingSeconds * (2 / 3)  // Warning phase
elapsed >= startingSeconds * (5 / 6)  // Critical phase
```

### Change Appearance
```javascript
// Font size
timeText.style.fontSize = "72px";

// Colors
progressBar.style.backgroundColor = "#4caf50"; // Green
timeText.style.color = "#ff9800";              // Orange
```

## Development

### Script Structure
- **Clock detection** - Monitors Chess.com's clock elements
- **Phase calculation** - Determines current time phase
- **Visual updates** - Manages colors, animations, and effects
- **Audio system** - Handles Web Audio API for notifications
- **Drag system** - Implements draggable functionality


### Key Functions
- `updateClock()` - Main update loop (200ms interval)
- `playNote(pitch, duration)` - Audio notification system
- `startFontPulse()` / `stopFontPulse()` - Font scaling effects

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test on Chess.com
4. Submit a pull request

### Roadmap
- [ ] Sound volume controls
- [ ] Multiple timer themes
- [ ] Position memory
- [ ] Tournament mode features

## License

MIT License - Feel free to modify and distribute.

## Support

- **Issues** - Report bugs via GitHub issues
- **Compatibility** - Tested on Chess.com's current interface
- **Updates** - Script auto-updates through Tampermonkey

---

*Enhance your Chess.com experience with better time awareness! 🚀*
