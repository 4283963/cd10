package com.tubeamp.repository;

import com.tubeamp.entity.TubeModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface TubeModelRepository extends JpaRepository<TubeModel, Long> {

    Optional<TubeModel> findByModelName(String modelName);

    List<TubeModel> findByTubeType(String tubeType);

    boolean existsByModelName(String modelName);
}
