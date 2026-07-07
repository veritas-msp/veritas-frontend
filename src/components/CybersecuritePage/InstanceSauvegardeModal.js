// ──────────────────────────────
// Modal d'édition / ajout d'une instance de sauvegarde (HYCU, Veeam, Active Backup, HyperBackup)
// Formulaire aligné sur StepSauvegarde.js
// ──────────────────────────────
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import styles from "./InstanceSauvegardeModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "./cyberModalsI18n";

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const INSTANCE_TYPE_LABELS = {
  'HYCU Backup': 'HYCU Backup',
  'Veeam': 'Veeam',
  'Active Backup for Microsoft 365': 'Active Backup for Microsoft 365',
  'HyperBackup': 'HyperBackup'
};

export default function InstanceSauvegardeModal({
  open,
  onClose,
  mode,
  instanceType,
  clientId: initialClientId,
  clientName,
  instance: initialInstance,
  clients = [],
  onSaved
}) {
  const locale = useAppLocale();
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const isEdit = mode === 'edit';
  const [clientId, setClientId] = useState(initialClientId || '');
  const [equipements, setEquipements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formInstance, setFormInstance] = useState(null);

  const currentLogiciel = isEdit ? (initialInstance?.logiciel) : instanceType;

  const loadModules = useCallback(async (cid) => {
    if (!cid) return null;
    setLoading(true);
    try {
      const data = await fetchClientModules(cid);
      setEquipements(data.equipements || {});
      const instances = data.equipements?.Sauvegarde?.instances || [];
      if (isEdit && initialInstance?.id) {
        const idx = instances.findIndex(inst => (inst.id || inst.instanceId) === (initialInstance.id || initialInstance.instanceId));
        if (idx >= 0) setFormInstance({ ...instances[idx] });
        else setFormInstance({ ...initialInstance });
      } else if (!isEdit && currentLogiciel) {
        const tempInstanceId = generateUUID();
        const newInstance = {
          id: tempInstanceId,
          logiciel: currentLogiciel,
          expiration: currentLogiciel === 'Veeam' ? '' : undefined,
          server: currentLogiciel === 'HYCU Backup' ? 'Datacenter PSI' : '',
          hyperbackupSource: currentLogiciel === 'HyperBackup' ? '' : undefined,
          hyperbackupDestination: currentLogiciel === 'HyperBackup' ? '' : undefined,
          jobs: (currentLogiciel === 'HyperBackup' || currentLogiciel === 'HYCU Backup') ? [] : [],
          activeBackupModules: currentLogiciel === 'Active Backup for Microsoft 365' ? {
            oneDrive: false,
            sharePoint: false,
            exchange: false,
            teams: false,
            calendar: false,
            contacts: false
          } : undefined,
          activeBackupStorage: currentLogiciel === 'Active Backup for Microsoft 365' ? '' : undefined
        };
        setFormInstance(newInstance);
      }
      return data;
    } catch (e) {
      toast.error('Erreur lors du chargement des données client');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isEdit, initialInstance, currentLogiciel]);

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialClientId) {
      setClientId(initialClientId);
      loadModules(initialClientId);
    } else if (!isEdit && initialClientId) {
      setClientId(initialClientId);
      loadModules(initialClientId);
    } else if (!isEdit && !initialClientId) {
      setClientId('');
      setEquipements(null);
      setFormInstance(null);
    }
  }, [open, isEdit, initialClientId, loadModules]);

  useEffect(() => {
    if (!open) return;
    if (clientId && !isEdit && !formInstance && currentLogiciel) {
      loadModules(clientId);
    }
  }, [open, clientId, isEdit, currentLogiciel, loadModules]);

  const updateField = (field, value) => {
    setFormInstance(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cid = isEdit ? initialClientId : clientId;
    if (!cid) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (!formInstance) return;
    setSaving(true);
    try {
      const modulesData = equipements ? { equipements } : await fetchClientModules(cid);
      const existingEquipements = modulesData.equipements || {};
      const currentInstances = existingEquipements.Sauvegarde?.instances || [];

      let updatedInstances;
      if (isEdit) {
        const instanceId = formInstance.id || initialInstance?.id;
        updatedInstances = currentInstances.map(inst =>
          (inst.id || inst.instanceId) === instanceId ? { ...formInstance, id: inst.id || formInstance.id } : inst
        );
      } else {
        updatedInstances = [...currentInstances, { ...formInstance }];
      }

      await saveClientModules(cid, {
        equipements: {
          ...existingEquipements,
          Sauvegarde: { instances: updatedInstances }
        }
      });
      toast.success(isEdit ? 'Instance mise à jour' : 'Instance ajoutée');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!isEdit || !initialClientId || !formInstance) return;
    if (!window.confirm(cyberCopy.deleteBackupInstance)) return;
    setDeleting(true);
    try {
      const modulesData = equipements ? { equipements } : await fetchClientModules(initialClientId);
      const existingEquipements = modulesData.equipements || {};
      const currentInstances = existingEquipements.Sauvegarde?.instances || [];
      const instanceId = formInstance.id || initialInstance?.id;
      const updatedInstances = currentInstances.filter(
        inst => (inst.id || inst.instanceId) !== instanceId
      );
      await saveClientModules(initialClientId, {
        equipements: {
          ...existingEquipements,
          Sauvegarde: { instances: updatedInstances }
        }
      });
      toast.success("Instance supprimée");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const showClientSelect = !isEdit && !initialClientId && !formInstance;
  const canShowForm = (isEdit && formInstance) || (!isEdit && (initialClientId ? formInstance : clientId && formInstance));

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Icon icon={isEdit ? 'mdi:pencil' : 'mdi:plus-circle'} className={styles.modalIcon} />
            <h3>
              {isEdit
                ? `Modifier l'instance ${INSTANCE_TYPE_LABELS[currentLogiciel] || currentLogiciel}`
                : `Ajouter une instance ${INSTANCE_TYPE_LABELS[instanceType] || instanceType}`}
            </h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Fermer">
            <FaTimes />
          </button>
        </div>

        {showClientSelect && (
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Client <span className={styles.required}>*</span></label>
              <select
                className={styles.fieldInput}
                value={clientId}
                onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sélectionner un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.nom || `Client ${c.id}`}</option>
                ))}
              </select>
            </div>
            {clientId && loading && <p className={styles.loadingText}>Chargement...</p>}
          </div>
        )}

        {!showClientSelect && (
          <>
            {isEdit && clientName && (
              <div className={styles.clientBadge}>
                Client : <strong>{clientName}</strong>
              </div>
            )}
            {loading && !formInstance && <div className={styles.modalBody}><p className={styles.loadingText}>Chargement...</p></div>}
            {canShowForm && formInstance && (
              <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  {/* Veeam : date d'expiration + serveur (add + edit) */}
                  {currentLogiciel === 'Veeam' && (
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Date d'expiration</label>
                        <input
                          type="date"
                          className={styles.fieldInput}
                          value={formInstance.expiration ?? ''}
                          onChange={(e) => updateField('expiration', e.target.value)}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Serveur de sauvegarde</label>
                        <select
                          className={styles.fieldInput}
                          value={formInstance.server || ''}
                          onChange={(e) => updateField('server', e.target.value)}
                        >
                          <option value="">Aucun serveur de sauvegarde</option>
                          {(equipements?.Serveurs || []).map((s, i) => (
                            <option key={i} value={s.nom}>
                              {s.nom} - {Array.isArray(s.role) ? s.role.join(', ') : s.role} ({s.ip})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Active Backup for Microsoft 365 */}
                  {currentLogiciel === 'Active Backup for Microsoft 365' && (
                    <div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Modules activés</label>
                        <div className={styles.modulesGrid}>
                          {[
                            { key: 'oneDrive', label: 'OneDrive' },
                            { key: 'sharePoint', label: 'SharePoint' },
                            { key: 'exchange', label: 'Exchange' },
                            { key: 'teams', label: 'Teams' },
                            { key: 'calendar', label: 'Calendar' },
                            { key: 'contacts', label: 'Contacts' }
                          ].map(({ key, label }) => (
                            <label key={key} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                checked={formInstance.activeBackupModules?.[key] || false}
                                onChange={(e) => {
                                  const updated = {
                                    ...(formInstance.activeBackupModules || {
                                      oneDrive: false,
                                      sharePoint: false,
                                      exchange: false,
                                      teams: false,
                                      calendar: false,
                                      contacts: false
                                    }),
                                    [key]: e.target.checked
                                  };
                                  updateField('activeBackupModules', updated);
                                }}
                                className={styles.checkbox}
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Destination</label>
                        <select
                          className={styles.fieldInput}
                          value={formInstance.activeBackupStorage || ''}
                          onChange={(e) => updateField('activeBackupStorage', e.target.value)}
                        >
                          <option value="">Sélectionner une destination</option>
                          {(equipements?.NAS || [])
                            .filter((eq) => eq.type === 'NAS' || eq.type === 'SAN')
                            .map((eq, i) => (
                              <option key={i} value={eq.nom}>
                                {eq.nom} {eq.modele ? `(${eq.modele})` : ''} {eq.ip ? ` - ${eq.ip}` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* HyperBackup : NAS d'origine + NAS de destination (add + edit) */}
                  {currentLogiciel === 'HyperBackup' && (
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>NAS d'origine</label>
                        <select
                          className={styles.fieldInput}
                          value={formInstance.hyperbackupSource ?? ''}
                          onChange={(e) => updateField('hyperbackupSource', e.target.value)}
                        >
                          <option value="">Sélectionner un NAS Synology source</option>
                          {(equipements?.NAS || [])
                            .filter(n => (n.fabricant || '').toLowerCase().includes('synology') || (n.nom || '').toLowerCase().includes('synology'))
                            .map((n, i) => (
                              <option key={i} value={`NAS-${n.nom}`}>
                                {n.nom} (NAS) - {n.fabricant || ''} {n.modele || ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>NAS de destination</label>
                        <select
                          className={styles.fieldInput}
                          value={formInstance.hyperbackupDestination ?? ''}
                          onChange={(e) => updateField('hyperbackupDestination', e.target.value)}
                        >
                          <option value="">Sélectionner un NAS ou disque de destination</option>
                          {(equipements?.NAS || [])
                            .filter(n => {
                              const src = formInstance.hyperbackupSource || '';
                              const v = `NAS-${n.nom}`;
                              return v !== src && ((n.fabricant || '').toLowerCase().includes('synology') || (n.nom || '').toLowerCase().includes('synology'));
                            })
                            .map((n, i) => (
                              <option key={`nas-${i}`} value={`NAS-${n.nom}`}>
                                {n.nom} (NAS) - {n.fabricant || ''} {n.modele || ''}
                              </option>
                            ))}
                          {(equipements?.NAS || [])
                            .filter(n => n.type === 'Disque dur externe')
                            .map((d, i) => (
                              <option key={`d-${i}`} value={`DISQUE-${d.nom}${d.numeroDisque ? `-${d.numeroDisque}` : ''}`}>
                                {d.nom} (Disque dur externe){d.numeroDisque ? ` - N°${d.numeroDisque}` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* HYCU Backup : optionnel serveur (affiché comme "Nom" dans la table) */}
                  {currentLogiciel === 'HYCU Backup' && (
                    <div className={styles.formField}>
                      <label className={styles.fieldLabel}>Serveur (Datacenter)</label>
                      <select
                        className={styles.fieldInput}
                        value={formInstance.server || 'Datacenter PSI'}
                        onChange={(e) => updateField('server', e.target.value)}
                      >
                        <option value="Datacenter PSI">Datacenter PSI</option>
                        {(equipements?.Serveurs || []).map((s, i) => (
                          <option key={i} value={s.nom}>
                            {s.nom} - {Array.isArray(s.role) ? s.role.join(', ') : s.role} ({s.ip})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className={styles.modalFooter}>
                  {isEdit && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={handleDeleteInstance}
                      disabled={saving || deleting}
                      title="Supprimer l'instance"
                    >
                      <FaTrash /> {deleting ? 'Suppression...' : 'Supprimer l\'instance'}
                    </button>
                  )}
                  <div className={styles.modalFooterRight}>
                    <button type="button" className={styles.cancelButton} onClick={onClose}>
                      Annuler
                    </button>
                    <button type="submit" className={styles.submitButton} disabled={saving}>
                      {saving ? 'Enregistrement...' : (isEdit ? 'Enregistrer' : 'Ajouter')}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
