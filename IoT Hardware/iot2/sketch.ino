#include <TinyGPS++.h>
#include <HardwareSerial.h>

// Create GPS object
TinyGPSPlus gps;

// Use Serial2 on ESP32 (RX2=16, TX2=17)
HardwareSerial SerialGPS(2);

void setup() {
  Serial.begin(115200);           // Serial monitor
  SerialGPS.begin(9600, SERIAL_8N1, 16, 17);  // GPS module serial (RX=16, TX=17)
  
  Serial.println("GPS Module initializing...");
}

void loop() {
  // Read data from GPS
  while (SerialGPS.available() > 0) {
    char c = SerialGPS.read();
    gps.encode(c);
  }

  // If we have a valid location, print it
  if (gps.location.isUpdated()) {
    Serial.print("Latitude: ");
    Serial.println(gps.location.lat(), 6);  // 6 decimal places
    Serial.print("Longitude: ");
    Serial.println(gps.location.lng(), 6);
    Serial.print("Altitude: ");
    Serial.println(gps.altitude.meters());
    Serial.print("Speed (km/h): ");
    Serial.println(gps.speed.kmph());
    Serial.print("Satellites: ");
    Serial.println(gps.satellites.value());
    Serial.println("---------------------------");
  }
}
