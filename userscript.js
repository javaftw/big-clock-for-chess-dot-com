// ==UserScript==
// @name         Big Floating Chess Timer
// @namespace    http://tampermonkey.net/
// @version      0.15
// @description  Positionable clock with progress bar, instant movement, turn-based border pulse, dynamic visual alerts, and double beep for final seconds
// @author       javaftw
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

    // Extra text lines container
    const infoContainer = document.createElement("div");
    infoContainer.style.marginTop = "5px";
    infoContainer.style.fontSize = "14px";
    infoContainer.style.lineHeight = "1.2em";
    infoContainer.style.textAlign = "center";

    const line1 = document.createElement("div");
    const line2 = document.createElement("div");

    const words1 = ["CHECKS", "CAPTURES", "THREATS"];
    const words2 = ["DEFENSES", "IMPROVEMENTS"];

    line1.innerHTML = words1.map(w => `<span style="opacity:0.15; color:white; margin:0 4px;">${w}</span>`).join("|");
    line2.innerHTML = words2.map(w => `<span style="opacity:0.15; color:white; margin:0 4px;">${w}</span>`).join("|");

    infoContainer.appendChild(line1);
    infoContainer.appendChild(line2);
    bigClock.appendChild(infoContainer);

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
    progressBar.style.backgroundColor = "#4caf50";
    progressBar.style.borderRadius = "5px";
    progressBar.style.width = "100%";
    progressBar.style.transition = "none";
    barContainer.appendChild(progressBar);

    // Styles for animations
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
            10% { transform: scale(1.15); }
            90% { transform: scale(1.15); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(bigClock);

    // Variables
    let startingSeconds = null;
    let fontPulseInterval = null;
    let lastPhase = 'normal';
    let hasPlayedWarningBeep = false;
    let cycleIndex = 0;
    let cycleInterval = null;
    let myTurnClock = null;
    let myClockElem = null;
    let cachedElements = false;
    let doubleBeepInterval = null;
    let hasPlayedTimeUpTune = false;

    // Position persistence functions
    function savePosition() {
        try {
            localStorage.setItem('bigChessClock_position', JSON.stringify({
                left: bigClock.style.left,
                top: bigClock.style.top
            }));
        } catch (e) {
            console.log('Could not save position:', e);
        }
    }

    function loadPosition() {
        try {
            const saved = localStorage.getItem('bigChessClock_position');
            if (saved) {
                const position = JSON.parse(saved);
                if (position.left && position.top) {
                    bigClock.style.left = position.left;
                    bigClock.style.top = position.top;
                }
            }
        } catch (e) {
            console.log('Could not load saved position:', e);
        }
    }

    // DOM caching functions
    function cacheElements() {
        myTurnClock = document.querySelector('.clock-bottom.clock-player-turn .clock-time-monospace');
        myClockElem = document.querySelector('.clock-bottom .clock-time-monospace');
        cachedElements = true;
    }

    function refreshCache() {
        cachedElements = false;
    }

    function getCycleInterval() {
        if (startingSeconds <= 180) {
            return 1000;
        } else {
            return 2000;
        }
    }

    function startWordCycle() {
        if (cycleInterval) return;
        const spans1 = line1.querySelectorAll("span");
        const spans2 = line2.querySelectorAll("span");
        const allSpans = [...spans1, ...spans2];
        const intervalTime = getCycleInterval();
        cycleInterval = setInterval(() => {
            allSpans.forEach(s => s.style.opacity = "0.15");
            const target = allSpans[cycleIndex % allSpans.length];
            target.style.transition = "opacity 0.3s";
            target.style.opacity = "1";
            cycleIndex++;
        }, intervalTime);
    }

    function stopWordCycle(isMyTurn) {
        if (cycleInterval) {
            clearInterval(cycleInterval);
            cycleInterval = null;
        }
        const spans1 = line1.querySelectorAll("span");
        const spans2 = line2.querySelectorAll("span");
        [...spans1, ...spans2].forEach(s => {
            s.style.transition = "opacity 0.3s";
            s.style.opacity = isMyTurn ? "0.15" : "0.3";
        });
    }

    function parseTimeString(str) {
        if (!str.includes(':')) return null;
        const [minStr, secStr] = str.split(':');
        const min = parseInt(minStr);
        const sec = parseFloat(secStr);
        return min * 60 + Math.floor(sec);
    }

    function playNote(pitch, duration) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = pitch;
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            gainNode.gain.value = 0;
            const fadeTime = Math.min(duration * 0.1, 0.1);
            const currentTime = audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0.3, currentTime + fadeTime);
            gainNode.gain.linearRampToValueAtTime(0, currentTime + duration - fadeTime);
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            oscillator.onended = () => {
                gainNode.disconnect();
                oscillator.disconnect();
                if (audioContext.state !== 'closed') {
                    audioContext.close().catch(e => console.error('Error closing audio context:', e));
                }
            };
        } catch (e) {
            console.log('Audio error:', e);
        }
    }

    function playDoubleBeep() {
        playNote(1000, 0.1);
        setTimeout(() => playNote(1000, 0.1), 200);
    }

    function playTimeUpTune() {
        const notes = [
            { freq: 523, duration: 0.2 }, // C5
            { freq: 659, duration: 0.2 }, // E5
            { freq: 784, duration: 0.2 }, // G5
            { freq: 1047, duration: 0.4 }, // C6
            { freq: 784, duration: 0.2 }, // G5
            { freq: 1047, duration: 0.6 }  // C6 (longer)
        ];
        
        let delay = 0;
        notes.forEach(note => {
            setTimeout(() => playNote(note.freq, note.duration), delay * 1000);
            delay += note.duration;
        });
    }

    function startDoubleBeep() {
        if (doubleBeepInterval) return;
        playDoubleBeep();
        doubleBeepInterval = setInterval(() => {
            // Check if time is up before playing beep
            const currentTimeStr = myClockElem ? myClockElem.textContent.trim() : "";
            const isTimeUp = currentTimeStr === "0:00" || (currentTimeStr.includes(':') && parseFloat(currentTimeStr.split(':')[1]) <= 0.1);
            if (!isTimeUp) {
                playDoubleBeep();
            }
        }, 1000);
    }

    function stopDoubleBeep() {
        if (doubleBeepInterval) {
            clearInterval(doubleBeepInterval);
            doubleBeepInterval = null;
        }
    }

    function startFontPulse() {
        if (fontPulseInterval) return;
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
        if (!cachedElements || !myClockElem) {
            cacheElements();
        }

        if (!myClockElem || !myClockElem.textContent) {
            refreshCache();
            return;
        }

        // Always re-query turn indicator since it appears/disappears
        myTurnClock = document.querySelector('.clock-bottom.clock-player-turn .clock-time-monospace');
        const isMyTurn = !!myTurnClock;
        const timeStr = myClockElem.textContent.trim();
        const currentSeconds = parseTimeString(timeStr);
        if (currentSeconds == null) return;

        if (startingSeconds == null || currentSeconds > startingSeconds) {
            startingSeconds = currentSeconds;
            hasPlayedWarningBeep = false;
            hasPlayedTimeUpTune = false;
        }

        // Check if time has reached zero - detect 0.1s or less as "zero"
        const isTimeUp = timeStr === "0:00" || (timeStr.includes(':') && parseFloat(timeStr.split(':')[1]) <= 0.1);
        if (isMyTurn && isTimeUp && !hasPlayedTimeUpTune) {
            stopDoubleBeep();
            stopFontPulse();
            playTimeUpTune();
            hasPlayedTimeUpTune = true;
        }

        // Skip normal phase logic if time is at zero
        if (isTimeUp) {
            timeText.textContent = "0:00"; // Display as 0:00 when time is up
            return;
        }

        const elapsed = startingSeconds - currentSeconds;
        
        // Adjust display time by subtracting 0.1s to stay in sync with chess.com
        let displayTime = timeStr;
        if (timeStr.includes('.')) {
            const [minStr, secStr] = timeStr.split(':');
            const totalSeconds = parseInt(minStr) * 60 + parseFloat(secStr);
            const adjustedSeconds = Math.max(0, totalSeconds - 0.1);
            const adjustedMin = Math.floor(adjustedSeconds / 60);
            const adjustedSec = adjustedSeconds % 60;
            
            if (adjustedSeconds < 10) {
                displayTime = `${adjustedMin}:${adjustedSec.toFixed(1).padStart(4, '0')}`;
            } else {
                displayTime = `${adjustedMin}:${Math.floor(adjustedSec).toString().padStart(2, '0')}`;
            }
        }
        
        timeText.textContent = displayTime;

        bigClock.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        progressBar.style.backgroundColor = "#4caf50";
        bigClock.style.animation = "none";
        bigClock.style.boxShadow = "0 0 10px rgba(0,0,0,0.7)";
        timeText.style.color = isMyTurn ? "white" : "#555";

        // Determine if we're in the final seconds phase
        const finalSecondsThreshold = startingSeconds <= 180 ? 10 : 30;
        const inFinalSeconds = isMyTurn && currentSeconds <= finalSecondsThreshold;

        if (!isMyTurn) {
            stopDoubleBeep();
        }

        if (isMyTurn) {
            startWordCycle();
            let borderColor = "limegreen";
            let currentPhase = 'normal';

            if (elapsed >= startingSeconds * (2 / 3) && elapsed < startingSeconds * (5 / 6)) {
                borderColor = "#ff9800";
                timeText.style.color = "#ff9800";
                progressBar.style.backgroundColor = "#ff9800";
                stopFontPulse();
                stopDoubleBeep();
                currentPhase = 'warning';
                if (!hasPlayedWarningBeep) {
                    playNote(800, 0.2);
                    hasPlayedWarningBeep = true;
                }
            } else if (elapsed >= startingSeconds * (5 / 6)) {
                borderColor = "red";
                timeText.style.color = "white";
                progressBar.style.backgroundColor = "red";
                bigClock.style.animation = "pulseRedBG 0.5s infinite";
                currentPhase = 'critical';
                
                if (inFinalSeconds) {
                    startFontPulse();
                    startDoubleBeep();
                } else {
                    startFontPulse();
                    stopDoubleBeep();
                    if (lastPhase !== 'critical') {
                        playNote(1200, 0.1);
                    }
                }
            } else {
                stopFontPulse();
                stopDoubleBeep();
                hasPlayedWarningBeep = false;
            }

            lastPhase = currentPhase;
            bigClock.style.setProperty('--pulse-color', borderColor);
            bigClock.style.animation = `pulseBorder 0.5s infinite`;
        } else {
            stopWordCycle(false);
            stopFontPulse();
            stopDoubleBeep();
            lastPhase = 'normal';
        }

        if (startingSeconds > 0) {
            const percent = Math.max(0, (currentSeconds / startingSeconds) * 100);
            progressBar.style.width = percent + "%";
        }
    }

    // Start the clock updates
    setInterval(updateClock, 500);

    // Load saved position
    loadPosition();

    // Dragging functionality
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
        if (isDragging) {
            savePosition();
        }
        isDragging = false;
    }

    // Mouse events
    bigClock.addEventListener('mousedown', e => {
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => drag(e.clientX, e.clientY));
    document.addEventListener('mouseup', endDrag);

    // Touch events
    bigClock.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
        e.preventDefault();
    });
    document.addEventListener('touchmove', e => {
        if (isDragging) {
            const touch = e.touches[0];
            drag(touch.clientX, touch.clientY);
        }
    });
    document.addEventListener('touchend', endDrag);

})();
