export type Position = "president" | "vicePresident" | "secretary";

export interface Candidate {
  id: string;
  name: string;
  position: Position;
}

export interface Voter {
  email: string;
  code: string;
  hasVoted: boolean;
  createdAt: string;
}

export interface VoteResults {
  [candidateId: string]: number;
}

export interface Votes {
  president: string;
  vicePresident: string;
  secretary: string;
}

export interface VoterDocument {
  email: string;
  code: string;
  hasVoted: boolean;
  votedAt?: string;
  votes?:Votes;
}

export interface VoteDocument {
  [candidateId: string]: number;
}

// export interface Votes {
//   [key in Position]: string;
// }
