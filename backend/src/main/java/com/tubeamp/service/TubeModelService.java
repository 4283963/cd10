package com.tubeamp.service;

import com.tubeamp.entity.TubeModel;
import com.tubeamp.repository.TubeModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TubeModelService {

    private final TubeModelRepository tubeModelRepository;

    @Autowired
    public TubeModelService(TubeModelRepository tubeModelRepository) {
        this.tubeModelRepository = tubeModelRepository;
    }

    public List<TubeModel> getAllTubeModels() {
        return tubeModelRepository.findAll();
    }

    public Optional<TubeModel> getTubeModelById(Long id) {
        return tubeModelRepository.findById(id);
    }

    public Optional<TubeModel> getTubeModelByName(String modelName) {
        return tubeModelRepository.findByModelName(modelName);
    }

    public List<TubeModel> getTubeModelsByType(String tubeType) {
        return tubeModelRepository.findByTubeType(tubeType);
    }

    public TubeModel createTubeModel(TubeModel tubeModel) {
        if (tubeModelRepository.existsByModelName(tubeModel.getModelName())) {
            throw new IllegalArgumentException("Tube model with name " + tubeModel.getModelName() + " already exists");
        }
        return tubeModelRepository.save(tubeModel);
    }

    public Optional<TubeModel> updateTubeModel(Long id, TubeModel tubeModelDetails) {
        return tubeModelRepository.findById(id).map(tubeModel -> {
            tubeModel.setModelName(tubeModelDetails.getModelName());
            tubeModel.setTubeType(tubeModelDetails.getTubeType());
            tubeModel.setDescription(tubeModelDetails.getDescription());
            tubeModel.setGainFactor(tubeModelDetails.getGainFactor());
            tubeModel.setSecondHarmonicCoeff(tubeModelDetails.getSecondHarmonicCoeff());
            tubeModel.setThirdHarmonicCoeff(tubeModelDetails.getThirdHarmonicCoeff());
            tubeModel.setFourthHarmonicCoeff(tubeModelDetails.getFourthHarmonicCoeff());
            tubeModel.setSoftClipThreshold(tubeModelDetails.getSoftClipThreshold());
            tubeModel.setSoftClipKnee(tubeModelDetails.getSoftClipKnee());
            tubeModel.setWarmFactor(tubeModelDetails.getWarmFactor());
            tubeModel.setBassBoost(tubeModelDetails.getBassBoost());
            tubeModel.setTrebleCut(tubeModelDetails.getTrebleCut());
            tubeModel.setPlateVoltage(tubeModelDetails.getPlateVoltage());
            tubeModel.setCathodeBias(tubeModelDetails.getCathodeBias());
            return tubeModelRepository.save(tubeModel);
        });
    }

    public boolean deleteTubeModel(Long id) {
        if (tubeModelRepository.existsById(id)) {
            tubeModelRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
