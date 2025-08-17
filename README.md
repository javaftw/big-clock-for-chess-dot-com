# Big Floating Chess Timer

A Tampermonkey userscript that adds a draggable timer overlay to Chess.com with visual and audio feedback based on remaining time. **The script does not interact or interfere with the game in any way** - it only reads and displays timing information.
 
<img width="289" height="231" alt="image" src="https://github.com/user-attachments/assets/656936de-5090-4da1-85a4-34649ab1ddc2"/>
<img width="321" height="236" alt="image" src="https://github.com/user-attachments/assets/2df522c8-e4ff-4eb2-b41e-1503d22d0be5" />
<img width="321" height="228" alt="image" src="https://github.com/user-attachments/assets/d8a4561f-ba54-4112-a2b9-f473705325d3" />

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Create a new script in Tampermonkey
3. Copy and paste the userscript code
4. Save and navigate to any Chess.com game
5. The timer appears automatically during games

![Chess Timer Demo](https://img.shields.io/badge/Chess.com-Compatible-green) ![Version](https://img.shields.io/badge/Version-0.15-blue)

## Features

### Visual Display
- Large 72px monospace font for time visibility
- Color coding: Green → Orange → Red based on time remaining
- Progress bar showing time remaining
- Border pulsing during your turn
- Font scaling and background pulsing during critical time
- Dimmed display when not your turn
- Cycling reminder text: "CHECKS | CAPTURES | THREATS" and "DEFENSES | IMPROVEMENTS"

### Audio Notifications
- Warning beep (800Hz) at 2/3 time remaining
- Critical phase beep (1200Hz) at 5/6 time remaining
- Double beep (1kHz) in final seconds (10s for ≤3min games, 30s for longer games)
- Musical tune when time reaches zero
- Fade-in/fade-out audio transitions

### Interactive Features
- Fully draggable - position anywhere on screen
- Position saved between sessions
- Automatic game detection and reset
- Turn-based visual feedback

## Time Phases

| Time Remaining | Visual State | Audio Behavior |
|----------------|--------------|----------------|
| > 1/3 time | Green border, white text | None |
| 1/3 - 1/6 time | Orange border and text | Single warning beep |
| < 1/6 time | Red border and text, pulsing background | Critical beep on phase entry |
| Final seconds | Red with font scaling | Double beep every second |
| 0:00 | Time up display | Musical tune |

## Browser Compatibility

- Chrome/Chromium
- Firefox  
- Safari
- Edge

## Technical Details

- Updates every 500ms
- Uses Web Audio API for sound generation
- Pure JavaScript implementation
- Minimal performance impact
- Automatic cleanup of audio contexts

## Customization

### Audio Settings
```javascript
// Change beep frequencies
playNote(800, 0.2);  // Warning beep
playNote(1200, 0.1); // Critical beep
playNote(1000, 0.1); // Double beep

// Adjust volume (0.0 - 1.0)
gainNode.gain.linearRampToValueAtTime(0.3, currentTime + fadeTime);
```

### Visual Settings
```javascript
// Font size
timeText.style.fontSize = "72px";

// Phase thresholds
elapsed >= startingSeconds * (2 / 3)  // Warning phase
elapsed >= startingSeconds * (5 / 6)  // Critical phase
```

## Usage Notes

- Browser may request audio permission on first sound
- Timer automatically adapts to different time controls
- Position is saved in browser localStorage
- Only displays during active games on Chess.com

## License

MIT License
