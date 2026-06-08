const VinylEffect = (function() {
    let audioContext = null;
    let outputGain = null;
    let crackleGain = null;
    let scratchGain = null;
    let crackleBuffer = null;
    let crackleSource = null;
    let isEnabled = false;
    let nextScratchTime = 0;
    let scratchTimer = null;
    let scratchGainNode = null;
    let crackleGainNode = null;
    let masterGain = null;
    let isInitialized = false;

    const CRACKLE_DURATION = 2;
    const SCRATCH_MIN_INTERVAL = 8;
    const SCRATCH_MAX_INTERVAL = 20;
    const SCRATCH_DURATION_MIN = 0.3;
    const SCRATCH_DURATION_MAX = 1.2;

    function init(ctx) {
        if (isInitialized) return;
        audioContext = ctx;

        masterGain = audioContext.createGain();
        masterGain.gain.value = 0;

        crackleGainNode = audioContext.createGain();
        crackleGainNode.gain.value = 0.15;

        scratchGainNode = audioContext.createGain();
        scratchGainNode.gain.value = 0;

        crackleGainNode.connect(masterGain);
        scratchGainNode.connect(masterGain);

        generateCrackleBuffer();
        startCrackleLoop();

        isInitialized = true;
    }

    function generateCrackleBuffer() {
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * CRACKLE_DURATION;
        crackleBuffer = audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = crackleBuffer.getChannelData(channel);
            let popDecay = 0;

            for (let i = 0; i < length; i++) {
                let sample = 0;

                if (Math.random() < 0.0008) {
                    popDecay = 0.5 + Math.random() * 0.5;
                }

                if (popDecay > 0) {
                    const pop = (Math.random() * 2 - 1) * popDecay * 0.8;
                    sample += pop;
                    popDecay *= 0.75;
                }

                if (Math.random() < 0.003) {
                    const tick = (Math.random() * 2 - 1) * 0.1;
                    sample += tick;
                }

                const hiss = (Math.random() * 2 - 1) * 0.008;
                sample += hiss;

                sample *= 0.6;

                data[i] = Math.max(-1, Math.min(1, sample));
            }
        }
    }

    function startCrackleLoop() {
        if (!crackleBuffer) return;

        crackleSource = audioContext.createBufferSource();
        crackleSource.buffer = crackleBuffer;
        crackleSource.loop = true;
        crackleSource.connect(crackleGainNode);
        crackleSource.start();
    }

    function scheduleNextScratch() {
        if (!isEnabled || !isInitialized) return;

        const interval = SCRATCH_MIN_INTERVAL + Math.random() * (SCRATCH_MAX_INTERVAL - SCRATCH_MIN_INTERVAL);
        scratchTimer = setTimeout(() => {
            triggerScratch();
            scheduleNextScratch();
        }, interval * 1000);
    }

    function triggerScratch() {
        if (!isEnabled || !isInitialized) return;

        const duration = SCRATCH_DURATION_MIN + Math.random() * (SCRATCH_DURATION_MAX - SCRATCH_DURATION_MIN);
        const sampleRate = audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);

        const scratchBuffer = audioContext.createBuffer(2, length, sampleRate);

        const type = Math.floor(Math.random() * 3);

        for (let channel = 0; channel < 2; channel++) {
            const data = scratchBuffer.getChannelData(channel);

            if (type === 0) {
                generateSoftScratch(data, length);
            } else if (type === 1) {
                generateLoudPop(data, length);
            } else {
                generateDustScratch(data, length);
            }

            applyFadeInOut(data, length, sampleRate);
        }

        const scratchSource = audioContext.createBufferSource();
        scratchSource.buffer = scratchBuffer;

        const volume = 0.08 + Math.random() * 0.12;
        const now = audioContext.currentTime;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        const attack = 0.02 + Math.random() * 0.05;
        const release = duration * 0.4;

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + attack);
        gainNode.gain.setValueAtTime(volume, now + duration - release);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        scratchSource.connect(gainNode);
        gainNode.connect(scratchGainNode);

        scratchSource.start(now);
        scratchSource.stop(now + duration + 0.05);

        scratchSource.onended = () => {
            gainNode.disconnect();
        };
    }

    function generateSoftScratch(data, length) {
        let phase = 0;
        let noise = 0;

        for (let i = 0; i < length; i++) {
            const progress = i / length;

            noise = noise * 0.95 + (Math.random() * 2 - 1) * 0.05;

            const freqMod = 1000 + Math.sin(phase) * 500 + progress * 2000;
            phase += freqMod / audioContext.sampleRate * Math.PI * 2;

            const roughNoise = (Math.random() * 2 - 1) * 0.3;

            const envelope = Math.sin(progress * Math.PI);

            data[i] = (noise * 0.7 + roughNoise * 0.3) * envelope * 0.5;
        }
    }

    function generateLoudPop(data, length) {
        const popCenter = length * (0.3 + Math.random() * 0.4);
        let decay = 0;

        for (let i = 0; i < length; i++) {
            let sample = 0;

            if (i === Math.floor(popCenter)) {
                decay = 1.0;
            }

            if (decay > 0) {
                sample = (Math.random() * 2 - 1) * decay * 0.9;
                decay *= 0.85;
            }

            const hiss = (Math.random() * 2 - 1) * 0.05;
            sample += hiss;

            const progress = i / length;
            const envelope = Math.sin(progress * Math.PI);
            data[i] = sample * envelope;
        }
    }

    function generateDustScratch(data, length) {
        let grainPhase = 0;
        const grainRate = 80 + Math.random() * 60;

        for (let i = 0; i < length; i++) {
            grainPhase += grainRate / audioContext.sampleRate;

            if (grainPhase >= 1) {
                grainPhase -= 1;
            }

            const grainEnv = Math.sin(grainPhase * Math.PI);
            const grainNoise = (Math.random() * 2 - 1) * grainEnv * 0.4;

            const surfaceNoise = (Math.random() * 2 - 1) * 0.08;

            const progress = i / length;
            const envelope = Math.sin(progress * Math.PI);

            data[i] = (grainNoise * 0.6 + surfaceNoise * 0.4) * envelope;
        }
    }

    function applyFadeInOut(data, length, sampleRate) {
        const fadeSamples = Math.floor(sampleRate * 0.02);

        for (let i = 0; i < fadeSamples && i < length; i++) {
            data[i] *= i / fadeSamples;
        }

        for (let i = 0; i < fadeSamples && i < length; i++) {
            const idx = length - 1 - i;
            data[idx] *= i / fadeSamples;
        }
    }

    function enable() {
        if (!isInitialized || !audioContext) return;
        if (isEnabled) return;

        isEnabled = true;

        const now = audioContext.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(1.0, now + 0.5);

        scheduleNextScratch();
    }

    function disable() {
        isEnabled = false;

        if (scratchTimer) {
            clearTimeout(scratchTimer);
            scratchTimer = null;
        }

        if (masterGain && audioContext) {
            const now = audioContext.currentTime;
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
        }
    }

    function setIntensity(value) {
        if (!crackleGainNode || !scratchGainNode || !audioContext) return;

        const crackleVol = 0.05 + value * 0.25;
        const scratchVol = value;

        const now = audioContext.currentTime;
        crackleGainNode.gain.setTargetAtTime(crackleVol, now, 0.1);
    }

    function connect(destination) {
        if (masterGain && destination) {
            masterGain.connect(destination);
        }
    }

    function disconnect() {
        if (masterGain) {
            try {
                masterGain.disconnect();
            } catch (e) {}
        }
    }

    function getOutputNode() {
        return masterGain;
    }

    function toggle() {
        if (isEnabled) {
            disable();
        } else {
            enable();
        }
        return isEnabled;
    }

    function getEnabled() {
        return isEnabled;
    }

    return {
        init,
        enable,
        disable,
        toggle,
        setIntensity,
        connect,
        disconnect,
        getOutputNode,
        getEnabled
    };
})();
