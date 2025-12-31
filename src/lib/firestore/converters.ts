import {
    QueryDocumentSnapshot,
    SnapshotOptions,
    WithFieldValue,
    DocumentData,
    FirestoreDataConverter
} from 'firebase/firestore';

const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj; // Preserve Dates

    if (Array.isArray(obj)) {
        return obj.map(v => removeUndefined(v));
    }

    if (typeof obj === 'object') {
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (val !== undefined) {
                newObj[key] = removeUndefined(val);
            }
        });
        return newObj;
    }

    return obj;
};

export const converter = <T>(): FirestoreDataConverter<T> => ({
    toFirestore(modelObject: WithFieldValue<T>): DocumentData {
        // Recursively strip undefined values
        return removeUndefined(modelObject);
    },
    fromFirestore(
        snapshot: QueryDocumentSnapshot,
        options: SnapshotOptions
    ): T {
        const data = snapshot.data(options);
        return {
            id: snapshot.id, // Ensure ID is always merged from doc ID
            ...data
        } as T;
    }
});
