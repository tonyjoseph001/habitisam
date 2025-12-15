
export const playSound = (type: 'complete' | 'select' | 'error') => {
    // In a real app, these would proceed from an asset folder
    // For now, we will just log or assume these assets exist in public/sounds
    // OR we could use AudioContext for synthesized beeps if we want to be fancy without assets
    // Let's assume standard assets path

    const sounds = {
        complete: '/sounds/success.mp3',
        select: '/sounds/pop.mp3',
        error: '/sounds/error.mp3'
    };

    try {
        const audio = new Audio(sounds[type]);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio play failed (interaction needed first?)", e));
    } catch (err) {
        console.error("Sound error", err);
    }
};
