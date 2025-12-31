import { useEffect, useState, useMemo } from 'react';
import { Query, onSnapshot, DocumentData } from 'firebase/firestore';

export function useFirestoreQuery<T = DocumentData>(query: Query<T> | null) {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!query) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = onSnapshot(query,
            (snapshot) => {
                const results = snapshot.docs.map(d => d.data());
                setData(results);
                setLoading(false);
            },
            (err) => {
                console.error("Firestore Error:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [query]); // Note: query must be memoized or stable ref

    return { data, loading, error };
}
