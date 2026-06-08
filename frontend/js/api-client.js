const TubeAmpApi = (function() {
    const BASE_URL = 'http://localhost:8080/api';

    async function request(endpoint, options = {}) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            console.warn('API request failed, using fallback data:', error);
            return null;
        }
    }

    async function getAllTubeModels() {
        const data = await request('/tubes');
        return data || getFallbackTubeModels();
    }

    async function getTubeModelByName(modelName) {
        const data = await request(`/tubes/params/${modelName}`);
        return data || getFallbackTubeParams(modelName);
    }

    function getFallbackTubeModels() {
        return [
            { modelName: '300B', tubeType: 'Triode', description: '经典直热式三极功率管，温暖醇厚' },
            { modelName: 'KT88', tubeType: 'Beam Tetrode', description: '束射四极管，动态范围大' },
            { modelName: 'EL34', tubeType: 'Pentode', description: '五极管，英国声代表' },
            { modelName: '6L6', tubeType: 'Beam Tetrode', description: '美式经典束射管' },
            { modelName: 'EL84', tubeType: 'Pentode', description: '小功率五极管，甜美细腻' },
            { modelName: '6V6', tubeType: 'Beam Tetrode', description: '小型束射管，温暖圆润' },
            { modelName: '2A3', tubeType: 'Triode', description: '直热式三极，极致顺滑' },
            { modelName: '6550', tubeType: 'Beam Tetrode', description: '大功率束射管，控制力强' }
        ];
    }

    function getFallbackTubeParams(modelName) {
        const params = {
            '300B': {
                modelName: '300B',
                tubeType: 'Triode',
                description: '经典直热式三极功率管，温暖醇厚的人声表现，被誉为"胆王"',
                gainFactor: 1.8,
                secondHarmonicCoeff: 0.15,
                thirdHarmonicCoeff: 0.05,
                fourthHarmonicCoeff: 0.02,
                softClipThreshold: 0.75,
                softClipKnee: 0.35,
                warmFactor: 0.85,
                bassBoost: 1.15,
                trebleCut: 0.92
            },
            'KT88': {
                modelName: 'KT88',
                tubeType: 'Beam Tetrode',
                description: '束射四极管，动态范围大，低频强劲，适合摇滚和交响',
                gainFactor: 2.5,
                secondHarmonicCoeff: 0.08,
                thirdHarmonicCoeff: 0.12,
                fourthHarmonicCoeff: 0.06,
                softClipThreshold: 0.82,
                softClipKnee: 0.28,
                warmFactor: 0.65,
                bassBoost: 1.25,
                trebleCut: 0.95
            },
            'EL34': {
                modelName: 'EL34',
                tubeType: 'Pentode',
                description: '五极管，英国声代表，中频迷人，适合人声和弦乐',
                gainFactor: 2.2,
                secondHarmonicCoeff: 0.10,
                thirdHarmonicCoeff: 0.09,
                fourthHarmonicCoeff: 0.04,
                softClipThreshold: 0.78,
                softClipKnee: 0.32,
                warmFactor: 0.72,
                bassBoost: 1.10,
                trebleCut: 0.93
            },
            '6L6': {
                modelName: '6L6',
                tubeType: 'Beam Tetrode',
                description: '美式经典束射管，音色明亮通透，动态好',
                gainFactor: 2.0,
                secondHarmonicCoeff: 0.09,
                thirdHarmonicCoeff: 0.10,
                fourthHarmonicCoeff: 0.05,
                softClipThreshold: 0.80,
                softClipKnee: 0.30,
                warmFactor: 0.68,
                bassBoost: 1.12,
                trebleCut: 0.94
            },
            'EL84': {
                modelName: 'EL84',
                tubeType: 'Pentode',
                description: '小功率五极管，音色甜美细腻，适合小音量聆听',
                gainFactor: 1.6,
                secondHarmonicCoeff: 0.12,
                thirdHarmonicCoeff: 0.07,
                fourthHarmonicCoeff: 0.03,
                softClipThreshold: 0.72,
                softClipKnee: 0.38,
                warmFactor: 0.78,
                bassBoost: 1.08,
                trebleCut: 0.91
            },
            '6V6': {
                modelName: '6V6',
                tubeType: 'Beam Tetrode',
                description: '小型束射管，温暖圆润，复古味道浓郁',
                gainFactor: 1.5,
                secondHarmonicCoeff: 0.14,
                thirdHarmonicCoeff: 0.06,
                fourthHarmonicCoeff: 0.02,
                softClipThreshold: 0.70,
                softClipKnee: 0.40,
                warmFactor: 0.82,
                bassBoost: 1.18,
                trebleCut: 0.90
            },
            '2A3': {
                modelName: '2A3',
                tubeType: 'Triode',
                description: '直热式三极功率管，极致顺滑，人声毒器',
                gainFactor: 1.4,
                secondHarmonicCoeff: 0.18,
                thirdHarmonicCoeff: 0.04,
                fourthHarmonicCoeff: 0.015,
                softClipThreshold: 0.68,
                softClipKnee: 0.42,
                warmFactor: 0.90,
                bassBoost: 1.10,
                trebleCut: 0.88
            },
            '6550': {
                modelName: '6550',
                tubeType: 'Beam Tetrode',
                description: '大功率束射管，控制力强，低频下潜深',
                gainFactor: 2.8,
                secondHarmonicCoeff: 0.07,
                thirdHarmonicCoeff: 0.14,
                fourthHarmonicCoeff: 0.07,
                softClipThreshold: 0.85,
                softClipKnee: 0.25,
                warmFactor: 0.60,
                bassBoost: 1.30,
                trebleCut: 0.96
            }
        };
        return params[modelName] || params['300B'];
    }

    return {
        getAllTubeModels,
        getTubeModelByName
    };
})();
