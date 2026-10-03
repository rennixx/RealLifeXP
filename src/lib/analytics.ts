export type AnalyticsEventName =
  | 'sign_up_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'category_selected'
  | 'activity_log_started'
  | 'activity_log_completed'
  | 'activity_log_failed'
  | 'activity_reversed'
  | 'custom_template_created'
  | 'character_level_up'
  | 'category_level_up'
  | 'attribute_level_up'
  | 'achievement_unlocked'
  | 'title_equipped'
  | 'character_card_exported'
  | 'offline_activity_queued'
  | 'offline_activity_synced'
  | 'account_deleted';

export type AnalyticsPayload = Readonly<Record<string, string | number | boolean | null | undefined>>;

export interface AnalyticsAdapter {
  track(eventName: AnalyticsEventName, payload?: AnalyticsPayload): void;
}

class NoopAnalyticsAdapter implements AnalyticsAdapter {
  track() {
    return;
  }
}

const noopAdapter = new NoopAnalyticsAdapter();

let activeAdapter: AnalyticsAdapter = noopAdapter;

export function setAnalyticsAdapter(adapter: AnalyticsAdapter): void {
  activeAdapter = adapter;
}

export function trackEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  activeAdapter.track(eventName, payload);
}

export function resetAdapterForTests() {
  activeAdapter = noopAdapter;
}