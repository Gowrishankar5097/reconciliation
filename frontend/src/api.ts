import axios from 'axios';
import type {
  UploadResponse,
  ReconcileResponse,
  FullResults,
  PreviewData,
  EngineConfig,
  FileInfo,
  AddFileResponse,
  FilesResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE });

export async function uploadFiles(fileA: File, fileB: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file_a', fileA);
  form.append('file_b', fileB);
  const { data } = await api.post<UploadResponse>('/upload', form);
  return data;
}

export async function addFile(company: 'A' | 'B', file: File): Promise<AddFileResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<AddFileResponse>(`/upload/add?company=${company}`, form);
  return data;
}

export async function getFiles(): Promise<FilesResponse> {
  const { data } = await api.get<FilesResponse>('/files');
  return data;
}

export async function removeFile(company: 'A' | 'B', index: number): Promise<FilesResponse> {
  const { data } = await api.delete<FilesResponse>(`/files/${company}/${index}`);
  return data;
}

export async function loadSample(): Promise<UploadResponse> {
  const { data } = await api.post<UploadResponse>('/sample');
  return data;
}

export async function reconcile(): Promise<ReconcileResponse> {
  const { data } = await api.post<ReconcileResponse>('/reconcile');
  return data;
}

export async function getResults(): Promise<FullResults> {
  const { data } = await api.get<FullResults>('/results');
  return data;
}

export async function getPreview(): Promise<PreviewData> {
  const { data } = await api.get<PreviewData>('/preview');
  return data;
}

export async function getConfig(): Promise<EngineConfig> {
  const { data } = await api.get<EngineConfig>('/config');
  return data;
}

export async function updateConfig(cfg: Partial<EngineConfig>): Promise<EngineConfig> {
  const { data } = await api.put<EngineConfig>('/config', cfg);
  return data;
}

export async function resetAll(): Promise<void> {
  await api.post('/reset');
}

export function getReportUrl(): string {
  return `${API_BASE}/report`;
}
