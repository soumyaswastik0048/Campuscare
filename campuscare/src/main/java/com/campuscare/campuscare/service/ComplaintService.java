package com.campuscare.campuscare.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.campuscare.campuscare.model.complaint;
import com.campuscare.campuscare.repository.ComplaintRepository;


@Service

public class ComplaintService {

     private final ComplaintRepository  complaintRepository;

    public ComplaintService(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
    }

     public complaint createComplaint(complaint newComplaint) {
        return complaintRepository.save(newComplaint);
    }

    public List<complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }
    public complaint updateComplaint(Long id,complaint updatedComplaint) {
    complaint existingComplaint = complaintRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Complaint not found"));

    //existingComplaint.setStatus(status);
    existingComplaint.setType(updatedComplaint.getType());
    existingComplaint.setCategory(updatedComplaint.getCategory());
    existingComplaint.setDescription(updatedComplaint.getDescription());
    existingComplaint.setStatus(updatedComplaint.getStatus());
    if (updatedComplaint.getPhotoData() != null) {
        existingComplaint.setPhotoData(updatedComplaint.getPhotoData());
        existingComplaint.setPhotoFileName(updatedComplaint.getPhotoFileName());
        existingComplaint.setPhotoMimeType(updatedComplaint.getPhotoMimeType());
    }
    if (updatedComplaint.getRequestedResolutionHours() != null) {
        existingComplaint.setRequestedResolutionHours(updatedComplaint.getRequestedResolutionHours());
    }

    return complaintRepository.save(existingComplaint);
}
public void deleteComplaint(Long id) {
    if (!complaintRepository.existsById(id)) {
        throw new RuntimeException("Complaint not found");
    }

    complaintRepository.deleteById(id);
}
public complaint getComplaintById(Long id) {
    return complaintRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Complaint not found"));
}
public complaint getComplaintByTrackingId(String trackingId) {
    return complaintRepository.findByTrackingId(trackingId)
            .orElseThrow(() -> new RuntimeException("Complaint not found"));
}

public List<complaint> getComplaintsByCategory(String category) {
    return complaintRepository.findByCategory(category);
}
}
