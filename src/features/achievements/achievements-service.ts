import { AppError, AppErrorCode } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

import type { PostgrestError } from '@supabase/supabase-js';

type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
type IconName = string;

type AchievementRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rarity: AchievementRarity | string;
  icon_key: IconName | null;
  is_hidden: boolean;
  sort_order: number | string | null;
  reward_title_id: string | null;
};

type TitleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rarity: AchievementRarity | string;
  icon_key: IconName | null;
};

type UserAchievementRow = {
  achievement_id: string;
  unlocked_at: string | null;
};

type UserTitleRow = {
  title_id: string;
  unlocked_at: string | null;
};

type ProfileRow = {
  equipped_title_id: string | null;
};

export type AchievementItem = {
  id: string;
  slug: string;
  name: string;
  hiddenName: string;
  description: string;
  hiddenDescription: string;
  rarity: AchievementRarity;
  iconKey: IconName;
  isHidden: boolean;
  isUnlocked: boolean;
  unlockedAt: string | null;
  rewardTitleId: string | null;
  rewardTitleName: string | null;
  sortOrder: number;
};

export type TitleItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  iconKey: string;
  isOwned: boolean;
  isEquipped: boolean;
  unlockedAt: string | null;
};

export type AchievementsOverview = {
  achievements: AchievementItem[];
  titles: TitleItem[];
  unlockedAchievementCount: number;
  totalAchievementCount: number;
  equippedTitleId: string | null;
};

export type AchievementFilter = 'all' | 'unlocked' | 'locked' | 'hidden';

const HIDDEN_ACHIEVEMENT_DESCRIPTION = 'Unlock this achievement to reveal details.';

const RARITY_ORDER: Record<AchievementRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

function parseRarity(value: unknown): AchievementRarity {
  switch (value) {
    case 'rare':
    case 'epic':
    case 'legendary':
      return value;
    case 'common':
    default:
      return 'common';
  }
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSortOrder(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return Math.max(0, asNumber);
    }
  }

  return 0;
}

function buildMap<T extends { unlocked_at: string | null }>(rows: T[] | null, key: keyof T): Map<string, string | null> {
  const map = new Map<string, string | null>();
  rows?.forEach((row: T) => {
    const id = row[key] as unknown as string;
    if (typeof id === 'string') {
      map.set(id, parseDate(row.unlocked_at));
    }
  });

  return map;
}

function mapRPCError(error: PostgrestError): never {
  if (error.message.includes('AUTH_REQUIRED')) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in to equip a title.');
  }

  if (error.message.includes('TITLE_NOT_OWNED')) {
    throw new AppError(AppErrorCode.AuthorizationError, 'This title is not unlocked for your account.');
  }

  if (error.message.includes('INVALID_TITLE')) {
    throw new AppError(AppErrorCode.ValidationError, 'Invalid title selected.');
  }

  throw new AppError(
    AppErrorCode.ServerError,
    'The server could not equip this title.',
    { cause: error.message }
  );
}

async function fetchCurrentUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load your session for achievements.', {
      cause: error.message,
    });
  }

  if (!session?.user?.id) {
    throw new AppError(AppErrorCode.AuthError, 'You must be signed in to view achievements.');
  }

  return session.user.id;
}

export async function fetchAchievementsOverview(): Promise<AchievementsOverview> {
  const supabase = getSupabaseClient();
  const userId = await fetchCurrentUserId();

  const [
    achievementsResult,
    userAchievementsResult,
    titlesResult,
    userTitlesResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('achievements')
      .select('id,slug,name,description,rarity,icon_key,is_hidden,sort_order,reward_title_id')
      .order('sort_order')
      .order('name'),
    supabase
      .from('user_achievements')
      .select('achievement_id,unlocked_at')
      .eq('user_id', userId),
    supabase
      .from('titles')
      .select('id,slug,name,description,rarity,icon_key')
      .order('name'),
    supabase
      .from('user_titles')
      .select('title_id,unlocked_at')
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('equipped_title_id')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  if (achievementsResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load achievement catalog.', {
      cause: achievementsResult.error.message,
    });
  }

  if (userAchievementsResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load unlocked achievements.', {
      cause: userAchievementsResult.error.message,
    });
  }

  if (titlesResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load title catalog.', {
      cause: titlesResult.error.message,
    });
  }

  if (userTitlesResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load unlocked titles.', {
      cause: userTitlesResult.error.message,
    });
  }

  if (profileResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load equipped title.', {
      cause: profileResult.error.message,
    });
  }

  const achievementRows = (achievementsResult.data ?? []) as AchievementRow[];
  const titleRows = (titlesResult.data ?? []) as TitleRow[];
  const unlockedAchievements = buildMap<UserAchievementRow>(userAchievementsResult.data as UserAchievementRow[] | null, 'achievement_id');
  const unlockedTitles = buildMap<UserTitleRow>(userTitlesResult.data as UserTitleRow[] | null, 'title_id');

  const titleById = new Map<string, TitleRow>(titleRows.map((row) => [row.id, row]));
  const sortedTitleRows = [...titleRows].sort((left, right) => {
    return left.name.localeCompare(right.name);
  });

  const achievements = achievementRows.map((row) => {
    const isUnlocked = unlockedAchievements.has(row.id);
    const rarity = parseRarity(row.rarity);
    const rewardTitle = row.reward_title_id ? titleById.get(row.reward_title_id) : null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      hiddenName: row.name,
      description: row.description,
      hiddenDescription: HIDDEN_ACHIEVEMENT_DESCRIPTION,
      rarity,
      iconKey: row.icon_key ?? 'ribbon',
      isHidden: row.is_hidden === true,
      isUnlocked,
      unlockedAt: unlockedAchievements.get(row.id) ?? null,
      rewardTitleId: row.reward_title_id,
      rewardTitleName: rewardTitle?.name ?? null,
      sortOrder: parseSortOrder(row.sort_order),
    };
  });

  const equippedTitleId = profileResult.data ? (profileResult.data as ProfileRow).equipped_title_id : null;
  const equippedId = typeof equippedTitleId === 'string' && equippedTitleId.length > 0 ? equippedTitleId : null;

  const titles = sortedTitleRows.map((row) => {
    const titleId = row.id;
    const isOwned = unlockedTitles.has(titleId);

    return {
      id: titleId,
      slug: row.slug,
      name: row.name,
      description: row.description,
      rarity: parseRarity(row.rarity),
      iconKey: row.icon_key ?? 'ribbon',
      isOwned,
      isEquipped: equippedId === titleId,
      unlockedAt: unlockedTitles.get(titleId) ?? null,
    };
  }).sort((left, right) => {
    if (left.isEquipped !== right.isEquipped) {
      return left.isEquipped ? -1 : 1;
    }

    if (left.isOwned !== right.isOwned) {
      return left.isOwned ? -1 : 1;
    }

    if (left.rarity !== right.rarity) {
      return RARITY_ORDER[right.rarity] - RARITY_ORDER[left.rarity];
    }

    return left.name.localeCompare(right.name);
  });

  const unlockedAchievementCount = achievements.filter((achievement) => achievement.isUnlocked).length;

  return {
    achievements,
    titles,
    unlockedAchievementCount,
    totalAchievementCount: achievements.length,
    equippedTitleId: equippedId,
  };
}

export async function equipTitle(titleId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('equip_title', {
    p_title_id: titleId,
  });

  if (error) {
    mapRPCError(error);
  }
}
