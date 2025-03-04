import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const expos = [
  {
    id: 1,
    title: "Exposition Monet",
    lat: 48.8566,
    lon: 2.3522,
    address: "Musée d'Orsay, Paris",
  },
  {
    id: 2,
    title: "Expo Van Gogh",
    lat: 48.8606,
    lon: 2.3376,
    address: "Louvre, Paris",
  },
  {
    id: 3,
    title: "Surréalisme Moderne",
    lat: 48.8738,
    lon: 2.295,
    address: "Centre Pompidou, Paris",
  },
];

const expoIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
});

export default function ExpoMap() {
  const [selectedExpo, setSelectedExpo] = useState(null);

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
        <MapContainer center={[48.8566, 2.3522]} zoom={12} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {expos.map((expo) => (
            <Marker key={expo.id} position={[expo.lat, expo.lon]} icon={expoIcon}>
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
