const TubeAmpProcessor = (function() {
    let audioContext = null;
    let sourceNode = null;
    let gainNode = null;
    let inputGainNode = null;
    let tubeProcessor = null;
    let analyserL = null;
    let analyserR = null;
    let splitter = null;
    let merger = null;
    let bassFilter = null;
    let trebleFilter = null;
    let warmFilter = null;
    let audioBuffer = null;
    let isPlaying = false;
    let isMicActive = false;
    let micStream = null;
    let micSource = null;
    let startTime = 0;
    let pauseTime = 0;
    let onLevelUpdate = null;
    let onWaveformUpdate = null;
    let waveformData = null;
    let animationId = null;
    let audioGraphReady = false;
    let fadeTimer = null;
    let outputMixer = null;
    let vinylEnabled = false;

    const targetParams = {
        gainFactor: 1.8,
        secondHarmonicCoeff: 0.15,
        thirdHarmonicCoeff: 0.05,
        fourthHarmonicCoeff: 0.02,
        softClipThreshold: 0.75,
        softClipKnee: 0.35,
        warmFactor: 0.85,
        bassBoost: 1.15,
        trebleCut: 0.92
    };

    const currentParams = {
        gainFactor: 1.8,
        secondHarmonicCoeff: 0.15,
        thirdHarmonicCoeff: 0.05,
        fourthHarmonicCoeff: 0.02,
        softClipThreshold: 0.75,
        softClipKnee: 0.35,
        warmFactor: 0.85,
        bassBoost: 1.15,
        trebleCut: 0.92
    };

    let targetDrive = 0.4;
    let currentDrive = 0.4;
    let targetWarmth = 0.5;
    let currentWarmth = 0.5;
    let targetPresence = 0.5;
    let currentPresence = 0.5;
    let targetVolume = 0.6;
    let currentVolume = 0.6;

    const BLOCKS_PER_SECOND = 48000 / 2048;
    const SMOOTHING_TIME_CONSTANT = 0.08;
    const PARAM_SMOOTHING = 1 - Math.exp(-1 / (BLOCKS_PER_SECOND * SMOOTHING_TIME_CONSTANT));

    function init() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function resume() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function setTubeParams(params) {
        if (!params) return;

        targetParams.gainFactor = params.gainFactor || 1.0;
        targetParams.secondHarmonicCoeff = params.secondHarmonicCoeff || 0;
        targetParams.thirdHarmonicCoeff = params.thirdHarmonicCoeff || 0;
        targetParams.fourthHarmonicCoeff = params.fourthHarmonicCoeff || 0;
        targetParams.softClipThreshold = params.softClipThreshold || 0.8;
        targetParams.softClipKnee = params.softClipKnee || 0.3;
        targetParams.warmFactor = params.warmFactor || 0.5;
        targetParams.bassBoost = params.bassBoost || 1.0;
        targetParams.trebleCut = params.trebleCut || 1.0;

        if (bassFilter && audioContext) {
            const bassGainDb = 20 * Math.log10(targetParams.bassBoost);
            bassFilter.gain.setTargetAtTime(bassGainDb, audioContext.currentTime, SMOOTHING_TIME_CONSTANT);
        }
    }

    function setVolume(value) {
        targetVolume = value;
        if (gainNode && audioContext) {
            gainNode.gain.setTargetAtTime(value, audioContext.currentTime, 0.02);
        }
    }

    function setDrive(value) {
        targetDrive = value;
    }

    function setWarmth(value) {
        targetWarmth = value;
        if (warmFilter && audioContext) {
            const freq = 200 + (1 - value) * 1800;
            warmFilter.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.06);
        }
    }

    function setPresence(value) {
        targetPresence = value;
        if (trebleFilter && audioContext) {
            const gain = (value - 0.5) * 12;
            trebleFilter.gain.setTargetAtTime(gain, audioContext.currentTime, 0.06);
        }
    }

    function createAudioGraph() {
        if (audioGraphReady) return;
        if (!audioContext) init();

        inputGainNode = audioContext.createGain();
        inputGainNode.gain.value = 0;

        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = 20 * Math.log10(targetParams.bassBoost);

        const driveGainNode = audioContext.createGain();
        driveGainNode.gain.value = 1.0;

        tubeProcessor = audioContext.createScriptProcessor(2048, 2, 2);
        tubeProcessor.onaudioprocess = processTubeAudio;

        warmFilter = audioContext.createBiquadFilter();
        warmFilter.type = 'lowpass';
        warmFilter.frequency.value = 200 + (1 - targetWarmth) * 1800;
        warmFilter.Q.value = 0.7;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = 0;

        gainNode = audioContext.createGain();
        gainNode.gain.value = targetVolume;

        outputMixer = audioContext.createGain();
        outputMixer.gain.value = 1.0;

        splitter = audioContext.createChannelSplitter(2);
        merger = audioContext.createChannelMerger(2);

        analyserL = audioContext.createAnalyser();
        analyserL.fftSize = 2048;
        analyserL.smoothingTimeConstant = 0.85;

        analyserR = audioContext.createAnalyser();
        analyserR.fftSize = 2048;
        analyserR.smoothingTimeConstant = 0.85;

        inputGainNode.connect(bassFilter);
        bassFilter.connect(driveGainNode);
        driveGainNode.connect(tubeProcessor);
        tubeProcessor.connect(warmFilter);
        warmFilter.connect(trebleFilter);
        trebleFilter.connect(gainNode);
        gainNode.connect(outputMixer);
        outputMixer.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);
        analyserL.connect(merger, 0, 0);
        analyserR.connect(merger, 0, 1);
        merger.connect(audioContext.destination);

        if (typeof VinylEffect !== 'undefined') {
            VinylEffect.init(audioContext);
            VinylEffect.connect(outputMixer);
        }

        audioGraphReady = true;
    }

    function smoothParam(current, target, smoothing) {
        return current + (target - current) * smoothing;
    }

    function updateSmoothedParams() {
        const s = PARAM_SMOOTHING;
        currentParams.gainFactor = smoothParam(currentParams.gainFactor, targetParams.gainFactor, s);
        currentParams.secondHarmonicCoeff = smoothParam(currentParams.secondHarmonicCoeff, targetParams.secondHarmonicCoeff, s);
        currentParams.thirdHarmonicCoeff = smoothParam(currentParams.thirdHarmonicCoeff, targetParams.thirdHarmonicCoeff, s);
        currentParams.fourthHarmonicCoeff = smoothParam(currentParams.fourthHarmonicCoeff, targetParams.fourthHarmonicCoeff, s);
        currentParams.softClipThreshold = smoothParam(currentParams.softClipThreshold, targetParams.softClipThreshold, s);
        currentParams.softClipKnee = smoothParam(currentParams.softClipKnee, targetParams.softClipKnee, s);
        currentParams.warmFactor = smoothParam(currentParams.warmFactor, targetParams.warmFactor, s);
        currentDrive = smoothParam(currentDrive, targetDrive, s);
        currentWarmth = smoothParam(currentWarmth, targetWarmth, s);
        currentPresence = smoothParam(currentPresence, targetPresence, s);
        currentVolume = smoothParam(currentVolume, targetVolume, s * 1.5);
    }

    function processTubeAudio(e) {
        const inputL = e.inputBuffer.getChannelData(0);
        const inputR = e.inputBuffer.getChannelData(1);
        const outputL = e.outputBuffer.getChannelData(0);
        const outputR = e.outputBuffer.getChannelData(1);
        const bufferLength = e.inputBuffer.length;

        const prevGain = currentParams.gainFactor;
        const prevH2 = currentParams.secondHarmonicCoeff;
        const prevH3 = currentParams.thirdHarmonicCoeff;
        const prevH4 = currentParams.fourthHarmonicCoeff;
        const prevThreshold = currentParams.softClipThreshold;
        const prevKnee = currentParams.softClipKnee;
        const prevWarmFactor = currentParams.warmFactor;
        const prevDrive = currentDrive;
        const prevWarmth = currentWarmth;

        updateSmoothedParams();

        const gainStep = (currentParams.gainFactor - prevGain) / bufferLength;
        const h2Step = (currentParams.secondHarmonicCoeff - prevH2) / bufferLength;
        const h3Step = (currentParams.thirdHarmonicCoeff - prevH3) / bufferLength;
        const h4Step = (currentParams.fourthHarmonicCoeff - prevH4) / bufferLength;
        const thresholdStep = (currentParams.softClipThreshold - prevThreshold) / bufferLength;
        const kneeStep = (currentParams.softClipKnee - prevKnee) / bufferLength;
        const warmFactorStep = (currentParams.warmFactor - prevWarmFactor) / bufferLength;
        const driveStep = (currentDrive - prevDrive) / bufferLength;
        const warmthStep = (currentWarmth - prevWarmth) / bufferLength;

        let gain = prevGain;
        let h2 = prevH2;
        let h3 = prevH3;
        let h4 = prevH4;
        let threshold = prevThreshold;
        let knee = prevKnee;
        let warmFactor = prevWarmFactor;
        let drive = prevDrive;
        let warmth = prevWarmth;

        for (let i = 0; i < bufferLength; i++) {
            const totalGain = gain * (1 + drive * 3);
            const warmthMix = warmFactor * warmth;

            outputL[i] = processSample(inputL[i], totalGain, h2, h3, h4, threshold, knee, warmthMix);
            outputR[i] = processSample(inputR[i], totalGain, h2, h3, h4, threshold, knee, warmthMix);

            gain += gainStep;
            h2 += h2Step;
            h3 += h3Step;
            h4 += h4Step;
            threshold += thresholdStep;
            knee += kneeStep;
            warmFactor += warmFactorStep;
            drive += driveStep;
            warmth += warmthStep;
        }
    }

    function processSample(sample, gain, h2, h3, h4, threshold, knee, warmMix) {
        let x = sample * gain;

        let second = h2 * x * x;
        let third = h3 * x * x * x;
        let fourth = h4 * x * x * x * x;
        
        if (x < 0) {
            second = -second;
            fourth = -fourth;
        }

        let distorted = x + second + third + fourth;

        distorted = softClip(distorted, threshold, knee);

        let clean = sample * 0.3;
        let mixed = clean * (1 - warmMix) + distorted * warmMix;

        return Math.max(-1, Math.min(1, mixed));
    }

    function softClip(x, threshold, knee) {
        const absX = Math.abs(x);
        const sign = x >= 0 ? 1 : -1;

        if (absX <= threshold - knee / 2) {
            return x;
        } else if (absX >= threshold + knee / 2) {
            return sign * (threshold + knee / 2 + (1 - threshold - knee / 2) * 
                Math.tanh((absX - threshold - knee / 2) / (1 - threshold - knee / 2)));
        } else {
            const t = (absX - threshold + knee / 2) / knee;
            const smoothed = threshold - knee / 2 + knee * (3 * t * t - 2 * t * t * t);
            return sign * smoothed;
        }
    }

    async function loadAudioFile(file) {
        if (!audioContext) init();
        resume();

        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        waveformData = new Float32Array(audioBuffer.getChannelData(0).length);
        waveformData.set(audioBuffer.getChannelData(0));

        return audioBuffer;
    }

    function connectSource(source) {
        if (!audioGraphReady) {
            createAudioGraph();
        }
        source.connect(inputGainNode);
    }

    function disconnectSource(source) {
        try {
            source.disconnect(inputGainNode);
        } catch (e) {}
    }

    function fadeIn(duration = 0.05) {
        if (!inputGainNode || !audioContext) return;
        const now = audioContext.currentTime;
        inputGainNode.gain.cancelScheduledValues(now);
        inputGainNode.gain.setValueAtTime(inputGainNode.gain.value, now);
        inputGainNode.gain.linearRampToValueAtTime(1.0, now + duration);
    }

    function fadeOut(duration = 0.05) {
        if (!inputGainNode || !audioContext) return Promise.resolve();
        return new Promise((resolve) => {
            const now = audioContext.currentTime;
            inputGainNode.gain.cancelScheduledValues(now);
            inputGainNode.gain.setValueAtTime(inputGainNode.gain.value, now);
            inputGainNode.gain.linearRampToValueAtTime(0, now + duration);
            setTimeout(resolve, duration * 1000 + 10);
        });
    }

    function play() {
        if (!audioBuffer || isPlaying) return;
        resume();

        if (!audioGraphReady) {
            createAudioGraph();
        }

        stopSourceOnly().then(() => {
            sourceNode = audioContext.createBufferSource();
            sourceNode.buffer = audioBuffer;

            connectSource(sourceNode);

            const offset = pauseTime || 0;
            startTime = audioContext.currentTime - offset;
            sourceNode.start(0, offset);
            fadeIn(0.05);

            isPlaying = true;
            startVisualization();

            sourceNode.onended = () => {
                if (isPlaying && !isMicActive) {
                    stop();
                    pauseTime = 0;
                }
            };
        });
    }

    function pause() {
        if (!isPlaying || !sourceNode) return;
        
        fadeOut(0.03).then(() => {
            pauseTime = audioContext.currentTime - startTime;
            try {
                sourceNode.stop();
            } catch (e) {}
            sourceNode = null;
            isPlaying = false;
            stopVisualization();
        });
    }

    function stop() {
        fadeOut(0.05).then(() => {
            stopSourceOnly();
            isPlaying = false;
            pauseTime = 0;
            stopVisualization();
        });
    }

    function stopSourceOnly() {
        return fadeOut(0.02).then(() => {
            if (sourceNode) {
                try {
                    disconnectSource(sourceNode);
                } catch (e) {}
                try {
                    sourceNode.stop();
                } catch (e) {}
                sourceNode = null;
            }
            if (micSource) {
                try {
                    disconnectSource(micSource);
                } catch (e) {}
                try {
                    micSource.disconnect();
                } catch (e) {}
                micSource = null;
            }
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
                micStream = null;
            }
            isMicActive = false;
        });
    }

    async function startMicrophone() {
        if (!audioContext) init();
        resume();

        if (!audioGraphReady) {
            createAudioGraph();
        }

        try {
            micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            await stopSourceOnly();

            micSource = audioContext.createMediaStreamSource(micStream);
            connectSource(micSource);
            fadeIn(0.1);

            isMicActive = true;
            isPlaying = true;
            startVisualization();

            return true;
        } catch (err) {
            console.error('Microphone access error:', err);
            return false;
        }
    }

    function stopMicrophone() {
        stopSourceOnly().then(() => {
            isPlaying = false;
            stopVisualization();
        });
    }

    function startVisualization() {
        if (animationId) cancelAnimationFrame(animationId);
        animate();
    }

    function stopVisualization() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (onLevelUpdate) {
            onLevelUpdate(0, 0);
        }
    }

    function animate() {
        if (!analyserL || !analyserR) return;

        const dataArrayL = new Uint8Array(analyserL.frequencyBinCount);
        const dataArrayR = new Uint8Array(analyserR.frequencyBinCount);

        analyserL.getByteTimeDomainData(dataArrayL);
        analyserR.getByteTimeDomainData(dataArrayR);

        const levelL = calculateLevel(dataArrayL);
        const levelR = calculateLevel(dataArrayR);

        if (onLevelUpdate) {
            onLevelUpdate(levelL, levelR);
        }

        if (onWaveformUpdate && analyserL) {
            const waveData = new Float32Array(analyserL.fftSize);
            analyserL.getFloatTimeDomainData(waveData);
            onWaveformUpdate(waveData);
        }

        animationId = requestAnimationFrame(animate);
    }

    function calculateLevel(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        return rms;
    }

    function getCurrentTime() {
        if (!isPlaying || !audioContext) return pauseTime || 0;
        return audioContext.currentTime - startTime;
    }

    function getDuration() {
        return audioBuffer ? audioBuffer.duration : 0;
    }

    function getWaveformData() {
        return waveformData;
    }

    function setLevelCallback(callback) {
        onLevelUpdate = callback;
    }

    function setWaveformCallback(callback) {
        onWaveformUpdate = callback;
    }

    function isAudioPlaying() {
        return isPlaying;
    }

    function isMicrophoneActive() {
        return isMicActive;
    }

    function getAudioContext() {
        return audioContext;
    }

    function enableVinyl() {
        vinylEnabled = true;
        if (typeof VinylEffect !== 'undefined' && audioContext) {
            if (!audioGraphReady) {
                createAudioGraph();
            }
            VinylEffect.enable();
        }
    }

    function disableVinyl() {
        vinylEnabled = false;
        if (typeof VinylEffect !== 'undefined') {
            VinylEffect.disable();
        }
    }

    function toggleVinyl() {
        if (vinylEnabled) {
            disableVinyl();
        } else {
            enableVinyl();
        }
        return vinylEnabled;
    }

    function isVinylEnabled() {
        return vinylEnabled;
    }

    function setVinylIntensity(value) {
        if (typeof VinylEffect !== 'undefined') {
            VinylEffect.setIntensity(value);
        }
    }

    return {
        init,
        resume,
        loadAudioFile,
        play,
        pause,
        stop,
        startMicrophone,
        stopMicrophone,
        setTubeParams,
        setVolume,
        setDrive,
        setWarmth,
        setPresence,
        enableVinyl,
        disableVinyl,
        toggleVinyl,
        isVinylEnabled,
        setVinylIntensity,
        getCurrentTime,
        getDuration,
        getWaveformData,
        setLevelCallback,
        setWaveformCallback,
        isAudioPlaying,
        isMicrophoneActive,
        getAudioContext
    };
})();
