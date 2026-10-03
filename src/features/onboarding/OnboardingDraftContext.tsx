import { createContext, type PropsWithChildren, useContext, useState } from 'react';

export type OnboardingIdentity = {
  displayName: string;
  handle: string;
  emblemKey: string;
};

export type OnboardingDraftState = {
  identity: OnboardingIdentity | null;
  categoryIds: string[];
  templateIds: string[];
  setIdentity: (identity: OnboardingIdentity) => void;
  setCategoryIds: (categoryIds: string[]) => void;
  toggleCategoryId: (categoryId: string) => void;
  setTemplateIds: (templateIds: string[]) => void;
  toggleTemplateId: (templateId: string) => void;
  clearDraft: () => void;
};

const defaultIdentity: OnboardingDraftState = {
  identity: null,
  categoryIds: [],
  templateIds: [],
  setIdentity: () => undefined,
  setCategoryIds: () => undefined,
  toggleCategoryId: () => undefined,
  setTemplateIds: () => undefined,
  toggleTemplateId: () => undefined,
  clearDraft: () => undefined,
};

const OnboardingDraftContext = createContext<OnboardingDraftState>(defaultIdentity);

export function useOnboardingDraft() {
  const context = useContext(OnboardingDraftContext);
  return context;
}

export function OnboardingDraftProvider({ children }: PropsWithChildren) {
  const [identity, setIdentity] = useState<OnboardingIdentity | null>(null);
  const [categoryIds, setCategoryIdsState] = useState<string[]>([]);
  const [templateIds, setTemplateIdsState] = useState<string[]>([]);

  const setCategoryIds = (nextCategoryIds: string[]) => {
    setCategoryIdsState(nextCategoryIds);
  };

  const toggleCategoryId = (categoryId: string) => {
    setCategoryIdsState((current) => {
      if (current.includes(categoryId)) {
        return current.filter((value) => value !== categoryId);
      }

      return [...current, categoryId];
    });
    setTemplateIdsState([]);
  };

  const setTemplateIds = (nextTemplateIds: string[]) => {
    setTemplateIdsState(nextTemplateIds);
  };

  const toggleTemplateId = (templateId: string) => {
    setTemplateIdsState((current) => {
      if (current.includes(templateId)) {
        return current.filter((value) => value !== templateId);
      }

      return [...current, templateId];
    });
  };

  const clearDraft = () => {
    setIdentity(null);
    setCategoryIdsState([]);
    setTemplateIdsState([]);
  };

  return (
    <OnboardingDraftContext.Provider
      value={{
        identity,
        categoryIds,
        templateIds,
        setIdentity,
        setCategoryIds,
        toggleCategoryId,
        setTemplateIds,
        toggleTemplateId,
        clearDraft,
      }}
    >
      {children}
    </OnboardingDraftContext.Provider>
  );
}
