import {
  DemandStatus,
  DemandStatusLabels,
  TerminalDemandStatuses,
  ActiveDemandStatuses,
} from '../enums';

/**
 * Obtenir le label français d'un statut
 */
export function getDemandStatusLabel(status: DemandStatus): string {
  return DemandStatusLabels[status];
}

/**
 * Vérifier si un statut est terminal (fin du cycle de vie)
 */
export function isDemandStatusTerminal(status: DemandStatus): boolean {
  return TerminalDemandStatuses.includes(status);
}

/**
 * Vérifier si un statut est actif (pas terminé/annulé)
 */
export function isDemandStatusActive(status: DemandStatus): boolean {
  return ActiveDemandStatuses.includes(status);
}

/**
 * Obtenir tous les statuts possibles en tableau
 */
export function getAllDemandStatuses(): DemandStatus[] {
  return Object.values(DemandStatus);
}

/**
 * Valider une transition de statut
 * Définit les transitions autorisées entre statuts
 */
export function canTransitionDemandStatus(
  from: DemandStatus,
  to: DemandStatus,
): boolean {
  // Définir TOUTES les transitions autorisées pour chaque statut
  const allowedTransitions: Record<DemandStatus, DemandStatus[]> = {
    // Nouvelle demande → peut aller vers étude, refus prestataire, ou annulation client
    [DemandStatus.NEW_REQUEST]: [
      DemandStatus.UNDER_STUDY,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],

    // En cours d'étude → peut envoyer proposition, refuser, ou être annulée
    [DemandStatus.UNDER_STUDY]: [
      DemandStatus.PROPOSAL_SENT,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],

    // Proposition envoyée → prestataire peut accepter/refuser ou client peut annuler
    [DemandStatus.PROPOSAL_SENT]: [
      DemandStatus.ACCEPTED_BY_PROVIDER,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],

    // Refusée par prestataire → TERMINAL (pas de transition)
    [DemandStatus.REFUSED_BY_PROVIDER]: [],

    // Acceptée par prestataire → client peut accepter/refuser ou client peut annuler
    [DemandStatus.ACCEPTED_BY_PROVIDER]: [
      DemandStatus.ACCEPTED_BY_CLIENT,
      DemandStatus.REFUSED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],

    // Acceptée par client → peut être confirmée, en attente de paiement ou annulée
    [DemandStatus.ACCEPTED_BY_CLIENT]: [
      DemandStatus.MISSION_CONFIRMED,
      DemandStatus.WAITING_PAYMENT,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],

    // Refusée par client → TERMINAL (pas de transition)
    [DemandStatus.REFUSED_BY_CLIENT]: [],

    // Mission confirmée → passe en préparation ou peut être annulée
    [DemandStatus.MISSION_CONFIRMED]: [
      DemandStatus.IN_PREPARATION,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],

    // En attente de paiement -> peut être confirmée ou annulée
    [DemandStatus.WAITING_PAYMENT]: [
      DemandStatus.MISSION_CONFIRMED,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],

    // En préparation → événement réalisé ou annulation
    [DemandStatus.IN_PREPARATION]: [
      DemandStatus.EVENT_COMPLETED,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],

    // Événement réalisé → terminée (avec ou sans avis)
    [DemandStatus.EVENT_COMPLETED]: [DemandStatus.COMPLETED],

    // Terminée → TERMINAL (pas de transition)
    [DemandStatus.COMPLETED]: [],

    // Annulée par client → TERMINAL (pas de transition)
    [DemandStatus.CANCELLED_BY_CLIENT]: [],

    // Annulée par prestataire → TERMINAL (pas de transition)
    [DemandStatus.CANCELLED_BY_PROVIDER]: [],
  };

  // Vérifier si la transition est autorisée
  return allowedTransitions[from]?.includes(to) ?? false;
}

/**
 * Obtenir les transitions possibles depuis un statut donné
 */
export function getAvailableTransitions(status: DemandStatus): DemandStatus[] {
  const allowedTransitions: Record<DemandStatus, DemandStatus[]> = {
    [DemandStatus.NEW_REQUEST]: [
      DemandStatus.UNDER_STUDY,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],
    [DemandStatus.UNDER_STUDY]: [
      DemandStatus.PROPOSAL_SENT,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],
    [DemandStatus.PROPOSAL_SENT]: [
      DemandStatus.ACCEPTED_BY_PROVIDER,
      DemandStatus.REFUSED_BY_PROVIDER,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],
    [DemandStatus.REFUSED_BY_PROVIDER]: [],
    [DemandStatus.ACCEPTED_BY_PROVIDER]: [
      DemandStatus.ACCEPTED_BY_CLIENT,
      DemandStatus.REFUSED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],
    [DemandStatus.ACCEPTED_BY_CLIENT]: [
      DemandStatus.MISSION_CONFIRMED,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],
    [DemandStatus.REFUSED_BY_CLIENT]: [],
    [DemandStatus.MISSION_CONFIRMED]: [
      DemandStatus.IN_PREPARATION,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],
    [DemandStatus.WAITING_PAYMENT]: [
      DemandStatus.MISSION_CONFIRMED,
      DemandStatus.CANCELLED_BY_CLIENT,
    ],
    [DemandStatus.IN_PREPARATION]: [
      DemandStatus.EVENT_COMPLETED,
      DemandStatus.CANCELLED_BY_CLIENT,
      DemandStatus.CANCELLED_BY_PROVIDER,
    ],
    [DemandStatus.EVENT_COMPLETED]: [DemandStatus.COMPLETED],
    [DemandStatus.COMPLETED]: [],
    [DemandStatus.CANCELLED_BY_CLIENT]: [],
    [DemandStatus.CANCELLED_BY_PROVIDER]: [],
  };

  return allowedTransitions[status] || [];
}

/**
 * Obtenir le statut suivant logique dans le flow normal
 * (sans annulations ni refus)
 */
export function getNextNormalStatus(status: DemandStatus): DemandStatus | null {
  const normalFlow: Partial<Record<DemandStatus, DemandStatus>> = {
    [DemandStatus.NEW_REQUEST]: DemandStatus.UNDER_STUDY,
    [DemandStatus.UNDER_STUDY]: DemandStatus.PROPOSAL_SENT,
    [DemandStatus.PROPOSAL_SENT]: DemandStatus.ACCEPTED_BY_CLIENT,
    [DemandStatus.ACCEPTED_BY_CLIENT]: DemandStatus.WAITING_PAYMENT,
    [DemandStatus.WAITING_PAYMENT]: DemandStatus.MISSION_CONFIRMED,
    [DemandStatus.MISSION_CONFIRMED]: DemandStatus.IN_PREPARATION,
    [DemandStatus.IN_PREPARATION]: DemandStatus.EVENT_COMPLETED,
    [DemandStatus.EVENT_COMPLETED]: DemandStatus.COMPLETED,
  };

  return normalFlow[status] ?? null;
}

/**
 * Vérifier si un statut permet l'annulation
 */
export function canBeCancelled(status: DemandStatus): boolean {
  const cancellableStatuses = [
    DemandStatus.NEW_REQUEST,
    DemandStatus.UNDER_STUDY,
    DemandStatus.PROPOSAL_SENT,
    DemandStatus.ACCEPTED_BY_CLIENT,
    DemandStatus.WAITING_PAYMENT,
    DemandStatus.MISSION_CONFIRMED,
    DemandStatus.IN_PREPARATION,
  ];

  return cancellableStatuses.includes(status);
}

/**
 * Vérifier si le prestataire peut refuser à ce stade
 */
export function canProviderRefuse(status: DemandStatus): boolean {
  const refusableStatuses = [
    DemandStatus.NEW_REQUEST,
    DemandStatus.UNDER_STUDY,
  ];

  return refusableStatuses.includes(status);
}

/**
 * Vérifier si le client peut refuser à ce stade
 */
export function canClientRefuse(status: DemandStatus): boolean {
  return status === DemandStatus.PROPOSAL_SENT;
}

/**
 * Obtenir la couleur du badge pour l'UI (TailwindCSS)
 */
export function getDemandStatusColor(status: DemandStatus): string {
  const colors: Record<DemandStatus, string> = {
    [DemandStatus.NEW_REQUEST]: 'bg-blue-100 text-blue-800',
    [DemandStatus.UNDER_STUDY]: 'bg-yellow-100 text-yellow-800',
    [DemandStatus.PROPOSAL_SENT]: 'bg-purple-100 text-purple-800',
    [DemandStatus.REFUSED_BY_PROVIDER]: 'bg-red-100 text-red-800',
    [DemandStatus.ACCEPTED_BY_PROVIDER]: 'bg-cyan-100 text-cyan-800',
    [DemandStatus.ACCEPTED_BY_CLIENT]: 'bg-green-100 text-green-800',
    [DemandStatus.REFUSED_BY_CLIENT]: 'bg-red-100 text-red-800',
    [DemandStatus.MISSION_CONFIRMED]: 'bg-green-100 text-green-800',
    [DemandStatus.WAITING_PAYMENT]: 'bg-yellow-100 text-yellow-800',
    [DemandStatus.IN_PREPARATION]: 'bg-indigo-100 text-indigo-800',
    [DemandStatus.EVENT_COMPLETED]: 'bg-teal-100 text-teal-800',
    [DemandStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
    [DemandStatus.CANCELLED_BY_CLIENT]: 'bg-red-100 text-red-800',
    [DemandStatus.CANCELLED_BY_PROVIDER]: 'bg-red-100 text-red-800',
  };

  return colors[status];
}

/**
 * Obtenir une icône pour le statut (pour l'UI)
 */
export function getDemandStatusIcon(status: DemandStatus): string {
  const icons: Record<DemandStatus, string> = {
    [DemandStatus.NEW_REQUEST]: '📩',
    [DemandStatus.UNDER_STUDY]: '🔍',
    [DemandStatus.PROPOSAL_SENT]: '📤',
    [DemandStatus.REFUSED_BY_PROVIDER]: '❌',
    [DemandStatus.ACCEPTED_BY_PROVIDER]: '👍',
    [DemandStatus.ACCEPTED_BY_CLIENT]: '✅',
    [DemandStatus.REFUSED_BY_CLIENT]: '❌',
    [DemandStatus.MISSION_CONFIRMED]: '✔️',
    [DemandStatus.WAITING_PAYMENT]: '💳',
    [DemandStatus.IN_PREPARATION]: '⚙️',
    [DemandStatus.EVENT_COMPLETED]: '🎉',
    [DemandStatus.COMPLETED]: '✅',
    [DemandStatus.CANCELLED_BY_CLIENT]: '🚫',
    [DemandStatus.CANCELLED_BY_PROVIDER]: '🚫',
  };

  return icons[status];
}
