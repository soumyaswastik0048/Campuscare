package com.campuscare.campuscare.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.campuscare.campuscare.model.complaint;
import com.campuscare.campuscare.service.ComplaintService;

import jakarta.validation.Valid;



@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*")
@RestController


public class ComplaintController {
     private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
public complaint createComplaint(@Valid @RequestBody complaint newComplaint) {
    if (newComplaint.getRequestedResolutionHours() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested resolution time is required");
    }
    return complaintService.createComplaint(newComplaint);
}

    @GetMapping
    public List<complaint> getAllComplaints() {
        return complaintService.getAllComplaints();
    }
    
    @PutMapping("/{id}")
public complaint updateComplaint(
        @PathVariable Long id,
        @RequestBody complaint updatedComplaint) {

    return complaintService.updateComplaint(id, updatedComplaint);
}

@DeleteMapping("/{id}")
public String deleteComplaint(@PathVariable Long id) {
    complaintService.deleteComplaint(id);
    return "Complaint deleted successfully";
}
@GetMapping("/{id}")
public complaint getComplaintById(@PathVariable Long id) {
    return complaintService.getComplaintById(id);
}
@GetMapping("/track/{trackingId}")
public complaint getComplaintByTrackingId(
        @PathVariable String trackingId) {

    return complaintService.getComplaintByTrackingId(trackingId);
}

@GetMapping("/category/{category}")
public List<complaint> getComplaintsByCategory(
        @PathVariable String category) {

    return complaintService.getComplaintsByCategory(category);
}

}
