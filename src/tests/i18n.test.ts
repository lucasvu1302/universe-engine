import { describe, it, expect, beforeEach } from 'vitest';
import { useI18nStore, t } from '@/i18n';
import { getLocalizedBodyData } from '@/data/celestialData';

describe('i18n System', () => {
  beforeEach(() => {
    localStorage.clear();
    useI18nStore.getState().setLanguage('vi');
  });

  it('initializes with Vietnamese by default', () => {
    expect(useI18nStore.getState().language).toBe('vi');
    expect(t('common.search')).toBe('Tìm kiếm');
    expect(t('nav.solarSystem')).toBe('Hệ Mặt Trời');
  });

  it('translates correctly when switched to English', () => {
    useI18nStore.getState().setLanguage('en');
    expect(useI18nStore.getState().language).toBe('en');
    expect(t('common.search')).toBe('Search');
    expect(t('nav.solarSystem')).toBe('Solar System');
  });

  it('translates celestial body names and descriptions accurately', () => {
    useI18nStore.getState().setLanguage('vi');
    const earthVi = getLocalizedBodyData('earth');
    expect(earthVi.name).toBe('Trái Đất');
    expect(earthVi.displayName).toBe('Trái Đất (Terra)');

    useI18nStore.getState().setLanguage('en');
    const earthEn = getLocalizedBodyData('earth');
    expect(earthEn.name).toBe('Earth');
    expect(earthEn.displayName).toBe('Earth (Terra)');
  });

  it('persists language selection in localStorage', () => {
    useI18nStore.getState().setLanguage('en');
    expect(localStorage.getItem('universe_engine_lang')).toBe('en');

    useI18nStore.getState().setLanguage('vi');
    expect(localStorage.getItem('universe_engine_lang')).toBe('vi');
  });

  it('falls back to key when translation path is not found', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });
});
