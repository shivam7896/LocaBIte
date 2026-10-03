import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  onLocationSelected: (addressDetails: { title: string; fullAddress: string; lat: number; lng: number }) => void;
  onCancel: () => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ onLocationSelected, onCancel }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [address, setAddress] = useState<any>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      setAddress(data);
    } catch (e) {
      console.warn("Failed to reverse geocode:", e);
    } finally {
      setAddressLoading(false);
    }
  };

  const locateUser = (isInitial = false) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          fetchAddress(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation denied or error:", err);
          if (isInitial) {
             setPosition([28.6139, 77.2090]); // Default to Delhi
          } else {
             alert("Could not get your location. Please check browser permissions.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (isInitial) {
      setPosition([28.6139, 77.2090]);
    }
  };

  const LocationMarker = () => {
    const map = useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        fetchAddress(e.latlng.lat, e.latlng.lng);
      },
    });

    useEffect(() => {
      if (position) {
        map.flyTo(position, map.getZoom());
      }
    }, [position, map]);

    return position === null ? null : (
      <Marker position={position} />
    );
  };

  useEffect(() => {
    locateUser(true);
  }, []);

  const handleConfirm = () => {
    if (position && address) {
      onLocationSelected({
        title: address.address?.neighbourhood || address.address?.suburb || address.address?.city || 'Selected Location',
        fullAddress: address.display_name,
        lat: position[0],
        lng: position[1],
      });
    }
  };

  if (!position) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-surface-container-low rounded-xl">
        <div className="animate-pulse flex flex-col items-center">
          <span className="material-symbols-outlined text-[32px] text-primary">location_on</span>
          <span className="text-[12px] font-semibold text-on-surface-variant mt-2">Locating you...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full h-[300px] rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm" style={{ zIndex: 10 }}>
        <MapContainer center={position} zoom={15} scrollWheelZoom={true} className="w-full h-full" style={{ zIndex: 10 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
          <div className="absolute bottom-4 right-4 z-[400]">
            <button 
              onClick={(e) => { e.preventDefault(); locateUser(); }}
              className="w-10 h-10 bg-surface flex items-center justify-center rounded-full shadow-md text-primary hover:bg-surface-container-low transition-colors"
              title="Locate Me"
            >
              <span className="material-symbols-outlined text-[20px]">my_location</span>
            </button>
          </div>
        </MapContainer>
      </div>

      <div className="flex flex-col gap-3">
        <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-start gap-2">
          <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">place</span>
          <div className="flex-1 min-w-0">
            {addressLoading ? (
              <div className="flex flex-col gap-1">
                <div className="h-4 w-1/3 bg-outline-variant/30 rounded animate-pulse"></div>
                <div className="h-3 w-3/4 bg-outline-variant/30 rounded animate-pulse"></div>
              </div>
            ) : address ? (
              <>
                <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                  {address.address?.neighbourhood || address.address?.suburb || address.address?.city || 'Selected Location'}
                </p>
                <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-snug">
                  {address.display_name}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-on-surface-variant">Tap on the map to select a location</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!position || addressLoading || !address}
            className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};
