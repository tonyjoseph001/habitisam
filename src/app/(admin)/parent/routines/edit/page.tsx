"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RoutineEditor } from '@/components/domain/routines/RoutineEditor';

function EditRoutineContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    if (!id) return <div>Invalid Routine ID</div>;

    return <RoutineEditor initialRoutineId={id} />;
}

export default function EditRoutinePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EditRoutineContent />
        </Suspense>
    );
}
