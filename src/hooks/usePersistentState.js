import { useEffect, useState } from 'react';

function resolveInitialValue(initialValue) {
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

export default function usePersistentState(
  storageKey,
  initialValue,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = {},
) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return resolveInitialValue(initialValue);
    }

    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue === null) {
      return resolveInitialValue(initialValue);
    }

    try {
      return deserialize(storedValue);
    } catch (error) {
      console.warn(`Failed to parse localStorage value for "${storageKey}"`, error);
      return resolveInitialValue(initialValue);
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, serialize(value));
  }, [serialize, storageKey, value]);

  return [value, setValue];
}
