export type JsonRecord = Record<string, unknown>;

export type AppDomainError = {
  code: 'AUTH' | 'VALIDATION' | 'NETWORK' | 'SERVER' | 'UNKNOWN';
  message: string;
};