export type SentimentLabel = "positive" | "neutral" | "negative";
export type BiasLabel = "left" | "center" | "right" | "mixed" | "unclear";
export type LogType = "scrape" | "analysis" | "scheduled_pipeline";
export type LogStatus = "running" | "success" | "partial_success" | "failed";

export type SourceRow = {
  id: string;
  name: string;
  listing_url: string;
  logo_url: string | null;
  parser_strategy: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SourceInsert = {
  id?: string;
  name: string;
  listing_url: string;
  logo_url?: string | null;
  parser_strategy?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SourceUpdate = Partial<SourceInsert>;

export type ArticleRow = {
  id: string;
  source_id: string;
  original_url: string;
  canonical_url: string | null;
  title: string;
  image_url: string;
  published_at: string;
  raw_text: string;
  scraped_at: string;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ArticleInsert = {
  id?: string;
  source_id: string;
  original_url: string;
  canonical_url?: string | null;
  title: string;
  image_url: string;
  published_at: string;
  raw_text: string;
  scraped_at?: string;
  analyzed_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ArticleUpdate = Partial<ArticleInsert>;

export type ArticleAnalysisRow = {
  id: string;
  article_id: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  bias_score: number;
  bias_label: BiasLabel;
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
  framing_notes: string[];
  loaded_terms: string[];
  disclaimer: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type ArticleAnalysisInsert = {
  id?: string;
  article_id: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  bias_score: number;
  bias_label: BiasLabel;
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
  framing_notes?: string[];
  loaded_terms?: string[];
  disclaimer: string;
  model: string;
  created_at?: string;
  updated_at?: string;
};

export type ArticleAnalysisUpdate = Partial<ArticleAnalysisInsert>;

export type LogRow = {
  id: string;
  log_type: LogType;
  status: LogStatus;
  sources_checked: number;
  articles_found: number;
  articles_inserted: number;
  articles_analyzed: number;
  errors: unknown;
  metadata: unknown;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type LogInsert = {
  id?: string;
  log_type: LogType;
  status: LogStatus;
  sources_checked?: number;
  articles_found?: number;
  articles_inserted?: number;
  articles_analyzed?: number;
  errors?: unknown;
  metadata?: unknown;
  started_at?: string;
  finished_at?: string | null;
  created_at?: string;
};

export type LogUpdate = Partial<LogInsert>;

export type OxylabsScheduleRow = {
  id: string;
  source_id: string;
  oxylabs_schedule_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OxylabsScheduleInsert = {
  id?: string;
  source_id: string;
  oxylabs_schedule_id: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type OxylabsScheduleUpdate = Partial<OxylabsScheduleInsert>;

export type OxylabsScheduleRunRow = {
  id: string;
  schedule_id: string;
  oxylabs_run_id: string | null;
  status: string;
  articles_inserted: number;
  summary: unknown;
  run_at: string;
  created_at: string;
};

export type OxylabsScheduleRunInsert = {
  id?: string;
  schedule_id: string;
  oxylabs_run_id?: string | null;
  status: string;
  articles_inserted?: number;
  summary?: unknown;
  run_at?: string;
  created_at?: string;
};

export type OxylabsScheduleRunUpdate = Partial<OxylabsScheduleRunInsert>;

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      sources: TableDef<SourceRow, SourceInsert, SourceUpdate>;
      articles: TableDef<ArticleRow, ArticleInsert, ArticleUpdate>;
      article_analyses: TableDef<
        ArticleAnalysisRow,
        ArticleAnalysisInsert,
        ArticleAnalysisUpdate
      >;
      logs: TableDef<LogRow, LogInsert, LogUpdate>;
      oxylabs_schedules: TableDef<
        OxylabsScheduleRow,
        OxylabsScheduleInsert,
        OxylabsScheduleUpdate
      >;
      oxylabs_schedule_runs: TableDef<
        OxylabsScheduleRunRow,
        OxylabsScheduleRunInsert,
        OxylabsScheduleRunUpdate
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      sentiment_label: SentimentLabel;
      bias_label: BiasLabel;
      log_type: LogType;
      log_status: LogStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Source = SourceRow;
export type Article = ArticleRow;
export type ArticleAnalysis = ArticleAnalysisRow;
export type Log = LogRow;
export type OxylabsSchedule = OxylabsScheduleRow;
export type OxylabsScheduleRun = OxylabsScheduleRunRow;

export type ArticleWithAnalysis = Article & {
  sources: Source | null;
  article_analyses: ArticleAnalysis | ArticleAnalysis[] | null;
};
