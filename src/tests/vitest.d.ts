declare module 'vitest' {
  export interface ProvidedContext {
    MINIO_HOST: string;
    MINIO_PORT: number;
    MINIO_ACCESS_KEY: string;
    MINIO_SECRET_KEY: string;
    MINIO_BUCKET_NAME: string;

    DATABASE_URL: string;
  }
}

export {};
