import { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react-native';

import { OnboardingDraftProvider, useOnboardingDraft } from './OnboardingDraftContext';

describe('OnboardingDraftContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <OnboardingDraftProvider>{children}</OnboardingDraftProvider>
  );

  it('starts with empty identity, categories, and templates', () => {
    const { result } = renderHook(() => useOnboardingDraft(), { wrapper });

    expect(result.current.identity).toBeNull();
    expect(result.current.categoryIds).toEqual([]);
    expect(result.current.templateIds).toEqual([]);
  });

  it('sets and clears identity, category, and template values', () => {
    const { result } = renderHook(() => useOnboardingDraft(), { wrapper });

    act(() => {
      result.current.setIdentity({ displayName: 'Alex', handle: 'alex', emblemKey: 'atlas-default' });
      result.current.setCategoryIds(['cat-1', 'cat-2']);
      result.current.setTemplateIds(['tpl-1']);
    });

    expect(result.current.identity).toEqual({
      displayName: 'Alex',
      handle: 'alex',
      emblemKey: 'atlas-default',
    });
    expect(result.current.categoryIds).toEqual(['cat-1', 'cat-2']);
    expect(result.current.templateIds).toEqual(['tpl-1']);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.identity).toBeNull();
    expect(result.current.categoryIds).toEqual([]);
    expect(result.current.templateIds).toEqual([]);
  });

  it('clears template favorites when categories change', () => {
    const { result } = renderHook(() => useOnboardingDraft(), { wrapper });

    act(() => {
      result.current.setTemplateIds(['tpl-1', 'tpl-2']);
      result.current.toggleCategoryId('cat-1');
      result.current.toggleCategoryId('cat-2');
    });

    expect(result.current.categoryIds).toEqual(['cat-1', 'cat-2']);
    expect(result.current.templateIds).toEqual([]);

    act(() => {
      result.current.toggleCategoryId('cat-2');
    });

    expect(result.current.categoryIds).toEqual(['cat-1']);
    expect(result.current.templateIds).toEqual([]);
  });
});
