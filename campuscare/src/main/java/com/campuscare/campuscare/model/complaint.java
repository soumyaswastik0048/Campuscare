package com.campuscare.campuscare.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;


@Entity
public class complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String trackingId;
    private LocalDateTime createdAt;
    @Min(value = 1, message = "Requested resolution time must be at least 1 hour")
    private Integer requestedResolutionHours;
    @NotBlank(message = "Type is required")
    private String type;
@NotBlank(message = "Category is required")
    private String category;

@NotBlank(message = "Description is required")
@Size(min = 10, message = "Description must contain at least 10 characters")
    private String description;
@NotBlank(message = "Status is required")
    private String status;

@Lob
@Column(columnDefinition = "LONGTEXT")
private String photoData;

private String photoFileName;
private String photoMimeType;

public complaint(){

}
    @PrePersist
public void generateTrackingId() {
    if (trackingId == null) {
        trackingId = UUID.randomUUID().toString();
    }
    if (createdAt == null) {
        createdAt = LocalDateTime.now();
    }
}
 public complaint(String type, String category, String description, String status) {
        this.type = type;
        this.category = category;
        this.description = description;
        this.status = status;
    }

    public Long getId() {
    return id;
}

public String getType() {
    return type;
}

public void setType(String type) {
    this.type = type;
}

public String getCategory() {
    return category;
}

public void setCategory(String category) {
    this.category = category;
}

public String getDescription() {
    return description;
}

public void setDescription(String description) {
    this.description = description;
}

public String getStatus() {
    return status;
}

public void setStatus(String status) {
    this.status = status;
}

public String getPhotoData() {
return photoData;
}

public void setPhotoData(String photoData) {
this.photoData = photoData;
}

public String getPhotoFileName() {
return photoFileName;
}

public void setPhotoFileName(String photoFileName) {
this.photoFileName = photoFileName;
}

public String getPhotoMimeType() {
return photoMimeType;
}

public void setPhotoMimeType(String photoMimeType) {
this.photoMimeType = photoMimeType;
}

public String getTrackingId() {
return trackingId;
}

public void setTrackingId(String trackingId) {
this.trackingId = trackingId;
}

public LocalDateTime getCreatedAt() {
return createdAt;
}

public Integer getRequestedResolutionHours() {
return requestedResolutionHours;
}

public void setRequestedResolutionHours(Integer requestedResolutionHours) {
this.requestedResolutionHours = requestedResolutionHours;
}

}