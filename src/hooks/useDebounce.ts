// src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

/**
 * Ein Custom Hook, der einen Wert "debounced". Das bedeutet, er wartet eine
 * bestimmte Zeit, nachdem der Wert sich zuletzt geändert hat, bevor er den
 * neuen Wert zurückgibt. Das ist nützlich, um die Anzahl der API-Aufrufe
 * zu reduzieren, z.B. beim Speichern von Einstellungen.
 *
 * @param value Der Wert, der debounced werden soll (z.B. ein Einstellungs-Objekt).
 * @param delay Die Verzögerung in Millisekunden.
 * @returns Den debounced Wert.
 */
function useDebounce<T>(value: T, delay: number): T {
  // State, um den debounced Wert zu speichern
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Ein Timer wird gesetzt, der den State nach der angegebenen Verzögerung aktualisiert.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Wichtig: Die `cleanup`-Funktion. Sie wird ausgeführt, wenn der `value`
    // oder `delay` sich ändert, bevor der Timer abgelaufen ist. Sie bricht
    // den alten Timer ab, damit nur der letzte zählt.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Dieser Effekt wird nur neu ausgeführt, wenn sich Wert oder Verzögerung ändern

  return debouncedValue;
}

export default useDebounce;
