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
import Masonry from 'react-masonry-css';
import { useSwipeable } from 'react-swipeable';

// Définir l'élément racine pour react-modal
Modal.setAppElement('#root');

const pinStyle = "https://cdn-icons-png.flaticon.com/512/684/684908.png";
const pinStyleHover = "https://cdn-icons-png.flaticon.com/128/484/484167.png"; // Vous pouvez utiliser une autre icône pour le survol

const pastelColors = ["#E6E6FA"];

registerLocale("fr", fr);

// Fonction utilitaire pour vérifier si une exposition se termine dans les 14 prochains jours
const isEndingSoon = (endDate) => {
  const today = new Date();
  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14);
  return (new Date(endDate) <= twoWeeksFromNow) && (new Date(endDate) >= today);
};

// Nouvelle fonction pour vérifier si une exposition est en cours
const isOngoing = (startDate, endDate) => {
  const today = new Date();
  return (new Date(startDate) <= today) && (new Date(endDate) >= today);
};

// Nouvelle fonction pour vérifier si une exposition est à venir
const isUpcoming = (startDate) => {
  const today = new Date();
  return new Date(startDate) > today;
};

function MapEvents({ setFilteredExpos, expos, setButtonVisible, selectedTag, selectedArrondissement, selectedDate, petitBudget, finProche, enCours, aVenir, dateFilterEnabled }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const visibleExpos = expos.filter((expo) =>
        bounds.contains([expo.latitude, expo.longitude])
      );

      // Appliquer les filtres existants aux expositions visibles
      let filtered = visibleExpos;
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
        filtered = filtered.filter((expo) => isEndingSoon(expo.date_fin));
      }
      if (enCours) {
        filtered = filtered.filter((expo) => isOngoing(expo.date_debut, expo.date_fin));
      }
      if (aVenir) {
        filtered = filtered.filter((expo) => isUpcoming(expo.date_debut));
      }

      setFilteredExpos(filtered);
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
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [hoveredExpo, setHoveredExpo] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [modalAnimating, setModalAnimating] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const modalRef = useRef(null);
  const initialCenter = [48.8566, 2.3522];
  const initialZoom = 12;

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsSlidingOut(true);
    setTimeout(() => {
      closeModal();
      setIsSlidingOut(false);
    }, 300);
  };

  // Handle modal scroll to detect when at top and expand when scrolling down
  useEffect(() => {
    if (!modalIsOpen) return;
    
    let lastScrollTop = 0;
    
    const handleScroll = () => {
      const modalContent = document.querySelector('.modal-content');
      if (modalContent) {
        const currentScrollTop = modalContent.scrollTop;
        
        // Check if we're at the top
        setIsAtTop(currentScrollTop <= 10);
        
        // If scrolling down and not already expanded, expand the modal
        if (currentScrollTop > lastScrollTop && currentScrollTop > 5) {
          console.log("Expanding modal", currentScrollTop, lastScrollTop);
          setIsExpanded(true);
        }
        
        lastScrollTop = currentScrollTop;
      }
    };
    
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      // Set initial state
      setIsAtTop(modalContent.scrollTop <= 10);
      
      modalContent.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        modalContent.removeEventListener('scroll', handleScroll);
      };
    }
  }, [modalIsOpen]);

  // Reset expanded state when modal closes
  useEffect(() => {
    if (!modalIsOpen) {
      setIsExpanded(false);
    }
  }, [modalIsOpen]);

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
      filtered = filtered.filter((expo) => isEndingSoon(expo.date_fin));
    }
    if (enCours) {
      filtered = filtered.filter((expo) => isOngoing(expo.date_debut, expo.date_fin));
    }
    if (aVenir) {
      filtered = filtered.filter((expo) => isUpcoming(expo.date_debut));
    }
    setFilteredExpos(filtered);
  }, [selectedTag, selectedArrondissement, selectedDate, expos, petitBudget, finProche, enCours, aVenir, dateFilterEnabled]);

  const expoIcon = new L.Icon({
    iconUrl: pinStyle,
    iconSize: isMobile ? [30, 30] : [25, 25], // Réduire la taille des pins sur desktop
  });

  const expoIconHover = new L.Icon({
    iconUrl: pinStyleHover,
    iconSize: [35, 35], // Augmenter la taille des pins au survol
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
    resetMapView();
  };

  const resetMapView = () => {
    if (mapRef.current) {
      mapRef.current.setView(initialCenter, initialZoom);

      // Empêcher la réapparition immédiate
      setTimeout(() => {
        setButtonVisible(false);
      }, 400); // Délai pour éviter la réactivation immédiate
    }
  };

  const openModal = (expo) => {
    setSelectedExpo(expo);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setSelectedExpo(null);
    setModalIsOpen(false);
    setEnlargedImage(null); // Fermer l'image agrandie lorsque la modale se ferme
    setIsExpanded(false); // Reset expanded state
  };

  const openEnlargedImage = (url) => {
    setEnlargedImage(url);
  };

  const closeEnlargedImage = () => {
    setEnlargedImage(null);
  };

  // Ajouter un effet pour gérer l'animation de la modale
  useEffect(() => {
    if (filtersModalOpen) {
      setModalAnimating(true);
    }
  }, [filtersModalOpen]);

  const FiltersModal = () => (
    <div className="filters-modal-overlay" onClick={() => setFiltersModalOpen(false)}>
      <div 
        className={`filters-modal-content ${modalAnimating ? 'filters-modal-enter' : ''}`}
        onClick={e => e.stopPropagation()}
        onAnimationEnd={() => setModalAnimating(false)}
      >
        <div className="filters-modal-header">
          <h2 className="text-xl font-bold">Filtres</h2>
          <button className="filters-modal-close" onClick={() => setFiltersModalOpen(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="flex flex-col space-y-4">
          <select
            className={`p-2 rounded shadow-md cursor-pointer w-full ${selectedTag ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
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
            className={`p-2 rounded shadow-md cursor-pointer w-full ${selectedArrondissement ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
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
          <div className={`p-2 rounded shadow-md flex items-center relative cursor-pointer w-full ${selectedDate ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}>
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
                  setDateFilterEnabled(true);
                }}
              ></i>
            )}
          </div>
          <button
            className={`p-2 rounded shadow-md cursor-pointer w-full ${petitBudget ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
            onClick={() => setPetitBudget(!petitBudget)}
          >
            J'ai un petit budget
          </button>
          <button
            className={`p-2 rounded shadow-md cursor-pointer w-full ${finProche ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
            onClick={() => setFinProche(!finProche)}
          >
            Derniers jours
          </button>
          <button
            className={`p-2 rounded shadow-md cursor-pointer w-full ${enCours ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
            onClick={() => {
              setEnCours(!enCours);
              setAVenir(false);
            }}
          >
            En cours
          </button>
          <button
            className={`p-2 rounded shadow-md cursor-pointer w-full ${aVenir ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
            onClick={() => {
              setAVenir(!aVenir);
              setEnCours(false);
            }}
          >
            A venir
          </button>
          {(selectedTag || selectedArrondissement || selectedDate || petitBudget || finProche || enCours || aVenir) && (
            <button
              className="p-2 rounded shadow-md bg-gray-800 text-white w-full"
              onClick={() => {
                resetFilters();
              }}
            >
              Effacer les filtres
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedTag) count++;
    if (selectedArrondissement) count++;
    if (selectedDate) count++;
    if (petitBudget) count++;
    if (finProche) count++;
    if (enCours) count++;
    if (aVenir) count++;
    return count;
  };

  return (
    <div className="flex flex-col h-screen m-0 p-0">
      {isMobile && showMap ? (
        <div className="h-full w-full">
          <div className="relative h-full w-full">
            <MapContainer ref={mapRef} center={initialCenter} zoom={initialZoom} className="h-full w-full" style={{ position: 'relative', zIndex: 0 }} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <MapEvents
                setFilteredExpos={setFilteredExpos}
                expos={expos}
                setButtonVisible={setButtonVisible}
                selectedTag={selectedTag}
                selectedArrondissement={selectedArrondissement}
                selectedDate={selectedDate}
                petitBudget={petitBudget}
                finProche={finProche}
                enCours={enCours}
                aVenir={aVenir}
                dateFilterEnabled={dateFilterEnabled}
              />
              {filteredExpos.map((expo) => (
                <Marker
                  key={expo.titre}
                  position={[expo.latitude, expo.longitude]}
                  icon={hoveredExpo === expo.titre ? expoIconHover : expoIcon}
                  ref={(el) => (markerRefs.current[expo.titre] = el)}
                  eventHandlers={{
                    click: () => openModal(expo),
                  }}
                >
                </Marker>
              ))}
            </MapContainer>
          </div>
          <div className="mobile-floating-buttons">
            <button
              className="bg-gray-200 text-gray-800"
              onClick={() => setShowMap(!showMap)}
            >
              <i className="fas fa-list"></i>
            </button>
            <button
              className={`${showFilters ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
              onClick={() => setFiltersModalOpen(true)}
            >
              <i className="fas fa-filter"></i>
              {getActiveFiltersCount() > 0 && (
                <span className="filter-count">{getActiveFiltersCount()}</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className={`w-full h-full ${isMobile ? "grid grid-cols-1" : (showMap ? "grid grid-cols-3" : "grid grid-cols-2")}`}>
          <div className="col-span-2 bg-gray-100 overflow-auto p-4">
            <div className="mb-4">
              <h1 className="text-4xl font-bold mb-4">RadarExpo</h1>
              {(!isMobile || !showMap) && (
                <p>Trouve l'expo idéale en fonction de tes envies, ton budget, tes horaires de boulot...</p>
              )}
            </div>
            {isMobile && (
              <div className="mobile-floating-buttons">
                <button
                  className={`${showMap ? "bg-gray-200 text-gray-800" : "bg-white text-gray-800"}`}
                  onClick={() => setShowMap(!showMap)}
                >
                  <i className={`fas ${showMap ? "fa-list" : "fa-map-marked-alt"}`}></i>
                </button>
                <button
                  className={`${showFilters ? "bg-gray-400 text-white" : "bg-white text-gray-800"}`}
                  onClick={() => setFiltersModalOpen(true)}
                >
                  <i className="fas fa-filter"></i>
                  {getActiveFiltersCount() > 0 && (
                    <span className="filter-count">{getActiveFiltersCount()}</span>
                  )}
                </button>
              </div>
            )}
            {!isMobile && showFilters && (
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
                  {buttonVisible && (
                    <button
                      className="px-4 py-2 rounded shadow-md bg-gray-400 text-white mb-2 w-full sm:w-auto"
                      onClick={resetMapView}
                    >
                      Réinitialiser la carte
                    </button>
                  )}
                  {(selectedTag || selectedArrondissement || selectedDate || petitBudget || finProche || enCours || aVenir) && (
                    <button
                      className="px-4 py-2 rounded shadow-md bg-gray-800 text-white mb-2 w-full sm:w-auto"
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
                      onMouseEnter={() => setHoveredExpo(expo.titre)}
                      onMouseLeave={() => setHoveredExpo(null)}
                    >
                      <div className="relative w-1/3">
                        <img
                          src={expo.img_url}
                          alt={expo.titre}
                          className="w-full h-full object-cover"
                        />
                        {isEndingSoon(expo.date_fin) && (
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
            )}
          </div>
          
          {!isMobile && showMap && (
            <div className="col-span-1 p-4 relative flex flex-col h-full">
              <div className="relative h-full w-full">
                <MapContainer ref={mapRef} center={initialCenter} zoom={initialZoom} className="h-full w-full rounded-lg overflow-hidden shadow-lg" style={{ borderRadius: "1rem", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", position: 'relative', zIndex: 0 }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <MapEvents
                    setFilteredExpos={setFilteredExpos}
                    expos={expos}
                    setButtonVisible={setButtonVisible}
                    selectedTag={selectedTag}
                    selectedArrondissement={selectedArrondissement}
                    selectedDate={selectedDate}
                    petitBudget={petitBudget}
                    finProche={finProche}
                    enCours={enCours}
                    aVenir={aVenir}
                    dateFilterEnabled={dateFilterEnabled}
                  />
                  {filteredExpos.map((expo) => (
                    <Marker
                      key={expo.titre}
                      position={[expo.latitude, expo.longitude]}
                      icon={hoveredExpo === expo.titre ? expoIconHover : expoIcon}
                      ref={(el) => (markerRefs.current[expo.titre] = el)}
                      eventHandlers={{
                        click: () => openModal(expo),
                      }}
                    >
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Expo Details"
        className={`modal-content ${isSlidingOut ? 'modal-slide-out' : 'modal-slide-in'} ${isExpanded ? 'expanded' : ''}`}
        overlayClassName="modal-overlay"
        style={{
          content: {
            height: isExpanded ? '100%' : '90%',
            maxHeight: isExpanded ? '100vh' : '90vh',
            borderRadius: isExpanded ? '0' : '16px 16px 0 0',
          }
        }}
      >
        <div>
          {selectedExpo && (
            <>
              <div className={`modal-content-wrapper ${isMobile ? 'flex flex-col' : 'modal-header flex'}`}>
                <div className={`modal-image ${isMobile ? 'w-full mb-4' : 'w-2/5 mr-4'} relative`}>
                  {isMobile && (
                    <button 
                      className={`modal-close-button ${isAtTop ? 'visible' : 'invisible'}`} 
                      onClick={handleCloseModal}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                  <img 
                    src={selectedExpo.img_url} 
                    alt={selectedExpo.titre} 
                    onClick={() => openEnlargedImage(selectedExpo.img_url)}
                    className="w-full h-auto object-cover rounded-lg"
                  />
                </div>
                {!isMobile && (
                  <button className="modal-close" onClick={closeModal}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
                <div className={`modal-details ${isMobile ? 'w-full' : 'w-3/5'}`}>
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
              {selectedExpo.imgs_carousel_data && selectedExpo.imgs_carousel_data.length > 0 && (
                <div className={`${isMobile ? 'mt-6' : 'p-4'}`}>
                  <Masonry
                    breakpointCols={{ default: 3, 800: 1, 400: 1 }}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                  >
                    {selectedExpo.imgs_carousel_data.map((img, index) => (
                      <div key={index} className="mb-4">
                        <img 
                          src={img.url} 
                          alt={img.description} 
                          className="w-full h-auto rounded-lg shadow-lg cursor-pointer" 
                          onClick={() => openEnlargedImage(img.url)} 
                        />
                      </div>
                    ))}
                  </Masonry>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={!!enlargedImage}
        onRequestClose={closeEnlargedImage}
        contentLabel="Enlarged Image"
        className="enlarged-image-modal"
        overlayClassName="modal-overlay"
        shouldCloseOnOverlayClick={true}
      >
        {/* Wrapper to detect clicks outside the image */}
        <div
          className="enlarged-image-wrapper"
          onClick={closeEnlargedImage}
          style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}
        >
          {/* Stop click propagation on the image to prevent accidental closing */}
          <img
            src={enlargedImage}
            alt="Enlarged"
            className="max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </Modal>
      <Modal
        isOpen={filtersModalOpen}
        onRequestClose={() => setFiltersModalOpen(false)}
        contentLabel="Filters Modal"
        className="filters-modal"
        overlayClassName="filters-modal-overlay"
      >
        <FiltersModal />
      </Modal>
    </div>
  );
}
