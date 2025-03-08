import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale, setDefaultLocale } from "react-datepicker";
import fr from "date-fns/locale/fr";
import Modal from 'react-modal';
import '@fortawesome/fontawesome-free/css/all.min.css'; // Import Font Awesome

// Définir l'élément racine pour react-modal
Modal.setAppElement('#root');

const pinStyle = "https://cdn-icons-png.flaticon.com/512/684/684908.png";

const pastelColors = ["#E6E6FA"];

registerLocale("fr", fr);

function MapEvents({ setFilteredExpos, expos, setButtonVisible }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const visibleExpos = expos.filter((expo) =>
        bounds.contains([expo.latitude, expo.longitude])
      );
      setFilteredExpos(visibleExpos);
      setButtonVisible(true);
    },
    zoomend: () => {
      setButtonVisible(true);
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
  const [showMap, setShowMap] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const initialCenter = [48.8566, 2.3522];
  const initialZoom = 12;

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
    const checkIsMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setShowMap(!mobile);
      setShowFilters(!mobile);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
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

  const uniqueTags = [...new Set(expos.flatMap((expo) => expo.tags_category))];
  const uniqueArrondissements = [...new Set(expos.map((expo) => expo.adresse.split(" - ")[1]))];

  uniqueArrondissements.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, ""), 10);
    const numB = parseInt(b.replace(/[^0-9]/g, ""), 10);
    return numA - numB;
  });

  const resetFilters = () => {
    setSelectedTag("");
    setSelectedArrondissement("");
    setSelectedDate(null);
    setPetitBudget(false);
    setFinProche(false);
    setEnCours(false);
    setAVenir(false);
    setFilteredExpos(expos);
    setSelectedExpo(null);
    if (mapRef.current) {
      mapRef.current.setView(initialCenter, initialZoom);
    }
  };

  const resetMapView = () => {
    if (mapRef.current) {
      mapRef.current.setView(initialCenter, initialZoom);

      // Empêcher la réapparition immédiate
      setTimeout(() => {
        setButtonVisible(false);
      }, 500); // Délai pour éviter la réactivation immédiate
    }
  };

  const openModal = (expo) => {
    setSelectedExpo(expo);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setSelectedExpo(null);
    setModalIsOpen(false);
  };

  return (
    <div className="flex flex-col h-screen m-0 p-0">
      <div className={`w-full h-full ${isMobile ? (showMap ? "" : "grid grid-cols-1") : (showMap ? "grid grid-cols-3" : "grid grid-cols-2")}`}>
        <div className="col-span-2 bg-gray-100 overflow-auto p-4">
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-4">RadarExpo</h1>
            Trouve l'expo idéale en fonction de tes envies, ton budget, tes horaires de boulot...
          </div>
          {isMobile && (
            <div className="flex space-x-2 mb-4">
              <button
                className={`flex-1 px-4 py-2 rounded shadow-md ${showFilters ? "bg-gray-400 text-white" : "bg-gray-300 text-gray-800"}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <i className="fas fa-filter"></i>
              </button>
              <button
                className={`flex-1 px-4 py-2 rounded shadow-md ${showMap ? "bg-gray-400 text-white" : "bg-gray-300 text-gray-800"}`}
                onClick={() => setShowMap(!showMap)}
              >
                <i className="fas fa-map-marked-alt"></i>
              </button>
            </div>
          )}
          {showFilters && (
            <>
              <div className="flex flex-wrap space-x-2 mb-4">
                <select
                  className={`p-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${selectedTag ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  value={selectedTag}
                  style={{ outline: 'none' }}
                >
                  <option value="">Toutes les thématiques</option>
                  {uniqueTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <select
                  className={`p-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${selectedArrondissement ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onChange={(e) => setSelectedArrondissement(e.target.value)}
                  value={selectedArrondissement}
                  style={{ outline: 'none' }}
                >
                  <option value="">Toutes les villes</option>
                  {uniqueArrondissements.map((arr) => (
                    <option key={arr} value={arr}>
                      {arr}
                    </option>
                  ))}
                </select>
                <div className={`p-2 rounded shadow-md flex items-center relative cursor-pointer mb-2 w-full sm:w-auto ${selectedDate ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Date de la visite"
                    className="w-full datepicker-no-outline outline-none focus:outline-none"
                    locale="fr"
                    disabled={!dateFilterEnabled}
                  />

                  {selectedDate && (
                    <i
                      className="fas fa-times-circle text-white-500 cursor-pointer absolute right-2"
                      onClick={() => {
                        setSelectedDate(null);
                        setDateFilterEnabled(true); // Enable date filtering again
                      }}
                    ></i>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap space-x-2 mb-4">
                <button
                  className={`px-4 py-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${petitBudget ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onClick={() => setPetitBudget(!petitBudget)}
                >
                  J'ai un petit budget
                </button>
                <button
                  className={`px-4 py-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${finProche ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onClick={() => setFinProche(!finProche)}
                >
                  Derniers jours
                </button>
                <button
                  className={`px-4 py-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${enCours ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onClick={() => {
                    setEnCours(!enCours);
                    setAVenir(false);
                  }}
                >
                  En cours
                </button>
                <button
                  className={`px-4 py-2 rounded shadow-md cursor-pointer mb-2 w-full sm:w-auto ${aVenir ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onClick={() => {
                    setAVenir(!aVenir);
                    setEnCours(false);
                  }}
                >
                  A venir
                </button>
                {(selectedTag || selectedArrondissement || selectedDate || petitBudget || finProche || enCours || aVenir) && (
                  <button
                    className="px-4 py-2 rounded shadow-md bg-red-500 text-white mb-2 w-full sm:w-auto"
                    onClick={resetFilters}
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            </>
          )}
          {((!showMap && isMobile) || !isMobile) && (
            <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : (showMap ? "grid-cols-2" : "grid-cols-3")}`}>
              {filteredExpos.length === 0 ? (
                <p className="text-center text-gray-600">Aucune exposition ne correspond à ces filtres</p>
              ) : (
                filteredExpos.map((expo) => (
                  <div
                    key={expo.titre}
                    className="cursor-pointer bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex relative"
                    onClick={() => openModal(expo)}
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
            </div>)}
        </div>

        {showMap && (
          <div className={`col-span-1 p-4 relative flex flex-col ${isMobile ? 'h-full' : ''}`}>
            <div className="relative h-full w-full">
              <MapContainer ref={mapRef} center={initialCenter} zoom={initialZoom} className="h-full w-full rounded-lg overflow-hidden shadow-lg" style={{ borderRadius: "1rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", position: 'relative', zIndex: 0 }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <MapEvents setFilteredExpos={setFilteredExpos} expos={expos} setButtonVisible={setButtonVisible} />
                {filteredExpos.map((expo) => (
                  <Marker key={expo.titre} position={[expo.latitude, expo.longitude]} icon={expoIcon} ref={(el) => (markerRefs.current[expo.titre] = el)} eventHandlers={{
                    click: () => openModal(expo),
                  }}>
                  </Marker>
                ))}
              </MapContainer>
              {buttonVisible && (
                <button
                  className="absolute top-4 right-4 bg-gray-400 text-white px-4 py-2 rounded shadow-md z-10"
                  onClick={resetMapView}
                  style={{ zIndex: 10 }}
                >
                  Réinitialiser la carte
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Expo Details"
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        {selectedExpo && (
          <div className="modal-header">
            <button className="modal-close" onClick={closeModal}>
              <i className="fas fa-times"></i> {/* Utilisation de Font Awesome */}
            </button>
            <div className="modal-image">
              <img src={selectedExpo.img_url} alt={selectedExpo.titre} />
            </div>
            <div className="modal-details">
              <h2 className="text-2xl font-bold mb-2 mt-5">{selectedExpo.titre}</h2>
              <p className="text-sm text-gray-700">{selectedExpo.emplacement}</p>
              <p className="text-xs text-gray-500">{selectedExpo.adresse}</p>
              <a href={selectedExpo.url_lieu} className="text-sm text-blue-500 block" target="_blank" rel="noopener noreferrer">
                {selectedExpo.url_lieu}
              </a>
              <div className="mt-2 overflow-y-auto">
                {selectedExpo.description_detaillee_mise_en_forme && (
                  <>
                    <p className="text-sm text-gray-700">
                      <strong>🖼️ De quoi s'agit-il ?</strong><br />
                      {selectedExpo.description_detaillee_mise_en_forme.de_quoi_sagit_il}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>🔎 Plus précisément</strong><br />
                      {selectedExpo.description_detaillee_mise_en_forme.plus_precisement}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>❤️ Ça va t'intéresser si...</strong><br />
                      {selectedExpo.description_detaillee_mise_en_forme.ca_va_tinteresser_si}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
