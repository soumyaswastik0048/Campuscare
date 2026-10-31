package com.campuscare.campuscare.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.campuscare.campuscare.model.complaint;




public interface  ComplaintRepository extends JpaRepository<complaint, Long> {
    Optional<complaint> findByTrackingId(String trackingId);
List<complaint> findByStatus(String status);

    List<complaint> findByCategory(String category);

}
