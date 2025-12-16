"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface VoiceRecorderProps {
    initialBlob?: Blob;
    onRecordingComplete: (blob: Blob) => void;
    onDelete: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    initialBlob,
    onRecordingComplete,
    onDelete
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(initialBlob || null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize audio player if blob exists
    useEffect(() => {
        if (initialBlob) {
            setAudioBlob(initialBlob);
        }
    }, [initialBlob]);

    // Cleanup URLs on unmount
    useEffect(() => {
        return () => {
            if (audioPlayerRef.current) {
                URL.revokeObjectURL(audioPlayerRef.current.src);
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                onRecordingComplete(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);

            // visual timer or simple state is fine for now
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playAudio = () => {
        if (!audioBlob) return;

        if (!audioPlayerRef.current || audioPlayerRef.current.src === '') {
            const url = URL.createObjectURL(audioBlob);
            audioPlayerRef.current = new Audio(url);

            audioPlayerRef.current.onended = () => {
                setIsPlaying(false);
                setCurrentTime(0);
            };

            audioPlayerRef.current.ontimeupdate = () => {
                setCurrentTime(audioPlayerRef.current?.currentTime || 0);
            };

            audioPlayerRef.current.onloadedmetadata = () => {
                setAudioDuration(audioPlayerRef.current?.duration || 0);
            };
        }

        audioPlayerRef.current.play();
        setIsPlaying(true);
    };

    const pauseAudio = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleDelete = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current = null;
        }
        setAudioBlob(null);
        setIsPlaying(false);
        setCurrentTime(0);
        onDelete();
    };

    return (
        <div className="w-full">
            {!audioBlob && !isRecording && (
                <Button
                    onClick={startRecording}
                    variant="outline"
                    className="w-full h-14 border-2 border-slate-200 border-dashed rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-all font-bold"
                >
                    <Mic className="w-5 h-5" />
                    <span>Hold to Record Instruction</span>
                </Button>
            )}

            {isRecording && (
                <div className="w-full h-14 bg-red-50 border-2 border-red-100 rounded-xl flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-3 h-3 bg-red-500 rounded-full"
                        />
                        <span className="text-red-500 font-bold text-sm">Recording...</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4"
                    >
                        <Square className="w-4 h-4 fill-white mr-1" /> Stop
                    </Button>
                </div>
            )}

            {audioBlob && !isRecording && (
                <div className="w-full h-14 bg-violet-600 rounded-xl flex items-center justify-between px-2 pr-4 shadow-md overflow-hidden">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={isPlaying ? pauseAudio : playAudio}
                            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors text-white"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white pl-0.5" />}
                        </button>

                        {/* Simple Visualization / Waveform Placeholder */}
                        <div className="h-6 flex items-center gap-0.5 opacity-60">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-white rounded-full"
                                    style={{
                                        height: Math.max(20, Math.random() * 100) + '%',
                                        opacity: isPlaying ? 1 : 0.5
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        <button
                            onClick={handleDelete}
                            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
