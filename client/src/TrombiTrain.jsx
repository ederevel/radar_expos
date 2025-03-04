import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import exposData from "/public/sample_expos.json";

const pinStyle = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

function MoveView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center);
  }, [center, map]);
  return null;
}

export default function ExpoMap() {
  const [expos, setExpos] = useState([]);
  const [selectedExpo, setSelectedExpo] = useState(null);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  useEffect(() => {
    setExpos(exposData);
  }, []);

  const expoIcon = new L.Icon({
    iconUrl: pinStyle,
    iconSize: [30, 30],
  });

  useEffect(() => {
    if (selectedExpo && markerRefs.current[selectedExpo.id]) {
      markerRefs.current[selectedExpo.id].openPopup();
    }
  }, [selectedExpo]);

  return (
    <div className="flex h-screen">
      {/* Liste des expositions */}
      <div className="w-1/3 p-4 bg-gray-100 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Expositions</h2>
        {expos.map((expo) => (
          <div
            key={expo.id}
            className="p-3 mb-2 cursor-pointer bg-white rounded-lg shadow-md hover:bg-gray-200 transition"
            onClick={() => setSelectedExpo(expo)}
          >
            <h3 className="text-lg font-semibold">{expo.title}</h3>
            <p className="text-sm text-gray-600">{expo.address}</p>
          </div>
        ))}
      </div>

      {/* Carte */}
      <div className="w-2/3 h-full">
        <MapContainer ref={mapRef} center={[48.8566, 2.3522]} zoom={12} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {selectedExpo && <MoveView center={[selectedExpo.lat, selectedExpo.lon]} />}
          {expos.map((expo) => (
            <Marker
              key={expo.id}
              position={[expo.lat, expo.lon]}
              icon={expoIcon}
              ref={(el) => (markerRefs.current[expo.id] = el)}
            >
              <Popup>
                <h3 className="font-bold">{expo.title}</h3>
                <p>{expo.address}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
