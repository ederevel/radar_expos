import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import fr from "date-fns/locale/fr";

const pinStyle = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

const pastelColors = ["#E6E6FA"]; // Palette de couleurs pastel

registerLocale("fr", fr);

function MoveView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.setView(center, zoom, { animate: true, duration: 0.8, easeLinearity: 0.25 });
    }, 10);
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ setFilteredExpos, expos }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const visibleExpos = expos.filter((expo) =>
        bounds.contains([expo.latitude, expo.longitude])
      );
      setFilteredExpos(visibleExpos);
    },
  });
  return null;
}

export default function ExpoMap() {
  const [expos, setExpos] = useState([]);
  const [filteredExpos, setFilteredExpos] = useState([]);
  const [selectedExpo, setSelectedExpo] = useState(null);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedArrondissement, setSelectedArrondissement] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateFilterEnabled, setDateFilterEnabled] = useState(true);
  const [petitBudget, setPetitBudget] = useState(false);
  const [finProche, setFinProche] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [aVenir, setAVenir] = useState(false);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

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

  useEffect(() => {
    let filtered = expos;
    if (selectedTag) {
      filtered = filtered.filter((expo) => expo.tags_category.includes(selectedTag));
    }
    if (selectedArrondissement) {
      filtered = filtered.filter((expo) => expo.adresse.includes(selectedArrondissement));
    }
    if (dateFilterEnabled && selectedDate) {
      filtered = filtered.filter((expo) => {
        const startDate = new Date(expo.date_debut);
        const endDate = new Date(expo.date_fin);
        return selectedDate >= startDate && selectedDate <= endDate;
      });
    }
    if (petitBudget) {
      filtered = filtered.filter((expo) => expo.petit_budget);
    }
    if (finProche) {
      filtered = filtered.filter((expo) => expo.fin_proche);
    }
    if (enCours) {
      filtered = filtered.filter((expo) => expo.statut === "En cours");
    }
    if (aVenir) {
      filtered = filtered.filter((expo) => expo.statut === "A venir");
    }
    setFilteredExpos(filtered);
  }, [selectedTag, selectedArrondissement, selectedDate, expos, petitBudget, finProche, enCours, aVenir, dateFilterEnabled]);

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

  return (
    <div className="flex h-screen m-0 p-0">
      <div className="grid grid-cols-3 w-full h-full">
        <div className="col-span-2 bg-gray-100 overflow-auto p-4">
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
            <div className="w-1/3 bg-white p-2 rounded shadow-md flex items-center relative">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="Sélectionner une date"
                className="w-full"
                locale="fr"
                disabled={!dateFilterEnabled}
              />
              {selectedDate && (
                <i
                  className="fas fa-times-circle text-red-500 cursor-pointer absolute right-2"
                  onClick={() => {
                    setSelectedDate(null);
                    setDateFilterEnabled(true); // Enable date filtering again
                  }}
                ></i>
              )}
            </div>
          </div>

          <div className="mb-4 space-x-2">
            <button
              className={`px-4 py-2 rounded shadow-md ${petitBudget ? "bg-gray-500 text-white" : "bg-white text-gray-800"}`}
              onClick={() => setPetitBudget(!petitBudget)}
            >
              J'ai un petit budget
            </button>
            <button
              className={`px-4 py-2 rounded shadow-md ${finProche ? "bg-gray-500 text-white" : "bg-white text-gray-800"}`}
              onClick={() => setFinProche(!finProche)}
            >
              Derniers jours
            </button>
            <button
              className={`px-4 py-2 rounded shadow-md ${enCours ? "bg-gray-500 text-white" : "bg-white text-gray-800"}`}
              onClick={() => {
                setEnCours(!enCours);
                setAVenir(false);
              }}
            >
              En cours
            </button>
            <button
              className={`px-4 py-2 rounded shadow-md ${aVenir ? "bg-gray-500 text-white" : "bg-white text-gray-800"}`}
              onClick={() => {
                setAVenir(!aVenir);
                setEnCours(false);
              }}
            >
              A venir
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {filteredExpos.length === 0 ? (
              <p className="text-center text-gray-600">Aucune exposition ne correspond à ces filtres</p>
            ) : (
              filteredExpos.map((expo) => (
                <div
                  key={expo.titre}
                  className="cursor-pointer bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex relative"
                  onClick={() => setSelectedExpo(expo)}
                >
                  <div className="relative w-1/3">
                    <img
                      src={expo.img_url}
                      alt={expo.titre}
                      className="w-full h-full object-cover"
                    />
                    {expo.fin_proche && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded">
                        Derniers jours
                      </div>
                    )}
                  </div>
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
                          className="px-2 py-1 text-xs font-semibold whitespace-nowrap mb-2"
                          style={{ backgroundColor: "#E6E6FA", borderRadius: "0.375rem" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-1 p-4">
          <MapContainer ref={mapRef} center={[48.8566, 2.3522]} zoom={12} className="h-full w-full rounded-lg overflow-hidden shadow-lg" style={{ borderRadius: "1rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapEvents setFilteredExpos={setFilteredExpos} expos={expos} />
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
                  <a href={expo.url_lieu} className="text-blue-500 text-center block mt-2" target="_blank" rel="noopener noreferrer">{expo.url_lieu}</a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
