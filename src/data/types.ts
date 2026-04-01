export interface AntiphonEntry {
  title: string;
  text: string;
}

export interface LiturgicalProper {
  id: string;
  date: string;
  liturgicalTitle: string;
  tone?: number;
  opening?: string;
  antiphons?: AntiphonEntry[];
  holyGod?: string;
  troparia: TroparionEntry[];
  kondakia: KondakionEntry[];
  prokeimenon?: ProkeimenonEntry;
  epistle?: ScriptureReading;
  alleluia?: AlleluiaEntry;
  gospel?: ScriptureReading;
  communionHymn?: string;
  specialNotes?: string;
  pdfSourceUrl?: string;
  lastUpdated: string;
}

export interface TroparionEntry {
  label: string;
  text: string;
  tone?: number;
}

export interface KondakionEntry {
  label: string;
  text: string;
  tone?: number;
}

export interface ProkeimenonEntry {
  tone?: number;
  text: string;
  verse?: string;
}

export interface ScriptureReading {
  reference: string;
  text: string;
}

export interface AlleluiaEntry {
  tone?: number;
  verses: string[];
}

export interface PropersListItem {
  date: string;
  liturgicalTitle: string;
  tone?: number;
}
