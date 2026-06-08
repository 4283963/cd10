(function() {
    let currentTubeParams = null;
    let currentTubeModel = '300B';
    let timeUpdateInterval = null;

    function init() {
        VisualEffects.init();
        setupEventListeners();
        loadTubeParams(currentTubeModel);
        updateTubeInfo();
    }

    function setupEventListeners() {
        const audioFile = document.getElementById('audioFile');
        const uploadBtn = document.querySelector('.upload-btn');
        const micBtn = document.getElementById('micBtn');
        const playBtn = document.getElementById('playBtn');
        const stopBtn = document.getElementById('stopBtn');
        const tubeSelect = document.getElementById('tubeSelect');
        const volumeSlider = document.getElementById('volumeSlider');
        const driveSlider = document.getElementById('driveSlider');
        const warmthSlider = document.getElementById('warmthSlider');
        const presenceSlider = document.getElementById('presenceSlider');
        const vinylSwitch = document.getElementById('vinylSwitch');

        audioFile.addEventListener('change', handleFileSelect);
        
        micBtn.addEventListener('click', toggleMicrophone);
        
        playBtn.addEventListener('click', togglePlay);
        
        stopBtn.addEventListener('click', handleStop);
        
        tubeSelect.addEventListener('change', handleTubeChange);
        
        vinylSwitch.addEventListener('change', handleVinylToggle);
        
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            TubeAmpProcessor.setVolume(value);
            updateKnobRotation('volumeKnob', e.target.value);
        });
        
        driveSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            TubeAmpProcessor.setDrive(value);
            updateKnobRotation('driveKnob', e.target.value);
        });
        
        warmthSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            TubeAmpProcessor.setWarmth(value);
            updateKnobRotation('warmthKnob', e.target.value);
        });
        
        presenceSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            TubeAmpProcessor.setPresence(value);
            updateKnobRotation('presenceKnob', e.target.value);
        });

        TubeAmpProcessor.setLevelCallback((levelL, levelR) => {
            VisualEffects.updateLevels(levelL, levelR);
        });

        TubeAmpProcessor.setWaveformCallback((waveData) => {
            VisualEffects.drawWaveform(waveData);
        });

        updateKnobRotation('volumeKnob', volumeSlider.value);
        updateKnobRotation('driveKnob', driveSlider.value);
        updateKnobRotation('warmthKnob', warmthSlider.value);
        updateKnobRotation('presenceKnob', presenceSlider.value);
    }

    function updateKnobRotation(knobId, value) {
        const knob = document.getElementById(knobId);
        if (knob) {
            const rotation = -135 + (value / 100) * 270;
            knob.style.transform = `rotate(${rotation}deg)`;
        }
    }

    async function loadTubeParams(modelName) {
        try {
            const params = await TubeAmpApi.getTubeModelByName(modelName);
            if (params) {
                currentTubeParams = params;
                TubeAmpProcessor.setTubeParams(params);
            }
        } catch (error) {
            console.error('Failed to load tube params:', error);
        }
    }

    function handleTubeChange(e) {
        currentTubeModel = e.target.value;
        loadTubeParams(currentTubeModel);
        updateTubeInfo();
    }

    function handleVinylToggle(e) {
        const isOn = e.target.checked;
        if (isOn) {
            TubeAmpProcessor.enableVinyl();
        } else {
            TubeAmpProcessor.disableVinyl();
        }
    }

    function updateTubeInfo() {
        const modelNameEl = document.querySelector('.tube-model-name');
        const typeBadgeEl = document.querySelector('.tube-type-badge');
        
        if (currentTubeParams) {
            modelNameEl.textContent = currentTubeParams.modelName;
            typeBadgeEl.textContent = currentTubeParams.tubeType.toUpperCase();
        } else {
            modelNameEl.textContent = currentTubeModel;
        }
    }

    async function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        TubeAmpProcessor.stop();
        stopTimeUpdate();

        const trackName = document.getElementById('trackName');
        trackName.textContent = file.name;

        try {
            await TubeAmpProcessor.loadAudioFile(file);
            
            const playBtn = document.getElementById('playBtn');
            const stopBtn = document.getElementById('stopBtn');
            playBtn.disabled = false;
            stopBtn.disabled = false;

            const waveData = TubeAmpProcessor.getWaveformData();
            if (waveData) {
                VisualEffects.drawStaticWaveform(waveData);
            }

            updateTrackTime();
            VisualEffects.powerOn();

        } catch (error) {
            console.error('Error loading audio file:', error);
            alert('无法加载音频文件: ' + error.message);
        }
    }

    function togglePlay() {
        const playBtn = document.getElementById('playBtn');
        const playIcon = playBtn.querySelector('.play-icon');
        const playText = playBtn.querySelector('span:last-child');

        if (TubeAmpProcessor.isAudioPlaying() && !TubeAmpProcessor.isMicrophoneActive()) {
            TubeAmpProcessor.pause();
            playIcon.textContent = '▶';
            playText.textContent = '播放';
            stopTimeUpdate();
        } else {
            TubeAmpProcessor.resume();
            TubeAmpProcessor.play();
            playIcon.textContent = '❚❚';
            playText.textContent = '暂停';
            startTimeUpdate();
            VisualEffects.powerOn();
        }
    }

    function handleStop() {
        TubeAmpProcessor.stop();
        stopTimeUpdate();
        
        const playBtn = document.getElementById('playBtn');
        const playIcon = playBtn.querySelector('.play-icon');
        const playText = playBtn.querySelector('span:last-child');
        playIcon.textContent = '▶';
        playText.textContent = '播放';

        const waveData = TubeAmpProcessor.getWaveformData();
        if (waveData) {
            VisualEffects.drawStaticWaveform(waveData);
        }

        updateTrackTime();
    }

    async function toggleMicrophone() {
        const micBtn = document.getElementById('micBtn');
        const playBtn = document.getElementById('playBtn');

        if (TubeAmpProcessor.isMicrophoneActive()) {
            TubeAmpProcessor.stopMicrophone();
            micBtn.classList.remove('active');
            playBtn.disabled = document.getElementById('audioFile').files.length > 0 ? false : true;
            VisualEffects.powerOff();
        } else {
            TubeAmpProcessor.stop();
            stopTimeUpdate();
            
            const success = await TubeAmpProcessor.startMicrophone();
            if (success) {
                micBtn.classList.add('active');
                playBtn.disabled = true;
                document.getElementById('trackName').textContent = '🎤 麦克风输入中...';
                VisualEffects.powerOn();
            } else {
                alert('无法访问麦克风，请检查权限设置。');
            }
        }
    }

    function startTimeUpdate() {
        if (timeUpdateInterval) return;
        timeUpdateInterval = setInterval(updateTrackTime, 100);
    }

    function stopTimeUpdate() {
        if (timeUpdateInterval) {
            clearInterval(timeUpdateInterval);
            timeUpdateInterval = null;
        }
    }

    function updateTrackTime() {
        const trackTime = document.getElementById('trackTime');
        const current = TubeAmpProcessor.getCurrentTime();
        const duration = TubeAmpProcessor.getDuration();
        trackTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
