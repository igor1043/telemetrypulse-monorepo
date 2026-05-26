package com.telemetrypulse.processor.service;

public record VehicleProfile(
    String vehicleId,
    String model,
    String imageUrl,
    double baseLatitude,
    double baseLongitude
) {
}
