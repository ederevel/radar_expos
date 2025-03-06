import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const pinStyle = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

const pastelColors = ["#E6E6FA"]; // Palette de couleurs pastel

function MoveView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.setView(center, zoom, { animate: true, duration: 0.8, easeLinearity: 0.25 });
    }, 10);
  }, [center, zoom, map]);
  return null;
}

export default function ExpoMap() {
  const [expos, setExpos] = useState([]);
  const [filteredExpos, setFilteredExpos] = useState([]);
  const [selectedExpo, setSelectedExpo] = useState(null);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedArrondissement, setSelectedArrondissement] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  // Chargement des expositions
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}expos.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP! Statut: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setExpos(data);
        setFilteredExpos(data);
      })
      .catch((error) =>
        console.error("Erreur lors du chargement des expositions:", error)
      );
  }, []);

  // Filtrage des expositions
  useEffect(() => {
    let filtered = expos;
    if (selectedTag) {
      filtered = filtered.filter((expo) => expo.tags_category.includes(selectedTag));
    }
    if (selectedArrondissement) {
      filtered = filtered.filter((expo) => expo.adresse.includes(selectedArrondissement));
    }
    if (selectedDate) {
      filtered = filtered.filter((expo) => expo.dates.includes(selectedDate));
    }
    setFilteredExpos(filtered);
  }, [selectedTag, selectedArrondissement, selectedDate, expos]);

  const expoIcon = new L.Icon({
    iconUrl: pinStyle,
    iconSize: [30, 30],
  });

  useEffect(() => {
    if (selectedExpo && markerRefs.current[selectedExpo.titre]) {
      markerRefs.current[selectedExpo.titre].openPopup();
    }
  }, [selectedExpo]);

  const uniqueTags = [...new Set(expos.flatMap((expo) => expo.tags_category))];
  const uniqueArrondissements = [...new Set(expos.map((expo) => expo.adresse.split(" - ")[1]))];

  uniqueArrondissements.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
    const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
    return numA - numB;
  });

  const uniqueDates = [...new Set(expos.map((expo) => expo.dates))];

  return (
    <div className="flex h-screen m-0 p-0">
      {/* Conteneur principal utilisant flex pour aligner les deux sections côte à côte */}
      <div className="grid grid-cols-3 w-full h-full">
        {/* Liste des expositions avec filtres */}
        <div className="col-span-2 bg-gray-100 overflow-auto p-4">
          {/* Filtres */}
          <div className="flex space-x-2 mb-4">
            <select className="w-1/3 bg-white p-2 rounded shadow-md" onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="">Tag</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select className="w-1/3 bg-white p-2 rounded shadow-md" onChange={(e) => setSelectedArrondissement(e.target.value)}>
              <option value="">Arrondissement</option>
              {uniqueArrondissements.map((arr) => (
                <option key={arr} value={arr}>
                  {arr}
                </option>
              ))}
            </select>
            <select className="w-1/3 bg-white p-2 rounded shadow-md" onChange={(e) => setSelectedDate(e.target.value)}>
              <option value="">Date</option>
              {uniqueDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Grille pour les expositions avec éléments stylisés */}
          <div className="grid grid-cols-2 gap-6">
            {filteredExpos.map((expo) => (
              <div
                key={expo.titre}
                className="cursor-pointer bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex"
                onClick={() => setSelectedExpo(expo)}
              >
                <img
                  src={expo.img_url}
                  alt={expo.titre}
                  className="w-1/3 object-cover"
                />
                <div className="w-2/3 p-4 flex flex-col">
                  <h3 className="text-xl font-semibold mb-1 text-gray-800">
                    {expo.titre}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {expo.emplacement}
                  </p>
                  <p className="text-xs text-gray-500 italic mb-2">
                    {expo.dates}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                    {expo.description_sommaire}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-3">
                    {expo.prix_nominal}
                  </p>
                  <div className="flex flex-wrap justify-start space-x-2 mt-auto">
                    {expo.tags_category.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap mb-2"
                        style={{ backgroundColor: "#E6E6FA" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carte */}
        <div className="col-span-1 p-4">
          <MapContainer ref={mapRef} center={[48.8566, 2.3522]} zoom={12} className="h-full w-full rounded-lg overflow-hidden shadow-lg" style={{ borderRadius: "1rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            {selectedExpo && <MoveView center={[selectedExpo.latitude, selectedExpo.longitude]} zoom={16} />}
            {filteredExpos.map((expo) => (
              <Marker key={expo.titre} position={[expo.latitude, expo.longitude]} icon={expoIcon} ref={(el) => (markerRefs.current[expo.titre] = el)}>
                <Popup closeButton={false} className="custom-popup" offset={[0, -10]}>
                  <div className="flex justify-center items-center">
                    <img src={expo.img_url} alt={expo.titre} className="w-1/3 object-cover rounded-t-lg" />
                  </div>
                  <h3 className="font-bold text-center mt-2">{expo.titre}</h3>
                  <p className="text-sm text-gray-700 text-center">{expo.emplacement}</p>
                  <p className="text-xs text-gray-500 text-center">{expo.adresse}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
