import { invoke } from "@tauri-apps/api/core";

export interface Store {
  id: number;
  name: string;
  sellerId: number;
  environment: "prod" | "stage";
  integratorName: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStorePayload {
  name: string;
  sellerId: number;
  environment: "prod" | "stage";
  integratorName?: string;
  active?: boolean;
  apiKey: string;
  apiSecret: string;
}

export interface UpdateStorePayload {
  id: number;
  name: string;
  environment: "prod" | "stage";
  integratorName: string;
  active: boolean;
  apiKey?: string;
  apiSecret?: string;
}

export interface StoredQuestion {
  questionId: number;
  storeId: number;
  storeName: string;
  customerId: number | null;
  customerName: string | null;
  text: string;
  status: string;
  creationDate: number;
  productMainId: string | null;
  productName: string | null;
  productWebUrl: string | null;
  productImageUrl: string | null;
  barcode: string | null;
  public: boolean | null;
  answerId: number | null;
  answerText: string | null;
  answerCreationDate: number | null;
  reportedDate: number | null;
  rejectedDate: number | null;
  fetchedAt: number;
  notified: boolean;
  draftAiAnswer: string | null;
  draftAiGeneratedAt: number | null;
}

export interface SyncSummary {
  fetched: number;
  newQuestions: number;
  updatedQuestions: number;
  errors: { storeId: number; storeName: string; message: string }[];
}

export interface AnswerTemplate {
  id?: number | null;
  title: string;
  body: string;
  category?: string | null;
  usageCount: number;
  createdAt: number;
}

export interface AiProviderRow {
  id?: number | null;
  provider: "gemini" | "openrouter" | string;
  displayName: string;
  selectedModel: string | null;
  baseUrl: string | null;
  active: boolean;
  createdAt: number;
  hasApiKey: boolean;
}

export interface AiModel {
  id: string;
  name: string;
  description?: string | null;
}

export interface ActiveTraining {
  id: number;
  startDate: number;
  endDate: number;
  qaPairCount: number;
  systemPrompt: string;
  createdAt: number;
}

export interface TrainingRecord {
  id: number;
  name: string | null;
  startDate: number;
  endDate: number;
  qaPairCount: number;
  systemPrompt: string;
  originalPrompt: string | null;
  active: boolean;
  createdAt: number;
}

export interface SubmitAnswerResult {
  answerId: number | null;
  questionId: number;
  success: boolean;
  message: string;
  bannedWord: string | null;
}

export interface AnswerCheckResult {
  valid: boolean;
  charCount: number;
  bannedWord: string | null;
  message: string | null;
}

export const api = {
  listStores: () => invoke<Store[]>("list_stores"),
  createStore: (payload: CreateStorePayload) =>
    invoke<Store>("create_store", { payload }),
  updateStore: (payload: UpdateStorePayload) =>
    invoke<Store>("update_store", { payload }),
  deleteStore: (id: number) => invoke<void>("delete_store", { id }),
  testStoreConnection: (
    payload: Omit<CreateStorePayload, "name" | "active">
  ) => invoke<boolean>("test_store_connection", { payload }),

  syncNow: (params?: {
    status?: string | null;
    startDate?: number | null;
    endDate?: number | null;
  }) => invoke<SyncSummary>("sync_now", { params: params ?? null }),
  syncQuestion: (questionId: number) =>
    invoke<StoredQuestion | null>("sync_question", { questionId }),
  listQuestions: (params: {
    storeIds?: number[] | null;
    status?: string | null;
    limit?: number | null;
    offset?: number | null;
    search?: string | null;
    startDate?: number | null;
    endDate?: number | null;
  }) => invoke<StoredQuestion[]>("list_questions", { params }),
  getQuestion: (questionId: number) =>
    invoke<StoredQuestion | null>("get_question", { questionId }),
  getCustomerHistory: (
    customerId: number,
    storeId?: number | null,
    excludeQuestionId?: number | null
  ) =>
    invoke<StoredQuestion[]>("get_customer_history", {
      customerId,
      storeId: storeId ?? null,
      excludeQuestionId: excludeQuestionId ?? null,
    }),
  markNotified: (questionIds: number[]) =>
    invoke<void>("mark_notified", { questionIds }),

  submitAnswer: (questionId: number, text: string, ignoreBannedWords = false) =>
    invoke<SubmitAnswerResult>("submit_answer", {
      payload: { questionId, text, ignoreBannedWords },
    }),
  submitBulkAnswers: (
    items: { questionId: number; text: string }[],
    ignoreBannedWords = false
  ) =>
    invoke<SubmitAnswerResult[]>("submit_bulk_answers", {
      payload: { items, ignoreBannedWords },
    }),
  checkAnswer: (text: string) =>
    invoke<AnswerCheckResult>("check_answer", { text }),

  listTemplates: () => invoke<AnswerTemplate[]>("list_templates"),
  upsertTemplate: (template: AnswerTemplate) =>
    invoke<AnswerTemplate>("upsert_template", { template }),
  deleteTemplate: (id: number) => invoke<void>("delete_template", { id }),

  listAiProviders: () => invoke<AiProviderRow[]>("list_ai_providers"),
  getAiKeyMasked: (provider: string) =>
    invoke<string | null>("get_ai_key_masked", { provider }),
  upsertAiProvider: (payload: {
    provider: string;
    displayName: string;
    selectedModel?: string | null;
    baseUrl?: string | null;
    apiKey?: string | null;
  }) => invoke<AiProviderRow>("upsert_ai_provider", { payload }),
  setActiveProvider: (provider: string) =>
    invoke<void>("set_active_provider", { provider }),
  deleteAiProvider: (provider: string) =>
    invoke<void>("delete_ai_provider", { provider }),
  listModels: (provider: string) =>
    invoke<AiModel[]>("list_models", { provider }),
  checkOllamaHealth: (baseUrl?: string | null) =>
    invoke<boolean>("check_ollama_health", { baseUrl: baseUrl ?? null }),
  generateAnswer: (questionId: number, modelOverride?: string) =>
    invoke<string>("generate_answer", {
      payload: { questionId, modelOverride: modelOverride ?? null },
    }),
  trainAi: (startDate: number, endDate: number, storeIds?: number[] | null) =>
    invoke<{
      trainingId: number;
      qaPairCount: number;
      pairsUsed: number;
      systemPrompt: string;
    }>("train_ai", {
      payload: { startDate, endDate, storeIds: storeIds ?? null },
    }),
  getActiveTraining: () => invoke<ActiveTraining | null>("get_active_training"),
  listTrainings: () => invoke<TrainingRecord[]>("list_trainings"),
  updateTrainingPrompt: (trainingId: number, systemPrompt: string) =>
    invoke<void>("update_training_prompt", {
      payload: { trainingId, systemPrompt },
    }),
  resetTrainingPrompt: (trainingId: number) =>
    invoke<void>("reset_training_prompt", { trainingId }),
  activateTraining: (trainingId: number) =>
    invoke<void>("activate_training", { trainingId }),
  deleteTraining: (trainingId: number) =>
    invoke<void>("delete_training", { trainingId }),

  getAllSettings: () => invoke<Record<string, string>>("get_all_settings"),
  getSetting: (key: string) => invoke<string | null>("get_setting", { key }),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),

  backupExport: (destination: string) =>
    invoke<number>("backup_export", { destination }),
  backupImport: (source: string) =>
    invoke<void>("backup_import", { source }),
  getDbPath: () => invoke<string>("get_db_path"),
};
