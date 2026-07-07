import React, { useState, useEffect } from "react";
import { FaCalendarAlt, FaTimes, FaSave, FaTrash } from "react-icons/fa";
import moment from "moment";
import { createEvent, updateEvent, deleteEvent } from "../../../api/events";
import { fetchClients } from "../../../api/clients";
import { fetchUsers } from "../../../api/users";
import { useAuthContext } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import API_BASE_URL from "../../../config";
import styles from "./EventModal.module.css";

function buildDefaultEventForm({ userId, initialClientId, initialEquipmentId }) {
  return {
    title: "",
    type: "intervention",
    startDate: moment().format("YYYY-MM-DD"),
    startTime: "09:00",
    endDate: moment().format("YYYY-MM-DD"),
    endTime: "12:00",
    description: "",
    clientId: initialClientId ?? null,
    equipmentId: initialEquipmentId ?? null,
    assignedUserId: userId || null,
  };
}

function buildFormFromEvent(event) {
  const start = moment(event.start);
  const end = moment(event.end);
  const clientId = event.clientId ?? event.client_id ?? null;
  const equipmentId = event.equipmentId ?? event.equipment_id ?? null;

  return {
    title: event.title || "",
    type: event.type || "intervention",
    startDate: start.isValid() ? start.format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
    startTime: start.isValid() ? start.format("HH:mm") : "09:00",
    endDate: end.isValid() ? end.format("YYYY-MM-DD") : moment().format("YYYY-MM-DD"),
    endTime: end.isValid() ? end.format("HH:mm") : "12:00",
    description: event.description || "",
    clientId,
    equipmentId,
    assignedUserId: event.assignedUserId ?? event.assigned_user_id ?? null,
  };
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  editingEvent = null,
  initialClientId = null,
  initialEquipmentId = null,
  resetToken = 0,
  onEventCreated,
  onEventUpdated,
  onEventDeleted
}) {
  const { user } = useAuthContext();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [peripherals, setPeripherals] = useState([]);
  const [selectedPeripheral, setSelectedPeripheral] = useState("");
  const [cybersecurities, setCybersecurities] = useState([]);
  const [selectedCybersecurity, setSelectedCybersecurity] = useState("");
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  
  const [eventForm, setEventForm] = useState(() =>
    buildDefaultEventForm({
      userId: user?.id,
      initialClientId,
      initialEquipmentId,
    })
  );

  const infrastructureTypes = ['Serveurs', 'NAS', 'SAN', 'Firewalls', 'Internet', 'Switch', 'BorneWifi'];
  const cybersecurityTypes = ['Antispam', 'Antivirus', 'Sauvegarde'];
  const serviceTypes = ['Office365', 'NDD'];
  const [equipmentMappings, setEquipmentMappings] = useState({});

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const [clientsList, usersList] = await Promise.all([
            fetchClients().catch(() => []),
            fetchUsers().catch(() => [])
          ]);
          setClients(clientsList);
          setUsers(usersList);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingEvent) {
      const form = buildFormFromEvent(editingEvent);
      setEventForm(form);
      setSelectedClient(form.clientId ? String(form.clientId) : "");
      setSelectedPeripheral("");
      setSelectedCybersecurity("");
      setSelectedService("");
      return;
    }

    const form = buildDefaultEventForm({
      userId: user?.id,
      initialClientId,
      initialEquipmentId,
    });
    setEventForm(form);
    setSelectedClient(initialClientId ? String(initialClientId) : "");
    setSelectedPeripheral(initialEquipmentId ? String(initialEquipmentId) : "");
    setSelectedCybersecurity("");
    setSelectedService("");
  }, [isOpen, editingEvent, initialClientId, initialEquipmentId, resetToken, user?.id]);

  useEffect(() => {
    if (!isOpen || !editingEvent) return;

    const equipmentId = editingEvent.equipmentId ?? editingEvent.equipment_id;
    if (!equipmentId) return;

    const eqId = String(equipmentId);
    if (peripherals.some((item) => String(item.id) === eqId)) {
      setSelectedPeripheral(eqId);
      setSelectedCybersecurity("");
      setSelectedService("");
    } else if (cybersecurities.some((item) => String(item.id) === eqId)) {
      setSelectedCybersecurity(eqId);
      setSelectedPeripheral("");
      setSelectedService("");
    } else if (services.some((item) => String(item.id) === eqId)) {
      setSelectedService(eqId);
      setSelectedPeripheral("");
      setSelectedCybersecurity("");
    }
  }, [isOpen, editingEvent, peripherals, cybersecurities, services]);

  useEffect(() => {
    if (selectedClient) {
      const client = clients.find((c) => c.id === parseInt(selectedClient));
      if (client) {
        const loadMappings = async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/checkmk/mapping/${client.id}`, {
              credentials: 'include'
            });
            if (response.ok) {
              const mappings = await response.json();
              const mappingsMap = {};
              mappings.forEach(m => {
                const key = `${m.equipment_type}-${m.equipment_name}`;
                mappingsMap[key] = m;
              });
              setEquipmentMappings(mappingsMap);
            }
          } catch (error) {
            console.error("Erreur lors du chargement des mappings:", error);
            setEquipmentMappings({});
          }
        };
        loadMappings();
      }
    } else {
      setEquipmentMappings({});
    }
  }, [selectedClient, clients]);

  // Charger les périphériques, cybersécurités et services quand un client est sélectionné
  useEffect(() => {
    if (selectedClient) {
      const client = clients.find((c) => c.id === parseInt(selectedClient));
      
      if (client) {
        // Charger les périphériques infrastructure (équipements matériels)
        const peripheralsList = [];
        if (client.equipements) {
          Object.keys(client.equipements).forEach((type) => {
            if (infrastructureTypes.includes(type)) {
              const equipmentsOfType = client.equipements[type] || [];
              equipmentsOfType.forEach((eq) => {
                const equipmentName = eq.name || eq.nom || "Sans nom";
                const mappingKey = `${type}-${equipmentName}`;
                const mapping = equipmentMappings[mappingKey];
                const isMapped = mapping && mapping.checkmk_host_name && (mapping.is_active !== false);
                // Extraire l'IP depuis différents champs possibles
                const equipmentIP = eq.ip || eq.adresseIP || eq.adresse_ip || null;
                
                peripheralsList.push({
                  id: eq.id || `${type}-${equipmentName}`,
                  name: equipmentName,
                  type: type,
                  isMapped: isMapped,
                  mapping: mapping,
                  ip: equipmentIP,
                });
              });
            }
          });
        }
        setPeripherals(peripheralsList);

        // Charger les cybersécurités
        const cybersecuritiesList = [];
        if (client.equipements) {
          Object.keys(client.equipements).forEach((type) => {
            if (cybersecurityTypes.includes(type)) {
              const cybersecOfType = client.equipements[type];
              
              // Pour Sauvegarde : utiliser les instances avec leur nom de logiciel
              if (type === 'Sauvegarde' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.instances && Array.isArray(cybersecOfType.instances)) {
                  cybersecOfType.instances.forEach((instance) => {
                    // Utiliser le nom du logiciel (HyperBackup, Veeam, HYCU Backup, etc.)
                    const instanceName = instance.logiciel || instance.nom || instance.name || 'Instance de sauvegarde';
                    cybersecuritiesList.push({
                      id: `${type}-${instance.logiciel || instance.nom || instance.name || 'instance'}-${cybersecOfType.instances.indexOf(instance)}`,
                      name: instanceName,
                      type: type,
                    });
                  });
                }
              }
              // Pour Antivirus : utiliser les solutions avec leur nom
              else if (type === 'Antivirus' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
                  cybersecOfType.solutions.forEach((solution) => {
                    // Utiliser le nom de la solution (GravityZone BitDefender, etc.)
                    const solutionName = solution.logiciel || solution.solution || solution.companyName || 'Antivirus';
                    cybersecuritiesList.push({
                      id: `${type}-${solution.logiciel || solution.companyName || 'solution'}-${cybersecOfType.solutions.indexOf(solution)}`,
                      name: solutionName,
                      type: type,
                    });
                  });
                }
              }
              // Pour Antispam : utiliser les solutions avec leur nom
              else if (type === 'Antispam' && cybersecOfType && typeof cybersecOfType === 'object') {
                if (cybersecOfType.solutions && Array.isArray(cybersecOfType.solutions)) {
                  cybersecOfType.solutions.forEach((solution) => {
                    // Utiliser le nom de la solution (Mail In Black, Vade Secure, etc.)
                    const solutionName = solution.logiciel || solution.solution || 'Antispam';
                    cybersecuritiesList.push({
                      id: `${type}-${solution.logiciel || 'solution'}-${cybersecOfType.solutions.indexOf(solution)}`,
                      name: solutionName,
                      type: type,
                    });
                  });
                }
              }
              // Fallback pour les structures en tableau (ancienne structure possible)
              else if (Array.isArray(cybersecOfType)) {
                cybersecOfType.forEach((cyber, index) => {
                  if (cyber && typeof cyber === 'object') {
                    let displayName = cyber.logiciel || cyber.solution || cyber.companyName || cyber.name || cyber.nom || type;
                    cybersecuritiesList.push({
                      id: cyber.id || `${type}-${displayName}-${index}`,
                      name: displayName,
                      type: type,
                    });
                  }
                });
              }
            }
          });
        }
        setCybersecurities(cybersecuritiesList);

        // Charger les services (Office365 et NDD) - utilisent des UUID
        const servicesList = [];
        
        if (client.equipements) {
          Object.keys(client.equipements).forEach((type) => {
            if (serviceTypes.includes(type)) {
              const servicesOfType = client.equipements[type] || [];
              if (Array.isArray(servicesOfType)) {
                servicesOfType.forEach((svc) => {
                  if (svc && typeof svc === 'object') {
                    // Utiliser l'UUID réel du service
                    const serviceId = svc.id; // UUID réel
                    if (serviceId) {
                      servicesList.push({
                        id: serviceId, // UUID réel
                        name: svc.name || svc.nom || type,
                        type: type,
                      });
                    }
                  }
                });
              } else if (servicesOfType && typeof servicesOfType === 'object') {
                // Pour Office365 qui peut être un objet
                const serviceId = servicesOfType.id; // UUID réel
                if (serviceId) {
                  servicesList.push({
                    id: serviceId, // UUID réel
                    name: servicesOfType.name || servicesOfType.nom || 'Office 365',
                    type: type,
                  });
                }
              }
            }
          });
        }
        setServices(servicesList);
      } else {
        setPeripherals([]);
        setCybersecurities([]);
        setServices([]);
      }
      setSelectedPeripheral("");
      setSelectedCybersecurity("");
      setSelectedService("");
    } else {
      setPeripherals([]);
      setCybersecurities([]);
      setServices([]);
      setSelectedPeripheral("");
      setSelectedCybersecurity("");
      setSelectedService("");
    }
  }, [selectedClient, clients, equipmentMappings]);

  const handleInputChange = (field, value) => {
    setEventForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (clientId) => {
    setSelectedClient(clientId);
    setSelectedPeripheral("");
    setSelectedCybersecurity("");
    setSelectedService("");
    setEventForm((prev) => ({
      ...prev,
      clientId: clientId ? parseInt(clientId) : null,
      equipmentId: null,
    }));
  };

  const handlePeripheralChange = (peripheralId) => {
    setSelectedPeripheral(peripheralId);
    setSelectedService("");
    setSelectedCybersecurity("");
    setEventForm((prev) => ({
      ...prev,
      equipmentId: peripheralId || null,
    }));
  };

  const handleCybersecurityChange = (cybersecurityId) => {
    setSelectedCybersecurity(cybersecurityId);
    setSelectedPeripheral("");
    setSelectedService("");
    setEventForm((prev) => ({
      ...prev,
      equipmentId: cybersecurityId || null,
    }));
  };

  const handleServiceChange = (serviceId) => {
    setSelectedService(serviceId);
    setSelectedPeripheral("");
    setSelectedCybersecurity("");
    setEventForm((prev) => ({
      ...prev,
      equipmentId: serviceId || null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!eventForm.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    const startDateTime = moment(`${eventForm.startDate} ${eventForm.startTime}`).toDate();
    const endDateTime = moment(`${eventForm.endDate} ${eventForm.endTime}`).toDate();

    if (endDateTime <= startDateTime) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setSaving(true);
    try {
      const equipmentId = eventForm.equipmentId && eventForm.equipmentId.toString().trim() !== '' 
        ? eventForm.equipmentId.toString().trim()
        : null;

      const eventData = {
        title: eventForm.title.trim(),
        type: eventForm.type,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        description: eventForm.description.trim() || null,
        clientId: eventForm.clientId || null,
        equipmentId: equipmentId,
        assignedUserId: eventForm.assignedUserId || null,
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        toast.success("Événement mis à jour avec succès");
        if (onEventUpdated) onEventUpdated();
      } else {
        await createEvent(eventData);
        toast.success("Événement créé avec succès");
        if (onEventCreated) onEventCreated();
      }
      
      onClose();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(editingEvent ? "Erreur lors de la mise à jour de l'événement" : "Erreur lors de la création de l'événement");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <FaCalendarAlt className={styles.modalIcon} />
            {editingEvent ? "Édition d'événement" : "Création d'événement"}
          </h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            title="Fermer"
          >
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.modalFormGrid}>
              <div className={styles.modalFormColumn}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Nom de l'événement <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={eventForm.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Ex: Maintenance préventive - Serveur"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Affectation <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={eventForm.assignedUserId || ""}
                    onChange={(e) => handleInputChange("assignedUserId", e.target.value || null)}
                    required
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username || u.email} {u.id === user?.id ? "(Moi)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Date de début <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={eventForm.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Heure de début <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={eventForm.startTime}
                      onChange={(e) => handleInputChange("startTime", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Date de fin <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      className={styles.formInput}
                      value={eventForm.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Heure de fin <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="time"
                      className={styles.formInput}
                      value={eventForm.endTime}
                      onChange={(e) => handleInputChange("endTime", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFormColumn}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Type d'événement <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.formSelect}
                    value={eventForm.type}
                    onChange={(e) => handleInputChange("type", e.target.value)}
                    required
                  >
                    <option value="presentation">Présentation client</option>
                    <option value="maintenance_preventive">Maintenance préventive</option>
                    <option value="intervention">Intervention</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="mise_a_jour">Mise à jour</option>
                    <option value="integration_monitoring">Intégration monitoring</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Client</label>
                  <select
                    className={styles.formSelect}
                    value={selectedClient}
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    <option value="">Aucun client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nom || client.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient && (
                  <>
                    {/* Périphériques Infrastructure */}
                    {peripherals.length > 0 && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Périphérique Infrastructure</label>
                        <select
                          className={styles.formSelect}
                          value={selectedPeripheral}
                          onChange={(e) => handlePeripheralChange(e.target.value)}
                        >
                          <option value="">Aucun périphérique</option>
                          {(() => {
                            // Grouper par type
                            const grouped = {};
                            peripherals.forEach(p => {
                              if (!grouped[p.type]) grouped[p.type] = [];
                              grouped[p.type].push(p);
                            });
                            
                            // Ordre d'affichage des catégories
                            const categoryOrder = ['Serveurs', 'NAS', 'SAN', 'Firewalls', 'Internet', 'Switch', 'BorneWifi'];
                            const categoryLabels = {
                              'Serveurs': 'Serveurs',
                              'NAS': 'Stockage (NAS)',
                              'SAN': 'Stockage (SAN)',
                              'Firewalls': 'Firewalls',
                              'Internet': 'Connexion Internet',
                              'Switch': 'Switchs',
                              'BorneWifi': 'Bornes WiFi'
                            };
                            
                            const options = [];
                            categoryOrder.forEach(type => {
                              if (grouped[type] && grouped[type].length > 0) {
                                options.push(
                                  <optgroup key={type} label={categoryLabels[type] || type}>
                                    {grouped[type].map((peripheral) => (
                                      <option key={peripheral.id} value={peripheral.id}>
                                        {peripheral.isMapped ? '✓ ' : '○ '}
                                        {peripheral.name}
                                        {peripheral.ip ? ` - ${peripheral.ip}` : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              }
                            });
                            return options;
                          })()}
                        </select>
                      </div>
                    )}

                    {/* Cybersécurités et Services */}
                    {(cybersecurities.length > 0 || services.length > 0) && (
                      <div className={styles.formRow}>
                        {cybersecurities.length > 0 && (
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Cybersécurité</label>
                            <select
                              className={styles.formSelect}
                              value={selectedCybersecurity}
                              onChange={(e) => handleCybersecurityChange(e.target.value)}
                            >
                              <option value="">Aucune cybersécurité</option>
                              {cybersecurities.map((cyber) => (
                                <option key={cyber.id} value={cyber.id}>
                                  {cyber.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {services.length > 0 && (
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Service</label>
                            <select
                              className={styles.formSelect}
                              value={selectedService}
                              onChange={(e) => handleServiceChange(e.target.value)}
                            >
                              <option value="">Aucun service</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name} ({service.type === 'Office365' ? 'Office 365' : service.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea
                className={styles.formTextarea}
                value={eventForm.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
                placeholder="Détails supplémentaires sur l'événement..."
              />
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="submit" className={styles.modalSaveButton} disabled={saving}>
              <FaSave />
              <span>{saving ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

