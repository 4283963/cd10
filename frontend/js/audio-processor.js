const TubeAmpProcessor = (function() {
    let audioContext = null;
    let sourceNode = null;
    let gainNode = null;
    let driveGainNode = null;
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
    let currentTubeParams = null;
    let onLevelUpdate = null;
    let onWaveformUpdate = null;
    let waveformData = null;
    let animationId = null;
    let warmthAmount = 0.5;
    let driveAmount = 0.4;
    let presenceAmount = 0.5;

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
        currentTubeParams = params;
    }

    function setVolume(value) {
        if (gainNode) {
            gainNode.gain.setValueAtTime(value, audioContext.currentTime);
        }
    }

    function setDrive(value) {
        driveAmount = value;
    }

    function setWarmth(value) {
        warmthAmount = value;
        if (warmFilter) {
            const freq = 200 + (1 - value) * 1800;
            warmFilter.frequency.setValueAtTime(freq, audioContext.currentTime);
        }
    }

    function setPresence(value) {
        presenceAmount = value;
        if (trebleFilter) {
            const gain = (value - 0.5) * 12;
            trebleFilter.gain.setValueAtTime(gain, audioContext.currentTime);
        }
    }

    function createAudioGraph() {
        if (!audioContext) init();

        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.6;

        driveGainNode = audioContext.createGain();
        driveGainNode.gain.value = 1.0;

        analyserL = audioContext.createAnalyser();
        analyserL.fftSize = 2048;
        analyserL.smoothingTimeConstant = 0.85;

        analyserR = audioContext.createAnalyser();
        analyserR.fftSize = 2048;
        analyserR.smoothingTimeConstant = 0.85;

        splitter = audioContext.createChannelSplitter(2);
        merger = audioContext.createChannelMerger(2);

        bassFilter = audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 200;
        bassFilter.gain.value = 0;

        trebleFilter = audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 3000;
        trebleFilter.gain.value = 0;

        warmFilter = audioContext.createBiquadFilter();
        warmFilter.type = 'lowpass';
        warmFilter.frequency.value = 12000;
        warmFilter.Q.value = 0.7;

        const bufferSize = 2048;
        tubeProcessor = audioContext.createScriptProcessor(bufferSize, 2, 2);
        tubeProcessor.onaudioprocess = processTubeAudio;
    }

    function processTubeAudio(e) {
        if (!currentTubeParams) {
            const inputL = e.inputBuffer.getChannelData(0);
            const inputR = e.inputBuffer.getChannelData(1);
            const outputL = e.outputBuffer.getChannelData(0);
            const outputR = e.outputBuffer.getChannelData(1);
            for (let i = 0; i < e.inputBuffer.length; i++) {
                outputL[i] = inputL[i];
                outputR[i] = inputR[i];
            }
            return;
        }

        const inputL = e.inputBuffer.getChannelData(0);
        const inputR = e.inputBuffer.getChannelData(1);
        const outputL = e.outputBuffer.getChannelData(0);
        const outputR = e.outputBuffer.getChannelData(1);

        const {
            gainFactor,
            secondHarmonicCoeff,
            thirdHarmonicCoeff,
            fourthHarmonicCoeff,
            softClipThreshold,
            softClipKnee,
            warmFactor
        } = currentTubeParams;

        const drive = 1 + driveAmount * 3;
        const totalGain = gainFactor * drive;
        const warmthMix = warmFactor * warmthAmount;

        for (let i = 0; i < e.inputBuffer.length; i++) {
            outputL[i] = processSample(inputL[i], totalGain, secondHarmonicCoeff, 
                thirdHarmonicCoeff, fourthHarmonicCoeff, softClipThreshold, 
                softClipKnee, warmthMix);
            outputR[i] = processSample(inputR[i], totalGain, secondHarmonicCoeff, 
                thirdHarmonicCoeff, fourthHarmonicCoeff, softClipThreshold, 
                softClipKnee, warmthMix);
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

    function play() {
        if (!audioBuffer || isPlaying) return;
        resume();

        if (!tubeProcessor) {
            createAudioGraph();
        }

        stopSource();

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;

        sourceNode.connect(bassFilter);
        bassFilter.connect(driveGainNode);
        driveGainNode.connect(tubeProcessor);
        tubeProcessor.connect(warmFilter);
        warmFilter.connect(trebleFilter);
        trebleFilter.connect(gainNode);
        gainNode.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);
        analyserL.connect(merger, 0, 0);
        analyserR.connect(merger, 0, 1);
        merger.connect(audioContext.destination);

        const offset = pauseTime || 0;
        startTime = audioContext.currentTime - offset;
        sourceNode.start(0, offset);

        isPlaying = true;
        startVisualization();

        sourceNode.onended = () => {
            if (isPlaying && !isMicActive) {
                stop();
                pauseTime = 0;
            }
        };
    }

    function pause() {
        if (!isPlaying || !sourceNode) return;
        
        pauseTime = audioContext.currentTime - startTime;
        sourceNode.stop();
        sourceNode = null;
        isPlaying = false;
        stopVisualization();
    }

    function stop() {
        stopSource();
        isPlaying = false;
        pauseTime = 0;
        stopVisualization();
    }

    function stopSource() {
        if (sourceNode) {
            try {
                sourceNode.stop();
            } catch (e) {}
            sourceNode = null;
        }
        if (micSource) {
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
    }

    async function startMicrophone() {
        if (!audioContext) init();
        resume();

        if (!tubeProcessor) {
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

            stopSource();

            micSource = audioContext.createMediaStreamSource(micStream);

            micSource.connect(bassFilter);
            bassFilter.connect(driveGainNode);
            driveGainNode.connect(tubeProcessor);
            tubeProcessor.connect(warmFilter);
            warmFilter.connect(trebleFilter);
            trebleFilter.connect(gainNode);
            gainNode.connect(splitter);
            splitter.connect(analyserL, 0);
            splitter.connect(analyserR, 1);
            analyserL.connect(merger, 0, 0);
            analyserR.connect(merger, 0, 1);
            merger.connect(audioContext.destination);

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
        stopSource();
        isPlaying = false;
        stopVisualization();
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
