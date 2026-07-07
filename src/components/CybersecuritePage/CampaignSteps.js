// ──────────────────────────────
// 📦 Dépendances
// ──────────────────────────────
import { useState, useEffect, useMemo } from "react";
import React from "react";
import { Icon } from "@iconify/react";
import { FaPlus, FaTrash, FaEdit, FaCheck, FaUser, FaGripVertical, FaEnvelope } from "react-icons/fa";
import { toast } from 'react-toastify';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCampaignSteps, createCampaignStep, updateCampaignStep, deleteCampaignStep, updateClientCampaign, reorderCampaignSteps } from "../../api/campaigns";
import { fetchUsers } from "../../api/users";
import CampaignEmailModal from "./CampaignEmailModal";
import CampaignStepModal from "./CampaignStepModal";
import styles from "./CampaignSteps.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "./cyberModalsI18n";

// ──────────────────────────────
// 🧩 Composant : StepItem (Sortable)
// ──────────────────────────────
function SortableStepItem({ step, onEdit, onDelete, onToggleComplete, getUserName, formatDate, isOverdue, onSendEmail }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.stepItem} ${isDragging ? styles.dragging : ''} ${step.completed ? styles.stepCompleted : ''} ${isOverdue(step.due_date, step.completed) ? styles.stepOverdue : ''}`}
    >
      <div className={styles.stepDragHandle} {...attributes} {...listeners}>
        <FaGripVertical className={styles.dragIcon} />
      </div>
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <button
            className={`${styles.checkbox} ${step.completed ? styles.checkboxChecked : ''}`}
            onClick={() => onToggleComplete(step)}
            title={step.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}
          >
            {step.completed && <FaCheck />}
          </button>
          <span className={styles.stepName}>{step.name}</span>
        </div>
        <div className={styles.stepDetails}>
          {step.assigned_user_id ? (
            <div className={styles.stepDetail}>
              <FaUser className={styles.detailIcon} />
              <span>{getUserName(step.assigned_user_id)}</span>
            </div>
          ) : (
            <div className={styles.stepDetail}>
              <FaUser className={styles.detailIcon} />
              <span className={styles.noData}>Non assigné</span>
            </div>
          )}
          {step.due_date ? (
            <div className={`${styles.stepDetail} ${isOverdue(step.due_date, step.completed) ? styles.overdue : ''}`}>
              <Icon icon="mdi:calendar" className={styles.detailIcon} />
              <span>{formatDate(step.due_date)}</span>
            </div>
          ) : (
            <div className={styles.stepDetail}>
              <Icon icon="mdi:calendar" className={styles.detailIcon} />
              <span className={styles.noData}>Aucune date</span>
            </div>
          )}
          {step.duration_hours ? (
            <div className={styles.stepDetail}>
              <Icon icon="mdi:clock-outline" className={styles.detailIcon} />
              <span>{step.duration_hours}h</span>
            </div>
          ) : (
            <div className={styles.stepDetail}>
              <Icon icon="mdi:clock-outline" className={styles.detailIcon} />
              <span className={styles.noData}>Aucune durée</span>
            </div>
          )}
        </div>
      </div>
      <div className={styles.stepActions}>
        {/* Bouton EMAIL uniquement pour l'étape "Communication orale puis écrite au client" */}
        {step.name === "Communication orale puis écrite au client" && (
          <button
            className={styles.emailButton}
            onClick={() => onSendEmail(step)}
            title="Envoyer un email"
          >
            <FaEnvelope />
          </button>
        )}
        <button
          className={styles.editButton}
          onClick={() => onEdit(step)}
          title="Modifier"
        >
          <FaEdit />
        </button>
        <button
          className={styles.deleteButton}
          onClick={() => onDelete(step.id)}
          title="Supprimer"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────
// 🧩 Composant : CampaignSteps
// ──────────────────────────────
export default function CampaignSteps({ campaign, clientId, onCampaignUpdate, onStepsCountUpdate, embedded = false }) {
  const locale = useAppLocale();
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedStepForEmail, setSelectedStepForEmail] = useState(null);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [stepModalMode, setStepModalMode] = useState('add');
  const [stepModalInitialData, setStepModalInitialData] = useState(null);
  const [stepModalStepId, setStepModalStepId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Nécessite un mouvement de 8px avant d'activer le drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (campaign && clientId) {
      loadSteps();
      loadUsers();
    }
  }, [campaign, clientId]);

  // Animer la progression quand les steps changent
  useEffect(() => {
    const currentProgress = calculateProgress(steps);
    setAnimatedProgress(currentProgress);
  }, [steps]);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const stepsData = await getCampaignSteps(clientId, campaign.id);
      setSteps(stepsData);
      // Calculer et mettre à jour la progression
      updateCampaignProgress(stepsData);
      // Notifier le parent du nombre d'étapes
      if (onStepsCountUpdate) {
        onStepsCountUpdate(stepsData.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des étapes:', error);
      toast.error('Erreur lors du chargement des étapes');
    } finally {
      setLoading(false);
    }
  };

  // Calculer la progression basée sur les steps complétés
  const calculateProgress = (stepsList) => {
    if (!stepsList || stepsList.length === 0) return 0;
    const completedSteps = stepsList.filter(step => step.completed).length;
    return Math.round((completedSteps / stepsList.length) * 100);
  };

  // Mettre à jour la progression de la campagne
  const updateCampaignProgress = async (stepsList) => {
    const newProgress = calculateProgress(stepsList);
    
    // Mettre à jour uniquement si la progression a changé
    if (campaign.global_progress !== newProgress) {
      try {
        await updateClientCampaign(clientId, campaign.id, {
          global_progress: newProgress
        });
        
        // Notifier le parent pour mettre à jour l'affichage
        if (onCampaignUpdate) {
          onCampaignUpdate();
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la progression:', error);
        // Ne pas afficher d'erreur toast pour éviter de spammer l'utilisateur
      }
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  const handleAdd = () => {
    setStepModalMode('add');
    setStepModalInitialData(null);
    setStepModalStepId(null);
    setStepModalOpen(true);
  };

  const handleEdit = (step) => {
    setStepModalMode('edit');
    setStepModalInitialData(step);
    setStepModalStepId(step.id);
    setStepModalOpen(true);
  };

  const handleModalSave = async (data) => {
    try {
      if (stepModalMode === 'add') {
        const tempId = `temp-${Date.now()}`;
        const newStep = {
          id: tempId,
          ...data,
          order_index: steps.length + 1
        };
        setSteps(prev => [...prev, newStep]);
        setStepModalOpen(false);

        try {
          const createdStep = await createCampaignStep(clientId, campaign.id, data);
          setSteps(prev => prev.map(s => s.id === tempId ? createdStep : s));
          if (onStepsCountUpdate) onStepsCountUpdate(steps.length + 1);
          toast.success('Étape ajoutée avec succès');
        } catch (apiError) {
          setSteps(prev => prev.filter(s => s.id !== tempId));
          toast.error(apiError.message || 'Erreur lors de l\'ajout de l\'étape');
        }
      } else if (stepModalStepId) {
        const updatedSteps = steps.map(s =>
          s.id === stepModalStepId ? { ...s, ...data } : s
        );
        setSteps(updatedSteps);
        setStepModalOpen(false);

        try {
          await updateCampaignStep(clientId, campaign.id, stepModalStepId, data);
          toast.success('Étape mise à jour avec succès');
        } catch (apiError) {
          await loadSteps();
          toast.error(apiError.message || 'Erreur lors de la mise à jour de l\'étape');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde de l\'étape');
    }
  };

  const handleDelete = async (stepId) => {
    if (!window.confirm(cyberCopy.deleteCampaignStep)) {
      return;
    }

    // Trouver l'étape à supprimer pour pouvoir la restaurer en cas d'erreur
    const stepToDelete = steps.find(s => s.id === stepId);
    if (!stepToDelete) return;

    // Optimistic update
    setSteps(prev => prev.filter(s => s.id !== stepId));

    try {
      await deleteCampaignStep(clientId, campaign.id, stepId);
      // Notifier le parent du nouveau nombre d'étapes
      if (onStepsCountUpdate) {
        onStepsCountUpdate(steps.length - 1);
      }
      toast.success('Étape supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // Restaurer l'étape en cas d'erreur
      setSteps(prev => [...prev, stepToDelete].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
      toast.error(error.message || 'Erreur lors de la suppression de l\'étape');
    }
  };

  const handleToggleComplete = async (step) => {
    // Optimistic update : mettre à jour l'état local immédiatement
    const newCompleted = !step.completed;
    const updatedSteps = steps.map(s =>
      s.id === step.id ? { ...s, completed: newCompleted } : s
    );
    setSteps(updatedSteps);

    // Calculer et mettre à jour la progression immédiatement
    const newProgress = calculateProgress(updatedSteps);
    if (campaign.global_progress !== newProgress) {
      updateCampaignProgress(updatedSteps);
    }

    try {
      // Faire l'appel API en arrière-plan sans bloquer l'UI
      await updateCampaignStep(clientId, campaign.id, step.id, {
        completed: newCompleted
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'étape');

      // En cas d'erreur, remettre l'état précédent
      setSteps(steps);
      // Recalculer la progression avec l'état précédent
      const originalProgress = calculateProgress(steps);
      if (campaign.global_progress !== originalProgress) {
        updateCampaignProgress(steps);
      }
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = steps.findIndex(step => step.id === active.id);
    const newIndex = steps.findIndex(step => step.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Mettre à jour l'ordre localement immédiatement pour un feedback instantané
    const newSteps = arrayMove(steps, oldIndex, newIndex);
    setSteps(newSteps);

    // Mettre à jour l'ordre dans la base de données
    try {
      const stepOrders = newSteps.map((step, index) => ({
        id: step.id,
        order_index: index + 1
      }));

      console.log('Frontend sending stepOrders:', stepOrders);
      console.log('Campaign ID:', campaign.id, 'Type:', typeof campaign.id);

      await reorderCampaignSteps(clientId, campaign.id, stepOrders);
      // Recharger pour s'assurer que tout est synchronisé
      await loadSteps();
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
      toast.error('Erreur lors de la réorganisation des étapes');
      // Recharger pour restaurer l'ordre original
      await loadSteps();
    }
  };

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user?.username || user?.email || 'Utilisateur inconnu';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const isOverdue = (dueDate, completed) => {
    if (!dueDate || completed) return false;
    return new Date(dueDate) < new Date();
  };

  const handleSendEmail = (step) => {
    setSelectedStepForEmail(step);
    setEmailModalOpen(true);
  };

  const handleEmailSent = async () => {
    if (!selectedStepForEmail) return;
    
    // Recharger les steps pour mettre à jour l'affichage
    await loadSteps();
    setEmailModalOpen(false);
    setSelectedStepForEmail(null);
  };

  if (loading) {
    return (
      <div className={embedded ? styles.embeddedContent : styles.stepsBlock}>
        {!embedded && <h3 className={styles.groupTitle}>Étapes de la campagne</h3>}
        <div className={styles.loadingState}>
          <Icon icon="mdi:loading" className={styles.loadingIcon} />
          <p>Chargement des étapes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? styles.embeddedContent : styles.stepsBlock}>
      {!embedded && (
        <div className={styles.stepsBlockHeader}>
          <h3 className={styles.groupTitle}>Étapes de la campagne</h3>
          <button className={styles.addButton} onClick={handleAdd} title="Ajouter une étape">
            <FaPlus />
          </button>
        </div>
      )}

      {embedded && (
        <div className={styles.embeddedHeader}>
          <div className={styles.cardTitle}>
            <span className={styles.cardTitleText}>Étapes de la campagne</span>
          </div>
          <button className={styles.addButton} onClick={handleAdd} title="Ajouter une étape">
            <FaPlus />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map(step => step.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.stepsList}>
            {steps.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon icon="mdi:clipboard-outline" className={styles.emptyIcon} />
                <p>Aucune étape définie</p>
              </div>
            ) : (
              steps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  getUserName={getUserName}
                  formatDate={formatDate}
                  isOverdue={isOverdue}
                  onSendEmail={handleSendEmail}
                />
              ))
            )}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className={`${styles.stepItem} ${styles.dragging}`}>
              <div className={styles.stepDragHandle}>
                <FaGripVertical className={styles.dragIcon} />
              </div>
              <div className={styles.stepContent}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepName}>
                    {steps.find(s => s.id === activeId)?.name || ''}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal d'envoi d'email */}
      {emailModalOpen && selectedStepForEmail && (
        <CampaignEmailModal
          step={selectedStepForEmail}
          campaign={campaign}
          clientId={clientId}
          campaignId={campaign.id}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedStepForEmail(null);
          }}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* Modal ajout / édition d'étape */}
      {stepModalOpen && (
        <CampaignStepModal
          mode={stepModalMode}
          initialData={stepModalInitialData}
          users={users}
          onSave={handleModalSave}
          onClose={() => setStepModalOpen(false)}
        />
      )}
    </div>
  );
}

