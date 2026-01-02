import { db } from './core';
import { converter } from './converters';
import { collection, doc, setDoc } from 'firebase/firestore';
import { Feedback } from '@/lib/db';

const COLLECTION_NAME = 'feedbacks';

export const FeedbackService = {
    getCollection: () => collection(db, COLLECTION_NAME).withConverter(converter<Feedback>()),

    add: async (item: Feedback) => {
        const ref = doc(db, COLLECTION_NAME, item.id).withConverter(converter<Feedback>());
        await setDoc(ref, item);
    }
};
