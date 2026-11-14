export interface ParkingZone {
  id: string;
  code: string;
  name: string;
  municipality: string;
  zone_type: 'zona_rosa_comercial' | 'zona_rosa_servicios' | 'zona_azul';
  base_minutes: number;
  max_extension_minutes: number;
  schedule_info: string;
  is_active: boolean;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  qr_token: string;
  is_active: boolean;
}

export interface ParkingSession {
  id: string;
  user_id?: string;
  license_plate: string;
  zone_id: string;
  started_at: string;
  expires_at: string;
  status: 'active' | 'extended' | 'completed' | 'expired';
  is_extended: boolean;
  zone_name?: string;
}

export interface ValidationRecord {
  id: string;
  session_id: string;
  merchant_id: string;
  merchant_name?: string;
  minutes_added: number;
  validated_at: string;
  verification_hash: string;
}
