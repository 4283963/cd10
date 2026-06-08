const VisualEffects = (function() {
    let vuNeedleL = null;
    let vuNeedleR = null;
    let powerLed = null;
    let waveformCanvas = null;
    let waveformCtx = null;
    let tubes = [];
    let filaments = [];
    let tubeGlasses = [];
    let currentLevelL = 0;
    let currentLevelR = 0;
    let targetLevelL = 0;
    let targetLevelR = 0;
    let isPoweredOn = false;
    let animationFrameId = null;
    let waveformAnimationId = null;

    function init() {
        vuNeedleL = document.getElementById('vuNeedleL');
        vuNeedleR = document.getElementById('vuNeedleR');
        powerLed = document.getElementById('powerLed');
        waveformCanvas = document.getElementById('waveformCanvas');
        
        if (waveformCanvas) {
            waveformCtx = waveformCanvas.getContext('2d');
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        }

        tubes = document.querySelectorAll('.tube');
        filaments = document.querySelectorAll('.tube-filament');
        tubeGlasses = document.querySelectorAll('.tube-glass');

        startVUMeterAnimation();
    }

    function resizeCanvas() {
        if (!waveformCanvas) return;
        const rect = waveformCanvas.getBoundingClientRect();
        waveformCanvas.width = rect.width * window.devicePixelRatio;
        waveformCanvas.height = rect.height * window.devicePixelRatio;
        waveformCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function powerOn() {
        isPoweredOn = true;
        if (powerLed) {
            powerLed.classList.add('on');
        }
        tubes.forEach((tube, index) => {
            setTimeout(() => {
                tube.style.opacity = '1';
            }, index * 200);
        });
    }

    function powerOff() {
        isPoweredOn = false;
        if (powerLed) {
            powerLed.classList.remove('on');
        }
        targetLevelL = 0;
        targetLevelR = 0;
    }

    function updateLevels(levelL, levelR) {
        targetLevelL = levelL;
        targetLevelR = levelR;
    }

    function startVUMeterAnimation() {
        function animate() {
            currentLevelL += (targetLevelL - currentLevelL) * 0.15;
            currentLevelR += (targetLevelR - currentLevelR) * 0.15;

            if (vuNeedleL) {
                const angleL = levelToAngle(currentLevelL);
                vuNeedleL.style.transform = `translateX(-50%) rotate(${angleL}deg)`;
            }
            if (vuNeedleR) {
                const angleR = levelToAngle(currentLevelR);
                vuNeedleR.style.transform = `translateX(-50%) rotate(${angleR}deg)`;
            }

            updateTubeGlow();

            animationFrameId = requestAnimationFrame(animate);
        }
        animate();
    }

    function levelToAngle(level) {
        const db = 20 * Math.log10(level + 0.0001);
        const minDb = -20;
        const maxDb = 3;
        const minAngle = -45;
        const maxAngle = 45;
        
        const normalized = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
        return minAngle + normalized * (maxAngle - minAngle);
    }

    function updateTubeGlow() {
        const avgLevel = (currentLevelL + currentLevelR) / 2;
        const glowIntensity = 0.3 + avgLevel * 2.5;
        const filamentIntensity = 0.6 + avgLevel * 1.5;

        tubeGlasses.forEach((glass, index) => {
            const phase = Math.sin(Date.now() / 500 + index * 2) * 0.1 + 1;
            const intensity = glowIntensity * phase;
            
            glass.style.boxShadow = `
                inset 0 0 30px rgba(255, 180, 80, ${0.2 + intensity * 0.2}),
                0 0 ${30 + intensity * 30}px rgba(255, 150, 50, ${0.3 + intensity * 0.3})
            `;
        });

        filaments.forEach((filament, index) => {
            const flicker = Math.sin(Date.now() / (150 + index * 30)) * 0.2 + 1;
            const intensity = filamentIntensity * flicker;
            
            filament.style.opacity = Math.min(1, 0.5 + intensity * 0.4);
            filament.style.transform = `translateX(-50%) scale(${1 + intensity * 0.2})`;
            filament.style.background = `
                radial-gradient(ellipse at center, 
                    rgba(255, ${180 + intensity * 50}, ${80 + intensity * 40}, ${0.6 + intensity * 0.3}) 0%,
                    rgba(255, 120, 30, ${0.3 + intensity * 0.2}) 40%,
                    transparent 70%)
            `;
        });
    }

    function drawWaveform(waveData) {
        if (!waveformCtx || !waveformCanvas) return;

        const rect = waveformCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        waveformCtx.clearRect(0, 0, width, height);

        const gradient = waveformCtx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 30, 30, 0.9)');
        gradient.addColorStop(0.5, 'rgba(10, 10, 10, 0.95)');
        gradient.addColorStop(1, 'rgba(30, 30, 30, 0.9)');
        waveformCtx.fillStyle = gradient;
        waveformCtx.fillRect(0, 0, width, height);

        waveformCtx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
        waveformCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = height * (i / 4);
            waveformCtx.beginPath();
            waveformCtx.moveTo(0, y);
            waveformCtx.lineTo(width, y);
            waveformCtx.stroke();
        }

        waveformCtx.beginPath();
        waveformCtx.moveTo(0, height / 2);
        waveformCtx.lineTo(width, height / 2);
        waveformCtx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
        waveformCtx.stroke();

        if (!waveData || waveData.length === 0) return;

        const sliceWidth = width / waveData.length;
        let x = 0;

        waveformCtx.beginPath();
        waveformCtx.lineWidth = 2;
        waveformCtx.strokeStyle = '#d4af37';
        waveformCtx.shadowColor = 'rgba(212, 175, 55, 0.5)';
        waveformCtx.shadowBlur = 5;

        for (let i = 0; i < waveData.length; i++) {
            const v = waveData[i];
            const y = (1 + v) * height / 2;

            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        waveformCtx.stroke();
        waveformCtx.shadowBlur = 0;

        waveformCtx.globalCompositeOperation = 'source-over';
    }

    function drawStaticWaveform(audioData) {
        if (!waveformCtx || !waveformCanvas || !audioData) return;

        const rect = waveformCanvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        waveformCtx.clearRect(0, 0, width, height);

        const gradient = waveformCtx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(30, 30, 30, 0.9)');
        gradient.addColorStop(0.5, 'rgba(10, 10, 10, 0.95)');
        gradient.addColorStop(1, 'rgba(30, 30, 30, 0.9)');
        waveformCtx.fillStyle = gradient;
        waveformCtx.fillRect(0, 0, width, height);

        waveformCtx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
        waveformCtx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = height * (i / 4);
            waveformCtx.beginPath();
            waveformCtx.moveTo(0, y);
            waveformCtx.lineTo(width, y);
            waveformCtx.stroke();
        }

        waveformCtx.beginPath();
        waveformCtx.moveTo(0, height / 2);
        waveformCtx.lineTo(width, height / 2);
        waveformCtx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
        waveformCtx.stroke();

        const samples = 1000;
        const blockSize = Math.floor(audioData.length / samples);
        
        waveformCtx.beginPath();
        waveformCtx.lineWidth = 1.5;
        waveformCtx.strokeStyle = 'rgba(100, 100, 100, 0.6)';

        for (let i = 0; i < samples; i++) {
            const blockStart = i * blockSize;
            let min = 1;
            let max = -1;
            
            for (let j = 0; j < blockSize; j++) {
                const sample = audioData[blockStart + j];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }

            const x = (i / samples) * width;
            const yMin = (1 + min) * height / 2;
            const yMax = (1 + max) * height / 2;

            waveformCtx.moveTo(x, yMin);
            waveformCtx.lineTo(x, yMax);
        }

        waveformCtx.stroke();
    }

    function destroy() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        if (waveformAnimationId) {
            cancelAnimationFrame(waveformAnimationId);
        }
    }

    return {
        init,
        powerOn,
        powerOff,
        updateLevels,
        drawWaveform,
        drawStaticWaveform,
        destroy
    };
})();
