package com.tubeamp.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tube_models")
public class TubeModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false, unique = true, length = 50)
    private String modelName;

    @Column(name = "tube_type", nullable = false, length = 50)
    private String tubeType;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "gain_factor", nullable = false)
    private Double gainFactor;

    @Column(name = "second_harmonic_coeff", nullable = false)
    private Double secondHarmonicCoeff;

    @Column(name = "third_harmonic_coeff", nullable = false)
    private Double thirdHarmonicCoeff;

    @Column(name = "fourth_harmonic_coeff", nullable = false)
    private Double fourthHarmonicCoeff;

    @Column(name = "soft_clip_threshold", nullable = false)
    private Double softClipThreshold;

    @Column(name = "soft_clip_knee", nullable = false)
    private Double softClipKnee;

    @Column(name = "warm_factor", nullable = false)
    private Double warmFactor;

    @Column(name = "bass_boost", nullable = false)
    private Double bassBoost = 1.0;

    @Column(name = "treble_cut", nullable = false)
    private Double trebleCut = 1.0;

    @Column(name = "plate_voltage")
    private Double plateVoltage;

    @Column(name = "cathode_bias")
    private Double cathodeBias;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getTubeType() {
        return tubeType;
    }

    public void setTubeType(String tubeType) {
        this.tubeType = tubeType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getGainFactor() {
        return gainFactor;
    }

    public void setGainFactor(Double gainFactor) {
        this.gainFactor = gainFactor;
    }

    public Double getSecondHarmonicCoeff() {
        return secondHarmonicCoeff;
    }

    public void setSecondHarmonicCoeff(Double secondHarmonicCoeff) {
        this.secondHarmonicCoeff = secondHarmonicCoeff;
    }

    public Double getThirdHarmonicCoeff() {
        return thirdHarmonicCoeff;
    }

    public void setThirdHarmonicCoeff(Double thirdHarmonicCoeff) {
        this.thirdHarmonicCoeff = thirdHarmonicCoeff;
    }

    public Double getFourthHarmonicCoeff() {
        return fourthHarmonicCoeff;
    }

    public void setFourthHarmonicCoeff(Double fourthHarmonicCoeff) {
        this.fourthHarmonicCoeff = fourthHarmonicCoeff;
    }

    public Double getSoftClipThreshold() {
        return softClipThreshold;
    }

    public void setSoftClipThreshold(Double softClipThreshold) {
        this.softClipThreshold = softClipThreshold;
    }

    public Double getSoftClipKnee() {
        return softClipKnee;
    }

    public void setSoftClipKnee(Double softClipKnee) {
        this.softClipKnee = softClipKnee;
    }

    public Double getWarmFactor() {
        return warmFactor;
    }

    public void setWarmFactor(Double warmFactor) {
        this.warmFactor = warmFactor;
    }

    public Double getBassBoost() {
        return bassBoost;
    }

    public void setBassBoost(Double bassBoost) {
        this.bassBoost = bassBoost;
    }

    public Double getTrebleCut() {
        return trebleCut;
    }

    public void setTrebleCut(Double trebleCut) {
        this.trebleCut = trebleCut;
    }

    public Double getPlateVoltage() {
        return plateVoltage;
    }

    public void setPlateVoltage(Double plateVoltage) {
        this.plateVoltage = plateVoltage;
    }

    public Double getCathodeBias() {
        return cathodeBias;
    }

    public void setCathodeBias(Double cathodeBias) {
        this.cathodeBias = cathodeBias;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
