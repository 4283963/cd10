package com.tubeamp.controller;

import com.tubeamp.entity.TubeModel;
import com.tubeamp.service.TubeModelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tubes")
@CrossOrigin(origins = "*")
public class TubeModelController {

    private final TubeModelService tubeModelService;

    @Autowired
    public TubeModelController(TubeModelService tubeModelService) {
        this.tubeModelService = tubeModelService;
    }

    @GetMapping
    public ResponseEntity<List<TubeModel>> getAllTubeModels() {
        List<TubeModel> tubeModels = tubeModelService.getAllTubeModels();
        return ResponseEntity.ok(tubeModels);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TubeModel> getTubeModelById(@PathVariable Long id) {
        return tubeModelService.getTubeModelById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/name/{modelName}")
    public ResponseEntity<TubeModel> getTubeModelByName(@PathVariable String modelName) {
        return tubeModelService.getTubeModelByName(modelName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/type/{tubeType}")
    public ResponseEntity<List<TubeModel>> getTubeModelsByType(@PathVariable String tubeType) {
        List<TubeModel> tubeModels = tubeModelService.getTubeModelsByType(tubeType);
        return ResponseEntity.ok(tubeModels);
    }

    @GetMapping("/params/{modelName}")
    public ResponseEntity<Map<String, Object>> getTubeParamsByName(@PathVariable String modelName) {
        return tubeModelService.getTubeModelByName(modelName)
                .map(tubeModel -> {
                    Map<String, Object> params = new HashMap<>();
                    params.put("modelName", tubeModel.getModelName());
                    params.put("tubeType", tubeModel.getTubeType());
                    params.put("description", tubeModel.getDescription());
                    params.put("gainFactor", tubeModel.getGainFactor());
                    params.put("secondHarmonicCoeff", tubeModel.getSecondHarmonicCoeff());
                    params.put("thirdHarmonicCoeff", tubeModel.getThirdHarmonicCoeff());
                    params.put("fourthHarmonicCoeff", tubeModel.getFourthHarmonicCoeff());
                    params.put("softClipThreshold", tubeModel.getSoftClipThreshold());
                    params.put("softClipKnee", tubeModel.getSoftClipKnee());
                    params.put("warmFactor", tubeModel.getWarmFactor());
                    params.put("bassBoost", tubeModel.getBassBoost());
                    params.put("trebleCut", tubeModel.getTrebleCut());
                    return ResponseEntity.ok(params);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createTubeModel(@RequestBody TubeModel tubeModel) {
        try {
            TubeModel createdTubeModel = tubeModelService.createTubeModel(tubeModel);
            return new ResponseEntity<>(createdTubeModel, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TubeModel> updateTubeModel(
            @PathVariable Long id,
            @RequestBody TubeModel tubeModelDetails) {
        return tubeModelService.updateTubeModel(id, tubeModelDetails)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTubeModel(@PathVariable Long id) {
        if (tubeModelService.deleteTubeModel(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
