import React, { Suspense } from 'react';
import { RoutineEditor } from '@/components/domain/routines/RoutineEditor';

export default function NewRoutinePage() {
    return (
        <Suspense fallback={<div>Loading editor...</div>}>
            <RoutineEditor />
        </Suspense>
    );
}
