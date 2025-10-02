#include <SPI.h>
#include <LoRa.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ------------------- LoRa pins -------------------
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_CS   5
#define LORA_RST  14
#define LORA_IRQ  26
#define LORA_FREQ 433E6   // Change to 868E6 or 915E6 depending on your module

// ------------------- GPS setup -------------------
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);  // Use UART1 for GPS
#define GPS_RX 16
#define GPS_TX 17
#define GPS_BAUD 9600

void setup() {
  Serial.begin(115200);
  while(!Serial);

  Serial.println("ESP32 GPS + LoRa Tracker Starting...");

  // GPS UART
  SerialGPS.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);

  // LoRa setup
  LoRa.setPins(LORA_CS, LORA_RST, LORA_IRQ);
  if (!LoRa.begin(LORA_FREQ)) {
    Serial.println("LoRa init failed!");
    while (1);
  }
  Serial.println("LoRa init succeeded!");
}

void loop() {
  // ---------------- GPS Parsing ----------------
  while (SerialGPS.available() > 0) {
    char c = SerialGPS.read();
    gps.encode(c);
  }

  if (gps.location.isUpdated()) {
    float lat = gps.location.lat();
    float lng = gps.location.lng();
    Serial.print("GPS: ");
    Serial.print(lat, 6);
    Serial.print(", ");
    Serial.println(lng, 6);

    // ---------------- Send via LoRa ----------------
    LoRa.beginPacket();
    LoRa.print("GPS: ");
    LoRa.print(lat, 6);
    LoRa.print(",");
    LoRa.print(lng, 6);
    LoRa.endPacket();

    Serial.println("Sent via LoRa!");
  }

  delay(1000); // 1 sec delay
}

