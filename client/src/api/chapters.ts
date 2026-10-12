import type { ChapterDialog, ChapterDraft, ChapterMeta, ReviewerResult, TranslateResponse } from "../types/api";
import { request } from "./client";

export const getChapterState = (slug: string, n: number) =>
  request<ChapterMeta>(`/books/${slug}/chapter/${n}/state`);

export const runEditorRound = (slug: string, n: number, model: string) =>
  request<ChapterMeta>(`/books/${slug}/chapter/${n}/round/editor`, {
    method: "POST",
    body: { model },
  });

export const runReviewerRound = (slug: string, n: number, model: string) =>
  request<ReviewerResult>(`/books/${slug}/chapter/${n}/round/reviewer`, {
    method: "POST",
    body: { model },
  });

export const finalizeChapter = (slug: string, n: number) =>
  request<ChapterMeta>(`/books/${slug}/chapter/${n}/finalize`, { method: "POST" });

export const finalChapterUrl = (slug: string, n: number) =>
  `/books/${slug}/chapter/${n}/final`;

export const translateChapter = (slug: string, n: number, model: string) =>
  request<TranslateResponse>(`/books/${slug}/chapter/${n}/translate`, {
    method: "POST",
    body: { model },
  });

export const getChapterDraft = (slug: string, n: number) =>
  request<ChapterDraft>(`/books/${slug}/chapter/${n}/draft`);

export const getChapterDialog = (slug: string, n: number) =>
  request<ChapterDialog>(`/books/${slug}/chapter/${n}/dialog`);
