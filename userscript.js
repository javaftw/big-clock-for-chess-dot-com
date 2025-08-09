// ==UserScript==
// @name         Big Floating Chess Timer
// @namespace    http://tampermonkey.net/
// @version      2025-08-08
// @description  Draggable chess.com timer with progress bar, instant movement, turn-based border pulse, and dynamic visual alerts based on game fraction 😎
// @author       You
// @match        https://www.chess.com/game/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Create wrapper
    const bigClock = document.createElement("div");
    bigClock.id = "bigChessClock";
    bigClock.style.position = "fixed";
    bigClock.style.top = "50px";
    bigClock.style.left = "50px";
    bigClock.style.zIndex = "9999";
    bigClock.style.fontFamily = "monospace";
    bigClock.style.color = "white";
    bigClock.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    bigClock.style.padding = "10px 20px";
    bigClock.style.borderRadius = "10px";
    bigClock.style.boxShadow = "0 0 10px rgba(0,0,0,0.7)";
    bigClock.style.cursor = "move";
    bigClock.style.width = "auto";
    bigClock.style.minWidth = "150px";
    bigClock.style.textAlign = "center";
    bigClock.style.animation = "none";
    bigClock.style.transition = "none";

    // Time display
    const timeText = document.createElement("div");
    timeText.style.fontSize = "72px";
    timeText.textContent = "Loading...";
    timeText.style.transition = "none";
    timeText.style.transformOrigin = "center center";
    bigClock.appendChild(timeText);

    // Progress bar container
    const barContainer = document.createElement("div");
    barContainer.style.width = "100%";
    barContainer.style.height = "10px";
    barContainer.style.backgroundColor = "#444";
    barContainer.style.borderRadius = "5px";
    barContainer.style.marginTop = "10px";
    bigClock.appendChild(barContainer);

    // Progress bar itself
    const progressBar = document.createElement("div");
    progressBar.style.height = "100%";
    progressBar.style.backgroundColor = "#4caf50"; // default green
    progressBar.style.borderRadius = "5px";
    progressBar.style.width = "100%";
    progressBar.style.transition = "none";
    barContainer.appendChild(progressBar);

    // Styles for pulse border and font pulse
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulseBorder {
            0%   { box-shadow: 0 0 5px 2px var(--pulse-color, green); }
            50%  { box-shadow: 0 0 15px 2px var(--pulse-color, green); }
            100% { box-shadow: 0 0 5px 2px var(--pulse-color, green); }
        }
        @keyframes pulseRedBG {
            0% { background-color: rgba(100, 0, 0, 0.9); }
            50% { background-color: rgba(150, 0, 0, 0.8); }
            100% { background-color: rgba(100, 0, 0, 0.9); }
        }
        @keyframes fontPulse {
            0% { transform: scale(1); }
            10% { transform: scale(1.2); }
            90% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(bigClock);

    let startingSeconds = null;
    let fontPulseInterval = null;
    let lastPhase = 'normal'; // Track phase changes to trigger sounds
    let hasPlayedWarningBeep = false; // Track if warning beep was played

    function parseTimeString(str) {
        if (!str.includes(':')) return null;
        const [minStr, secStr] = str.split(':');
        const min = parseInt(minStr);
        const sec = parseInt(secStr);
        return min * 60 + sec;
    }

    /**
     * Generates a short note with soft edges (fade in/out) at the specified pitch and duration.
     * @param {number} pitch - Frequency of the note in Hz (e.g., 440 for A4)
     * @param {number} duration - Duration of the note in seconds
     */
    function playNote(pitch, duration) {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for the tone
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Sine wave for a pure tone
        oscillator.frequency.value = pitch;
        
        // Create gain node for controlling volume and creating soft edges
        const gainNode = audioContext.createGain();
        
        // Connect oscillator to gain and gain to output
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set initial volume to 0
        gainNode.gain.value = 0;
        
        // Calculate fade time (10% of duration, but no more than 0.1 seconds)
        const fadeTime = Math.min(duration * 0.1, 0.1);
        
        // Schedule the parameter changes
        const currentTime = audioContext.currentTime;
        
        // Fade in
        gainNode.gain.linearRampToValueAtTime(0.3, currentTime + fadeTime);
        
        // Fade out
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration - fadeTime);
        
        // Start and stop the oscillator
        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
        
        // Clean up after the note finishes playing
        oscillator.onended = () => {
            gainNode.disconnect();
            oscillator.disconnect();
            
            // If we're done with all sounds, close the audio context
            if (audioContext.state !== 'closed') {
                audioContext.close().catch(e => console.error('Error closing audio context:', e));
            }
        };
    }

    function startFontPulse() {
        if (fontPulseInterval) return; // Already running
        
        fontPulseInterval = setInterval(() => {
            timeText.style.animation = "fontPulse 0.1s ease-in-out";
            setTimeout(() => {
                timeText.style.animation = "none";
                timeText.style.transform = "scale(1)";
            }, 100);
        }, 1000);
    }

    function stopFontPulse() {
        if (fontPulseInterval) {
            clearInterval(fontPulseInterval);
            fontPulseInterval = null;
            timeText.style.animation = "none";
            timeText.style.transform = "scale(1)";
        }
    }

    function updateClock() {
        const myTurnClock = document.querySelector('.clock-bottom.clock-player-turn .clock-time-monospace');
        const myClockElem = document.querySelector('.clock-bottom .clock-time-monospace');

        if (!myClockElem || !myClockElem.textContent) return;

        const isMyTurn = !!myTurnClock;
        const timeStr = myClockElem.textContent.trim();
        const currentSeconds = parseTimeString(timeStr);
        if (currentSeconds == null) return;

        if (startingSeconds == null || currentSeconds > startingSeconds) {
            startingSeconds = currentSeconds;
            hasPlayedWarningBeep = false; // Reset when game/timer resets
        }

        const elapsed = startingSeconds - currentSeconds;

        // Update time text
        timeText.textContent = timeStr;

        // Reset defaults
        bigClock.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        progressBar.style.backgroundColor = "#4caf50";
        bigClock.style.animation = "none";
        bigClock.style.boxShadow = "0 0 10px rgba(0,0,0,0.7)";
        timeText.style.color = isMyTurn ? "white" : "#555"; // darker when not my turn

        if (isMyTurn) {
            let borderColor = "limegreen";
            let currentPhase = 'normal';

            // Fraction-based thresholds
            if (elapsed >= startingSeconds * (2 / 3) && elapsed < startingSeconds * (5 / 6)) {
                borderColor = "#ff9800"; // orange
                timeText.style.color = "#ff9800";
                progressBar.style.backgroundColor = "#ff9800";
                stopFontPulse(); // Stop font pulse in orange phase
                currentPhase = 'warning';
                
                // Play warning note only once when first entering 2/3 phase
                if (!hasPlayedWarningBeep) {
                    playNote(800, 0.2); // Higher pitch, 2/10th second
                    hasPlayedWarningBeep = true;
                }
            } else if (elapsed >= startingSeconds * (5 / 6)) {
                borderColor = "red";
                timeText.style.color = "white";
                progressBar.style.backgroundColor = "red";
                bigClock.style.animation = "pulseRedBG 0.5s infinite"; // background pulse at 2Hz
                startFontPulse(); // Start font pulse in critical phase
                currentPhase = 'critical';
                
                // Play urgent note on every turn when in critical phase
                if (lastPhase !== 'critical') {
                    playNote(1200, 0.2); // Even higher pitch, more urgent
                }
            } else {
                stopFontPulse(); // Stop font pulse in normal phase
                hasPlayedWarningBeep = false; // Reset warning beep flag when back to normal
            }

            lastPhase = currentPhase;

            bigClock.style.setProperty('--pulse-color', borderColor);
            // 0.5s cycle → 2Hz pulse
            bigClock.style.animation = `pulseBorder 0.5s infinite`;
        } else {
            stopFontPulse(); // Stop font pulse when not my turn
            lastPhase = 'normal'; // Reset phase when not my turn
        }

        // Progress bar update
        if (startingSeconds > 0) {
            const percent = Math.max(0, (currentSeconds / startingSeconds) * 100);
            progressBar.style.width = percent + "%";
        }
    }

    setInterval(updateClock, 200);

    // Draggable (mouse and touch)
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function startDrag(clientX, clientY) {
        isDragging = true;
        offsetX = clientX - bigClock.offsetLeft;
        offsetY = clientY - bigClock.offsetTop;
    }

    function drag(clientX, clientY) {
        if (isDragging) {
            bigClock.style.left = (clientX - offsetX) + 'px';
            bigClock.style.top = (clientY - offsetY) + 'px';
        }
    }

    function endDrag() {
        isDragging = false;
    }

    // Mouse events
    bigClock.addEventListener('mousedown', function (e) {
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        drag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', endDrag);

    // Touch events
    bigClock.addEventListener('touchstart', function (e) {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
        e.preventDefault();
    });

    document.addEventListener('touchmove', function (e) {
        if (isDragging) {
            const touch = e.touches[0];
            drag(touch.clientX, touch.clientY);
        }
    });

    document.addEventListener('touchend', endDrag);
})();
