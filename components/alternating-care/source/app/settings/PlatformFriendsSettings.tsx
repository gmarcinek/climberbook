'use client';

import { useAppContext } from '@app/AppContext';
import { useEffect, useState } from 'react';
import { Check, Search, Trash2, UserPlus, Users } from 'lucide-react';
import styles from './settings.module.scss';

type FriendUser = {
  id: string;
  displayName: string;
  email?: string | null;
};

type Relationship = {
  id: string;
  status: 'pending' | 'accepted';
  requester: FriendUser;
  recipient: FriendUser;
  alternatingVisibleToRequester: boolean;
  alternatingVisibleToRecipient: boolean;
  createdAt: string;
  accessGrants: Array<{
    app: PlatformApp;
    level: AccessLevel;
    owner: FriendUser;
    grantee: FriendUser;
  }>;
};

type PlatformApp = 'climberbook' | 'alternating-care' | 'maps' | 'models';
type AccessLevel = 'none' | 'notifications' | 'read';

const apps: Array<{ id: PlatformApp; label: string }> = [
  { id: 'climberbook', label: 'Climberbook' },
  { id: 'alternating-care', label: 'Opieka naprzemienna' },
  { id: 'maps', label: 'Maps' },
  { id: 'models', label: 'Modele' },
];

async function getJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'Operacja nie powiodła się.');
  return data;
}

export function PlatformFriendsSettings() {
  const { user, language } = useAppContext();
  const isEnglish = language === 'en';
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [results, setResults] = useState<FriendUser[]>([]);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  const loadRelationships = async () => {
    try {
      const data = await getJson<{ relationships: Relationship[] }>(
        await fetch('/api/platform/friends', { cache: 'no-store' })
      );
      setRelationships(data.relationships);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : isEnglish
            ? 'Could not load friends.'
            : 'Nie udało się wczytać znajomych.'
      );
    }
  };

  useEffect(() => {
    void loadRelationships();
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/platform/friends/users?q=${encodeURIComponent(value)}`, {
        signal: controller.signal,
      })
        .then((response) =>
          getJson<{ users: FriendUser[] }>(response)
        )
        .then((data) => setResults(data.users))
        .catch((searchError) => {
          if (
            searchError instanceof DOMException &&
            searchError.name === 'AbortError'
          ) {
            return;
          }
          setError(
            searchError instanceof Error
              ? searchError.message
              : isEnglish
                ? 'Search failed.'
                : 'Wyszukiwanie nie powiodło się.'
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isEnglish, query]);

  const mutate = async (
    relationshipId: string,
    body: {
      action: string;
      enabled?: boolean;
      app?: PlatformApp;
      level?: AccessLevel;
    }
  ) => {
    setError('');
    try {
      await getJson(
        await fetch(`/api/platform/friends/${relationshipId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
      );
      await loadRelationships();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : isEnglish
            ? 'The operation failed.'
            : 'Operacja nie powiodła się.'
      );
    }
  };

  const sendInvite = async (recipientId: string) => {
    setError('');
    try {
      await getJson(
        await fetch('/api/platform/friends', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ recipientId }),
        })
      );
      setQuery('');
      setResults([]);
      await loadRelationships();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : isEnglish
            ? 'Could not send the invitation.'
            : 'Nie udało się wysłać zaproszenia.'
      );
    }
  };

  const incoming = relationships.filter(
    (relationship) =>
      relationship.status === 'pending' && relationship.recipient.id === user.id
  );
  const outgoing = relationships.filter(
    (relationship) =>
      relationship.status === 'pending' &&
      relationship.requester.id === user.id
  );
  const friends = relationships.filter(
    (relationship) => relationship.status === 'accepted'
  );

  const personIn = (relationship: Relationship) =>
    relationship.requester.id === user.id
      ? relationship.recipient
      : relationship.requester;

  const accessLevelFor = (
    relationship: Relationship,
    app: PlatformApp
  ): AccessLevel =>
    relationship.accessGrants.find(
      (grant) =>
        grant.app === app &&
        grant.owner.id === user.id &&
        grant.grantee.id === personIn(relationship).id
    )?.level ?? 'none';

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.icon}>
          <Users size={20} aria-hidden />
        </span>
        <div>
          <h2>{isEnglish ? 'Platform team' : 'Znajomi na platformie'}</h2>
          <p>
            {isEnglish
              ? 'Invite people and configure what each friend can see per application.'
              : 'Zaproś osoby i ustaw dla każdej, do czego ma dostęp w poszczególnych aplikacjach.'}
          </p>
        </div>
      </div>

      <div className={styles.friendSearch}>
        <Search size={17} aria-hidden />
        <input
          type='search'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            isEnglish
              ? 'Search platform users…'
              : 'Szukaj użytkowników platformy…'
          }
        />
      </div>

      {query.trim().length >= 2 && (
        <div className={styles.friendSearchResults}>
          {isSearching && (
            <span>{isEnglish ? 'Searching…' : 'Wyszukiwanie…'}</span>
          )}
          {!isSearching && results.length === 0 && (
            <span>{isEnglish ? 'No results' : 'Brak wyników'}</span>
          )}
          {results.map((result) => (
            <div key={result.id}>
              <span>
                <strong>{result.displayName}</strong>
                {result.email && <small>{result.email}</small>}
              </span>
              <button type='button' onClick={() => sendInvite(result.id)}>
                <UserPlus size={16} aria-hidden />
                {isEnglish ? 'Invite' : 'Zaproś'}
              </button>
            </div>
          ))}
        </div>
      )}

      {incoming.length > 0 && (
        <div className={styles.friendGroup}>
          <h3>{isEnglish ? 'Incoming invitations' : 'Otrzymane zaproszenia'}</h3>
          {incoming.map((relationship) => (
            <div className={styles.friendRow} key={relationship.id}>
              <span>{relationship.requester.displayName}</span>
              <div>
                <button
                  type='button'
                  className={styles.friendPrimaryAction}
                  onClick={() => mutate(relationship.id, { action: 'accept' })}
                >
                  <Check size={15} aria-hidden />
                  {isEnglish ? 'Accept' : 'Akceptuj'}
                </button>
                <button
                  type='button'
                  onClick={() => mutate(relationship.id, { action: 'reject' })}
                >
                  {isEnglish ? 'Reject' : 'Odrzuć'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className={styles.friendGroup}>
          <h3>{isEnglish ? 'Sent invitations' : 'Wysłane zaproszenia'}</h3>
          {outgoing.map((relationship) => (
            <div className={styles.friendRow} key={relationship.id}>
              <span>{relationship.recipient.displayName}</span>
              <button
                type='button'
                onClick={() => mutate(relationship.id, { action: 'remove' })}
              >
                {isEnglish ? 'Cancel' : 'Anuluj'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.friendGroup}>
        <h3>{isEnglish ? 'Friends' : 'Znajomi'}</h3>
        {friends.length === 0 && (
          <span className={styles.emptyState}>
            {isEnglish
              ? 'Add your first platform friend.'
              : 'Dodaj pierwszą osobę z platformy.'}
          </span>
        )}
        {friends.map((relationship) => {
          const person = personIn(relationship);
          return (
            <div className={styles.friendAccessCard} key={relationship.id}>
              <div className={styles.friendAccessHeader}>
                <span>
                  <strong>{person.displayName}</strong>
                  <small>
                    {isEnglish ? 'Application visibility' : 'Dostęp do aplikacji'}
                  </small>
                </span>
                <button
                  type='button'
                  className={styles.removeFriend}
                  aria-label={isEnglish ? 'Remove friend' : 'Usuń znajomego'}
                  onClick={() => mutate(relationship.id, { action: 'remove' })}
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              </div>
              <div className={styles.appAccessGrid}>
                {apps.map((app) => {
                  const level = accessLevelFor(relationship, app.id);
                  return (
                    <label key={app.id} className={styles.appAccess}>
                      <span>{app.label}</span>
                      <select
                        value={level}
                        onChange={(event) =>
                          mutate(relationship.id, {
                            action: 'set-app-access',
                            app: app.id,
                            level: event.target.value as AccessLevel,
                            enabled: event.target.value !== 'none',
                          })
                        }
                      >
                        <option value='none'>
                          {isEnglish ? 'Hidden' : 'Ukryte'}
                        </option>
                        <option value='notifications'>
                          {isEnglish ? 'Activity only' : 'Tylko aktywność'}
                        </option>
                        <option value='read'>
                          {isEnglish ? 'Can view' : 'Pełny podgląd'}
                        </option>
                      </select>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className={styles.operationError}>{error}</p>}
    </section>
  );
}
