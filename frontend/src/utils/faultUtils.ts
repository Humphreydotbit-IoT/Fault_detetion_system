
export const FAULT_TYPES = {
  SENSOR_NOT_WORKING: 1,      // Bit 0 (IAQ: all zeros)
  CALIBRATION_ERROR: 2,       // Bit 1 (IAQ: partial zeros)
  TEMP_HIGH: 4,              // Bit 2
  HUM_HIGH: 8,              // Bit 3
  CO2_LOW: 16,              // Bit 4
  CO2_HIGH: 32,             // Bit 5
  POWER_NOT_WORKING: 64,     // Bit 6 (Power: 0.0 kW)
  POWER_SPIKE: 128,         // Bit 7 (Power: >45.0 kW)
  PRESENCE_NOT_READING: 256  // Bit 8 (Presence: 3)
} as const;

export const getFaultDescription = (faultFlag: number): string[] => {
  const faults: string[] = [];
  
  if (faultFlag & FAULT_TYPES.SENSOR_NOT_WORKING) faults.push('Sensor not working');
  if (faultFlag & FAULT_TYPES.CALIBRATION_ERROR) faults.push('Calibration error');
  if (faultFlag & FAULT_TYPES.TEMP_HIGH) faults.push('High temperature');
  if (faultFlag & FAULT_TYPES.HUM_HIGH) faults.push('High humidity');
  if (faultFlag & FAULT_TYPES.CO2_LOW) faults.push('Low CO2');
  if (faultFlag & FAULT_TYPES.CO2_HIGH) faults.push('High CO2');
  if (faultFlag & FAULT_TYPES.POWER_NOT_WORKING) faults.push('Power not working');
  if (faultFlag & FAULT_TYPES.POWER_SPIKE) faults.push('Power spike detected');
  if (faultFlag & FAULT_TYPES.PRESENCE_NOT_READING) faults.push('Presence sensor error');
  
  return faults;
};
