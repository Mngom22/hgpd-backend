export enum DemandStatus {
  NEW_REQUEST = 'new_request',
  UNDER_STUDY = 'under_study',
  PROPOSAL_SENT = 'proposal_sent',
  REFUSED_BY_PROVIDER = 'refused_by_provider',
  ACCEPTED_BY_PROVIDER = 'accepted_by_provider',
  ACCEPTED_BY_CLIENT = 'accepted_by_client',
  REFUSED_BY_CLIENT = 'refused_by_client',
  MISSION_CONFIRMED = 'mission_confirmed',
  IN_PREPARATION = 'in_preparation',
  EVENT_COMPLETED = 'event_completed',
  COMPLETED = 'completed',
  CANCELLED_BY_CLIENT = 'cancelled_by_client',
  CANCELLED_BY_PROVIDER = 'cancelled_by_provider',
}

export const DemandStatusLabels = {
  [DemandStatus.NEW_REQUEST]: 'Nouvelle demande',
  [DemandStatus.UNDER_STUDY]: "En cours d'étude",
  [DemandStatus.PROPOSAL_SENT]: 'Proposition envoyée',
  [DemandStatus.REFUSED_BY_PROVIDER]: 'Refusée par le prestataire',
  [DemandStatus.ACCEPTED_BY_PROVIDER]: 'Acceptée par le prestataire',
  [DemandStatus.ACCEPTED_BY_CLIENT]: 'Acceptée par le client',
  [DemandStatus.REFUSED_BY_CLIENT]: 'Refusée par le client',
  [DemandStatus.MISSION_CONFIRMED]: 'Mission confirmée',
  [DemandStatus.IN_PREPARATION]: 'En préparation',
  [DemandStatus.EVENT_COMPLETED]: 'Événement réalisé',
  [DemandStatus.COMPLETED]: 'Terminée',
  [DemandStatus.CANCELLED_BY_CLIENT]: 'Annulée par le client',
  [DemandStatus.CANCELLED_BY_PROVIDER]: 'Annulée par le prestataire',
};

// Helper pour obtenir les statuts actifs (pas annulés/terminés)
export const ActiveDemandStatuses = [
  DemandStatus.NEW_REQUEST,
  DemandStatus.UNDER_STUDY,
  DemandStatus.PROPOSAL_SENT,
  DemandStatus.ACCEPTED_BY_PROVIDER,
  DemandStatus.ACCEPTED_BY_CLIENT,
  DemandStatus.MISSION_CONFIRMED,
  DemandStatus.IN_PREPARATION,
];

// Statuts terminaux (fin du cycle de vie)
export const TerminalDemandStatuses = [
  DemandStatus.COMPLETED,
  DemandStatus.CANCELLED_BY_CLIENT,
  DemandStatus.CANCELLED_BY_PROVIDER,
  DemandStatus.REFUSED_BY_CLIENT,
  DemandStatus.REFUSED_BY_PROVIDER,
];
